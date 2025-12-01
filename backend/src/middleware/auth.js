const jwt = require('jsonwebtoken');
const { jwtSecret, roles } = require('../config/auth');
const securityService = require('../services/securityService');
const logger = require('../utils/logger');

// Middleware para verificar token JWT
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    securityService.logSecurityEvent({
      userId: 'anonymous',
      action: 'UNAUTHORIZED_ACCESS',
      description: 'Tentativa de acesso sem token',
      ipAddress: req.ip
    });
    
    return res.status(401).json({
      error: 'Acesso não autorizado. Token não fornecido.'
    });
  }
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    
    // Log de acesso autorizado
    securityService.logSecurityEvent({
      userId: decoded.userId,
      action: 'USER_AUTHENTICATED',
      description: 'Usuário autenticado via JWT',
      ipAddress: req.ip
    });
    
    next();
  } catch (error) {
    logger.error('Erro de autenticação JWT:', error);
    
    securityService.logSecurityEvent({
      userId: 'unknown',
      action: 'INVALID_TOKEN',
      description: 'Token JWT inválido ou expirado',
      ipAddress: req.ip,
      details: error.message
    });
    
    return res.status(401).json({
      error: 'Token inválido ou expirado.'
    });
  }
}

// Middleware para verificar permissões baseadas em role
function authorize(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Hierarquia de roles
    const roleHierarchy = {
      [roles.ADMIN]: 4,
      [roles.MANAGER]: 3,
      [roles.CASHIER]: 2,
      [roles.USER]: 1
    };
    
    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    if (userRoleLevel < requiredRoleLevel) {
      securityService.logSecurityEvent({
        userId: req.user.userId,
        action: 'UNAUTHORIZED_ROLE',
        description: `Tentativa de acesso a recurso que requer role: ${requiredRole}`,
        ipAddress: req.ip,
        userRole: req.user.role,
        requiredRole: requiredRole
      });
      
      return res.status(403).json({
        error: 'Permissão insuficiente para acessar este recurso.'
      });
    }
    
    next();
  };
}

// Middleware para verificar múltiplas roles
function authorizeAny(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      securityService.logSecurityEvent({
        userId: req.user.userId,
        action: 'UNAUTHORIZED_ROLE',
        description: `Tentativa de acesso a recurso restrito. Role: ${req.user.role}`,
        ipAddress: req.ip,
        allowedRoles: allowedRoles
      });
      
      return res.status(403).json({
        error: 'Permissão insuficiente para acessar este recurso.'
      });
    }
    
    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  authorizeAny
};
