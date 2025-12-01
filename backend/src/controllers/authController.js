const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const securityService = require('../services/securityService');
const emailService = require('../services/emailService');
const { jwtSecret, jwtRefreshSecret } = require('../config/auth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthController {
  // Registro de novo usuário
  async register(req, res) {
    try {
      const { name, email, password, companyName, phone } = req.body;
      
      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'Este e-mail já está registrado.'
        });
      }
      
      // Criar usuário
      const user = await User.create({
        name,
        email,
        password,
        companyName,
        phone,
        role: 'admin' // Primeiro usuário é admin
      });
      
      // Gerar token de verificação
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      await user.save();
      
      // Enviar e-mail de verificação
      await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
      
      // Gerar tokens JWT
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      
      // Log de registro
      await securityService.logSecurityEvent({
        userId: user.id,
        action: 'USER_REGISTERED',
        description: 'Novo usuário registrado',
        ipAddress: req.ip,
        details: {
          companyName,
          role: user.role
        }
      });
      
      res.status(201).json({
        message: 'Usuário registrado com sucesso! Verifique seu e-mail.',
        user: user.toJSON(),
        token,
        refreshToken
      });
      
    } catch (error) {
      logger.error('Erro no registro:', error);
      
      await securityService.logSecurityEvent({
        userId: 'unknown',
        action: 'REGISTRATION_FAILED',
        description: 'Falha no registro de usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao registrar usuário.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Buscar usuário
      const user = await User.findOne({ where: { email } });
      if (!user) {
        await securityService.logSecurityEvent({
          userId: 'unknown',
          action: 'LOGIN_FAILED',
          description: 'Tentativa de login com e-mail não registrado',
          ipAddress: req.ip,
          details: { email }
        });
        
        return res.status(401).json({
          error: 'Credenciais inválidas.'
        });
      }
      
      // Verificar se conta está ativa
      if (!user.isActive) {
        await securityService.logSecurityEvent({
          userId: user.id,
          action: 'LOGIN_DISABLED_ACCOUNT',
          description: 'Tentativa de login em conta desativada',
          ipAddress: req.ip
        });
        
        return res.status(403).json({
          error: 'Conta desativada. Entre em contato com o administrador.'
        });
      }
      
      // Verificar senha
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        await securityService.logSecurityEvent({
          userId: user.id,
          action: 'LOGIN_FAILED',
          description: 'Tentativa de login com senha incorreta',
          ipAddress: req.ip
        });
        
        return res.status(401).json({
          error: 'Credenciais inválidas.'
        });
      }
      
      // Atualizar último login
      user.lastLogin = new Date();
      await user.save();
      
      // Gerar tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      
      // Log de login bem-sucedido
      await securityService.logSecurityEvent({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        description: 'Login realizado com sucesso',
        ipAddress: req.ip,
        details: {
          userAgent: req.headers['user-agent']
        }
      });
      
      res.json({
        message: 'Login realizado com sucesso!',
        user: user.toJSON(),
        token,
        refreshToken
      });
      
    } catch (error) {
      logger.error('Erro no login:', error);
      
      await securityService.logSecurityEvent({
        userId: 'unknown',
        action: 'LOGIN_ERROR',
        description: 'Erro durante o processo de login',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao fazer login.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token é obrigatório.'
        });
      }
      
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
      
      // Buscar usuário
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Token inválido ou usuário não encontrado.'
        });
      }
      
      // Gerar novo token
      const newToken = user.generateAuthToken();
      
      res.json({
        token: newToken
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar token:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido.'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado. Faça login novamente.'
        });
      }
      
      res.status(500).json({
        error: 'Erro ao atualizar token.'
      });
    }
  }
  
  // Logout
  async logout(req, res) {
    try {
      const userId = req.user.userId;
      
      // Log de logout
      await securityService.logSecurityEvent({
        userId,
        action: 'LOGOUT',
        description: 'Usuário realizou logout',
        ipAddress: req.ip
      });
      
      res.json({
        message: 'Logout realizado com sucesso.'
      });
      
    } catch (error) {
      logger.error('Erro no logout:', error);
      res.status(500).json({
        error: 'Erro ao fazer logout.'
      });
    }
  }
  
  // Esqueci a senha
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      // Buscar usuário
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Por segurança, não revelar se o e-mail existe
        return res.json({
          message: 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'
        });
      }
      
      // Gerar token de redefinição
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora
      await user.save();
      
      // Enviar e-mail
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      await emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
      
      // Log de solicitação
      await securityService.logSecurityEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        description: 'Solicitação de redefinição de senha',
        ipAddress: req.ip
      });
      
      res.json({
        message: 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'
      });
      
    } catch (error) {
      logger.error('Erro no esqueci a senha:', error);
      
      await securityService.logSecurityEvent({
        userId: 'unknown',
        action: 'PASSWORD_RESET_ERROR',
        description: 'Erro na solicitação de redefinição de senha',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao processar solicitação.'
      });
    }
  }
  
  // Redefinir senha
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      
      // Hash do token recebido
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      // Buscar usuário com token válido
      const user = await User.findOne({
        where: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: { [sequelize.Sequelize.Op.gt]: new Date() }
        }
      });
      
      if (!user) {
        return res.status(400).json({
          error: 'Token inválido ou expirado.'
        });
      }
      
      // Atualizar senha
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      
      // Log de redefinição
      await securityService.logSecurityEvent({
        userId: user.id,
        action: 'PASSWORD_RESET',
        description: 'Senha redefinida com sucesso',
        ipAddress: req.ip
      });
      
      res.json({
        message: 'Senha redefinida com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro na redefinição de senha:', error);
      
      await securityService.logSecurityEvent({
        userId: 'unknown',
        action: 'PASSWORD_RESET_FAILED',
        description: 'Falha na redefinição de senha',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao redefinir senha.'
      });
    }
  }
  
  // Verificar e-mail
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      const user = await User.findOne({
        where: { verificationToken: token }
      });
      
      if (!user) {
        return res.status(400).json({
          error: 'Token de verificação inválido.'
        });
      }
      
      user.emailVerified = true;
      user.verificationToken = null;
      await user.save();
      
      // Log de verificação
      await securityService.logSecurityEvent({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        description: 'E-mail verificado com sucesso',
        ipAddress: req.ip
      });
      
      res.json({
        message: 'E-mail verificado com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro na verificação de e-mail:', error);
      res.status(500).json({
        error: 'Erro ao verificar e-mail.'
      });
    }
  }
  
  // Perfil do usuário
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      res.json({
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        error: 'Erro ao buscar perfil.'
      });
    }
  }
  
  // Atualizar perfil
  async updateProfile(req, res) {
    try {
      const { name, phone, avatar } = req.body;
      const userId = req.user.userId;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Atualizar campos permitidos
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (avatar) user.avatar = avatar;
      
      await user.save();
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId,
        action: 'PROFILE_UPDATED',
        description: 'Perfil atualizado',
        ipAddress: req.ip,
        details: { updatedFields: Object.keys(req.body) }
      });
      
      res.json({
        message: 'Perfil atualizado com sucesso!',
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: 'Erro ao atualizar perfil.'
      });
    }
  }
  
  // Alterar senha
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Verificar senha atual
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        await securityService.logSecurityEvent({
          userId,
          action: 'PASSWORD_CHANGE_FAILED',
          description: 'Tentativa de alteração de senha com senha atual incorreta',
          ipAddress: req.ip
        });
        
        return res.status(400).json({
          error: 'Senha atual incorreta.'
        });
      }
      
      // Atualizar senha
      user.password = newPassword;
      await user.save();
      
      // Log de alteração
      await securityService.logSecurityEvent({
        userId,
        action: 'PASSWORD_CHANGED',
        description: 'Senha alterada com sucesso',
        ipAddress: req.ip
      });
      
      res.json({
        message: 'Senha alterada com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao alterar senha:', error);
      res.status(500).json({
        error: 'Erro ao alterar senha.'
      });
    }
  }
  
  // Verificar token (usado pelo frontend)
  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          valid: false,
          error: 'Token não fornecido.'
        });
      }
      
      jwt.verify(token, jwtSecret);
      
      res.json({
        valid: true,
        message: 'Token válido.'
      });
      
    } catch (error) {
      res.status(401).json({
        valid: false,
        error: 'Token inválido ou expirado.'
      });
    }
  }
}

module.exports = new AuthController();
