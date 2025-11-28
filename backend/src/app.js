const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('./config/cors'); // Configuração CORS personalizada

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const saleRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const documentRoutes = require('./routes/documents');
const subscriptionRoutes = require('./routes/subscription');

const app = express();

// ==================== CONFIGURAÇÕES DE RATE LIMITING ====================

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
    message: {
        success: false,
        error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Pular rate limiting para health checks e webhooks
        return req.url === '/health' || 
               req.url === '/api/health' ||
               req.url === '/api/subscription/webhook' ||
               req.method === 'OPTIONS'; // Pré-flight requests
    }
});

// Rate limiting para autenticação
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Apenas 5 tentativas de login por IP
    message: {
        success: false,
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    skipSuccessfulRequests: true
});

// Rate limiting para endpoints de pagamento
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limite mais baixo para pagamentos
    message: {
        success: false,
        error: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.'
    }
});

// ==================== MIDDLEWARES DE SEGURANÇA ====================

// Helmet com configurações otimizadas para Railway
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://api.stripe.com", "wss:"],
            frameSrc: ["'self'", "https://js.stripe.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            childSrc: ["'self'", "blob:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" } // Importante para Railway
}));

app.use(limiter);
app.use(cors); // Usar configuração CORS personalizada

// Rate limiting específico para endpoints sensíveis
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/subscription/upgrade', paymentLimiter);

// ==================== MIDDLEWARES DE REQUISIÇÃO ====================

// Middleware para webhook do Stripe (raw body) - DEVE VIR ANTES DO express.json
app.use('/api/subscription/webhook', express.raw({ 
    type: 'application/json',
    limit: '10mb'
}));

// Middlewares básicos para outras rotas
app.use(express.json({ 
    limit: process.env.MAX_FILE_SIZE || '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true,
    limit: process.env.MAX_FILE_SIZE || '10mb'
}));

// Logging de requests (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
        next();
    });
} else {
    // Log simplificado em produção
    app.use((req, res, next) => {
        if (req.url !== '/health' && req.url !== '/api/health') {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        }
        next();
    });
}

// ==================== HEALTH CHECKS ====================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'BizFlow API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        memory: process.memoryUsage(),
        version: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'BizFlow API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// ==================== SERVIR ARQUIVOS ESTÁTICOS ====================

app.use(express.static(path.join(__dirname, '../../frontend'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    index: 'index.html',
    setHeaders: (res, path) => {
        // Cache mais agressivo para assets estáticos
        if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 dia
        }
        // Não cachear HTML
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ==================== ROTAS DA API ====================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ==================== ROTA SPA (SINGLE PAGE APPLICATION) ====================

app.get('*', (req, res, next) => {
    // Se a rota começar com /api, passar para o próximo middleware (404)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Servir o frontend para todas as outras rotas
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ==================== MIDDLEWARE 404 ====================

app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint da API não encontrado',
            path: req.originalUrl,
            method: req.method,
            availableEndpoints: [
                '/api/auth',
                '/api/users', 
                '/api/products',
                '/api/customers',
                '/api/sales',
                '/api/inventory',
                '/api/documents',
                '/api/subscription'
            ]
        });
    }
    
    // Para rotas não-API, já servimos o frontend acima
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// ==================== MIDDLEWARE DE ERRO GLOBAL ====================

app.use((err, req, res, next) => {
    console.error('❌ Erro:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Erro de validação
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Dados de entrada inválidos',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    // Erro de duplicata (MongoDB)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field} já está em uso`
        });
    }

    // Erro JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }

    // Erro CORS
    if (err.message === 'Não permitido por CORS') {
        return res.status(403).json({
            success: false,
            message: 'Origem não permitida'
        });
    }

    // Erro de limite de plano
    if (err.message && err.message.includes('Limite')) {
        return res.status(403).json({
            success: false,
            message: err.message,
            code: 'PLAN_LIMIT_EXCEEDED'
        });
    }

    // Erro de pagamento
    if (err.message && err.message.includes('pagamento')) {
        return res.status(402).json({
            success: false,
            message: err.message,
            code: 'PAYMENT_FAILED'
        });
    }

    // Erro padrão
    const statusCode = err.statusCode || err.status || 500;
    
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Erro interno do servidor' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && {
            stack: err.stack,
            details: err
        })
    });
});

module.exports = app;
