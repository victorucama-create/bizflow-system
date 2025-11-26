const express = require('express');
const { body } = require('express-validator');
const {
    getCurrentSubscription,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    getInvoices,
    getAvailablePlans,
    handleWebhook
} = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const upgradeValidation = [
    body('plan')
        .isIn(['free', 'basic', 'pro'])
        .withMessage('Plano inválido'),
    body('billingCycle')
        .optional()
        .isIn(['monthly', 'yearly'])
        .withMessage('Ciclo de faturamento inválido')
];

// Webhook (não requer autenticação normal)
router.post('/webhook', handleWebhook);

// Todas as outras rotas requerem autenticação
router.use(authenticate);

// Rotas de consulta
router.get('/', getCurrentSubscription);
router.get('/plans', getAvailablePlans);
router.get('/invoices', getInvoices);

// Rotas de ação
router.post('/upgrade', upgradeValidation, upgradeSubscription);
router.post('/cancel', cancelSubscription);
router.post('/reactivate', reactivateSubscription);

module.exports = router;
