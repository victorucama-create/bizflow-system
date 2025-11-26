const express = require('express');
const { body } = require('express-validator');
const {
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    signDocument,
    updateDocumentStatus,
    getPendingDocuments,
    getOverdueDocuments
} = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const documentValidation = [
    body('type')
        .isIn(['invoice', 'purchase-order', 'requisition', 'contract', 'other'])
        .withMessage('Tipo de documento inválido'),
    body('title')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Título deve ter entre 2 e 200 caracteres'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Descrição não pode ter mais de 1000 caracteres'),
    body('customer')
        .optional()
        .isMongoId()
        .withMessage('ID do cliente inválido'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Valor deve ser um número positivo'),
    body('issueDate')
        .optional()
        .isISO8601()
        .withMessage('Data de emissão inválida'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Data de vencimento inválida'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Observações não podem ter mais de 500 caracteres')
];

const signDocumentValidation = [
    body('signatureData')
        .notEmpty()
        .withMessage('Dados da assinatura são obrigatórios'),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória para confirmar a assinatura')
];

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de consulta
router.get('/', getDocuments);
router.get('/pending', getPendingDocuments);
router.get('/overdue', getOverdueDocuments);
router.get('/:id', getDocument);

// Rotas de ação
router.post('/', authorize('admin', 'manager'), documentValidation, createDocument);
router.put('/:id', authorize('admin', 'manager'), documentValidation, updateDocument);
router.patch('/:id/status', authorize('admin', 'manager'), updateDocumentStatus);
router.post('/:id/sign', authorize('admin', 'manager'), signDocumentValidation, signDocument);
router.delete('/:id', authorize('admin'), deleteDocument);

module.exports = router;
