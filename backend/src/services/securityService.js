const SecurityLog = require('../models/SecurityLog');
const logger = require('../utils/logger');

class SecurityService {
  // Registrar evento de segurança
  async logSecurityEvent(eventData) {
    try {
      const log = await SecurityLog.create({
        userId: eventData.userId || null,
        action: eventData.action,
        description: eventData.description,
        ipAddress: eventData.ipAddress || null,
        userAgent: eventData.userAgent || null,
        endpoint: eventData.endpoint || null,
        method: eventData.method || null,
        statusCode: eventData.statusCode || null,
        details: eventData.details || {},
        severity: eventData.severity || 'medium'
      });
      
      // Também logar no console para ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        logger.info(`[SECURITY] ${eventData.action}: ${eventData.description}`);
      }
      
      return log;
    } catch (error) {
      logger.error('Erro ao registrar evento de segurança:', error);
      // Fallback para log no console
      console.error(`[SECURITY ERROR] Falha ao registrar: ${eventData.action}`, error);
    }
  }
  
  // Registrar tentativa de acesso não autorizado
  async logUnauthorizedAccess(req, reason) {
    return this.logSecurityEvent({
      userId: req.user?.userId || 'anonymous',
      action: 'UNAUTHORIZED_ACCESS',
      description: `Tentativa de acesso não autorizado: ${reason}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      severity: 'high'
    });
  }
  
  // Registrar login falho
  async logFailedLogin(email, ip, reason) {
    return this.logSecurityEvent({
      userId: 'unknown',
      action: 'FAILED_LOGIN',
      description: `Tentativa de login falha: ${reason}`,
      ipAddress: ip,
      details: { email, reason },
      severity: 'medium'
    });
  }
  
  // Registrar alteração crítica
  async logCriticalChange(userId, action, description, details = {}) {
    return this.logSecurityEvent({
      userId,
      action,
      description,
      details,
      severity: 'high'
    });
  }
  
  // Buscar logs
  async getLogs(filters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        severity,
        startDate,
        endDate,
        resolved
      } = filters;
      
      const offset = (page - 1) * limit;
      const where = {};
      
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (severity) where.severity = severity;
      if (resolved !== undefined) where.resolved = resolved;
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      const { count, rows: logs } = await SecurityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [{
          association: 'user',
          attributes: ['id', 'name', 'email']
        }]
      });
      
      return {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar logs de segurança:', error);
      throw error;
    }
  }
  
  // Obter estatísticas de segurança
  async getSecurityStats() {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Contar eventos por severidade
      const severityCounts = await SecurityLog.findAll({
        attributes: [
          'severity',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: { [Op.gte]: last7Days }
        },
        group: ['severity']
      });
      
      // Contar eventos por ação
      const actionCounts = await SecurityLog.findAll({
        attributes: [
          'action',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: { [Op.gte]: last7Days }
        },
        group: ['action'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      // Contar tentativas de login falhas nas últimas 24h
      const failedLogins = await SecurityLog.count({
        where: {
          action: 'FAILED_LOGIN',
          createdAt: { [Op.gte]: last24h }
        }
      });
      
      // Contar acessos não autorizados
      const unauthorizedAccess = await SecurityLog.count({
        where: {
          action: 'UNAUTHORIZED_ACCESS',
          createdAt: { [Op.gte]: last7Days }
        }
      });
      
      return {
        severityCounts,
        actionCounts,
        failedLogins24h: failedLogins,
        unauthorizedAccess7d: unauthorizedAccess,
        totalEvents7d: severityCounts.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0)
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de segurança:', error);
      throw error;
    }
  }
  
  // Marcar log como resolvido
  async resolveLog(logId, userId) {
    try {
      const log = await SecurityLog.findByPk(logId);
      if (!log) {
        throw new Error('Log não encontrado');
      }
      
      await log.markAsResolved(userId);
      
      // Log da resolução
      await this.logSecurityEvent({
        userId,
        action: 'SECURITY_LOG_RESOLVED',
        description: `Log de segurança resolvido: ${log.action}`,
        details: { logId }
      });
      
      return log;
    } catch (error) {
      logger.error('Erro ao resolver log de segurança:', error);
      throw error;
    }
  }
  
  // Verificar atividade suspeita
  async checkSuspiciousActivity(userId, ipAddress) {
    try {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      
      // Contar eventos críticos do usuário na última hora
      const criticalEvents = await SecurityLog.count({
        where: {
          userId,
          severity: 'critical',
          createdAt: { [Op.gte]: lastHour }
        }
      });
      
      // Contar tentativas de login falhas do IP na última hora
      const failedLoginsFromIP = await SecurityLog.count({
        where: {
          ipAddress,
          action: 'FAILED_LOGIN',
          createdAt: { [Op.gte]: lastHour }
        }
      });
      
      const isSuspicious = criticalEvents > 5 || failedLoginsFromIP > 10;
      
      if (isSuspicious) {
        await this.logSecurityEvent({
          userId,
          action: 'SUSPICIOUS_ACTIVITY_DETECTED',
          description: 'Atividade suspeita detectada',
          ipAddress,
          details: {
            criticalEvents,
            failedLoginsFromIP
          },
          severity: 'critical'
        });
      }
      
      return {
        isSuspicious,
        criticalEvents,
        failedLoginsFromIP
      };
    } catch (error) {
      logger.error('Erro ao verificar atividade suspeita:', error);
      return { isSuspicious: false };
    }
  }
  
  // Limpar logs antigos (manutenção)
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const deletedCount = await SecurityLog.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate },
          severity: { [Op.ne]: 'critical' } // Manter logs críticos por mais tempo
        }
      });
      
      logger.info(`Limpeza de logs: ${deletedCount} registros antigos removidos`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Erro na limpeza de logs:', error);
      throw error;
    }
  }
}

module.exports = new SecurityService();
