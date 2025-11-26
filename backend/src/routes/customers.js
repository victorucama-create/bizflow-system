const express = require('express');
const { body } = require('express-validator');
const {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers
} = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const customerValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nome deve ter entre 2 e 200 caracteres'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('phone')
        .optional()
        .trim()
        .isMobilePhone('pt-BR')
        .withMessage('Telefone inválido'),
    body('type')
        .isIn(['individual', 'company'])
        .withMessage('Tipo de cliente inválido'),
    body('taxId')
        .optional()
        .trim()
        .isLength({ min: 11, max: 18 })
        .withMessage('CPF/CNPJ inválido')
];

// Rotas públicas (apenas clientes ativos)
router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.get('/:id', getCustomer);

// Rotas protegidas
router.use(authenticate);

// Rotas que requerem autenticação
router.post('/', authorize('admin', 'manager'), customerValidation, createCustomer);
router.put('/:id', authorize('admin', 'manager'), customerValidation, updateCustomer);
router.delete('/:id', authorize('admin'), deleteCustomer);

module.exports = router;
