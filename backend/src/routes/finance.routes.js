const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { 
  createTransactionSchema, 
  updateTransactionSchema 
} = require('../utils/validators');

router.use(authenticate);

// Rotas principais
router.get('/', authorize('manager'), financeController.listTransactions);
router.get('/dashboard', authorize('manager'), financeController.getDashboard);
router.get('/report', authorize('manager'), financeController.getReport);
router.get('/export', authorize('manager'), financeController.exportTransactions);
router.get('/:id', authorize('manager'), financeController.getTransaction);
router.post('/', authorize('manager'), validate(createTransactionSchema), financeController.createTransaction);
router.put('/:id', authorize('manager'), validate(updateTransactionSchema), financeController.updateTransaction);
router.delete('/:id', authorize('admin'), financeController.deleteTransaction);

module.exports = router;
