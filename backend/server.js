require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const { sequelize, testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const securityService = require('./src/services/securityService');
require('express-async-errors');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const productRoutes = require('./src/routes/product.routes');
const saleRoutes = require('./src/routes/sale.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');
const customerRoutes = require('./src/routes/customer.routes');
const financeRoutes = require('./src/routes/finance.routes');
const documentRoutes = require('./src/routes/document.routes');
const subscriptionRoutes = require('./src/routes/subscription.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ====================
// CONFIGURAÇÃO DE SEGURANÇA
// ====================

// Helmet para headers de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            frameSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requisições sem origem (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Authorization', 'X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
};

app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Muitas requisições deste IP. Tente novamente após 15 minutos.'
    },
    skip: (req) => {
        // Pular rate limit para health check e documentação
        return req.path === '/health' || req.path.startsWith('/api-docs');
    }
});

app.use('/api/', apiLimiter);

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Apenas 5 tentativas de login
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente após 15 minutos.'
    }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ====================
// MIDDLEWARES GERAIS
// ====================

// Body parsing middleware
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Compression
app.use(compression({
    level: 6,
    threshold: 100 * 1024 // Comprimir apenas acima de 100KB
}));

// Logging HTTP
if (process.env.NODE_ENV !== 'test') {
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use(morgan(morganFormat, {
        stream: {
            write: (message) => logger.http(message.trim())
        },
        skip: (req) => req.path === '/health' // Não logar health checks
    }));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
        // Headers de segurança para arquivos estáticos
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache de 1 dia
    }
}));

// ====================
// SWAGGER / DOCUMENTAÇÃO
// ====================

if (process.env.NODE_ENV !== 'production') {
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'BizFlow API',
                version: '1.0.0',
                description: 'API completa do Sistema de Gestão Integrado BizFlow',
                contact: {
                    name: 'Suporte BizFlow',
                    email: 'suporte@bizflow.com',
                    url: 'https://bizflow.com'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [
                {
                    url: `http://localhost:${PORT}`,
                    description: 'Servidor Local'
                },
                {
                    url: 'https://api.bizflow.com',
                    description: 'Servidor de Produção'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Insira o token JWT no formato: Bearer <token>'
                    },
                    apiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key',
                        description: 'Chave de API para webhooks e integrações'
                    }
                },
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            role: { type: 'string', enum: ['super_admin', 'admin', 'user', 'viewer'] },
                            company: { type: 'string' },
                            plan: { type: 'string', enum: ['free', 'basic', 'professional', 'enterprise'] },
                            isActive: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    Error: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                            errors: { type: 'array', items: { type: 'string' } },
                            timestamp: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                responses: {
                    UnauthorizedError: {
                        description: 'Token de acesso inválido ou ausente',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                },
                                example: {
                                    success: false,
                                    message: 'Não autorizado',
                                    timestamp: '2023-10-01T10:00:00Z'
                                }
                            }
                        }
                    },
                    ValidationError: {
                        description: 'Erro de validação nos dados enviados',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                },
                                example: {
                                    success: false,
                                    message: 'Erro de validação',
                                    errors: ['O campo email é obrigatório', 'Senha muito curta'],
                                    timestamp: '2023-10-01T10:00:00Z'
                                }
                            }
                        }
                    }
                }
            },
            security: [{
                bearerAuth: []
            }]
        },
        apis: [
            './src/routes/*.js',
            './src/controllers/*.js'
        ]
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'BizFlow API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none'
        }
    }));

    // Rota para JSON da documentação
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

// ====================
// ROTAS DA API
// ====================

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: 'checking'
    };

    // Verificar conexão com banco de dados
    testConnection()
        .then(isConnected => {
            health.database = isConnected ? 'connected' : 'disconnected';
            health.status = isConnected ? 'healthy' : 'unhealthy';
            
            res.status(isConnected ? 200 : 503).json(health);
        })
        .catch(() => {
            health.database = 'error';
            health.status = 'unhealthy';
            res.status(503).json(health);
        });
});

// Ready check (para Kubernetes)
app.get('/ready', (req, res) => {
    testConnection()
        .then(isConnected => {
            if (isConnected) {
                res.status(200).json({
                    status: 'ready',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(503).json({
                    status: 'not_ready',
                    timestamp: new Date().toISOString(),
                    reason: 'Database not connected'
                });
            }
        })
        .catch(() => {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                reason: 'Database connection error'
            });
        });
});

// Live check (simples)
app.get('/live', (req, res) => {
    res.status(200).json({
        status: 'live',
        timestamp: new Date().toISOString()
    });
});

// Rota de informações do sistema (apenas desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.get('/system/info', (req, res) => {
        res.json({
            node: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            database: {
                host: process.env.DB_HOST,
                name: process.env.DB_NAME,
                ssl: process.env.DB_SSL === 'true'
            }
        });
    });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ====================
// MANUSEIO DE ERROS
// ====================

// 404 handler
app.use('*', (req, res) => {
    logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
    
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

// ====================
// INICIALIZAÇÃO DO SERVIDOR
// ====================

async function startServer() {
    try {
        logger.info('🚀 Iniciando servidor BizFlow...');
        
        // Log de inicialização
        console.log(`
╔══════════════════════════════════════════════════════╗
║                BIZFLOW BACKEND API                   ║
╠══════════════════════════════════════════════════════╣
║ 📍 Porta: ${PORT}${' '.repeat(36 - PORT.toString().length)}║
║ 🌍 Ambiente: ${process.env.NODE_ENV || 'development'}${' '.repeat(31 - (process.env.NODE_ENV || 'development').length)}║
║ 🗄️  Banco: PostgreSQL                              ║
║ 📚 Docs: http://localhost:${PORT}/api-docs${' '.repeat(27 - PORT.toString().length)}║
║ 🏥 Health: http://localhost:${PORT}/health${' '.repeat(28 - PORT.toString().length)}║
╚══════════════════════════════════════════════════════╝
        `);

        // Testar conexão com banco de dados
        const isConnected = await testConnection();
        
        if (!isConnected) {
            logger.error('❌ Falha na conexão com o banco de dados');
            
            // Tentar reconectar após 5 segundos
            logger.info('🔄 Tentando reconectar em 5 segundos...');
            setTimeout(startServer, 5000);
            return;
        }

        logger.info('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        
        // Sincronizar modelos (apenas em desenvolvimento)
        if (process.env.NODE_ENV !== 'production') {
            try {
                await sequelize.sync({ alter: true });
                logger.info('✅ Modelos sincronizados com o banco de dados');
            } catch (syncError) {
                logger.warn('⚠️  Erro ao sincronizar modelos:', syncError.message);
                logger.info('📝 Continuando sem sincronização automática...');
            }
        }

        // Log de inicialização do sistema
        await securityService.logSecurityEvent({
            userId: 'system',
            action: 'SYSTEM_STARTUP',
            description: 'Servidor BizFlow iniciado',
            ipAddress: '127.0.0.1',
            metadata: {
                port: PORT,
                environment: process.env.NODE_ENV,
                nodeVersion: process.version
            }
        });

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Servidor BizFlow rodando na porta ${PORT}`);
            logger.info(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`📁 Diretório: ${__dirname}`);
            
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`📚 Documentação: http://localhost:${PORT}/api-docs`);
                logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
            }
        });

        // Configurar timeout do servidor
        server.setTimeout(30000); // 30 segundos
        server.keepAliveTimeout = 120000; // 2 minutos
        server.headersTimeout = 125000; // 2 minutos e 5 segundos

        // Manipulador de shutdown gracioso
        const gracefulShutdown = async (signal) => {
            logger.info(`\n⚠️  Recebido ${signal}. Encerrando servidor graciosamente...`);
            
            // Parar de aceitar novas conexões
            server.close(async () => {
                logger.info('✅ Servidor HTTP fechado');
                
                // Fechar conexão com banco de dados
                try {
                    await sequelize.close();
                    logger.info('✅ Conexão com banco de dados encerrada');
                } catch (dbError) {
                    logger.error('❌ Erro ao fechar conexão com banco:', dbError);
                }
                
                // Log de shutdown
                await securityService.logSecurityEvent({
                    userId: 'system',
                    action: 'SYSTEM_SHUTDOWN',
                    description: `Servidor BizFlow encerrado por ${signal}`,
                    ipAddress: '127.0.0.1'
                });
                
                logger.info('👋 Shutdown completo. Até logo!');
                process.exit(0);
            });

            // Timeout forçado após 10 segundos
            setTimeout(() => {
                logger.error('❌ Timeout no shutdown forçado');
                process.exit(1);
            }, 10000);
        };

        // Capturar sinais de shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Para nodemon

    } catch (error) {
        logger.error('❌ Erro crítico ao iniciar servidor:', error);
        
        // Log do erro de inicialização
        await securityService.logSecurityEvent({
            userId: 'system',
            action: 'SYSTEM_STARTUP_FAILED',
            description: `Falha ao iniciar servidor: ${error.message}`,
            ipAddress: '127.0.0.1',
            details: error.stack,
            severity: 'critical'
        });
        
        process.exit(1);
    }
}

// ====================
// TRATAMENTO DE ERROS GLOBAIS
// ====================

// Erros não capturados
process.on('uncaughtException', async (error) => {
    logger.error('⚠️  Erro não capturado:', error);
    
    await securityService.logSecurityEvent({
        userId: 'system',
        action: 'UNCAUGHT_EXCEPTION',
        description: `Erro não capturado: ${error.message}`,
        ipAddress: '127.0.0.1',
        details: error.stack,
        severity: 'critical'
    });
    
    // Não sair imediatamente em produção, apenas logar
    if (process.env.NODE_ENV === 'production') {
        logger.info('🔄 Continuando após erro não capturado...');
    } else {
        process.exit(1);
    }
});

// Promises rejeitadas não tratadas
process.on('unhandledRejection', async (reason, promise) => {
    logger.error('⚠️  Rejeição não tratada em Promise:', reason);
    
    await securityService.logSecurityEvent({
        userId: 'system',
        action: 'UNHANDLED_REJECTION',
        description: `Rejeição não tratada: ${reason instanceof Error ? reason.message : reason}`,
        ipAddress: '127.0.0.1',
        details: reason instanceof Error ? reason.stack : JSON.stringify(reason),
        severity: 'high'
    });
});

// Aviso de memory leak
process.on('warning', (warning) => {
    logger.warn('⚠️  Aviso do Node.js:', warning);
});

// ====================
// INICIAR SERVIDOR
// ====================

// Iniciar apenas se executado diretamente
if (require.main === module) {
    startServer().catch(error => {
        logger.error('❌ Falha crítica ao iniciar servidor:', error);
        process.exit(1);
    });
}

module.exports = app; // Para testes
