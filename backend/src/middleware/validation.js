const { validationResult } = require('express-validator');

// Middleware para validar requisições
const validate = (schemas) => {
  return async (req, res, next) => {
    // Executar todas as validações
    await Promise.all(schemas.map(schema => schema.run(req)));
    
    // Verificar erros
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    
    next();
  };
};

// Middleware para validar ID
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        details: `O parâmetro ${paramName} deve ser um UUID válido`
      });
    }
    
    next();
  };
};

// Middleware para validar paginação
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      error: 'Parâmetro page deve ser um número maior que 0'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
    return res.status(400).json({
      error: 'Parâmetro limit deve ser um número entre 1 e 200'
    });
  }
  
  next();
};

module.exports = {
  validate,
  validateId,
  validatePagination
};
