const { Op } = require('sequelize');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class SubscriptionController {
    /**
     * @swagger
     * /api/subscriptions:
     *   get:
     *     summary: Get user's subscription
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Subscription details
     *       404:
     *         description: Subscription not found
     */
    async getSubscription(req, res) {
        try {
            const userId = req.user.id;
            
            const subscription = await Subscription.findOne({
                where: { userId },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                }]
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Assinatura não encontrada'
                });
            }
            
            // Log access
            await SecurityLog.create({
                userId,
                action: 'VIEW_SUBSCRIPTION',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { subscriptionId: subscription.id }
            });
            
            res.json({
                success: true,
                data: subscription
            });
            
        } catch (error) {
            logger.error('Get subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar assinatura',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/plans:
     *   get:
     *     summary: Get available subscription plans
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of available plans
     */
    async getPlans(req, res) {
        try {
            const plans = {
                free: {
                    name: 'Grátis',
                    description: 'Plano básico para pequenas empresas',
                    price: 0,
                    billingCycles: {
                        monthly: 0,
                        yearly: 0
                    },
                    features: {
                        users: 1,
                        products: 50,
                        customers: 100,
                        storage: 100, // MB
                        monthlySales: 100,
                        monthlyDocuments: 50,
                        apiCalls: 1000,
                        support: 'Email',
                        reports: 'Básicos',
                        integrations: 'Nenhuma'
                    },
                    limits: {
                        fileSize: 5, // MB
                        backupFrequency: 'Manual',
                        retentionPeriod: '30 dias'
                    }
                },
                basic: {
                    name: 'Básico',
                    description: 'Para empresas em crescimento',
                    price: 79.90,
                    billingCycles: {
                        monthly: 79.90,
                        yearly: 838.80 // 2 meses grátis
                    },
                    features: {
                        users: 3,
                        products: 500,
                        customers: 1000,
                        storage: 1024, // 1GB
                        monthlySales: 1000,
                        monthlyDocuments: 500,
                        apiCalls: 10000,
                        support: 'Email e Chat',
                        reports: 'Avançados',
                        integrations: 'Básicas'
                    },
                    limits: {
                        fileSize: 25, // MB
                        backupFrequency: 'Diário',
                        retentionPeriod: '90 dias'
                    }
                },
                professional: {
                    name: 'Profissional',
                    description: 'Para empresas estabelecidas',
                    price: 199.90,
                    billingCycles: {
                        monthly: 199.90,
                        yearly: 2158.92 // 10% desconto anual
                    },
                    features: {
                        users: 10,
                        products: 5000,
                        customers: 10000,
                        storage: 5120, // 5GB
                        monthlySales: 10000,
                        monthlyDocuments: 5000,
                        apiCalls: 50000,
                        support: 'Prioritário',
                        reports: 'Customizados',
                        integrations: 'Completas',
                        whiteLabel: true
                    },
                    limits: {
                        fileSize: 50, // MB
                        backupFrequency: 'Em tempo real',
                        retentionPeriod: '1 ano'
                    }
                },
                enterprise: {
                    name: 'Empresarial',
                    description: 'Solução personalizada para grandes empresas',
                    price: 'Personalizado',
                    billingCycles: {
                        custom: 'Personalizado'
                    },
                    features: {
                        users: 'Ilimitado',
                        products: 'Ilimitado',
                        customers: 'Ilimitado',
                        storage: 'Personalizado',
                        monthlySales: 'Ilimitado',
                        monthlyDocuments: 'Ilimitado',
                        apiCalls: 'Ilimitado',
                        support: '24/7 dedicado',
                        reports: 'Business Intelligence',
                        integrations: 'API completa',
                        whiteLabel: true,
                        customDevelopment: true,
                        dedicatedServer: true
                    },
                    limits: {
                        fileSize: 'Personalizado',
                        backupFrequency: 'Personalizado',
                        retentionPeriod: 'Personalizado'
                    }
                }
            };
            
            res.json({
                success: true,
                data: plans
            });
            
        } catch (error) {
            logger.error('Get plans error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar planos',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions:
     *   post:
     *     summary: Create or update subscription
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [plan, billingCycle]
     *             properties:
     *               plan:
     *                 type: string
     *                 enum: [free, basic, professional, enterprise]
     *               billingCycle:
     *                 type: string
     *                 enum: [monthly, quarterly, yearly]
     *               paymentMethod:
     *                 type: string
     *               autoRenew:
     *                 type: boolean
     *     responses:
     *       201:
     *         description: Subscription created/updated
     *       400:
     *         description: Invalid data
     */
    async createOrUpdateSubscription(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const { plan, billingCycle, paymentMethod, autoRenew = true } = req.body;
            
            // Get price based on plan
            const prices = {
                free: { monthly: 0, quarterly: 0, yearly: 0 },
                basic: { monthly: 79.90, quarterly: 215.73, yearly: 838.80 },
                professional: { monthly: 199.90, quarterly: 539.73, yearly: 2158.92 },
                enterprise: { monthly: 0 } // Custom pricing
            };
            
            if (!prices[plan]) {
                return res.status(400).json({
                    success: false,
                    message: 'Plano inválido'
                });
            }
            
            const price = plan === 'enterprise' ? 0 : prices[plan][billingCycle];
            
            // Find existing subscription
            let subscription = await Subscription.findOne({
                where: { userId }
            });
            
            if (subscription) {
                // Update existing subscription
                subscription.plan = plan;
                subscription.billingCycle = billingCycle;
                subscription.price = price;
                subscription.paymentMethod = paymentMethod;
                subscription.isAutoRenew = autoRenew;
                subscription.status = plan === 'free' ? 'active' : 'pending';
                
                await subscription.save();
                
                // Log update
                await SecurityLog.create({
                    userId,
                    action: 'UPDATE_SUBSCRIPTION',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    details: {
                        oldPlan: subscription._previousDataValues.plan,
                        newPlan: plan,
                        price
                    }
                });
                
            } else {
                // Create new subscription
                subscription = await Subscription.create({
                    userId,
                    plan,
                    billingCycle,
                    price,
                    paymentMethod,
                    isAutoRenew: autoRenew,
                    status: plan === 'free' ? 'active' : 'pending',
                    startDate: new Date()
                });
                
                // Log creation
                await SecurityLog.create({
                    userId,
                    action: 'CREATE_SUBSCRIPTION',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    details: { plan, price }
                });
            }
            
            // Update user's plan
            await User.update(
                { plan },
                { where: { id: userId } }
            );
            
            res.status(subscription._previousDataValues ? 200 : 201).json({
                success: true,
                message: 'Assinatura atualizada com sucesso',
                data: subscription
            });
            
        } catch (error) {
            logger.error('Create/update subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao processar assinatura',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/cancel:
     *   post:
     *     summary: Cancel subscription
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: false
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               reason:
     *                 type: string
     *     responses:
     *       200:
     *         description: Subscription canceled
     *       404:
     *         description: Subscription not found
     */
    async cancelSubscription(req, res) {
        try {
            const userId = req.user.id;
            const { reason } = req.body;
            
            const subscription = await Subscription.findOne({
                where: { userId }
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Assinatura não encontrada'
                });
            }
            
            if (subscription.status === 'canceled') {
                return res.status(400).json({
                    success: false,
                    message: 'Assinatura já está cancelada'
                });
            }
            
            // Keep subscription active until end date
            subscription.status = 'canceled';
            subscription.canceledAt = new Date();
            subscription.cancellationReason = reason;
            subscription.isAutoRenew = false;
            
            await subscription.save();
            
            // Log cancellation
            await SecurityLog.create({
                userId,
                action: 'CANCEL_SUBSCRIPTION',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { reason, plan: subscription.plan }
            });
            
            res.json({
                success: true,
                message: 'Assinatura cancelada com sucesso',
                data: {
                    status: subscription.status,
                    endDate: subscription.endDate,
                    remainingDays: subscription.getRemainingDays()
                }
            });
            
        } catch (error) {
            logger.error('Cancel subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao cancelar assinatura',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/upgrade:
     *   post:
     *     summary: Upgrade subscription plan
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [plan]
     *             properties:
     *               plan:
     *                 type: string
     *               billingCycle:
     *                 type: string
     *               immediate:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Subscription upgraded
     *       400:
     *         description: Invalid upgrade request
     */
    async upgradeSubscription(req, res) {
        try {
            const userId = req.user.id;
            const { plan, billingCycle, immediate = false } = req.body;
            
            const subscription = await Subscription.findOne({
                where: { userId }
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Assinatura não encontrada'
                });
            }
            
            // Check if upgrade is valid
            const planHierarchy = ['free', 'basic', 'professional', 'enterprise'];
            const currentPlanIndex = planHierarchy.indexOf(subscription.plan);
            const newPlanIndex = planHierarchy.indexOf(plan);
            
            if (newPlanIndex <= currentPlanIndex) {
                return res.status(400).json({
                    success: false,
                    message: 'Escolha um plano superior ao atual'
                });
            }
            
            // Calculate prorated amount
            const daysUsed = Math.ceil((new Date() - new Date(subscription.startDate)) / (1000 * 60 * 60 * 24));
            const daysInCycle = subscription.billingCycle === 'yearly' ? 365 : 
                               subscription.billingCycle === 'quarterly' ? 90 : 30;
            
            const unusedAmount = subscription.price * (1 - daysUsed / daysInCycle);
            
            // Get new plan price
            const prices = {
                free: { monthly: 0, quarterly: 0, yearly: 0 },
                basic: { monthly: 79.90, quarterly: 215.73, yearly: 838.80 },
                professional: { monthly: 199.90, quarterly: 539.73, yearly: 2158.92 }
            };
            
            const newPrice = prices[plan][billingCycle || subscription.billingCycle];
            const upgradeAmount = Math.max(0, newPrice - unusedAmount);
            
            // Update subscription
            const oldPlan = subscription.plan;
            subscription.plan = plan;
            subscription.price = newPrice;
            subscription.billingCycle = billingCycle || subscription.billingCycle;
            
            if (immediate) {
                subscription.startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + (subscription.billingCycle === 'yearly' ? 12 : 
                                                     subscription.billingCycle === 'quarterly' ? 3 : 1));
                subscription.endDate = endDate;
                subscription.nextBillingDate = endDate;
            }
            
            await subscription.save();
            
            // Update user
            await User.update(
                { plan },
                { where: { id: userId } }
            );
            
            // Log upgrade
            await SecurityLog.create({
                userId,
                action: 'UPGRADE_SUBSCRIPTION',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    from: oldPlan,
                    to: plan,
                    proratedAmount: unusedAmount,
                    upgradeAmount,
                    immediate
                }
            });
            
            res.json({
                success: true,
                message: 'Assinatura atualizada com sucesso',
                data: {
                    oldPlan,
                    newPlan: plan,
                    upgradeAmount: immediate ? upgradeAmount.toFixed(2) : 0,
                    nextBillingDate: subscription.nextBillingDate
                }
            });
            
        } catch (error) {
            logger.error('Upgrade subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar assinatura',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/usage:
     *   get:
     *     summary: Get subscription usage
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Usage statistics
     */
    async getUsage(req, res) {
        try {
            const userId = req.user.id;
            
            const subscription = await Subscription.findOne({
                where: { userId }
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Assinatura não encontrada'
                });
            }
            
            // Get current usage from metadata
            const usage = subscription.metadata?.usage || {};
            const limits = subscription.features;
            
            // Calculate usage percentages
            const usageStats = {};
            for (const [key, limit] of Object.entries(limits)) {
                if (typeof limit === 'number') {
                    const current = usage[key] || 0;
                    usageStats[key] = {
                        current,
                        limit,
                        percentage: Math.min(100, (current / limit) * 100),
                        remaining: Math.max(0, limit - current)
                    };
                }
            }
            
            res.json({
                success: true,
                data: {
                    subscription: {
                        plan: subscription.plan,
                        status: subscription.status,
                        endDate: subscription.endDate,
                        remainingDays: subscription.getRemainingDays()
                    },
                    usage: usageStats
                }
            });
            
        } catch (error) {
            logger.error('Get usage error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar uso',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/invoices:
     *   get:
     *     summary: Get subscription invoices
     *     tags: [Subscription]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of invoices
     */
    async getInvoices(req, res) {
        try {
            const userId = req.user.id;
            
            // In production, fetch from payment gateway
            const mockInvoices = [
                {
                    id: 'inv_001',
                    number: 'INV-2023-001',
                    date: '2023-10-01',
                    amount: 79.90,
                    currency: 'BRL',
                    status: 'paid',
                    plan: 'basic',
                    period: 'Outubro 2023',
                    pdfUrl: '#'
                },
                {
                    id: 'inv_002',
                    number: 'INV-2023-002',
                    date: '2023-11-01',
                    amount: 79.90,
                    currency: 'BRL',
                    status: 'paid',
                    plan: 'basic',
                    period: 'Novembro 2023',
                    pdfUrl: '#'
                }
            ];
            
            res.json({
                success: true,
                data: mockInvoices
            });
            
        } catch (error) {
            logger.error('Get invoices error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar faturas',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/subscriptions/webhook:
     *   post:
     *     summary: Handle payment webhook
     *     tags: [Subscription]
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *     responses:
     *       200:
     *         description: Webhook processed
     */
    async handleWebhook(req, res) {
        try {
            const webhookSecret = process.env.WEBHOOK_SECRET;
            const signature = req.headers['x-webhook-signature'];
            
            // Verify webhook signature
            // Implementation depends on payment gateway
            
            const event = req.body;
            
            switch (event.type) {
                case 'payment.succeeded':
                    await this.handlePaymentSuccess(event);
                    break;
                    
                case 'payment.failed':
                    await this.handlePaymentFailed(event);
                    break;
                    
                case 'subscription.canceled':
                    await this.handleSubscriptionCanceled(event);
                    break;
                    
                case 'invoice.paid':
                    await this.handleInvoicePaid(event);
                    break;
                    
                case 'invoice.payment_failed':
                    await this.handleInvoiceFailed(event);
                    break;
            }
            
            res.json({ received: true });
            
        } catch (error) {
            logger.error('Webhook error:', error);
            res.status(400).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }
    
    async handlePaymentSuccess(event) {
        // Update subscription status
        const subscriptionId = event.data.subscription_id;
        
        await Subscription.update({
            status: 'active',
            paymentStatus: 'paid',
            nextBillingDate: event.data.next_billing_date
        }, {
            where: { metadata: { paymentGatewayId: subscriptionId } }
        });
    }
    
    async handlePaymentFailed(event) {
        const subscriptionId = event.data.subscription_id;
        
        await Subscription.update({
            paymentStatus: 'failed'
        }, {
            where: { metadata: { paymentGatewayId: subscriptionId } }
        });
    }
}

module.exports = new SubscriptionController();
