const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// Middleware para verificar limite de produtos
exports.checkProductLimit = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        const productCount = await Product.countDocuments({ 
            createdBy: req.user._id,
            status: 'active'
        });

        if (productCount >= subscription.features.productLimit) {
            return res.status(403).json({
                success: false,
                message: `Limite de produtos atingido (${subscription.features.productLimit}). Faça upgrade para adicionar mais produtos.`
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar limite de produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar limite de clientes
exports.checkCustomerLimit = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        const customerCount = await Customer.countDocuments({ 
            createdBy: req.user._id,
            status: 'active'
        });

        if (customerCount >= subscription.features.customerLimit) {
            return res.status(403).json({
                success: false,
                message: `Limite de clientes atingido (${subscription.features.customerLimit}). Faça upgrade para adicionar mais clientes.`
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar limite de clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar se assinatura digital está disponível
exports.checkDigitalSignature = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        if (!subscription.features.digitalSignature) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura digital não disponível no seu plano. Faça upgrade para o plano Basic ou Pro.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar assinatura digital:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar se relatórios avançados estão disponíveis
exports.checkAdvancedReports = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        if (!subscription.features.advancedReports) {
            return res.status(403).json({
                success: false,
                message: 'Relatórios avançados não disponíveis no seu plano. Faça upgrade para o plano Basic ou Pro.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar relatórios avançados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar se API access está disponível
exports.checkApiAccess = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        if (!subscription.features.apiAccess) {
            return res.status(403).json({
                success: false,
                message: 'Acesso à API não disponível no seu plano. Faça upgrade para o plano Pro.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar acesso à API:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware geral para verificar se a assinatura está ativa
exports.checkActiveSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });
        
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        if (!subscription.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Sua assinatura não está ativa. Verifique seu pagamento ou entre em contato com o suporte.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar assinatura ativa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
