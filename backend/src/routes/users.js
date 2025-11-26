const express = require('express');
const { body } = require('express-validator');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword,
    toggleTwoFactor
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validações
const updateProfileValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('phone')
        .optional()
        .trim()
        .isMobilePhone('pt-BR')
        .withMessage('Telefone inválido')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Senha atual é obrigatória'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nova senha deve ter no mínimo 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas, números e símbolos'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Senhas não coincidem');
            }
            return true;
        })
];

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de perfil do usuário logado
router.get('/profile', getUser);
router.put('/profile', updateProfileValidation, updateProfile);
router.patch('/change-password', changePasswordValidation, changePassword);
router.patch('/toggle-two-factor', toggleTwoFactor);

// Rotas administrativas (apenas admin)
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.put('/:id', authorize('admin'), updateProfileValidation, updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
