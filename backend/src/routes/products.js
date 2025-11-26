const express = require('express');
const { body } = require('express-validator');
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    searchProducts
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const productValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nome deve ter entre 2 e 200 caracteres'),
    body('sku')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('SKU deve ter entre 3 e 50 caracteres'),
    body('category')
        .isIn(['eletronicos', 'informatica', 'audio', 'acessorios', 'outros'])
        .withMessage('Categoria inválida'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Preço deve ser um número positivo'),
    body('cost')
        .isFloat({ min: 0 })
        .withMessage('Custo deve ser um número positivo'),
    body('stock')
        .isInt({ min: 0 })
        .withMessage('Estoque deve ser um número inteiro positivo'),
    body('minStock')
        .isInt({ min: 0 })
        .withMessage('Estoque mínimo deve ser um número inteiro positivo')
];

// Rotas públicas
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);

// Rotas protegidas
router.use(authenticate);

// Rotas que requerem autenticação
router.post('/', authorize('admin', 'manager'), productValidation, createProduct);
router.put('/:id', authorize('admin', 'manager'), productValidation, updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

module.exports = router;
