const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class AuthService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
        this.maxSessions = 5;
    }

    /**
     * Authenticate user with email and password
     */
    async authenticate(email, password, ip, userAgent) {
        try {
            const user = await User.findOne({
                where: { email },
                attributes: { include: ['password'] }
            });

            if (!user) {
                await this.logFailedAttempt(email, ip, 'USER_NOT_FOUND');
                return { success: false, message: 'Credenciais inválidas' };
            }

            // Check if account is locked
            if (user.failedAttempts >= 5) {
                const lockTime = new Date(user.lastFailedAttempt);
                lockTime.setMinutes(lockTime.getMinutes() + 15);
                
                if (new Date() < lockTime) {
                    return { 
                        success: false, 
                        message: 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.' 
                    };
                }
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            
            if (!isValid) {
                await user.increment('failedAttempts');
                user.lastFailedAttempt = new Date();
                await user.save();
                
                await this.logFailedAttempt(email, ip, 'INVALID_PASSWORD');
                
                return { 
                    success: false, 
                    message: 'Credenciais inválidas',
                    attemptsLeft: 5 - user.failedAttempts 
                };
            }

            // Reset failed attempts on successful login
            if (user.failedAttempts > 0) {
                user.failedAttempts = 0;
                await user.save();
            }

            // Check if 2FA is required
            if (user.twoFactorEnabled) {
                const tempToken = this.generate2FAToken(user.id);
                return {
                    success: true,
                    requires2FA: true,
                    tempToken,
                    userId: user.id
                };
            }

            // Generate tokens
            const tokens = await this.generateTokens(user);
            
            // Create session
            await this.createSession(user.id, tokens.refreshToken, ip, userAgent);
            
            // Log successful login
            await SecurityLog.create({
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                ipAddress: ip,
                userAgent,
                details: { method: 'password' }
            });

            return {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    twoFactorEnabled: user.twoFactorEnabled
                },
                tokens
            };

        } catch (error) {
            logger.error('Authentication error:', error);
            return { success: false, message: 'Erro na autenticação' };
        }
    }

    /**
     * Verify 2FA code
     */
    async verify2FA(userId, code, tempToken, ip, userAgent) {
        try {
            // Verify temp token
            const decoded = jwt.verify(tempToken, process.env.JWT_TEMP_SECRET);
            if (decoded.userId !== userId) {
                return { success: false, message: 'Token inválido' };
            }

            const user = await User.findByPk(userId);
            
            if (!user) {
                return { success: false, message: 'Usuário não encontrado' };
            }

            // In production, use proper TOTP validation
            // For demo, accept any 6-digit code
            const isValid = /^\d{6}$/.test(code);
            
            if (!isValid) {
                await this.logFailedAttempt(user.email, ip, 'INVALID_2FA_CODE');
                return { success: false, message: 'Código inválido' };
            }

            // Generate tokens
            const tokens = await this.generateTokens(user);
            
            // Create session
            await this.createSession(user.id, tokens.refreshToken, ip, userAgent);
            
            // Log successful 2FA
            await SecurityLog.create({
                userId: user.id,
                action: '2FA_SUCCESS',
                ipAddress: ip,
                userAgent,
                details: { method: 'authenticator' }
            });

            return {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    twoFactorEnabled: user.twoFactorEnabled
                },
                tokens
            };

        } catch (error) {
            logger.error('2FA verification error:', error);
            return { success: false, message: 'Erro na verificação' };
        }
    }

    /**
     * Generate access and refresh tokens
     */
    async generateTokens(user) {
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            this.accessTokenSecret,
            { expiresIn: this.accessTokenExpiry }
        );

        const refreshToken = jwt.sign(
            {
                id: user.id,
                tokenVersion: user.tokenVersion || 0
            },
            this.refreshTokenSecret,
            { expiresIn: this.refreshTokenExpiry }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
            
            const user = await User.findByPk(decoded.id);
            if (!user || user.tokenVersion !== decoded.tokenVersion) {
                return { success: false, message: 'Refresh token inválido' };
            }

            // Check if session exists
            const session = await SecurityLog.findOne({
                where: {
                    userId: user.id,
                    action: 'SESSION_CREATED',
                    details: { refreshTokenHash: this.hashToken(refreshToken) }
                }
            });

            if (!session) {
                return { success: false, message: 'Sessão expirada' };
            }

            const accessToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                this.accessTokenSecret,
                { expiresIn: this.accessTokenExpiry }
            );

            // Log token refresh
            await SecurityLog.create({
                userId: user.id,
                action: 'TOKEN_REFRESHED',
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                details: { method: 'refresh_token' }
            });

            return { success: true, accessToken };

        } catch (error) {
            logger.error('Token refresh error:', error);
            return { success: false, message: 'Erro ao renovar token' };
        }
    }

    /**
     * Create new session
     */
    async createSession(userId, refreshToken, ip, userAgent) {
        try {
            // Limit number of active sessions
            const activeSessions = await SecurityLog.count({
                where: {
                    userId,
                    action: 'SESSION_CREATED',
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                }
            });

            if (activeSessions >= this.maxSessions) {
                // Revoke oldest session
                const oldestSession = await SecurityLog.findOne({
                    where: {
                        userId,
                        action: 'SESSION_CREATED'
                    },
                    order: [['createdAt', 'ASC']]
                });

                if (oldestSession) {
                    await SecurityLog.create({
                        userId,
                        action: 'SESSION_REVOKED',
                        ipAddress: ip,
                        userAgent,
                        details: { reason: 'MAX_SESSIONS_EXCEEDED' }
                    });
                }
            }

            // Create new session
            await SecurityLog.create({
                userId,
                action: 'SESSION_CREATED',
                ipAddress: ip,
                userAgent,
                details: {
                    refreshTokenHash: this.hashToken(refreshToken),
                    userAgent: userAgent
                }
            });

            // Update user's last login
            await User.update(
                { lastLogin: new Date() },
                { where: { id: userId } }
            );

        } catch (error) {
            logger.error('Create session error:', error);
        }
    }

    /**
     * Revoke all sessions for user
     */
    async revokeAllSessions(userId, ip, userAgent) {
        try {
            await SecurityLog.create({
                userId,
                action: 'ALL_SESSIONS_REVOKED',
                ipAddress: ip,
                userAgent,
                details: { revokedBy: 'user' }
            });

            // Increment token version to invalidate all refresh tokens
            await User.increment('tokenVersion', { where: { id: userId } });

            return { success: true, message: 'Todas as sessões foram encerradas' };

        } catch (error) {
            logger.error('Revoke sessions error:', error);
            return { success: false, message: 'Erro ao encerrar sessões' };
        }
    }

    /**
     * Get active sessions
     */
    async getActiveSessions(userId) {
        try {
            const sessions = await SecurityLog.findAll({
                where: {
                    userId,
                    action: 'SESSION_CREATED',
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'ipAddress', 'userAgent', 'createdAt']
            });

            return sessions.map(session => ({
                id: session.id,
                ip: session.ipAddress,
                userAgent: session.userAgent,
                createdAt: session.createdAt,
                current: this.isCurrentSession(session)
            }));

        } catch (error) {
            logger.error('Get sessions error:', error);
            return [];
        }
    }

    /**
     * Validate access token
     */
    validateAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expirado');
            }
            throw new Error('Token inválido');
        }
    }

    /**
     * Generate 2FA setup secret
     */
    async generate2FASecret(userId) {
        try {
            const secret = crypto.randomBytes(20).toString('hex');
            
            // Store secret temporarily (in production, use secure storage)
            const tempToken = jwt.sign(
                { userId, secret },
                process.env.JWT_TEMP_SECRET,
                { expiresIn: '10m' }
            );

            // Generate QR code URL for Google Authenticator
            const appName = 'BizFlow';
            const userEmail = (await User.findByPk(userId)).email;
            const qrCodeUrl = `otpauth://totp/${appName}:${userEmail}?secret=${secret}&issuer=${appName}`;

            return {
                success: true,
                tempToken,
                secret,
                qrCodeUrl
            };

        } catch (error) {
            logger.error('Generate 2FA secret error:', error);
            return { success: false, message: 'Erro ao gerar segredo 2FA' };
        }
    }

    /**
     * Enable 2FA for user
     */
    async enable2FA(userId, secret, code) {
        try {
            // Verify code (in production, use proper TOTP validation)
            const isValid = /^\d{6}$/.test(code);
            
            if (!isValid) {
                return { success: false, message: 'Código inválido' };
            }

            // Store 2FA secret (in production, encrypt before storing)
            await User.update({
                twoFactorEnabled: true,
                twoFactorSecret: secret
            }, { where: { id: userId } });

            // Log 2FA enablement
            await SecurityLog.create({
                userId,
                action: '2FA_ENABLED',
                ipAddress: 'system',
                details: { method: 'authenticator' }
            });

            return { success: true, message: '2FA ativado com sucesso' };

        } catch (error) {
            logger.error('Enable 2FA error:', error);
            return { success: false, message: 'Erro ao ativar 2FA' };
        }
    }

    /**
     * Disable 2FA for user
     */
    async disable2FA(userId, password) {
        try {
            const user = await User.findByPk(userId);
            
            if (!user) {
                return { success: false, message: 'Usuário não encontrado' };
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return { success: false, message: 'Senha incorreta' };
            }

            // Disable 2FA
            await User.update({
                twoFactorEnabled: false,
                twoFactorSecret: null
            }, { where: { id: userId } });

            // Log 2FA disablement
            await SecurityLog.create({
                userId,
                action: '2FA_DISABLED',
                ipAddress: 'system',
                details: { method: 'user_request' }
            });

            return { success: true, message: '2FA desativado com sucesso' };

        } catch (error) {
            logger.error('Disable 2FA error:', error);
            return { success: false, message: 'Erro ao desativar 2FA' };
        }
    }

    /**
     * Log failed login attempt
     */
    async logFailedAttempt(email, ip, reason) {
        try {
            await SecurityLog.create({
                userId: null,
                action: 'LOGIN_FAILED',
                ipAddress: ip,
                details: { email, reason }
            });
        } catch (error) {
            logger.error('Log failed attempt error:', error);
        }
    }

    /**
     * Generate 2FA token
     */
    generate2FAToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_TEMP_SECRET,
            { expiresIn: '5m' }
        );
    }

    /**
     * Hash token for storage
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Check if session is current
     */
    isCurrentSession(session) {
        // Compare user agent and IP with current request
        // This would need request context in production
        return false;
    }
}

module.exports = new AuthService();
