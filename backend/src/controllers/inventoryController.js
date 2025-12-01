const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const securityService = require('../services/securityService');
const logger = require('../utils/logger');
const { Op, Sequelize } = require('sequelize');

class InventoryController {
  // Listar movimentações de inventário
  async listMovements(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 50, 
        productId, 
        type, 
        startDate,
        endDate,
        referenceType,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = { userId };
      
      // Filtros
      if (productId) where.productId = productId;
      if (type) where.type = type;
      if (referenceType) where.referenceType = referenceType;
      
      // Filtro por data
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Ordenação
      const order = [[sortBy, sortOrder.toUpperCase()]];
      
      // Buscar movimentações
      const { count, rows: movements } = await Inventory.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'category']
        }]
      });
      
      // Calcular totais
      const totals = await Inventory.findAll({
        where,
        attributes: [
          'type',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
          [Sequelize.fn('SUM', Sequelize.col('total_value')), 'totalValue']
        ],
        group: ['type']
      });
      
      res.json({
        movements,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        totals
      });
      
    } catch (error) {
      logger.error('Erro ao listar movimentações:', error);
      res.status(500).json({
        error: 'Erro ao listar movimentações.'
      });
    }
  }
  
  // Buscar movimentação por ID
  async getMovement(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const movement = await Inventory.findOne({
        where: { id, userId },
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'category', 'cost', 'price']
        }]
      });
      
      if (!movement) {
        return res.status(404).json({
          error: 'Movimentação não encontrada.'
        });
      }
      
      res.json({ movement });
      
    } catch (error) {
      logger.error('Erro ao buscar movimentação:', error);
      res.status(500).json({
        error: 'Erro ao buscar movimentação.'
      });
    }
  }
  
  // Criar movimentação manual
  async createMovement(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const userId = req.user.userId;
      const { productId, type, quantity, unitCost, notes, locationFrom, locationTo } = req.body;
      
      // Buscar produto
      const product = await Product.findOne({
        where: { id: productId, userId },
        transaction
      });
      
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Calcular novos valores
      const previousQuantity = product.stock;
      let newQuantity;
      
      if (type === 'entry' || type === 'return' || type === 'adjustment' && quantity > 0) {
        newQuantity = previousQuantity + quantity;
      } else if (type === 'withdrawal' || type === 'sale' || type === 'loss' || 
                 (type === 'adjustment' && quantity < 0)) {
        const absQuantity = Math.abs(quantity);
        newQuantity = previousQuantity - absQuantity;
        
        if (newQuantity < 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Estoque insuficiente. Disponível: ${previousQuantity}, Solicitado: ${absQuantity}`
          });
        }
      } else if (type === 'transfer') {
        // Transferência entre locais - estoque total não muda
        newQuantity = previousQuantity;
      } else {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Tipo de movimentação inválido.'
        });
      }
      
      // Calcular valor total
      const totalValue = unitCost * quantity;
      
      // Criar movimentação
      const movement = await Inventory.create({
        productId,
        userId,
        type,
        quantity,
        previousQuantity,
        newQuantity,
        unitCost,
        totalValue,
        notes,
        locationFrom,
        locationTo
      }, { transaction });
      
      // Atualizar estoque do produto (exceto transferências)
      if (type !== 'transfer') {
        product.stock = newQuantity;
        await product.save({ transaction });
      }
      
      await transaction.commit();
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId,
        action: 'INVENTORY_MOVEMENT_CREATED',
        description: `Movimentação de inventário criada: ${type} - ${quantity} unidades`,
        ipAddress: req.ip,
        details: {
          movementId: movement.id,
          productId,
          productName: product.name,
          type,
          quantity,
          previousQuantity,
          newQuantity
        }
      });
      
      res.status(201).json({
        message: 'Movimentação registrada com sucesso!',
        movement,
        product: {
          id: product.id,
          name: product.name,
          previousStock: previousQuantity,
          newStock: newQuantity
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Erro ao criar movimentação:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'INVENTORY_MOVEMENT_ERROR',
        description: 'Erro ao criar movimentação de inventário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar movimentação.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Dashboard de inventário
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Movimentações recentes
      const recentMovements = await Inventory.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [{
          model: Product,
          as: 'product',
          attributes: ['name', 'sku']
        }]
      });
      
      // Estatísticas por tipo
      const statsByType = await Inventory.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
          [Sequelize.fn('SUM', Sequelize.col('total_value')), 'totalValue']
        ],
        group: ['type']
      });
      
      // Valor total do inventário
      const inventoryValue = await Product.sum('cost', {
        where: {
          userId,
          stock: { [Op.gt]: 0 }
        },
        attributes: [
          [Sequelize.literal('SUM(cost * stock)'), 'totalValue']
        ]
      }) || 0;
      
      // Produtos com maior movimentação
      const topProducts = await Inventory.findAll({
        where: { userId },
        attributes: [
          'productId',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalMovement'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'movementCount']
        ],
        group: ['productId'],
        order: [[Sequelize.literal('ABS(SUM(quantity))'), 'DESC']],
        limit: 10,
        include: [{
          model: Product,
          as: 'product',
          attributes: ['name', 'sku', 'category']
        }]
      });
      
      // Alertas de inventário
      const lowStockProducts = await Product.findAll({
        where: {
          userId,
          stock: {
            [Op.lte]: Sequelize.col('minStock')
          },
          status: 'active'
        },
        limit: 10
      });
      
      res.json({
        recentMovements,
        statsByType,
        inventoryValue: parseFloat(inventoryValue).toFixed(2),
        topProducts,
        alerts: {
          lowStockCount: lowStockProducts.length,
          lowStockProducts: lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock
          })),
          outOfStockCount: await Product.count({
            where: {
              userId,
              stock: 0,
              status: 'active'
            }
          })
        },
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard de inventário:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
  
  // Relatório de inventário
  async getReport(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, productId, type, format = 'json' } = req.query;
      
      const where = { userId };
      
      if (productId) where.productId = productId;
      if (type) where.type = type;
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Buscar movimentações
      const movements = await Inventory.findAll({
        where,
        include: [{
          model: Product,
          as: 'product',
          attributes: ['name', 'sku', 'category']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Calcular totais
      const totals = movements.reduce((acc, movement) => {
        if (movement.type === 'entry' || movement.type === 'return' || 
            (movement.type === 'adjustment' && movement.quantity > 0)) {
          acc.entries += Math.abs(movement.quantity);
          acc.entryValue += Math.abs(movement.totalValue);
        } else if (movement.type === 'withdrawal' || movement.type === 'sale' || 
                   movement.type === 'loss' || 
                   (movement.type === 'adjustment' && movement.quantity < 0)) {
          acc.withdrawals += Math.abs(movement.quantity);
          acc.withdrawalValue += Math.abs(movement.totalValue);
        } else if (movement.type === 'transfer') {
          acc.transfers++;
        }
        acc.totalQuantity += Math.abs(movement.quantity);
        acc.totalValue += Math.abs(movement.totalValue);
        return acc;
      }, { 
        entries: 0, withdrawals: 0, transfers: 0, 
        entryValue: 0, withdrawalValue: 0, 
        totalQuantity: 0, totalValue: 0 
      });
      
      // Agrupar por produto
      const byProduct = {};
      movements.forEach(movement => {
        const productId = movement.productId;
        if (!byProduct[productId]) {
          byProduct[productId] = {
            product: movement.product,
            entries: 0,
            withdrawals: 0,
            transfers: 0,
            netMovement: 0,
            movements: []
          };
        }
        
        byProduct[productId].movements.push(movement);
        
        if (movement.type === 'entry' || movement.type === 'return' || 
            (movement.type === 'adjustment' && movement.quantity > 0)) {
          byProduct[productId].entries += Math.abs(movement.quantity);
          byProduct[productId].netMovement += Math.abs(movement.quantity);
        } else if (movement.type === 'withdrawal' || movement.type === 'sale' || 
                   movement.type === 'loss' || 
                   (movement.type === 'adjustment' && movement.quantity < 0)) {
          byProduct[productId].withdrawals += Math.abs(movement.quantity);
          byProduct[productId].netMovement -= Math.abs(movement.quantity);
        } else if (movement.type === 'transfer') {
          byProduct[productId].transfers++;
        }
      });
      
      const report = {
        period: {
          startDate: startDate || 'Início',
          endDate: endDate || 'Hoje'
        },
        totals,
        byProduct: Object.values(byProduct),
        movements: format === 'detailed' ? movements : undefined,
        generatedAt: new Date()
      };
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSVReport(Object.values(byProduct), totals);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=inventario_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      }
      
      res.json(report);
      
    } catch (error) {
      logger.error('Erro no relatório de inventário:', error);
      res.status(500).json({
        error: 'Erro ao gerar relatório.'
      });
    }
  }
  
  // Gerar CSV do relatório
  generateCSVReport(byProduct, totals) {
    const headers = [
      'Produto', 'SKU', 'Categoria', 'Entradas', 'Saídas', 
      'Transferências', 'Movimentação Líquida'
    ];
    
    const rows = byProduct.map(item => [
      `"${item.product.name}"`,
      item.product.sku,
      item.product.category,
      item.entries,
      item.withdrawals,
      item.transfers,
      item.netMovement
    ]);
    
    // Adicionar totais
    rows.push(['', '', 'TOTAIS:', totals.entries, totals.withdrawals, totals.transfers, totals.entries - totals.withdrawals]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Exportar movimentações
  async exportMovements(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, format = 'csv' } = req.query;
      
      const where = { userId };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      const movements = await Inventory.findAll({
        where,
        include: [{
          model: Product,
          as: 'product',
          attributes: ['name', 'sku']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Log de exportação
      await securityService.logSecurityEvent({
        userId,
        action: 'INVENTORY_EXPORTED',
        description: `Movimentações de inventário exportadas: ${movements.length} registros`,
        ipAddress: req.ip,
        details: { format, count: movements.length }
      });
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSV(movements);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      }
      
      res.json({ movements });
      
    } catch (error) {
      logger.error('Erro ao exportar movimentações:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'INVENTORY_EXPORT_ERROR',
        description: 'Erro ao exportar movimentações de inventário',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao exportar movimentações.'
      });
    }
  }
  
  // Gerar CSV de movimentações
  generateCSV(movements) {
    const headers = [
      'Data', 'Produto', 'SKU', 'Tipo', 'Quantidade', 
      'Estoque Anterior', 'Novo Estoque', 'Custo Unitário', 
      'Valor Total', 'Observações'
    ];
    
    const rows = movements.map(m => [
      m.createdAt.toISOString().split('T')[0],
      `"${m.product?.name || 'N/A'}"`,
      m.product?.sku || 'N/A',
      this.getTypeName(m.type),
      m.quantity,
      m.previousQuantity,
      m.newQuantity,
      m.unitCost.toFixed(2),
      m.totalValue.toFixed(2),
      `"${m.notes || ''}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Obter nome do tipo
  getTypeName(type) {
    const types = {
      'entry': 'Entrada',
      'withdrawal': 'Saída',
      'adjustment': 'Ajuste',
      'initial': 'Inicial',
      'sale': 'Venda',
      'return': 'Retorno',
      'loss': 'Perda',
      'transfer': 'Transferência'
    };
    
    return types[type] || type;
  }
  
  // Histórico do produto
  async getProductHistory(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;
      const { page = 1, limit = 50 } = req.query;
      
      const offset = (page - 1) * limit;
      
      // Verificar se produto existe e pertence ao usuário
      const product = await Product.findOne({
        where: { id: productId, userId }
      });
      
      if (!product) {
        return res.status(404).json({
          error: 'Produto não encontrado.'
        });
      }
      
      // Buscar histórico
      const { count, rows: history } = await Inventory.findAndCountAll({
        where: { productId, userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      // Estatísticas do produto
      const productStats = await Inventory.findAll({
        where: { productId, userId },
        attributes: [
          'type',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['type']
      });
      
      res.json({
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.stock,
          minStock: product.minStock
        },
        history,
        stats: productStats,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar histórico do produto:', error);
      res.status(500).json({
        error: 'Erro ao buscar histórico.'
      });
    }
  }
}

module.exports = new InventoryController();
