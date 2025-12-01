const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');
const { validateSubscription } = require('../middleware/validation');

// All routes require authentication except webhook
router.use('/webhook', (req, res, next) => {
    // Webhook authentication using API key
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== process.env.WEBHOOK_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    
    next();
});

router.use('/', authenticate);

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: Subscription management
 */

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
 */
router.get('/', subscriptionController.getSubscription);

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
router.get('/plans', subscriptionController.getPlans);

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
router.get('/usage', subscriptionController.getUsage);

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
router.get('/invoices', subscriptionController.getInvoices);

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
 *               billingCycle:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               autoRenew:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Subscription created/updated
 */
router.post('/', validateSubscription, subscriptionController.createOrUpdateSubscription);

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
 */
router.post('/upgrade', subscriptionController.upgradeSubscription);

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
 */
router.post('/cancel', subscriptionController.cancelSubscription);

/**
 * @swagger
 * /api/subscriptions/renew:
 *   post:
 *     summary: Renew subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription renewed
 */
router.post('/renew', async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id }
        });
        
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }
        
        if (subscription.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Only active subscriptions can be renewed'
            });
        }
        
        // Calculate new dates
        const startDate = new Date(subscription.endDate);
        const endDate = new Date(startDate);
        
        switch (subscription.billingCycle) {
            case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'quarterly':
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case 'yearly':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
        }
        
        subscription.endDate = endDate;
        subscription.nextBillingDate = endDate;
        await subscription.save();
        
        // Log renewal
        await SecurityLog.create({
            userId: req.user.id,
            action: 'SUBSCRIPTION_RENEWED',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
                plan: subscription.plan,
                billingCycle: subscription.billingCycle,
                newEndDate: endDate
            }
        });
        
        res.json({
            success: true,
            message: 'Subscription renewed successfully',
            data: {
                endDate: subscription.endDate,
                nextBillingDate: subscription.nextBillingDate,
                remainingDays: subscription.getRemainingDays()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error renewing subscription'
        });
    }
});

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
router.post('/webhook', subscriptionController.handleWebhook);

/**
 * @swagger
 * /api/subscriptions/check:
 *   get:
 *     summary: Check subscription status and limits
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status and limits
 */
router.get('/check', async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id }
        });
        
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }
        
        // Check if subscription is active
        const isActive = subscription.status === 'active';
        const remainingDays = subscription.getRemainingDays();
        const isExpiringSoon = remainingDays !== null && remainingDays <= 7;
        
        // Check usage against limits
        const usage = subscription.metadata?.usage || {};
        const limits = subscription.features;
        const warnings = [];
        
        Object.keys(limits).forEach(key => {
            if (typeof limits[key] === 'number') {
                const current = usage[key] || 0;
                const limit = limits[key];
                const percentage = (current / limit) * 100;
                
                if (percentage >= 90) {
                    warnings.push(`${key} usage at ${percentage.toFixed(0)}%`);
                }
            }
        });
        
        res.json({
            success: true,
            data: {
                status: subscription.status,
                plan: subscription.plan,
                isActive,
                remainingDays,
                isExpiringSoon,
                warnings,
                canUseFeatures: {
                    createDocument: subscription.canUseFeature('monthlyDocuments', 1),
                    addProduct: subscription.canUseFeature('products', 1),
                    addCustomer: subscription.canUseFeature('customers', 1)
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking subscription'
        });
    }
});

module.exports = router;
