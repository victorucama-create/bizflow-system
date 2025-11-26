const cors = require('cors');

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sem origin (como mobile apps ou curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:5000',
            'https://bizflow-system.onrender.com'
        ].filter(Boolean);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'Authorization'
    ],
    maxAge: 86400 // 24 horas
};

module.exports = cors(corsOptions);
