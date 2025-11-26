const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Configuração de planos
const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        features: {
            pdvCount: 1,
            productLimit: 100,
            customerLimit: 500,
            digitalSignature: false,
            advancedReports: false,
            apiAccess: false,
            prioritySupport: false
        }
    },
    basic: {
        name: 'Basic',
        price: 99.90,
        features: {
            pdvCount: 3,
            productLimit: 1000,
            customerLimit: 2000,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: false,
            prioritySupport: false
        }
    },
    pro: {
        name: 'Pro',
        price: 199.90,
        features: {
            pdvCount: 10,
            productLimit: 10000,
            customerLimit: 10000,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: true,
            prioritySupport: true
        }
    }
};

// Buscar assinatura atual do usuário
exports.getCurrentSubscription = async (req, res) => {
    try {
        let subscription = await Subscription.findOne({ user: req.user._id });

        // Se não existir, criar assinatura free
        if (!subscription) {
            subscription = await Subscription.createInitialSubscription(req.user._id);
        }

        await subscription.populate('user', 'name email company');

        res.json({
            success: true,
            data: {
                subscription,
                planInfo: PLANS[subscription.plan]
            }
        });

    } catch (error) {
        console.error('Erro ao buscar assinatura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Fazer upgrade de plano
exports.upgradeSubscription = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const { plan, billingCycle = 'monthly' } = req.body;

        // Validar plano
        if (!PLANS[plan]) {
            return res.status(400).json({
                success: false,
                message: 'Plano inválido'
            });
        }

        let subscription = await Subscription.findOne({ user: req.user._id });

        // Se não existir, criar
        if (!subscription) {
            subscription = await Subscription.createInitialSubscription(req.user._id);
        }

        // Verificar se já está no plano solicitado
        if (subscription.plan === plan) {
            return res.status(400).json({
                success: false,
                message: `Você já está no plano ${PLANS[plan].name}`
            });
        }

        // Em produção, aqui integraria com Stripe/PagSeguro
        // Por enquanto, simular processamento de pagamento
        
        const price = PLANS[plan].price;
        
        // Simular processamento de pagamento
        const paymentSuccess = await simulatePayment(price, billingCycle);
        
        if (!paymentSuccess) {
            return res.status(402).json({
                success: false,
                message: 'Pagamento não autorizado. Verifique seus dados de pagamento.'
            });
        }

        // Atualizar plano
        await subscription.updatePlan(plan, price, 'upgrade');
        
        await subscription.populate('user', 'name email company');

        res.json({
            success: true,
            message: `Upgrade para plano ${PLANS[plan].name} realizado com sucesso!`,
            data: {
                subscription,
                planInfo: PLANS[plan]
            }
        });

    } catch (error) {
        console.error('Erro ao fazer upgrade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Cancelar assinatura
exports.cancelSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        // Não permitir cancelar assinatura free
        if (subscription.plan === 'free') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível cancelar assinatura gratuita'
            });
        }

        // Em produção, cancelar no Stripe também
        // Por enquanto, apenas marcar para cancelar no final do período
        
        subscription.cancelAtPeriodEnd = true;
        subscription.status = 'active'; // Mantém ativo até o final do período
        await subscription.save();

        await subscription.populate('user', 'name email company');

        res.json({
            success: true,
            message: 'Assinatura será cancelada ao final do período atual.',
            data: { subscription }
        });

    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Reativar assinatura cancelada
exports.reactivateSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        if (!subscription.cancelAtPeriodEnd) {
            return res.status(400).json({
                success: false,
                message: 'Assinatura não está marcada para cancelamento'
            });
        }

        // Em produção, reativar no Stripe também
        
        subscription.cancelAtPeriodEnd = false;
        await subscription.save();

        await subscription.populate('user', 'name email company');

        res.json({
            success: true,
            message: 'Assinatura reativada com sucesso!',
            data: { subscription }
        });

    } catch (error) {
        console.error('Erro ao reativar assinatura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar faturas (mock para desenvolvimento)
exports.getInvoices = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }

        // Faturas mock - em produção buscar do Stripe
        const mockInvoices = [
            {
                id: 'inv_001',
                number: 'INV-2023-001',
                date: new Date('2023-10-01'),
                amount: subscription.price,
                status: 'paid',
                plan: subscription.plan,
                pdfUrl: '#'
            },
            {
                id: 'inv_002', 
                number: 'INV-2023-002',
                date: new Date('2023-11-01'),
                amount: subscription.price,
                status: 'paid',
                plan: subscription.plan,
                pdfUrl: '#'
            }
        ];

        res.json({
            success: true,
            data: {
                invoices: mockInvoices
            }
        });

    } catch (error) {
        console.error('Erro ao buscar faturas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar todos os planos disponíveis
exports.getAvailablePlans = async (req, res) => {
    try {
        const plans = Object.entries(PLANS).map(([key, plan]) => ({
            id: key,
            name: plan.name,
            price: plan.price,
            features: plan.features,
            recommended: key === 'basic'
        }));

        res.json({
            success: true,
            data: { plans }
        });

    } catch (error) {
        console.error('Erro ao buscar planos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Webhook para processar eventos do Stripe (placeholder)
exports.handleWebhook = async (req, res) => {
    try {
        // Em produção, validar assinatura do webhook do Stripe
        const event = req.body;

        console.log('Webhook recebido:', event.type);

        // Processar diferentes tipos de eventos
        switch (event.type) {
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Funções auxiliares para webhook
async function handlePaymentSucceeded(invoice) {
    // Atualizar status da assinatura no banco
    console.log('Pagamento processado:', invoice.id);
}

async function handleSubscriptionUpdated(subscription) {
    // Atualizar dados da assinatura
    console.log('Assinatura atualizada:', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
    // Marcar assinatura como cancelada
    console.log('Assinatura cancelada:', subscription.id);
}

// Simular processamento de pagamento (mock)
async function simulatePayment(amount, billingCycle) {
    // Em produção, integrar com Stripe/PagSeguro
    // Por enquanto, simular sucesso 90% das vezes
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(Math.random() < 0.9); // 90% de sucesso
        }, 1000);
    });
}
