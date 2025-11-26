const express = require('express');
const { body } = require('express-validator');
const {
    getSales,
    getSale,
    createSale,
    updateSaleStatus,
    getSalesByPeriod
} = require('../controllers/saleController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const saleValidation = [
    body('customer')
        .optional()
        .isMongoId()
        .withMessage('ID do cliente inválido'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('A venda deve ter pelo menos um item'),
    body('items.*.productId')
        .isMongoId()
        .withMessage('ID do produto inválido'),
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantidade deve ser um número inteiro positivo'),
    body('items.*.unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Preço unitário deve ser um número positivo'),
    body('discount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Desconto deve ser um número positivo'),
    body('tax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Imposto deve ser um número positivo'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'transfer', 'pix', 'other'])
        .withMessage('Método de pagamento inválido')
];

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas básicas
router.get('/', getSales);
router.get('/period', getSalesByPeriod);
router.get('/:id', getSale);
router.post('/', authorize('admin', 'manager', 'user'), saleValidation, createSale);
router.patch('/:id/status', authorize('admin', 'manager'), updateSaleStatus);

module.exports = router;
