const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticate, authorize, authorizeAny } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { createSaleSchema, cancelSaleSchema } = require('../utils/validators');

router.use(authenticate);

// Rotas principais de vendas
router.get('/', authorizeAny(['admin', 'manager', 'cashier']), saleController.listSales);
router.get('/dashboard', authorizeAny(['admin', 'manager']), saleController.getDashboard);
router.get('/today', authorizeAny(['admin', 'manager', 'cashier']), saleController.getTodaySales);
router.get('/:id', authorizeAny(['admin', 'manager', 'cashier']), saleController.getSale);
router.get('/:id/receipt', authorizeAny(['admin', 'manager', 'cashier']), saleController.generateReceipt);

// POS - Ponto de Venda
router.post('/pos/checkout', authorizeAny(['admin', 'cashier']), validate(createSaleSchema), saleController.createSale);
router.post('/pos/open-cash-drawer', authorizeAny(['admin', 'cashier']), saleController.openCashDrawer);
router.post('/pos/close-cash-drawer', authorizeAny(['admin', 'cashier']), saleController.closeCashDrawer);
router.get('/pos/cash-drawer/status', authorizeAny(['admin', 'cashier']), saleController.getCashDrawerStatus);

// Gestão de vendas
router.post('/:id/cancel', authorizeAny(['admin', 'manager']), validate(cancelSaleSchema), saleController.cancelSale);
router.post('/:id/refund', authorize('admin'), saleController.refundSale);
router.get('/:id/invoice', authorizeAny(['admin', 'manager']), saleController.generateInvoice);

// Relatórios
router.get('/reports/daily', authorizeAny(['admin', 'manager']), saleController.getDailyReport);
router.get('/reports/monthly', authorizeAny(['admin', 'manager']), saleController.getMonthlyReport);
router.get('/reports/top-products', authorizeAny(['admin', 'manager']), saleController.getTopProducts);
router.get('/reports/top-customers', authorizeAny(['admin', 'manager']), saleController.getTopCustomers);

// Exportação
router.get('/export/csv', authorizeAny(['admin', 'manager']), saleController.exportSalesCSV);
router.get('/export/pdf', authorizeAny(['admin', 'manager']), saleController.exportSalesPDF);

module.exports = router;
