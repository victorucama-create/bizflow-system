const cors = require('cors');

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sem origin (como mobile apps, curl, servidores)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.CORS_ORIGIN,
            'https://bizflow-system.up.railway.app',  // NOVO - URL do Railway
            'https://*.up.railway.app',              // NOVO - Todos os subdomínios Railway
            'http://localhost:3000',
            'http://localhost:5000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000',
            'https://bizflow-system.onrender.com'    // Mantenha o Render por enquanto
        ].filter(Boolean); // Remove valores undefined/null

        // Log para debugging em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🌐 CORS Check - Origin: ${origin}, Allowed: ${allowedOrigins.includes(origin)}`);
        }

        // Permitir origens da lista OU em ambiente de desenvolvimento
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
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
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Cache-Control',
        'X-API-Key'
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

// Exportar tanto o middleware quanto a configuração
const corsMiddleware = cors(corsOptions);

// Helper para debugging
corsMiddleware.getAllowedOrigins = () => {
    return [
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN,
        'https://bizflow-system.up.railway.app',
        'https://*.up.railway.app',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://bizflow-system.onrender.com'
    ].filter(Boolean);
};

module.exports = corsMiddleware;
