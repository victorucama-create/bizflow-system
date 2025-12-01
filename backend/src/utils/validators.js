const { body, param, query } = require('express-validator');

// Validações de autenticação
const registerSchema = [
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'),
  
  body('companyName')
    .notEmpty().withMessage('Nome da empresa é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome da empresa deve ter entre 2 e 200 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
];

const loginSchema = [
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
];

const forgotPasswordSchema = [
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail()
];

const resetPasswordSchema = [
  body('token')
    .notEmpty().withMessage('Token é obrigatório'),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número')
];

const changePasswordSchema = [
  body('currentPassword')
    .notEmpty().withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('Nova senha deve ser diferente da senha atual')
];

const updateProfileSchema = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
];

// Validações de produtos
const createProductSchema = [
  body('sku')
    .notEmpty().withMessage('SKU é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('SKU deve ter entre 2 e 100 caracteres'),
  
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres'),
  
  body('category')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isLength({ min: 2, max: 100 }).withMessage('Categoria deve ter entre 2 e 100 caracteres'),
  
  body('price')
    .notEmpty().withMessage('Preço é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que 0')
    .toFloat(),
  
  body('cost')
    .notEmpty().withMessage('Custo é obrigatório')
    .isFloat({ min: 0 }).withMessage('Custo não pode ser negativo')
    .toFloat(),
  
  body('stock')
    .notEmpty().withMessage('Estoque é obrigatório')
    .isInt({ min: 0 }).withMessage('Estoque não pode ser negativo')
    .toInt(),
  
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque mínimo não pode ser negativo')
    .toInt(),
  
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Taxa deve ser entre 0 e 100')
    .toFloat()
];

const updateProductSchema = [
  body('sku')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('SKU deve ter entre 2 e 100 caracteres'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres'),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que 0')
    .toFloat(),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque não pode ser negativo')
    .toInt()
];

const adjustStockSchema = [
  body('adjustment')
    .notEmpty().withMessage('Ajuste é obrigatório')
    .isInt().withMessage('Ajuste deve ser um número inteiro'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notas não podem exceder 500 caracteres')
];

const importProductsSchema = [
  body()
    .isArray({ min: 1 }).withMessage('Array de produtos é obrigatório')
    .custom((products) => products.length <= 100).withMessage('Máximo de 100 produtos por importação'),
  
  body('*.sku')
    .notEmpty().withMessage('SKU é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('SKU deve ter entre 2 e 100 caracteres'),
  
  body('*.name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
];

// Validações de clientes
const createCustomerSchema = [
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres'),
  
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('type')
    .optional()
    .isIn(['individual', 'company']).withMessage('Tipo deve ser individual ou company'),
  
  body('taxId')
    .optional()
    .custom((value, { req }) => {
      if (req.body.type === 'company' && !value) {
        throw new Error('CNPJ é obrigatório para pessoa jurídica');
      }
      return true;
    })
];

const updateCustomerSchema = [
  body('email')
    .optional()
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
];

const importCustomersSchema = [
  body()
    .isArray({ min: 1 }).withMessage('Array de clientes é obrigatório')
    .custom((customers) => customers.length <= 100).withMessage('Máximo de 100 clientes por importação'),
  
  body('*.name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres'),
  
  body('*.email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail()
];

// Validações de vendas
const createSaleSchema = [
  body('items')
    .notEmpty().withMessage('Itens são obrigatórios')
    .isArray({ min: 1 }).withMessage('Deve conter pelo menos um item'),
  
  body('items.*.productId')
    .notEmpty().withMessage('ID do produto é obrigatório')
    .isUUID().withMessage('ID do produto inválido'),
  
  body('items.*.quantity')
    .notEmpty().withMessage('Quantidade é obrigatória')
    .isInt({ min: 1 }).withMessage('Quantidade deve ser maior que 0')
    .toInt(),
  
  body('paymentMethod')
    .notEmpty().withMessage('Método de pagamento é obrigatório')
    .isIn(['cash', 'card', 'transfer', 'pix', 'multiple']).withMessage('Método de pagamento inválido'),
  
  body('customerId')
    .optional()
    .isUUID().withMessage('ID do cliente inválido'),
  
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Desconto não pode ser negativo')
    .toFloat()
];

const cancelSaleSchema = [
  body('reason')
    .notEmpty().withMessage('Motivo do cancelamento é obrigatório')
    .isLength({ min: 5, max: 500 }).withMessage('Motivo deve ter entre 5 e 500 caracteres')
];

// Validações de transações financeiras
const createTransactionSchema = [
  body('date')
    .notEmpty().withMessage('Data é obrigatória')
    .isISO8601().withMessage('Data inválida'),
  
  body('description')
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 3, max: 200 }).withMessage('Descrição deve ter entre 3 e 200 caracteres'),
  
  body('category')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isLength({ min: 2, max: 50 }).withMessage('Categoria deve ter entre 2 e 50 caracteres'),
  
  body('amount')
    .notEmpty().withMessage('Valor é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat(),
  
  body('type')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['income', 'expense']).withMessage('Tipo deve ser income ou expense')
];

const updateTransactionSchema = [
  body('description')
    .optional()
    .isLength({ min: 3, max: 200 }).withMessage('Descrição deve ter entre 3 e 200 caracteres'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat()
];

// Validações de documentos
const createDocumentSchema = [
  body('type')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['invoice', 'purchase_order', 'requisition', 'contract', 'other']).withMessage('Tipo inválido'),
  
  body('description')
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 5, max: 500 }).withMessage('Descrição deve ter entre 5 e 500 caracteres'),
  
  body('amount')
    .notEmpty().withMessage('Valor é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat(),
  
  body('date')
    .notEmpty().withMessage('Data é obrigatória')
    .isISO8601().withMessage('Data inválida'),
  
  body('customerId')
    .optional()
    .isUUID().withMessage('ID do cliente inválido')
];

// Validações de parâmetros de query
const paginationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página deve ser um número maior que 0')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Limite deve ser entre 1 e 200')
    .toInt()
];

const dateRangeSchema = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Data inicial inválida'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Data final inválida')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('Data final não pode ser anterior à data inicial');
      }
      return true;
    })
];

module.exports = {
  // Autenticação
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  
  // Produtos
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  importProductsSchema,
  
  // Clientes
  createCustomerSchema,
  updateCustomerSchema,
  importCustomersSchema,
  
  // Vendas
  createSaleSchema,
  cancelSaleSchema,
  
  // Financeiro
  createTransactionSchema,
  updateTransactionSchema,
  
  // Documentos
  createDocumentSchema,
  
  // Query params
  paginationSchema,
  dateRangeSchema
};
