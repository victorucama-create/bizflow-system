const { body, param, query, validationResult } = require('express-validator');

// Configuração de roles
const roles = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  CASHIER: 'cashier'
};

// ============================================
// VALIDAÇÕES DE AUTENTICAÇÃO
// ============================================

const registerSchema = [
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  
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
    .isLength({ min: 2, max: 200 }).withMessage('Nome da empresa deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim()
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
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim(),
  
  body('avatar')
    .optional()
    .isURL().withMessage('Avatar deve ser uma URL válida')
];

// ============================================
// VALIDAÇÕES DE USUÁRIOS
// ============================================

const createUserSchema = [
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'),
  
  body('role')
    .optional()
    .isIn(Object.values(roles)).withMessage(`Cargo inválido. Valores permitidos: ${Object.values(roles).join(', ')}`),
  
  body('companyName')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome da empresa deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim()
];

const updateUserSchema = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(Object.values(roles)).withMessage(`Cargo inválido. Valores permitidos: ${Object.values(roles).join(', ')}`),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('Status deve ser verdadeiro ou falso')
    .toBoolean(),
  
  body('companyName')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome da empresa deve ter entre 2 e 200 caracteres')
    .trim()
];

const changeUserPasswordSchema = [
  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número')
];

const toggleUserStatusSchema = [
  body('action')
    .notEmpty().withMessage('Ação é obrigatória')
    .isIn(['activate', 'deactivate']).withMessage('Ação deve ser activate ou deactivate')
];

// ============================================
// VALIDAÇÕES DE PRODUTOS
// ============================================

const createProductSchema = [
  body('sku')
    .notEmpty().withMessage('SKU é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('SKU deve ter entre 2 e 100 caracteres')
    .trim(),
  
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Descrição não pode exceder 1000 caracteres')
    .trim(),
  
  body('category')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isLength({ min: 2, max: 100 }).withMessage('Categoria deve ter entre 2 e 100 caracteres')
    .trim(),
  
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
  
  body('maxStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque máximo não pode ser negativo')
    .toInt(),
  
  body('barcode')
    .optional()
    .isLength({ max: 100 }).withMessage('Código de barras não pode exceder 100 caracteres')
    .trim(),
  
  body('unit')
    .optional()
    .isLength({ max: 20 }).withMessage('Unidade não pode exceder 20 caracteres')
    .trim(),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 }).withMessage('Peso não pode ser negativo')
    .toFloat(),
  
  body('dimensions')
    .optional()
    .isLength({ max: 100 }).withMessage('Dimensões não podem exceder 100 caracteres')
    .trim(),
  
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Taxa deve ser entre 0 e 100')
    .toFloat(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'discontinued']).withMessage('Status inválido'),
  
  body('location')
    .optional()
    .isLength({ max: 100 }).withMessage('Localização não pode exceder 100 caracteres')
    .trim(),
  
  body('imageUrl')
    .optional()
    .isURL().withMessage('URL da imagem inválida')
];

const updateProductSchema = [
  body('sku')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('SKU deve ter entre 2 e 100 caracteres')
    .trim(),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que 0')
    .toFloat(),
  
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Custo não pode ser negativo')
    .toFloat(),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque não pode ser negativo')
    .toInt(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'discontinued']).withMessage('Status inválido')
];

const adjustStockSchema = [
  body('adjustment')
    .notEmpty().withMessage('Ajuste é obrigatório')
    .isInt().withMessage('Ajuste deve ser um número inteiro')
    .toInt(),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notas não podem exceder 500 caracteres')
    .trim(),
  
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Custo não pode ser negativo')
    .toFloat()
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
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres'),
  
  body('*.price')
    .notEmpty().withMessage('Preço é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que 0'),
  
  body('*.cost')
    .notEmpty().withMessage('Custo é obrigatório')
    .isFloat({ min: 0 }).withMessage('Custo não pode ser negativo'),
  
  body('*.stock')
    .notEmpty().withMessage('Estoque é obrigatório')
    .isInt({ min: 0 }).withMessage('Estoque não pode ser negativo')
];

// ============================================
// VALIDAÇÕES DE CLIENTES
// ============================================

const createCustomerSchema = [
  body('name')
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim(),
  
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
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
    .withMessage('CNPJ inválido (formato: 00.000.000/0000-00)')
    .trim(),
  
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Endereço não pode exceder 500 caracteres')
    .trim(),
  
  body('city')
    .optional()
    .isLength({ max: 100 }).withMessage('Cidade não pode exceder 100 caracteres')
    .trim(),
  
  body('state')
    .optional()
    .isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres')
    .trim(),
  
  body('zipCode')
    .optional()
    .matches(/^\d{5}-\d{3}$/)
    .withMessage('CEP inválido (formato: 00000-000)')
    .trim(),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Observações não podem exceder 1000 caracteres')
    .trim()
];

const updateCustomerSchema = [
  body('email')
    .optional()
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Nome deve ter entre 2 e 200 caracteres')
    .trim(),
  
  body('phone')
    .optional()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone inválido')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['individual', 'company']).withMessage('Tipo deve ser individual ou company'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'blocked']).withMessage('Status inválido'),
  
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Endereço não pode exceder 500 caracteres')
    .trim()
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
    .normalizeEmail(),
  
  body('*.type')
    .optional()
    .isIn(['individual', 'company']).withMessage('Tipo deve ser individual ou company')
];

// ============================================
// VALIDAÇÕES DE VENDAS
// ============================================

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
    .toFloat(),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Observações não podem exceder 500 caracteres')
    .trim(),
  
  body('location')
    .optional()
    .isLength({ max: 100 }).withMessage('Localização não pode exceder 100 caracteres')
    .trim(),
  
  body('paymentDetails')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'object' || value === null) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }).withMessage('Detalhes do pagamento devem ser um objeto válido')
];

const cancelSaleSchema = [
  body('reason')
    .notEmpty().withMessage('Motivo do cancelamento é obrigatório')
    .isLength({ min: 5, max: 500 }).withMessage('Motivo deve ter entre 5 e 500 caracteres')
    .trim()
];

// ============================================
// VALIDAÇÕES DE TRANSAÇÕES FINANCEIRAS
// ============================================

const createTransactionSchema = [
  body('date')
    .notEmpty().withMessage('Data é obrigatória')
    .isISO8601().withMessage('Data inválida')
    .toDate(),
  
  body('description')
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 3, max: 200 }).withMessage('Descrição deve ter entre 3 e 200 caracteres')
    .trim(),
  
  body('category')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isLength({ min: 2, max: 50 }).withMessage('Categoria deve ter entre 2 e 50 caracteres')
    .trim(),
  
  body('amount')
    .notEmpty().withMessage('Valor é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat(),
  
  body('type')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['income', 'expense']).withMessage('Tipo deve ser income ou expense'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Observações não podem exceder 1000 caracteres')
    .trim(),
  
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido'),
  
  body('referenceId')
    .optional()
    .isUUID().withMessage('ID de referência inválido'),
  
  body('referenceType')
    .optional()
    .isLength({ max: 50 }).withMessage('Tipo de referência não pode exceder 50 caracteres')
    .trim()
];

const updateTransactionSchema = [
  body('description')
    .optional()
    .isLength({ min: 3, max: 200 }).withMessage('Descrição deve ter entre 3 e 200 caracteres')
    .trim(),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat(),
  
  body('date')
    .optional()
    .isISO8601().withMessage('Data inválida')
    .toDate(),
  
  body('category')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Categoria deve ter entre 2 e 50 caracteres')
    .trim(),
  
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Observações não podem exceder 1000 caracteres')
    .trim()
];

// ============================================
// VALIDAÇÕES DE DOCUMENTOS
// ============================================

const createDocumentSchema = [
  body('type')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['invoice', 'purchase_order', 'requisition', 'contract', 'other']).withMessage('Tipo inválido'),
  
  body('description')
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 5, max: 500 }).withMessage('Descrição deve ter entre 5 e 500 caracteres')
    .trim(),
  
  body('amount')
    .notEmpty().withMessage('Valor é obrigatório')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0')
    .toFloat(),
  
  body('date')
    .notEmpty().withMessage('Data é obrigatória')
    .isISO8601().withMessage('Data inválida')
    .toDate(),
  
  body('customerId')
    .optional()
    .isUUID().withMessage('ID do cliente inválido'),
  
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Data de vencimento inválida')
    .toDate(),
  
  body('requiresApproval')
    .optional()
    .isBoolean().withMessage('Require aprovação deve ser verdadeiro ou falso')
    .toBoolean(),
  
  body('content')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'object' || value === null) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }).withMessage('Conteúdo deve ser um objeto válido'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'signed', 'rejected', 'cancelled']).withMessage('Status inválido')
];

// ============================================
// VALIDAÇÕES DE INVENTÁRIO
// ============================================

const createInventoryMovementSchema = [
  body('productId')
    .notEmpty().withMessage('ID do produto é obrigatório')
    .isUUID().withMessage('ID do produto inválido'),
  
  body('type')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['entry', 'withdrawal', 'adjustment', 'initial', 'sale', 'return', 'loss', 'transfer']).withMessage('Tipo inválido'),
  
  body('quantity')
    .notEmpty().withMessage('Quantidade é obrigatória')
    .isInt().withMessage('Quantidade deve ser um número inteiro')
    .toInt(),
  
  body('unitCost')
    .notEmpty().withMessage('Custo unitário é obrigatório')
    .isFloat({ min: 0 }).withMessage('Custo unitário não pode ser negativo')
    .toFloat(),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notas não podem exceder 500 caracteres')
    .trim(),
  
  body('referenceId')
    .optional()
    .isUUID().withMessage('ID de referência inválido'),
  
  body('referenceType')
    .optional()
    .isLength({ max: 50 }).withMessage('Tipo de referência não pode exceder 50 caracteres')
    .trim(),
  
  body('locationFrom')
    .optional()
    .isLength({ max: 100 }).withMessage('Local de origem não pode exceder 100 caracteres')
    .trim(),
  
  body('locationTo')
    .optional()
    .isLength({ max: 100 }).withMessage('Local de destino não pode exceder 100 caracteres')
    .trim()
];

// ============================================
// VALIDAÇÕES DE ASSINATURA
// ============================================

const createSubscriptionSchema = [
  body('plan')
    .notEmpty().withMessage('Plano é obrigatório')
    .isIn(['free', 'basic', 'pro', 'enterprise']).withMessage('Plano inválido'),
  
  body('status')
    .optional()
    .isIn(['active', 'canceled', 'expired', 'pending']).withMessage('Status inválido'),
  
  body('currentPeriodStart')
    .notEmpty().withMessage('Início do período é obrigatório')
    .isISO8601().withMessage('Data de início inválida')
    .toDate(),
  
  body('currentPeriodEnd')
    .notEmpty().withMessage('Fim do período é obrigatório')
    .isISO8601().withMessage('Data de fim inválida')
    .toDate(),
  
  body('cancelAtPeriodEnd')
    .optional()
    .isBoolean().withMessage('Cancelar ao fim do período deve ser verdadeiro ou falso')
    .toBoolean(),
  
  body('metadata')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'object' || value === null) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }).withMessage('Metadados devem ser um objeto válido')
];

// ============================================
// VALIDAÇÕES DE ASSINATURA DIGITAL
// ============================================

const signDocumentSchema = [
  body('password')
    .notEmpty().withMessage('Senha é obrigatória'),
  
  body('consent')
    .notEmpty().withMessage('Consentimento é obrigatório')
    .isBoolean().withMessage('Consentimento deve ser verdadeiro ou falso')
    .custom(value => value === true).withMessage('Você deve concordar com os termos do documento'),
  
  body('signatureData')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'object' || value === null) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }).withMessage('Dados da assinatura devem ser um objeto válido')
];

// ============================================
// VALIDAÇÕES DE PARÂMETROS DE QUERY
// ============================================

const paginationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página deve ser um número maior que 0')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Limite deve ser entre 1 e 200')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isLength({ max: 50 }).withMessage('Campo de ordenação não pode exceder 50 caracteres')
    .trim(),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Ordem deve ser ASC ou DESC')
    .toUpperCase()
];

const dateRangeSchema = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Data inicial inválida')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Data final inválida')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('Data final não pode ser anterior à data inicial');
      }
      return true;
    })
];

const searchSchema = [
  query('search')
    .optional()
    .isLength({ max: 100 }).withMessage('Termo de busca não pode exceder 100 caracteres')
    .trim()
];

// ============================================
// VALIDAÇÕES DE PARÂMETROS DE URL
// ============================================

const uuidParamSchema = [
  param('id')
    .notEmpty().withMessage('ID é obrigatório')
    .isUUID().withMessage('ID inválido')
];

const emailParamSchema = [
  param('email')
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail()
];

// ============================================
// VALIDAÇÕES DE FILTROS ESPECÍFICOS
// ============================================

const productFilterSchema = [
  query('category')
    .optional()
    .isLength({ max: 100 }).withMessage('Categoria não pode exceder 100 caracteres')
    .trim(),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'discontinued']).withMessage('Status inválido'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Preço mínimo não pode ser negativo')
    .toFloat(),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Preço máximo não pode ser negativo')
    .toFloat(),
  
  query('lowStock')
    .optional()
    .isBoolean().withMessage('Low stock deve ser verdadeiro ou falso')
    .toBoolean()
];

const saleFilterSchema = [
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled', 'refunded']).withMessage('Status inválido'),
  
  query('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'pix', 'multiple']).withMessage('Método de pagamento inválido'),
  
  query('customerId')
    .optional()
    .isUUID().withMessage('ID do cliente inválido')
];

const customerFilterSchema = [
  query('type')
    .optional()
    .isIn(['individual', 'company']).withMessage('Tipo inválido'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'blocked']).withMessage('Status inválido'),
  
  query('minPurchases')
    .optional()
    .isFloat({ min: 0 }).withMessage('Compras mínimas não podem ser negativas')
    .toFloat(),
  
  query('maxPurchases')
    .optional()
    .isFloat({ min: 0 }).withMessage('Compras máximas não podem ser negativas')
    .toFloat()
];

const transactionFilterSchema = [
  query('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Tipo inválido'),
  
  query('category')
    .optional()
    .isLength({ max: 50 }).withMessage('Categoria não pode exceder 50 caracteres')
    .trim(),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido'),
  
  query('minAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Valor mínimo não pode ser negativo')
    .toFloat(),
  
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Valor máximo não pode ser negativo')
    .toFloat()
];

// ============================================
// FUNÇÃO AUXILIAR PARA VALIDAÇÃO
// ============================================

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errorMessages
    });
  }
  
  next();
};

// ============================================
// VALIDAÇÕES COMPOSTAS (COMBINAÇÕES)
// ============================================

const listProductsSchema = [
  ...paginationSchema,
  ...productFilterSchema,
  ...searchSchema,
  ...dateRangeSchema
];

const listSalesSchema = [
  ...paginationSchema,
  ...saleFilterSchema,
  ...searchSchema,
  ...dateRangeSchema
];

const listCustomersSchema = [
  ...paginationSchema,
  ...customerFilterSchema,
  ...searchSchema,
  ...dateRangeSchema
];

const listTransactionsSchema = [
  ...paginationSchema,
  ...transactionFilterSchema,
  ...searchSchema,
  ...dateRangeSchema
];

const listUsersSchema = [
  ...paginationSchema,
  query('role')
    .optional()
    .isIn(Object.values(roles)).withMessage(`Cargo inválido. Valores permitidos: ${Object.values(roles).join(', ')}`),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status inválido'),
  ...searchSchema
];

// ============================================
// EXPORTAÇÃO
// ============================================

module.exports = {
  // Configuração
  roles,
  validateRequest,
  
  // Autenticação
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  
  // Usuários
  createUserSchema,
  updateUserSchema,
  changeUserPasswordSchema,
  toggleUserStatusSchema,
  listUsersSchema,
  
  // Produtos
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  importProductsSchema,
  listProductsSchema,
  
  // Clientes
  createCustomerSchema,
  updateCustomerSchema,
  importCustomersSchema,
  listCustomersSchema,
  
  // Vendas
  createSaleSchema,
  cancelSaleSchema,
  listSalesSchema,
  
  // Financeiro
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsSchema,
  
  // Documentos
  createDocumentSchema,
  
  // Inventário
  createInventoryMovementSchema,
  
  // Assinatura
  createSubscriptionSchema,
  signDocumentSchema,
  
  // Parâmetros
  paginationSchema,
  dateRangeSchema,
  searchSchema,
  uuidParamSchema,
  emailParamSchema,
  
  // Schemas compostos
  listProductsSchema,
  listSalesSchema,
  listCustomersSchema,
  listTransactionsSchema
};
