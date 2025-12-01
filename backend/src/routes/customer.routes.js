const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { 
  createCustomerSchema, 
  updateCustomerSchema,
  importCustomersSchema 
} = require('../utils/validators');

router.use(authenticate);

// Rotas principais
router.get('/', authorize('manager'), customerController.listCustomers);
router.get('/dashboard', authorize('manager'), customerController.getDashboard);
router.get('/export', authorize('manager'), customerController.exportCustomers);
router.get('/email/:email', authorize('manager'), customerController.findByEmail);
router.get('/:id', authorize('manager'), customerController.getCustomer);
router.post('/', authorize('manager'), validate(createCustomerSchema), customerController.createCustomer);
router.put('/:id', authorize('manager'), validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', authorize('admin'), customerController.deleteCustomer);

// Importação em lote
router.post('/import', authorize('manager'), validate(importCustomersSchema), customerController.importCustomers);

module.exports = router;
