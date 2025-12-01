const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { 
  createProductSchema, 
  updateProductSchema, 
  adjustStockSchema,
  importProductsSchema 
} = require('../utils/validators');
const upload = require('../middleware/upload');

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas principais
router.get('/', productController.listProducts);
router.get('/dashboard', productController.getDashboard);
router.get('/export', productController.exportProducts);
router.get('/search/:code', productController.findByCode);
router.get('/:id', productController.getProduct);
router.post('/', authorize('manager'), validate(createProductSchema), productController.createProduct);
router.put('/:id', authorize('manager'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authorize('admin'), productController.deleteProduct);

// Rotas de estoque
router.post('/:id/adjust-stock', authorize('manager'), validate(adjustStockSchema), productController.adjustStock);
router.post('/import', authorize('manager'), validate(importProductsSchema), productController.importProducts);

// Upload de imagem
router.post('/:id/upload-image', authorize('manager'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Atualizar URL da imagem
    product.imageUrl = `/uploads/products/${req.file.filename}`;
    await product.save();

    res.json({
      message: 'Imagem uploadada com sucesso',
      imageUrl: product.imageUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

module.exports = router;
