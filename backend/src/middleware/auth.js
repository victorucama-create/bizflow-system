const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    try {
        let token;

        // Verificar token no header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acesso não autorizado. Token não fornecido.'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Buscar usuário
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido. Usuário não encontrado.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o administrador.'
            });
        }

        // Adicionar usuário à requisição
        req.user = user;
        req.userId = user._id;
        next();

    } catch (error) {
        console.error('Erro na autenticação:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Permissões insuficientes.'
            });
        }
        next();
    };
};
