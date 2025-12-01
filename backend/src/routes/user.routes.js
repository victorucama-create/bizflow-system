const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { 
  createUserSchema, 
  updateUserSchema,
  changeUserPasswordSchema,
  toggleUserStatusSchema 
} = require('../utils/validators');

router.use(authenticate);

// Rotas de admin
router.get('/', authorize('admin'), userController.listUsers);
router.get('/dashboard', authorize('admin'), userController.getUsersDashboard);
router.get('/export', authorize('admin'), userController.exportUsers);
router.get('/company/:companyName', authorize('manager'), userController.getUsersByCompany);
router.get('/:id/audit-log', userController.getUserAuditLog);
router.get('/:id', userController.getUser);
router.post('/', authorize('admin'), validate(createUserSchema), userController.createUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

// Rotas de status
router.post('/:id/toggle-status', authorize('manager'), validate(toggleUserStatusSchema), userController.toggleUserStatus);
router.post('/:id/change-password', authorize('admin'), validate(changeUserPasswordSchema), userController.changeUserPassword);
router.post('/:id/resend-verification', userController.resendVerificationEmail);

module.exports = router;
