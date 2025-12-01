const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const SecurityLog = require('../models/SecurityLog');
const securityService = require('../services/securityService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class ProductController {
  // Listar produtos
  async listProducts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        status, 
        search,
        minPrice,
        maxPrice,
        lowStock = false
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = {};
      const userId = req.user.userId;
      
      // Filtros
      where.userId = userId;
      
      if (category) {
        where.category = category;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
      }
      
      if (lowStock === 'true') {
        where.stock = {
          [Op.lte]: sequelize.col('minStock')
        };
      }
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Buscar produtos
      const { count, rows: products } = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      // Calcular estatísticas
      const totalValue = await Product.sum('cost', {
        where: { userId, stock: { [Op.gt]: 0 } }
      }) || 0;
      
      const lowStockCount = await Product.count({
        where: {
          userId,
          stock: {
            [Op.lte]: sequelize.col('minStock')
          },
          status: 'active'
        }
      });
      
      const outOfStockCount = await Product.count({
        where: {
          userId,
          stock: 0,
          status: 'active'
        }
      });
      
      // Log de consulta
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCTS_LISTED',
        description: 'Lista de produtos consultada',
        ipAddress: req.ip,
        details: {
          filters: req.query,
          count
        }
      });
      
      res.json({
        products,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        statistics: {
          totalValue: parseFloat(totalValue).toFixed(2),
          lowStockCount,
          outOfStockCount,
          totalProducts: count
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar produtos:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCTS_LIST_ERROR',
        description: 'Erro ao listar produtos',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao listar produtos.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Buscar produto por ID
  async getProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const product = await Product.findOne({
        where: { id, userId }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Log de consulta
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCT_VIEWED',
        description: `Produto visualizado: ${product.name}`,
        ipAddress: req.ip,
        details: { productId: id }
      });
      
      res.json({ product });
      
    } catch (error) {
      logger.error('Erro ao buscar produto:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCT_VIEW_ERROR',
        description: 'Erro ao visualizar produto',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao buscar produto.'
      });
    }
  }
  
  // Criar produto
  async createProduct(req, res) {
    try {
      const userId = req.user.userId;
      const productData = req.body;
      
      // Verificar se SKU já existe
      const existingProduct = await Product.findOne({
        where: { 
          sku: productData.sku,
          userId 
        }
      });
      
      if (existingProduct) {
        return res.status(400).json({
          error: 'Já existe um produto com este SKU.'
        });
      }
      
      // Criar produto
      const product = await Product.create({
        ...productData,
        userId
      });
      
      // Registrar movimento no inventário
      if (productData.stock > 0) {
        await Inventory.create({
          productId: product.id,
          userId,
          type: 'initial',
          quantity: productData.stock,
          previousQuantity: 0,
          newQuantity: productData.stock,
          cost: productData.cost,
          notes: 'Estoque inicial'
        });
      }
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCT_CREATED',
        description: `Produto criado: ${product.name}`,
        ipAddress: req.ip,
        details: {
          productId: product.id,
          sku: product.sku,
          stock: product.stock
        }
      });
      
      res.status(201).json({
        message: 'Produto criado com sucesso!',
        product
      });
      
    } catch (error) {
      logger.error('Erro ao criar produto:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCT_CREATION_ERROR',
        description: 'Erro ao criar produto',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar produto.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Atualizar produto
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      // Buscar produto
      const product = await Product.findOne({
        where: { id, userId }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Verificar se novo SKU já existe
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await Product.findOne({
          where: { 
            sku: updateData.sku,
            userId 
          }
        });
        
        if (existingProduct) {
          return res.status(400).json({
            error: 'Já existe um produto com este SKU.'
          });
        }
      }
      
      // Registrar mudança de estoque
      if (updateData.stock !== undefined && updateData.stock !== product.stock) {
        await Inventory.create({
          productId: product.id,
          userId,
          type: 'adjustment',
          quantity: updateData.stock - product.stock,
          previousQuantity: product.stock,
          newQuantity: updateData.stock,
          cost: product.cost,
          notes: updateData.adjustmentNotes || 'Ajuste manual de estoque'
        });
      }
      
      // Atualizar produto
      await product.update(updateData);
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCT_UPDATED',
        description: `Produto atualizado: ${product.name}`,
        ipAddress: req.ip,
        details: {
          productId: product.id,
          updatedFields: Object.keys(updateData)
        }
      });
      
      res.json({
        message: 'Produto atualizado com sucesso!',
        product
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar produto:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCT_UPDATE_ERROR',
        description: 'Erro ao atualizar produto',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao atualizar produto.'
      });
    }
  }
  
  // Excluir produto
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const product = await Product.findOne({
        where: { id, userId }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Verificar se há estoque
      if (product.stock > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir produto com estoque disponível.'
        });
      }
      
      // Verificar se há vendas relacionadas
      const hasSales = await Sale.findOne({
        where: {
          items: {
            [Op.contains]: [{ productId: id }]
          }
        }
      });
      
      if (hasSales) {
        // Marcar como descontinuado em vez de excluir
        await product.update({ status: 'discontinued' });
        
        await securityService.logSecurityEvent({
          userId,
          action: 'PRODUCT_DISCONTINUED',
          description: `Produto marcado como descontinuado: ${product.name}`,
          ipAddress: req.ip,
          details: { productId: id }
        });
        
        return res.json({
          message: 'Produto marcado como descontinuado (não pode ser excluído por ter vendas relacionadas).',
          product
        });
      }
      
      // Excluir produto
      await product.destroy();
      
      // Log de exclusão
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCT_DELETED',
        description: `Produto excluído: ${product.name}`,
        ipAddress: req.ip,
        details: { productId: id }
      });
      
      res.json({
        message: 'Produto excluído com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao excluir produto:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCT_DELETION_ERROR',
        description: 'Erro ao excluir produto',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao excluir produto.'
      });
    }
  }
  
  // Ajustar estoque
  async adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { adjustment, notes, cost } = req.body;
      const userId = req.user.userId;
      
      const product = await Product.findOne({
        where: { id, userId }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Calcular novo estoque
      const newStock = product.stock + adjustment;
      
      if (newStock < 0) {
        return res.status(400).json({
          error: 'Estoque não pode ser negativo.'
        });
      }
      
      // Registrar movimento
      await Inventory.create({
        productId: product.id,
        userId,
        type: adjustment > 0 ? 'entry' : 'withdrawal',
        quantity: Math.abs(adjustment),
        previousQuantity: product.stock,
        newQuantity: newStock,
        cost: cost || product.cost,
        notes: notes || `Ajuste de estoque: ${adjustment > 0 ? '+' : ''}${adjustment}`
      });
      
      // Atualizar estoque do produto
      await product.update({ stock: newStock });
      
      // Log de ajuste
      await securityService.logSecurityEvent({
        userId,
        action: 'STOCK_ADJUSTED',
        description: `Estoque ajustado para produto: ${product.name}`,
        ipAddress: req.ip,
        details: {
          productId: id,
          adjustment,
          previousStock: product.stock,
          newStock
        }
      });
      
      res.json({
        message: 'Estoque ajustado com sucesso!',
        product
      });
      
    } catch (error) {
      logger.error('Erro ao ajustar estoque:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'STOCK_ADJUSTMENT_ERROR',
        description: 'Erro ao ajustar estoque',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao ajustar estoque.'
      });
    }
  }
  
  // Buscar por SKU ou código de barras
  async findByCode(req, res) {
    try {
      const { code } = req.params;
      const userId = req.user.userId;
      
      const product = await Product.findOne({
        where: {
          userId,
          [Op.or]: [
            { sku: code },
            { barcode: code }
          ]
        }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Log de consulta
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCT_SEARCH_BY_CODE',
        description: `Produto buscado por código: ${code}`,
        ipAddress: req.ip,
        details: { code, productId: product.id }
      });
      
      res.json({ product });
      
    } catch (error) {
      logger.error('Erro ao buscar produto por código:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCT_SEARCH_ERROR',
        description: 'Erro ao buscar produto por código',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao buscar produto.'
      });
    }
  }
  
  // Importar produtos em lote
  async importProducts(req, res) {
    try {
      const userId = req.user.userId;
      const products = req.body;
      
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          error: 'Array de produtos é obrigatório.'
        });
      }
      
      if (products.length > 100) {
        return res.status(400).json({
          error: 'Limite de 100 produtos por importação.'
        });
      }
      
      const results = {
        success: [],
        errors: []
      };
      
      for (const productData of products) {
        try {
          // Verificar SKU único
          const existingProduct = await Product.findOne({
            where: { sku: productData.sku, userId }
          });
          
          if (existingProduct) {
            results.errors.push({
              sku: productData.sku,
              error: 'SKU já existe'
            });
            continue;
          }
          
          // Criar produto
          const product = await Product.create({
            ...productData,
            userId
          });
          
          // Registrar estoque inicial
          if (productData.stock > 0) {
            await Inventory.create({
              productId: product.id,
              userId,
              type: 'initial',
              quantity: productData.stock,
              previousQuantity: 0,
              newQuantity: productData.stock,
              cost: productData.cost,
              notes: 'Importação em lote'
            });
          }
          
          results.success.push(product);
        } catch (error) {
          results.errors.push({
            sku: productData.sku,
            error: error.message
          });
        }
      }
      
      // Log de importação
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCTS_IMPORTED',
        description: `Produtos importados em lote: ${results.success.length} sucesso, ${results.errors.length} erros`,
        ipAddress: req.ip,
        details: {
          total: products.length,
          success: results.success.length,
          errors: results.errors.length
        }
      });
      
      res.json({
        message: `Importação concluída: ${results.success.length} produtos importados, ${results.errors.length} erros.`,
        results
      });
      
    } catch (error) {
      logger.error('Erro na importação de produtos:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCTS_IMPORT_ERROR',
        description: 'Erro na importação de produtos em lote',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro na importação de produtos.'
      });
    }
  }
  
  // Exportar produtos
  async exportProducts(req, res) {
    try {
      const userId = req.user.userId;
      const { format = 'json' } = req.query;
      
      const products = await Product.findAll({
        where: { userId },
        attributes: [
          'sku', 'name', 'description', 'category', 'price', 
          'cost', 'stock', 'minStock', 'barcode', 'unit', 
          'weight', 'dimensions', 'taxRate', 'status'
        ]
      });
      
      // Log de exportação
      await securityService.logSecurityEvent({
        userId,
        action: 'PRODUCTS_EXPORTED',
        description: `Produtos exportados: ${products.length} itens`,
        ipAddress: req.ip,
        details: { format, count: products.length }
      });
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSV(products);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=produtos.csv');
        return res.send(csv);
      }
      
      res.json({ products });
      
    } catch (error) {
      logger.error('Erro ao exportar produtos:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'PRODUCTS_EXPORT_ERROR',
        description: 'Erro ao exportar produtos',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao exportar produtos.'
      });
    }
  }
  
  // Gerar CSV
  generateCSV(products) {
    const headers = [
      'SKU', 'Nome', 'Descrição', 'Categoria', 'Preço', 
      'Custo', 'Estoque', 'Estoque Mínimo', 'Código de Barras',
      'Unidade', 'Peso', 'Dimensões', 'Taxa de Imposto', 'Status'
    ];
    
    const rows = products.map(p => [
      p.sku,
      `"${p.name}"`,
      `"${p.description || ''}"`,
      p.category,
      p.price,
      p.cost,
      p.stock,
      p.minStock,
      p.barcode || '',
      p.unit,
      p.weight || '',
      p.dimensions || '',
      p.taxRate,
      p.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Dashboard de produtos
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;
      
      // Estatísticas
      const totalProducts = await Product.count({ where: { userId } });
      const totalValue = await Product.sum('cost', {
        where: { userId, stock: { [Op.gt]: 0 } }
      }) || 0;
      
      const lowStockProducts = await Product.count({
        where: {
          userId,
          stock: {
            [Op.lte]: sequelize.col('minStock')
          },
          status: 'active'
        }
      });
      
      const outOfStockProducts = await Product.count({
        where: {
          userId,
          stock: 0,
          status: 'active'
        }
      });
      
      // Produtos mais vendidos (precisa de integração com vendas)
      const topProducts = await Product.findAll({
        where: { userId, status: 'active' },
        limit: 10,
        order: [['stock', 'ASC']] // Temporário - depois integrar com vendas
      });
      
      // Categorias
      const categories = await Product.findAll({
        where: { userId },
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('stock')), 'totalStock']
        ],
        group: ['category'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
      });
      
      res.json({
        statistics: {
          totalProducts,
          totalValue: parseFloat(totalValue).toFixed(2),
          lowStockProducts,
          outOfStockProducts,
          activeProducts: totalProducts - outOfStockProducts
        },
        topProducts,
        categories,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard de produtos:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
}

module.exports = new ProductController();
