const securityService = require('../services/securityService');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting específico para endpoints sensíveis
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 requisições por IP
  message: 'Muitas requisições para este endpoint. Tente novamente mais tarde.',
  keyGenerator: (req) => {
    // Usar IP + user ID se disponível
    return req.user ? `${req.ip}-${req.user.userId}` : req.ip;
  },
  skipSuccessfulRequests: false
});

// Middleware para detectar atividade suspeita
const suspiciousActivityDetection = async (req, res, next) => {
  try {
    // Verificar apenas para usuários autenticados
    if (req.user && req.user.userId) {
      const { isSuspicious, criticalEvents, failedLoginsFromIP } = 
        await securityService.checkSuspiciousActivity(req.user.userId, req.ip);
      
      if (isSuspicious) {
        // Log de atividade suspeita detectada
        await securityService.logSecurityEvent({
          userId: req.user.userId,
          action: 'SUSPICIOUS_ACTIVITY_BLOCKED',
          description: 'Requisição bloqueada devido a atividade suspeita',
          ipAddress: req.ip,
          endpoint: req.originalUrl,
          method: req.method,
          details: {
            criticalEvents,
            failedLoginsFromIP
          },
          severity: 'critical'
        });
        
        return res.status(429).json({
          error: 'Atividade suspeita detectada. Por favor, tente novamente mais tarde.'
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Erro na detecção de atividade suspeita:', error);
    next(); // Continuar mesmo com erro
  }
};

// Middleware para validar origem da requisição
const validateOrigin = (req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:8080'
  ].filter(Boolean);
  
  const origin = req.headers.origin || req.headers.referer;
  
  if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    // Log de tentativa de acesso de origem não autorizada
    securityService.logSecurityEvent({
      userId: req.user?.userId || 'unknown',
      action: 'UNAUTHORIZED_ORIGIN',
      description: 'Tentativa de acesso de origem não autorizada',
      ipAddress: req.ip,
      endpoint: req.originalUrl,
      origin,
      severity: 'high'
    });
    
    return res.status(403).json({
      error: 'Origem não autorizada.'
    });
  }
  
  next();
};

// Middleware para prevenir ataques de força bruta
const bruteForceProtection = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Limite de 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 1 hora.',
  keyGenerator: (req) => {
    // Usar IP + e-mail para login
    if (req.body.email) {
      return `${req.ip}-${req.body.email}`;
    }
    return req.ip;
  },
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  skip: (req) => {
    // Não aplicar para rotas que não são login
    return !req.originalUrl.includes('/auth/login') && 
           !req.originalUrl.includes('/auth/forgot-password');
  }
});

// Middleware para validar tamanho do corpo da requisição
const validateBodySize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    // Converter maxSize para bytes
    const sizeMap = {
      '1kb': 1024,
      '10kb': 10240,
      '100kb': 102400,
      '1mb': 1048576,
      '10mb': 10485760,
      '100mb': 104857600
    };
    
    const maxBytes = sizeMap[maxSize.toLowerCase()] || 10485760; // Padrão 10MB
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: `Tamanho do corpo da requisição excede o limite de ${maxSize}`
      });
    }
    
    next();
  };
};

// Middleware para log de requisições sensíveis
const logSensitiveRequests = (req, res, next) => {
  // Endpoints sensíveis para log detalhado
  const sensitiveEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/change-password',
    '/api/auth/reset-password',
    '/api/users',
    '/api/sales/pos/checkout',
    '/api/finance',
    '/api/documents/sign'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint)
  );
  
  if (isSensitive && req.user) {
    // Log assíncrono - não bloquear a resposta
    securityService.logSecurityEvent({
      userId: req.user.userId,
      action: 'SENSITIVE_REQUEST',
      description: `Requisição sensível: ${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      details: {
        // Não logar senhas ou tokens
        body: { ...req.body, password: undefined, token: undefined }
      }
    }).catch(err => {
      logger.error('Erro ao logar requisição sensível:', err);
    });
  }
  
  next();
};

module.exports = {
  sensitiveEndpointsLimiter,
  suspiciousActivityDetection,
  validateOrigin,
  bruteForceProtection,
  validateBodySize,
  logSensitiveRequests
};
