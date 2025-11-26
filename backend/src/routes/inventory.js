const express = require('express');
const { body } = require('express-validator');
const {
    getInventoryMovements,
    getInventoryMovement,
    recordEntry,
    recordOut,
    adjustStock,
    getInventoryReport,
    getProductHistory
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const movementValidation = [
    body('product')
        .isMongoId()
        .withMessage('ID do produto inválido'),
    body('quantity')
        .isFloat({ min: 0.01 })
        .withMessage('Quantidade deve ser um número positivo'),
    body('reason')
        .isIn(['purchase', 'sale', 'adjustment', 'return', 'damaged', 'expired', 'other'])
        .withMessage('Motivo inválido'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Observações não podem ter mais de 500 caracteres')
];

const adjustmentValidation = [
    body('product')
        .isMongoId()
        .withMessage('ID do produto inválido'),
    body('newStock')
        .isInt({ min: 0 })
        .withMessage('Novo estoque deve ser um número inteiro positivo'),
    body('reason')
        .isIn(['adjustment', 'damaged', 'expired', 'other'])
        .withMessage('Motivo inválido')
];

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de consulta
router.get('/', getInventoryMovements);
router.get('/report', getInventoryReport);
router.get('/product/:productId', getProductHistory);
router.get('/:id', getInventoryMovement);

// Rotas de ação (requerem permissões específicas)
router.post('/entry', authorize('admin', 'manager'), movementValidation, recordEntry);
router.post('/out', authorize('admin', 'manager', 'user'), movementValidation, recordOut);
router.post('/adjust', authorize('admin', 'manager'), adjustmentValidation, adjustStock);

module.exports = router;
