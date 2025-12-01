const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Criar diretório de logs se não existir
const logDir = process.env.LOG_FILE_PATH || './logs';
(async () => {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretório de logs:', error);
  }
})();

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Transportes
const transports = [
  // Console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    ),
    level: process.env.LOG_LEVEL || 'info'
  })
];

// Adicionar transporte para arquivo se configurado
if (process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  exitOnError: false
});

// Stream para Morgan (HTTP logging)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Métodos auxiliares
logger.api = (message, meta = {}) => {
  logger.info(`[API] ${message}`, meta);
};

logger.database = (message, meta = {}) => {
  logger.info(`[DATABASE] ${message}`, meta);
};

logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, meta);
};

logger.business = (message, meta = {}) => {
  logger.info(`[BUSINESS] ${message}`, meta);
};

// Middleware para logging de requisições HTTP
logger.httpMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId || 'anonymous'
    };
    
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.debug('HTTP Request', logData);
    }
  });
  
  next();
};

module.exports = logger;
