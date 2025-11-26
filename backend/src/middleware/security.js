const rateLimit = require('express-rate-limit');

// Rate limiting para diferentes endpoints
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas
    message: {
        success: false,
        error: 'Muitas tentativas. Tente novamente em 15 minutos.'
    },
    skipSuccessfulRequests: true
});

exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
        success: false,
        error: 'Muitas requisições. Tente novamente em 15 minutos.'
    }
});

exports.strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Apenas 10 requisições
    message: {
        success: false,
        error: 'Muitas requisições. Tente novamente em 15 minutos.'
    }
});

// Middleware para prevenir ataques de força bruta
exports.preventBruteForce = (req, res, next) => {
    // Implementação básica - em produção usar Redis
    const attempts = req.session.loginAttempts || 0;
    
    if (attempts >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Muitas tentativas de login. Tente novamente mais tarde.'
        });
    }
    
    next();
};

// Middleware para validar origem das requisições
exports.validateOrigin = (req, res, next) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:5000',
        'https://bizflow-system.onrender.com'
    ];
    
    const origin = req.get('origin');
    
    if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
            success: false,
            message: 'Origem não permitida'
        });
    }
    
    next();
};

// Middleware para prevenir ataques de CSRF (simplificado)
exports.csrfProtection = (req, res, next) => {
    // Em uma implementação real, usar csurf package
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'];
        const sessionToken = req.session.csrfToken;
        
        if (!csrfToken || csrfToken !== sessionToken) {
            return res.status(403).json({
                success: false,
                message: 'Token CSRF inválido'
            });
        }
    }
    
    next();
};
