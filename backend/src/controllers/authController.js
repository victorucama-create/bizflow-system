const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const speakeasy = require('speakeasy'); // Para 2FA
const bcrypt = require('bcryptjs');

// ✅ GERAR TOKEN JWT MELHORADO
const generateToken = (userId) => {
    return jwt.sign(
        { 
            userId,
            type: 'access'
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            issuer: 'bizflow-system',
            subject: userId.toString()
        }
    );
};

// ✅ GERAR REFRESH TOKEN
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { 
            userId,
            type: 'refresh'
        },
        process.env.JWT_SECRET + '_refresh', // Segredo diferente para refresh tokens
        { 
            expiresIn: '30d',
            issuer: 'bizflow-system',
            subject: userId.toString()
        }
    );
};

// ✅ REGISTRAR NOVO USUÁRIO
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const { name, email, password, companyName, twoFactorEnabled, phone } = req.body;

        // ✅ VERIFICAR SE USUÁRIO JÁ EXISTE
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma conta com este email'
            });
        }

        // ✅ GERAR SECRET PARA 2FA SE SOLICITADO
        let twoFactorSecret;
        if (twoFactorEnabled) {
            twoFactorSecret = speakeasy.generateSecret({
                name: `BizFlow (${email})`,
                issuer: 'BizFlow System'
            });
        }

        // ✅ CRIAR USUÁRIO
        const user = await User.create({
            name,
            email,
            password,
            phone,
            company: companyName ? { name: companyName } : undefined,
            twoFactorEnabled: twoFactorEnabled || false,
            twoFactorSecret: twoFactorEnabled ? twoFactorSecret.base32 : undefined,
            role: (await User.countDocuments()) === 0 ? 'admin' : 'user'
        });

        // ✅ GERAR TOKENS
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // ✅ ATUALIZAR ÚLTIMO LOGIN
        user.lastLogin = new Date();
        user.lastLoginIp = req.ip || req.connection.remoteAddress;
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso' + (twoFactorEnabled ? ' - 2FA ativado' : ''),
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    twoFactorEnabled: user.twoFactorEnabled,
                    subscription: user.subscription
                },
                token,
                refreshToken,
                twoFactorSetup: twoFactorEnabled ? {
                    secret: twoFactorSecret.base32,
                    qrCode: twoFactorSecret.otpauth_url
                } : undefined
            }
        });

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        
        // ✅ TRATAMENTO DE ERROS ESPECÍFICOS
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ LOGIN DE USUÁRIO
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const { email, password, twoFactorCode } = req.body;

        // ✅ BUSCAR USUÁRIO COM SENHA
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !(await user.comparePassword(password))) {
            // ✅ INCREMENTAR TENTATIVAS DE LOGIN
            if (user) {
                await user.incrementLoginAttempts();
            }

            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // ✅ VERIFICAR SE CONTA ESTÁ BLOQUEADA
        if (user.isLocked) {
            const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Conta temporariamente bloqueada. Tente novamente em ${lockTime} minutos.`
            });
        }

        // ✅ VERIFICAR SE CONTA ESTÁ ATIVA
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o administrador.'
            });
        }

        // ✅ VERIFICAÇÃO 2FA
        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                return res.status(200).json({
                    success: true,
                    requires2FA: true,
                    message: 'Código de verificação 2FA necessário',
                    tempToken: generateToken(user._id + '_2fa_pending') // Token temporário
                });
            }

            // ✅ VALIDAR CÓDIGO 2FA
            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: twoFactorCode,
                window: 2 // Permite 2 intervalos de tempo para sincronização
            });

            if (!verified) {
                await user.incrementLoginAttempts();
                return res.status(401).json({
                    success: false,
                    message: 'Código de verificação inválido'
                });
            }
        }

        // ✅ RESETAR TENTATIVAS DE LOGIN
        await user.resetLoginAttempts();

        // ✅ ATUALIZAR ÚLTIMO LOGIN
        user.lastLogin = new Date();
        user.lastLoginIp = req.ip || req.connection.remoteAddress;
        await user.save();

        // ✅ GERAR TOKENS
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    twoFactorEnabled: user.twoFactorEnabled,
                    subscription: user.subscription,
                    preferences: user.preferences
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ VERIFICAR TOKEN
exports.verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // ✅ VERIFICAR SE CONTA ESTÁ ATIVA
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    twoFactorEnabled: user.twoFactorEnabled,
                    subscription: user.subscription,
                    preferences: user.preferences,
                    lastLogin: user.lastLogin
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro na verificação do token:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ RENOVAR TOKEN
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token é obrigatório'
            });
        }

        // ✅ VERIFICAR REFRESH TOKEN
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + '_refresh');
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado ou conta desativada'
            });
        }

        // ✅ GERAR NOVOS TOKENS
        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        console.error('❌ Erro no refresh token:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token expirado'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token inválido'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ LOGOUT
exports.logout = async (req, res) => {
    try {
        // Em produção, você pode adicionar o token a uma blacklist
        // ou invalidar o refresh token no banco de dados
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro no logout:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ SOLICITAR RESET DE SENHA
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // ✅ POR SEGURANÇA, NÃO REVELAR SE O EMAIL EXISTE
            return res.json({
                success: true,
                message: 'Se o email existir, um link de recuperação será enviado'
            });
        }

        // ✅ GERAR TOKEN DE RESET
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hora

        // ✅ SALVAR TOKEN NO USUÁRIO (em produção)
        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.passwordResetExpires = new Date(resetTokenExpiry);
        await user.save();

        // ✅ EM PRODUÇÃO: ENVIAR EMAIL COM LINK DE RESET
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        console.log(`🔐 Link de reset para ${email}: ${resetUrl}`);
        console.log(`📧 Em produção, enviar email com o link acima`);

        res.json({
            success: true,
            message: 'Link de recuperação enviado para seu email'
        });

    } catch (error) {
        console.error('❌ Erro no forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ REDEFINIR SENHA
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token e nova senha são obrigatórios'
            });
        }

        // ✅ HASH DO TOKEN PARA COMPARAÇÃO
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // ✅ BUSCAR USUÁRIO COM TOKEN VÁLIDO
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        // ✅ ATUALIZAR SENHA
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro no reset password:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ✅ VERIFICAR CÓDIGO 2FA
exports.verify2FA = async (req, res) => {
    try {
        const { code, tempToken } = req.body;

        if (!code || !tempToken) {
            return res.status(400).json({
                success: false,
                message: 'Código e token temporário são obrigatórios'
            });
        }

        // ✅ DECODIFICAR TOKEN TEMPORÁRIO
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        const userId = decoded.userId.replace('_2fa_pending', '');

        const user = await User.findById(userId);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Usuário não encontrado ou 2FA não ativado'
            });
        }

        // ✅ VALIDAR CÓDIGO 2FA
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(401).json({
                success: false,
                message: 'Código de verificação inválido'
            });
        }

        // ✅ GERAR TOKENS FINAIS
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.json({
            success: true,
            message: 'Verificação 2FA realizada com sucesso',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    subscription: user.subscription
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error('❌ Erro na verificação 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
