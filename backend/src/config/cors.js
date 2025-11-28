const cors = require('cors');

/**
 * Configuração CORS personalizada para o Railway
 */
// Domínios permitidos
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    'https://bizflow-system.up.railway.app',
    'https://*.up.railway.app',
    'https://*.railway.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://bizflow-system.onrender.com'
].filter(Boolean); // Remove valores undefined/null

// Configuração CORS
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sem origin (como mobile apps, curl, servidores)
        if (!origin) return callback(null, true);
        
        // Log para debugging em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🌐 CORS Check - Origin: ${origin}`);
            console.log(`📋 Allowed Origins: ${allowedOrigins.join(', ')}`);
        }

        // Verificar se a origem está na lista de permitidas
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            // Suporte para wildcards
            if (allowedOrigin.includes('*')) {
                const regex = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
                return regex.test(origin);
            }
            return allowedOrigin === origin;
        });

        // Permitir origens da lista OU em ambiente de desenvolvimento
        if (isAllowed || process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ CORS permitido para: ${origin}`);
            }
            callback(null, true);
        } else {
            console.warn(`🚫 CORS bloqueado para origem: ${origin}`);
            console.log(`📋 Origens permitidas: ${allowedOrigins.join(', ')}`);
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Cache-Control',
        'X-Requested-With'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count',
        'Authorization',
        'X-API-Version'
    ],
    maxAge: 86400, // 24 horas
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Middleware CORS
const corsMiddleware = cors(corsOptions);

// Helper para verificar origens
corsMiddleware.isOriginAllowed = (origin) => {
    return allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
            const regex = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
            return regex.test(origin);
        }
        return allowedOrigin === origin;
    });
};

// Helper para adicionar origens dinamicamente
corsMiddleware.addAllowedOrigin = (origin) => {
    if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
        console.log(`✅ Origem adicionada ao CORS: ${origin}`);
    }
};

// Helper para obter origens permitidas
corsMiddleware.getAllowedOrigins = () => {
    return [...allowedOrigins];
};

// Health check do CORS
corsMiddleware.healthCheck = () => {
    return {
        status: 'healthy',
        allowedOrigins: allowedOrigins,
        config: {
            credentials: corsOptions.credentials,
            methods: corsOptions.methods,
            maxAge: corsOptions.maxAge
        }
    };
};

module.exports = corsMiddleware;
