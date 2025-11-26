const { validationResult } = require('express-validator');

// Middleware para tratar erros de validação
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dados de entrada inválidos',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    
    next();
};

// Sanitização de dados
exports.sanitizeInput = (req, res, next) => {
    // Função recursiva para sanitizar objetos
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remover ou escapar caracteres perigosos
            return obj.trim()
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .substring(0, 10000); // Limite de tamanho
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitize(value);
            }
            return sanitized;
        }
        
        return obj;
    };
    
    if (req.body) {
        req.body = sanitize(req.body);
    }
    
    if (req.query) {
        req.query = sanitize(req.query);
    }
    
    next();
};

// Validação de ObjectId do MongoDB
exports.validateObjectId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'ID inválido'
        });
    }
    
    next();
};
