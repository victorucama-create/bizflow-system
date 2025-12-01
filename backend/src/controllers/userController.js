const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const securityService = require('../services/securityService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { roles } = require('../config/auth');

class UserController {
  // Listar usuários (apenas admin)
  async listUsers(req, res) {
    try {
      const currentUserId = req.user.userId;
      const { 
        page = 1, 
        limit = 20, 
        role, 
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = {};
      
      // Apenas admin pode listar todos os usuários
      const currentUser = await User.findByPk(currentUserId);
      if (currentUser.role !== 'admin') {
        // Não-admin só vê usuários da mesma empresa
        where.companyName = currentUser.companyName;
      }
      
      // Filtros
      if (role) where.role = role;
      if (status === 'active') where.isActive = true;
      if (status === 'inactive') where.isActive = false;
      
      // Busca
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { companyName: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Ordenação
      const order = [[sortBy, sortOrder.toUpperCase()]];
      
      // Buscar usuários
      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        attributes: { 
          exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'verificationToken'] 
        }
      });
      
      // Log de listagem
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USERS_LISTED',
        description: 'Lista de usuários consultada',
        ipAddress: req.ip,
        details: {
          filters: req.query,
          count
        }
      });
      
      res.json({
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USERS_LIST_ERROR',
        description: 'Erro ao listar usuários',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao listar usuários.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Buscar usuário por ID
  async getUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      
      // Verificar permissões
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Verificar se usuário tem permissão para ver este perfil
      const canView = currentUser.role === 'admin' || 
                     currentUser.id === id || 
                     currentUser.companyName === targetUser.companyName;
      
      if (!canView) {
        await securityService.logSecurityEvent({
          userId: currentUserId,
          action: 'UNAUTHORIZED_USER_VIEW',
          description: 'Tentativa de visualizar usuário não autorizado',
          ipAddress: req.ip,
          details: {
            targetUserId: id,
            userRole: currentUser.role
          },
          severity: 'medium'
        });
        
        return res.status(403).json({
          error: 'Permissão insuficiente para visualizar este usuário.'
        });
      }
      
      // Log de consulta
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_VIEWED',
        description: `Usuário visualizado: ${targetUser.email}`,
        ipAddress: req.ip,
        details: { targetUserId: id }
      });
      
      res.json({
        user: targetUser.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao buscar usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_VIEW_ERROR',
        description: 'Erro ao visualizar usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao buscar usuário.'
      });
    }
  }
  
  // Criar usuário (apenas admin/manager)
  async createUser(req, res) {
    try {
      const currentUserId = req.user.userId;
      const userData = req.body;
      
      // Verificar permissões
      const currentUser = await User.findByPk(currentUserId);
      const isAdmin = currentUser.role === 'admin';
      const isManager = currentUser.role === 'manager';
      
      // Apenas admin pode criar admin
      if (userData.role === 'admin' && !isAdmin) {
        return res.status(403).json({
          error: 'Apenas administradores podem criar outros administradores.'
        });
      }
      
      // Manager só pode criar usuários com role menor
      if (isManager && userData.role && userData.role !== 'user') {
        return res.status(403).json({
          error: 'Gerentes só podem criar usuários comuns.'
        });
      }
      
      // Verificar se e-mail já existe
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        return res.status(400).json({
          error: 'Este e-mail já está registrado.'
        });
      }
      
      // Definir empresa do novo usuário
      if (!userData.companyName && !isAdmin) {
        userData.companyName = currentUser.companyName;
      }
      
      // Criar usuário
      const user = await User.create(userData);
      
      // Gerar token de verificação
      const crypto = require('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      await user.save();
      
      // Enviar e-mail de verificação
      await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_CREATED',
        description: `Usuário criado por ${currentUser.role}: ${user.email}`,
        ipAddress: req.ip,
        details: {
          newUserId: user.id,
          newUserRole: user.role,
          newUserCompany: user.companyName
        },
        severity: 'high'
      });
      
      res.status(201).json({
        message: 'Usuário criado com sucesso!',
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_CREATION_ERROR',
        description: 'Erro ao criar usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar usuário.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Atualizar usuário
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      const updateData = req.body;
      
      // Buscar usuários
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Verificar permissões
      const canUpdate = currentUser.role === 'admin' || 
                       (currentUser.role === 'manager' && targetUser.companyName === currentUser.companyName) ||
                       currentUser.id === id;
      
      if (!canUpdate) {
        await securityService.logSecurityEvent({
          userId: currentUserId,
          action: 'UNAUTHORIZED_USER_UPDATE',
          description: 'Tentativa de atualizar usuário não autorizado',
          ipAddress: req.ip,
          details: {
            targetUserId: id,
            userRole: currentUser.role,
            targetUserRole: targetUser.role
          },
          severity: 'medium'
        });
        
        return res.status(403).json({
          error: 'Permissão insuficiente para atualizar este usuário.'
        });
      }
      
      // Verificações específicas por role
      if (updateData.role) {
        // Apenas admin pode alterar roles
        if (currentUser.role !== 'admin') {
          return res.status(403).json({
            error: 'Apenas administradores podem alterar cargos.'
          });
        }
        
        // Não permitir remover último admin
        if (targetUser.role === 'admin' && updateData.role !== 'admin') {
          const adminCount = await User.count({
            where: { role: 'admin', companyName: targetUser.companyName }
          });
          
          if (adminCount <= 1) {
            return res.status(400).json({
              error: 'Não é possível remover o último administrador da empresa.'
            });
          }
        }
      }
      
      // Verificar se novo e-mail já existe
      if (updateData.email && updateData.email !== targetUser.email) {
        const existingUser = await User.findOne({
          where: { email: updateData.email }
        });
        
        if (existingUser) {
          return res.status(400).json({
            error: 'Este e-mail já está registrado.'
          });
        }
      }
      
      // Salvar dados antigos para log
      const oldData = {
        role: targetUser.role,
        isActive: targetUser.isActive,
        email: targetUser.email
      };
      
      // Atualizar usuário
      await targetUser.update(updateData);
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_UPDATED',
        description: `Usuário atualizado: ${targetUser.email}`,
        ipAddress: req.ip,
        details: {
          targetUserId: id,
          updatedFields: Object.keys(updateData),
          oldData,
          newData: {
            role: targetUser.role,
            isActive: targetUser.isActive,
            email: targetUser.email
          }
        },
        severity: 'high'
      });
      
      res.json({
        message: 'Usuário atualizado com sucesso!',
        user: targetUser.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_UPDATE_ERROR',
        description: 'Erro ao atualizar usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao atualizar usuário.'
      });
    }
  }
  
  // Excluir usuário
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      
      // Verificar se não está tentando excluir a si mesmo
      if (currentUserId === id) {
        return res.status(400).json({
          error: 'Não é possível excluir sua própria conta.'
        });
      }
      
      // Buscar usuários
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Apenas admin pode excluir usuários
      if (currentUser.role !== 'admin') {
        await securityService.logSecurityEvent({
          userId: currentUserId,
          action: 'UNAUTHORIZED_USER_DELETION',
          description: 'Tentativa de excluir usuário não autorizada',
          ipAddress: req.ip,
          details: {
            targetUserId: id,
            userRole: currentUser.role,
            targetUserRole: targetUser.role
          },
          severity: 'high'
        });
        
        return res.status(403).json({
          error: 'Apenas administradores podem excluir usuários.'
        });
      }
      
      // Não permitir excluir último admin da empresa
      if (targetUser.role === 'admin') {
        const adminCount = await User.count({
          where: { role: 'admin', companyName: targetUser.companyName }
        });
        
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Não é possível excluir o último administrador da empresa.'
          });
        }
      }
      
      // Excluir usuário
      await targetUser.destroy();
      
      // Log de exclusão
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_DELETED',
        description: `Usuário excluído: ${targetUser.email}`,
        ipAddress: req.ip,
        details: {
          targetUserId: id,
          targetUserEmail: targetUser.email,
          targetUserRole: targetUser.role,
          targetUserCompany: targetUser.companyName
        },
        severity: 'critical'
      });
      
      res.json({
        message: 'Usuário excluído com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao excluir usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_DELETION_ERROR',
        description: 'Erro ao excluir usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao excluir usuário.'
      });
    }
  }
  
  // Ativar/desativar usuário
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'activate' ou 'deactivate'
      const currentUserId = req.user.userId;
      
      // Buscar usuários
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Verificar permissões
      const canToggle = currentUser.role === 'admin' || 
                       (currentUser.role === 'manager' && targetUser.companyName === currentUser.companyName);
      
      if (!canToggle) {
        await securityService.logSecurityEvent({
          userId: currentUserId,
          action: 'UNAUTHORIZED_USER_STATUS_CHANGE',
          description: 'Tentativa de alterar status de usuário não autorizada',
          ipAddress: req.ip,
          details: {
            targetUserId: id,
            userRole: currentUser.role,
            targetUserRole: targetUser.role
          },
          severity: 'medium'
        });
        
        return res.status(403).json({
          error: 'Permissão insuficiente para alterar status deste usuário.'
        });
      }
      
      // Não permitir desativar a si mesmo
      if (currentUserId === id && action === 'deactivate') {
        return res.status(400).json({
          error: 'Não é possível desativar sua própria conta.'
        });
      }
      
      // Não permitir desativar último admin
      if (action === 'deactivate' && targetUser.role === 'admin') {
        const adminCount = await User.count({
          where: { 
            role: 'admin', 
            companyName: targetUser.companyName,
            isActive: true 
          }
        });
        
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Não é possível desativar o último administrador ativo da empresa.'
          });
        }
      }
      
      // Atualizar status
      const newStatus = action === 'activate';
      const oldStatus = targetUser.isActive;
      
      targetUser.isActive = newStatus;
      await targetUser.save();
      
      // Log de alteração de status
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: `USER_${action.toUpperCase()}`,
        description: `Usuário ${action === 'activate' ? 'ativado' : 'desativado'}: ${targetUser.email}`,
        ipAddress: req.ip,
        details: {
          targetUserId: id,
          oldStatus,
          newStatus,
          targetUserRole: targetUser.role
        },
        severity: 'high'
      });
      
      res.json({
        message: `Usuário ${action === 'activate' ? 'ativado' : 'desativado'} com sucesso!`,
        user: targetUser.toJSON()
      });
      
    } catch (error) {
      logger.error('Erro ao alterar status do usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_STATUS_CHANGE_ERROR',
        description: 'Erro ao alterar status do usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao alterar status do usuário.'
      });
    }
  }
  
  // Alterar senha de usuário (admin)
  async changeUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const currentUserId = req.user.userId;
      
      // Buscar usuários
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Apenas admin pode alterar senha de outros usuários
      if (currentUser.role !== 'admin') {
        await securityService.logSecurityEvent({
          userId: currentUserId,
          action: 'UNAUTHORIZED_PASSWORD_CHANGE',
          description: 'Tentativa de alterar senha de usuário não autorizada',
          ipAddress: req.ip,
          details: {
            targetUserId: id,
            userRole: currentUser.role
          },
          severity: 'high'
        });
        
        return res.status(403).json({
          error: 'Apenas administradores podem alterar senhas de outros usuários.'
        });
      }
      
      // Alterar senha
      targetUser.password = newPassword;
      await targetUser.save();
      
      // Log de alteração de senha
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_PASSWORD_CHANGED_BY_ADMIN',
        description: `Senha alterada para usuário: ${targetUser.email}`,
        ipAddress: req.ip,
        details: {
          targetUserId: id,
          targetUserEmail: targetUser.email,
          changedBy: currentUser.email
        },
        severity: 'critical'
      });
      
      // Enviar e-mail de notificação
      await emailService.sendEmail({
        to: targetUser.email,
        subject: 'Sua senha foi alterada - BizFlow',
        html: `
          <h1>Alteração de Senha</h1>
          <p>Olá ${targetUser.name},</p>
          <p>Sua senha foi alterada por um administrador do sistema.</p>
          <p>Se você não solicitou esta alteração, entre em contato imediatamente com o suporte.</p>
          <p>© ${new Date().getFullYear()} BizFlow - Todos os direitos reservados</p>
        `
      });
      
      res.json({
        message: 'Senha alterada com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao alterar senha do usuário:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USER_PASSWORD_CHANGE_ERROR',
        description: 'Erro ao alterar senha do usuário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao alterar senha do usuário.'
      });
    }
  }
  
  // Dashboard de usuários (admin)
  async getUsersDashboard(req, res) {
    try {
      const currentUserId = req.user.userId;
      const currentUser = await User.findByPk(currentUserId);
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({
          error: 'Apenas administradores podem acessar este dashboard.'
        });
      }
      
      // Estatísticas gerais
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { isActive: true } });
      const verifiedUsers = await User.count({ where: { emailVerified: true } });
      
      // Usuários por role
      const usersByRole = await User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['role']
      });
      
      // Usuários por empresa
      const usersByCompany = await User.findAll({
        attributes: [
          'companyName',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['companyName'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      // Novos usuários (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = await User.count({
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      });
      
      // Log de acesso ao dashboard
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USERS_DASHBOARD_ACCESSED',
        description: 'Dashboard de usuários acessado',
        ipAddress: req.ip
      });
      
      res.json({
        statistics: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          verifiedUsers,
          unverifiedUsers: totalUsers - verifiedUsers,
          newUsersLast30Days: newUsers
        },
        usersByRole,
        topCompanies: usersByCompany,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard de usuários:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
  
  // Buscar usuários por empresa
  async getUsersByCompany(req, res) {
    try {
      const currentUserId = req.user.userId;
      const { companyName } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;
      const currentUser = await User.findByPk(currentUserId);
      
      // Verificar permissões
      if (currentUser.role !== 'admin' && currentUser.companyName !== companyName) {
        return res.status(403).json({
          error: 'Permissão insuficiente para visualizar usuários desta empresa.'
        });
      }
      
      const where = { companyName };
      
      // Buscar usuários
      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['name', 'ASC']],
        attributes: { 
          exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'verificationToken'] 
        }
      });
      
      res.json({
        companyName,
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar usuários por empresa:', error);
      res.status(500).json({
        error: 'Erro ao buscar usuários.'
      });
    }
  }
  
  // Exportar usuários (admin)
  async exportUsers(req, res) {
    try {
      const currentUserId = req.user.userId;
      const currentUser = await User.findByPk(currentUserId);
      const { format = 'json' } = req.query;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({
          error: 'Apenas administradores podem exportar usuários.'
        });
      }
      
      const users = await User.findAll({
        attributes: [
          'name', 'email', 'role', 'companyName', 'phone',
          'isActive', 'emailVerified', 'lastLogin', 'createdAt'
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // Log de exportação
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USERS_EXPORTED',
        description: `Usuários exportados: ${users.length} registros`,
        ipAddress: req.ip,
        details: { format, count: users.length },
        severity: 'medium'
      });
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSV(users);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios.csv');
        return res.send(csv);
      }
      
      res.json({ users });
      
    } catch (error) {
      logger.error('Erro ao exportar usuários:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'USERS_EXPORT_ERROR',
        description: 'Erro ao exportar usuários',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao exportar usuários.'
      });
    }
  }
  
  // Gerar CSV
  generateCSV(users) {
    const headers = [
      'Nome', 'E-mail', 'Cargo', 'Empresa', 'Telefone',
      'Ativo', 'E-mail Verificado', 'Último Login', 'Data de Criação'
    ];
    
    const rows = users.map(u => [
      `"${u.name}"`,
      u.email,
      u.role,
      `"${u.companyName}"`,
      u.phone || '',
      u.isActive ? 'Sim' : 'Não',
      u.emailVerified ? 'Sim' : 'Não',
      u.lastLogin ? u.lastLogin.toISOString().split('T')[0] : '',
      u.createdAt.toISOString().split('T')[0]
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Reenviar e-mail de verificação
  async resendVerificationEmail(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      
      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(id);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado.'
        });
      }
      
      // Verificar permissões
      const canResend = currentUser.role === 'admin' || 
                       (currentUser.role === 'manager' && targetUser.companyName === currentUser.companyName) ||
                       currentUser.id === id;
      
      if (!canResend) {
        return res.status(403).json({
          error: 'Permissão insuficiente para reenviar e-mail de verificação.'
        });
      }
      
      // Verificar se já está verificado
      if (targetUser.emailVerified) {
        return res.status(400).json({
          error: 'Este e-mail já está verificado.'
        });
      }
      
      // Gerar novo token
      const crypto = require('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      targetUser.verificationToken = verificationToken;
      await targetUser.save();
      
      // Enviar e-mail
      await emailService.sendVerificationEmail(targetUser.email, targetUser.name, verificationToken);
      
      // Log de reenvio
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'VERIFICATION_EMAIL_RESENT',
        description: `E-mail de verificação reenviado para: ${targetUser.email}`,
        ipAddress: req.ip,
        details: { targetUserId: id }
      });
      
      res.json({
        message: 'E-mail de verificação reenviado com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao reenviar e-mail de verificação:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'VERIFICATION_EMAIL_RESEND_ERROR',
        description: 'Erro ao reenviar e-mail de verificação',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao reenviar e-mail de verificação.'
      });
    }
  }
  
  // Audit log de ações do usuário
  async getUserAuditLog(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      const { page = 1, limit = 50, startDate, endDate } = req.query;
      
      const offset = (page - 1) * limit;
      const currentUser = await User.findByPk(currentUserId);
      
      // Verificar permissões
      if (currentUser.role !== 'admin' && currentUser.id !== id) {
        return res.status(403).json({
          error: 'Permissão insuficiente para visualizar logs deste usuário.'
        });
      }
      
      const where = { userId: id };
      
      // Filtro por data
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Buscar logs
      const { count, rows: logs } = await SecurityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [{
          association: 'user',
          attributes: ['name', 'email']
        }]
      });
      
      // Log de consulta
      await securityService.logSecurityEvent({
        userId: currentUserId,
        action: 'USER_AUDIT_LOG_ACCESSED',
        description: `Logs de auditoria do usuário ${id} acessados`,
        ipAddress: req.ip,
        details: {
          targetUserId: id,
          logCount: count
        }
      });
      
      res.json({
        userId: id,
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar logs de auditoria:', error);
      res.status(500).json({
        error: 'Erro ao buscar logs de auditoria.'
      });
    }
  }
}

module.exports = new UserController();
