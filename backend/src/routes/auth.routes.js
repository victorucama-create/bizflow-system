const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validation');
const { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema 
} = require('../utils/validators');

// Rotas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/verify-token', authController.verifyToken);

// Rotas protegidas
router.get('/profile', authController.authenticate, authController.getProfile);
router.put('/profile', authController.authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authController.authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/logout', authController.authenticate, authController.logout);

module.exports = router;
