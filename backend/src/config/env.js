/**
 * Configuração centralizada de variáveis de ambiente
 * Valida e fornece valores padrão para todas as variáveis do sistema
 */

const Joi = require('joi');

// Schema de validação para variáveis de ambiente
const envSchema = Joi.object({
  // Configuração da aplicação
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .default(3000),
  
  APP_URL: Joi.string()
    .uri()
    .default('http://localhost:3000'),
  
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:8080'),
  
  API_VERSION: Joi.string()
    .default('v1'),
  
  // Banco de dados PostgreSQL
  DB_HOST: Joi.string()
    .default('localhost'),
  
  DB_PORT: Joi.number()
    .default(5432),
  
  DB_NAME: Joi.string()
    .default('bizflow'),
  
  DB_USER: Joi.string()
    .default('postgres'),
  
  DB_PASSWORD: Joi.string()
    .default('postgres'),
  
  DB_SSL: Joi.boolean()
    .default(false),
  
  // Autenticação JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key'),
  
  JWT_EXPIRATION: Joi.string()
    .default('24h'),
  
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT refresh secret key'),
  
  JWT_REFRESH_EXPIRATION: Joi.string()
    .default('7d'),
  
  // Email (SMTP)
  SMTP_HOST: Joi.string()
    .default('smtp.gmail.com'),
  
  SMTP_PORT: Joi.number()
    .default(587),
  
  SMTP_SECURE: Joi.boolean()
    .default(false),
  
  SMTP_USER: Joi.string()
    .email(),
  
  SMTP_PASSWORD: Joi.string(),
  
  EMAIL_FROM: Joi.string()
    .email()
    .default('noreply@bizflow.com'),
  
  EMAIL_NAME: Joi.string()
    .default('BizFlow System'),
  
  // Armazenamento de arquivos
  UPLOAD_PATH: Joi.string()
    .default('./uploads'),
  
  MAX_FILE_SIZE: Joi.number()
    .default(10485760), // 10MB
  
  // Segurança
  RATE_LIMIT_WINDOW: Joi.number()
    .default(15),
  
  RATE_LIMIT_MAX: Joi.number()
    .default(100),
  
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:8080'),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  LOG_TO_FILE: Joi.boolean()
    .default(true),
  
  LOG_FILE_PATH: Joi.string()
    .default('./logs'),
  
  // Assinatura Digital
  SIGNATURE_PRIVATE_KEY: Joi.string(),
  
  SIGNATURE_PUBLIC_KEY: Joi.string(),
  
  // Chaves API (opcionais)
  GOOGLE_MAPS_API_KEY: Joi.string()
    .optional(),
  
  // Redis (cache)
  REDIS_URL: Joi.string()
    .optional(),
  
  REDIS_TTL: Joi.number()
    .default(3600), // 1 hora
  
  // Sentry (monitoramento)
  SENTRY_DSN: Joi.string()
    .optional(),
  
  // Pagamento
  STRIPE_SECRET_KEY: Joi.string()
    .optional(),
  
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .optional(),
}).unknown(); // Permite variáveis não definidas no schema

// Validar variáveis de ambiente
const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true
});

if (error) {
  console.error('❌ Erro na configuração de ambiente:');
  error.details.forEach(detail => {
    console.error(`  - ${detail.message}`);
  });
  process.exit(1);
}

// Configurações por ambiente
const config = {
  // Ambiente
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  appUrl: envVars.APP_URL,
  frontendUrl: envVars.FRONTEND_URL,
  apiVersion: envVars.API_VERSION,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  
  // Banco de dados
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    ssl: envVars.DB_SSL,
    connectionString: `postgresql://${envVars.DB_USER}:${envVars.DB_PASSWORD}@${envVars.DB_HOST}:${envVars.DB_PORT}/${envVars.DB_NAME}`,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // Autenticação
  auth: {
    jwtSecret: envVars.JWT_SECRET,
    jwtExpiration: envVars.JWT_EXPIRATION,
    jwtRefreshSecret: envVars.JWT_REFRESH_SECRET,
    jwtRefreshExpiration: envVars.JWT_REFRESH_EXPIRATION,
    bcryptRounds: 10,
    tokenVersion: 1
  },
  
  // Email
  email: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    secure: envVars.SMTP_SECURE,
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASSWORD
    },
    from: `${envVars.EMAIL_NAME} <${envVars.EMAIL_FROM}>`
  },
  
  // Upload de arquivos
  upload: {
    path: envVars.UPLOAD_PATH,
    maxSize: envVars.MAX_FILE_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFiles: 5
  },
  
  // Segurança
  security: {
    rateLimitWindow: envVars.RATE_LIMIT_WINDOW * 60 * 1000, // minutos para milissegundos
    rateLimitMax: envVars.RATE_LIMIT_MAX,
    corsOrigin: envVars.CORS_ORIGIN,
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:"]
        }
      }
    }
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    toFile: envVars.LOG_TO_FILE,
    filePath: envVars.LOG_FILE_PATH,
    maxSize: '10m',
    maxFiles: '30d'
  },
  
  // Assinatura digital
  signature: {
    privateKey: envVars.SIGNATURE_PRIVATE_KEY,
    publicKey: envVars.SIGNATURE_PUBLIC_KEY
  },
  
  // Cache
  cache: {
    redisUrl: envVars.REDIS_URL,
    ttl: envVars.REDIS_TTL,
    enabled: !!envVars.REDIS_URL
  },
  
  // Monitoramento
  monitoring: {
    sentryDsn: envVars.SENTRY_DSN,
    enabled: !!envVars.SENTRY_DSN
  },
  
  // Pagamentos
  payments: {
    stripe: {
      secretKey: envVars.STRIPE_SECRET_KEY,
      webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
      enabled: !!envVars.STRIPE_SECRET_KEY
    }
  },
  
  // APIs externas
  apis: {
    googleMaps: envVars.GOOGLE_MAPS_API_KEY
  }
};

// Validações específicas por ambiente
if (config.isProduction) {
  // Em produção, garantir que segredos estão definidos
  const requiredInProduction = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'SMTP_USER',
    'SMTP_PASSWORD'
  ];
  
  const missing = requiredInProduction.filter(key => !envVars[key]);
  if (missing.length > 0) {
    console.error(`❌ Variáveis de ambiente obrigatórias em produção não definidas: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Em produção, SSL do banco deve ser true
  if (!config.database.ssl) {
    console.warn('⚠️  DB_SSL está como false em ambiente de produção');
  }
}

// Helper para verificar se está em desenvolvimento
config.isDev = () => config.env === 'development';
config.isProd = () => config.env === 'production';
config.isTestEnv = () => config.env === 'test';

// Helper para obter URL completa
config.getFullUrl = (path = '') => {
  return `${config.appUrl}/${path.replace(/^\//, '')}`;
};

// Helper para obter URL do frontend
config.getFrontendUrl = (path = '') => {
  return `${config.frontendUrl}/${path.replace(/^\//, '')}`;
};

// Exportar configuração
module.exports = config;
