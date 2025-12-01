const logger = require('../utils/logger');
const securityService = require('../services/securityService');

// Classe de erro personalizada
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handler de erros global
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log do erro
  logger.error(`${err.statusCode} - ${err.message}`, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId || 'anonymous'
  });
  
  // Log de segurança para erros operacionais
  if (err.isOperational !== false && err.statusCode >= 400) {
    securityService.logSecurityEvent({
      userId: req.user?.userId || 'anonymous',
      action: 'API_ERROR',
      description: `Erro na API: ${err.message}`,
      ipAddress: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode,
      details: {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      severity: err.statusCode >= 500 ? 'high' : 'medium'
    });
  }
  
  // Resposta em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  
  // Resposta em produção
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  
  // Erros não operacionais (programming/unknown errors)
  logger.error('💥 ERRO CRÍTICO:', err);
  
  return res.status(500).json({
    status: 'error',
    message: 'Algo deu errado. Por favor, tente novamente mais tarde.'
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Rota não encontrada: ${req.originalUrl}`, 404);
  next(err);
};

// Async handler wrapper (evita try-catch em controllers)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validação de erro do Sequelize
const handleSequelizeError = (err) => {
  // Erros de validação
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    return new AppError('Erro de validação', 400, {
      details: messages
    });
  }
  
  // Erros de chave única violada
  if (err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map(error => ({
      field: error.path,
      message: 'Já existe um registro com este valor',
      value: error.value
    }));
    
    return new AppError('Valor duplicado', 400, {
      details: messages
    });
  }
  
  // Erro de chave estrangeira
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Referência inválida', 400);
  }
  
  // Erro de conexão com banco
  if (err.name === 'SequelizeConnectionError') {
    return new AppError('Erro de conexão com o banco de dados', 503);
  }
  
  // Outros erros do Sequelize
  return new AppError('Erro no banco de dados', 500);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleSequelizeError
};
