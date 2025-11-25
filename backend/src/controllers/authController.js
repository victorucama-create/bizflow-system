const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Gerar token JWT
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Registrar novo usuário
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

        const { name, email, password, companyName, twoFactorEnabled } = req.body;

        // Verificar se usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma conta com este email'
            });
        }

        // Criar usuário
        const user = await User.create({
            name,
            email,
            password,
            company: companyName ? { name: companyName } : undefined,
            twoFactorEnabled: twoFactorEnabled || false,
            role: (await User.countDocuments()) === 0 ? 'admin' : 'user'
        });

        // Gerar token
        const token = generateToken(user._id);

        // Atualizar último login
        user.lastLogin = new Date();
        user.lastLoginIp = req.ip;
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company
                },
                token
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Login de usuário
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

        const { email, password } = req.body;

        // Buscar usuário com senha
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !(await user.comparePassword(password))) {
            // Incrementar tentativas de login
            if (user) {
                await user.incrementLoginAttempts();
            }

            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar se conta está bloqueada
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.'
            });
        }

        // Resetar tentativas de login
        await user.resetLoginAttempts();

        // Atualizar último login
        user.lastLogin = new Date();
        user.lastLoginIp = req.ip;
        await user.save();

        // Gerar token
        const token = generateToken(user._id);

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
                    twoFactorEnabled: user.twoFactorEnabled
                },
                token
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Verificar token
exports.verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
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
                    company: user.company
                }
            }
        });

    } catch (error) {
        console.error('Erro na verificação do token:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    // Em uma implementação real, você pode adicionar o token a uma blacklist
    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
};

// Solicitar reset de senha
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Por segurança, não revelar se o email existe ou não
            return res.json({
                success: true,
                message: 'Se o email existir, um link de recuperação será enviado'
            });
        }

        // Gerar token de reset (simplificado para demo)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hora

        // Em produção, salvar o token no banco e enviar email
        console.log(`Token de reset para ${email}: ${resetToken}`);

        res.json({
            success: true,
            message: 'Link de recuperação enviado para seu email'
        });

    } catch (error) {
        console.error('Erro no forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
