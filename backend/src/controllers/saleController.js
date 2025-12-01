const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const CashDrawer = require('../models/CashDrawer');
const securityService = require('../services/securityService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { Op, Sequelize } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

class SaleController {
  // Criar nova venda (checkout POS)
  async createSale(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const userId = req.user.userId;
      const { items, customerId, paymentMethod, paymentDetails, notes, location } = req.body;
      
      // Validar itens
      if (!items || !Array.isArray(items) || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'A venda deve conter pelo menos um item.'
        });
      }
      
      // Verificar estoque e calcular totais
      let subtotal = 0;
      let tax = 0;
      const processedItems = [];
      const inventoryMovements = [];
      
      for (const item of items) {
        const product = await Product.findOne({
          where: { id: item.productId, userId },
          transaction
        });
        
        if (!product) {
          await transaction.rollback();
          return res.status(404).json({
            error: `Produto não encontrado: ${item.productId}`
          });
        }
        
        if (product.stock < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, Solicitado: ${item.quantity}`
          });
        }
        
        // Calcular valores
        const itemSubtotal = product.price * item.quantity;
        const itemTax = (itemSubtotal * (product.taxRate / 100));
        
        subtotal += itemSubtotal;
        tax += itemTax;
        
        // Preparar item processado
        processedItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          tax: itemTax,
          taxRate: product.taxRate,
          subtotal: itemSubtotal
        });
        
        // Registrar movimento de inventário
        inventoryMovements.push({
          productId: product.id,
          userId,
          type: 'sale',
          quantity: -item.quantity, // Saída de estoque
          previousQuantity: product.stock,
          newQuantity: product.stock - item.quantity,
          unitCost: product.cost,
          totalValue: product.cost * item.quantity * -1,
          notes: `Venda POS - ${item.quantity} unidades`
        });
        
        // Atualizar estoque do produto
        await product.decrement('stock', {
          by: item.quantity,
          transaction
        });
      }
      
      // Calcular total
      const discount = req.body.discount || 0;
      const total = subtotal + tax - discount;
      
      // Verificar se caixa está aberto para vendas em dinheiro
      if (paymentMethod === 'cash') {
        const cashDrawer = await CashDrawer.findOne({
          where: { userId, status: 'open' },
          transaction
        });
        
        if (!cashDrawer) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'Caixa não está aberto. Abra o caixa antes de processar vendas em dinheiro.'
          });
        }
      }
      
      // Criar venda
      const sale = await Sale.create({
        customerId,
        userId,
        items: processedItems,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod,
        paymentDetails,
        status: 'completed',
        notes,
        location: location || 'PDV Principal',
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      }, { transaction });
      
      // Registrar movimentos de inventário
      for (const movement of inventoryMovements) {
        movement.referenceId = sale.id;
        movement.referenceType = 'sale';
        await Inventory.create(movement, { transaction });
      }
      
      // Atualizar total de compras do cliente
      if (customerId) {
        const customer = await Customer.findByPk(customerId, { transaction });
        if (customer) {
          customer.totalPurchases = (customer.totalPurchases || 0) + total;
          customer.lastPurchase = new Date();
          await customer.save({ transaction });
        }
      }
      
      // Atualizar caixa se for venda em dinheiro
      if (paymentMethod === 'cash' && paymentDetails?.cashAmount) {
        const cashDrawer = await CashDrawer.findOne({
          where: { userId, status: 'open' },
          transaction
        });
        
        if (cashDrawer) {
          cashDrawer.expectedBalance = (cashDrawer.expectedBalance || cashDrawer.openingBalance) + total;
          await cashDrawer.save({ transaction });
        }
      }
      
      // Commit da transação
      await transaction.commit();
      
      // Log de venda
      await securityService.logSecurityEvent({
        userId,
        action: 'SALE_CREATED',
        description: `Venda criada: ${sale.saleNumber}`,
        ipAddress: req.ip,
        details: {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          total,
          paymentMethod,
          itemsCount: items.length
        }
      });
      
      // Gerar recibo (opcional)
      const receipt = await this.generateReceiptData(sale);
      
      res.status(201).json({
        message: 'Venda realizada com sucesso!',
        sale,
        receipt
      });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Erro ao criar venda:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'SALE_CREATION_ERROR',
        description: 'Erro ao processar venda',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao processar venda.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Listar vendas
  async listSales(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        status,
        paymentMethod,
        customerId,
        search
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = { userId };
      
      // Filtros
      if (status) where.status = status;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (customerId) where.customerId = customerId;
      
      // Filtro por data
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Busca por número da venda
      if (search) {
        where[Op.or] = [
          { saleNumber: { [Op.iLike]: `%${search}%` } },
          { '$customer.name$': { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Buscar vendas com cliente
      const { count, rows: sales } = await Sale.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        }]
      });
      
      // Calcular estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySales = await Sale.sum('total', {
        where: {
          userId,
          status: 'completed',
          createdAt: { [Op.gte]: today }
        }
      }) || 0;
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlySales = await Sale.sum('total', {
        where: {
          userId,
          status: 'completed',
          createdAt: { [Op.gte]: monthStart }
        }
      }) || 0;
      
      res.json({
        sales,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        statistics: {
          todaySales: parseFloat(todaySales).toFixed(2),
          monthlySales: parseFloat(monthlySales).toFixed(2),
          totalSales: count
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar vendas:', error);
      res.status(500).json({
        error: 'Erro ao listar vendas.'
      });
    }
  }
  
  // Buscar venda específica
  async getSale(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const sale = await Sale.findOne({
        where: { id, userId },
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone', 'address']
          },
          {
            model: Product,
            as: 'products',
            through: { attributes: ['quantity', 'price', 'tax'] }
          }
        ]
      });
      
      if (!sale) {
        return res.status(404).json({
          error: 'Venda não encontrada.'
        });
      }
      
      res.json({ sale });
      
    } catch (error) {
      logger.error('Erro ao buscar venda:', error);
      res.status(500).json({
        error: 'Erro ao buscar venda.'
      });
    }
  }
  
  // Cancelar venda
  async cancelSale(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { reason } = req.body;
      
      const sale = await Sale.findOne({
        where: { id, userId, status: 'completed' },
        transaction
      });
      
      if (!sale) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Venda não encontrada ou já cancelada.'
        });
      }
      
      // Verificar se a venda não é muito antiga (ex: 24 horas)
      const hoursSinceSale = (new Date() - sale.createdAt) / (1000 * 60 * 60);
      if (hoursSinceSale > 24) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Não é possível cancelar vendas com mais de 24 horas.'
        });
      }
      
      // Estornar estoque
      for (const item of sale.items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          await product.increment('stock', {
            by: item.quantity,
            transaction
          });
          
          // Registrar movimento de estorno
          await Inventory.create({
            productId: product.id,
            userId,
            type: 'return',
            quantity: item.quantity,
            previousQuantity: product.stock - item.quantity,
            newQuantity: product.stock,
            unitCost: product.cost,
            totalValue: product.cost * item.quantity,
            referenceId: sale.id,
            referenceType: 'sale_cancellation',
            notes: `Estorno - Cancelamento venda ${sale.saleNumber}: ${reason}`
          }, { transaction });
        }
      }
      
      // Atualizar status da venda
      sale.status = 'cancelled';
      sale.notes = sale.notes ? `${sale.notes}\nCancelada: ${reason}` : `Cancelada: ${reason}`;
      await sale.save({ transaction });
      
      // Atualizar total de compras do cliente
      if (sale.customerId) {
        const customer = await Customer.findByPk(sale.customerId, { transaction });
        if (customer) {
          customer.totalPurchases = Math.max(0, (customer.totalPurchases || 0) - sale.total);
          await customer.save({ transaction });
        }
      }
      
      await transaction.commit();
      
      // Log de cancelamento
      await securityService.logSecurityEvent({
        userId,
        action: 'SALE_CANCELLED',
        description: `Venda cancelada: ${sale.saleNumber}`,
        ipAddress: req.ip,
        details: {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          reason,
          total: sale.total
        },
        severity: 'high'
      });
      
      res.json({
        message: 'Venda cancelada com sucesso!',
        sale
      });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Erro ao cancelar venda:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'SALE_CANCELLATION_ERROR',
        description: 'Erro ao cancelar venda',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao cancelar venda.'
      });
    }
  }
  
  // Abrir caixa
  async openCashDrawer(req, res) {
    try {
      const userId = req.user.userId;
      const { openingBalance, notes } = req.body;
      
      // Verificar se já existe caixa aberto
      const existingDrawer = await CashDrawer.findOne({
        where: { userId, status: 'open' }
      });
      
      if (existingDrawer) {
        return res.status(400).json({
          error: 'Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.'
        });
      }
      
      const cashDrawer = await CashDrawer.create({
        userId,
        openingBalance: openingBalance || 0,
        expectedBalance: openingBalance || 0,
        status: 'open',
        notes,
        openedAt: new Date()
      });
      
      // Log de abertura
      await securityService.logSecurityEvent({
        userId,
        action: 'CASH_DRAWER_OPENED',
        description: 'Caixa aberto',
        ipAddress: req.ip,
        details: {
          drawerId: cashDrawer.id,
          openingBalance: cashDrawer.openingBalance
        }
      });
      
      res.json({
        message: 'Caixa aberto com sucesso!',
        cashDrawer
      });
      
    } catch (error) {
      logger.error('Erro ao abrir caixa:', error);
      res.status(500).json({
        error: 'Erro ao abrir caixa.'
      });
    }
  }
  
  // Fechar caixa
  async closeCashDrawer(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const userId = req.user.userId;
      const { closingBalance, notes } = req.body;
      
      // Buscar caixa aberto
      const cashDrawer = await CashDrawer.findOne({
        where: { userId, status: 'open' },
        transaction
      });
      
      if (!cashDrawer) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Nenhum caixa aberto encontrado.'
        });
      }
      
      // Calcular vendas em dinheiro desde a abertura
      const cashSales = await Sale.sum('total', {
        where: {
          userId,
          paymentMethod: 'cash',
          status: 'completed',
          createdAt: { [Op.between]: [cashDrawer.openedAt, new Date()] }
        },
        transaction
      }) || 0;
      
      // Calcular saldo esperado
      const expectedBalance = cashDrawer.openingBalance + cashSales;
      const difference = closingBalance - expectedBalance;
      
      // Atualizar caixa
      cashDrawer.closingBalance = closingBalance;
      cashDrawer.expectedBalance = expectedBalance;
      cashDrawer.difference = difference;
      cashDrawer.status = 'closed';
      cashDrawer.closedAt = new Date();
      cashDrawer.notes = notes;
      
      await cashDrawer.save({ transaction });
      
      await transaction.commit();
      
      // Log de fechamento
      await securityService.logSecurityEvent({
        userId,
        action: 'CASH_DRAWER_CLOSED',
        description: 'Caixa fechado',
        ipAddress: req.ip,
        details: {
          drawerId: cashDrawer.id,
          openingBalance: cashDrawer.openingBalance,
          closingBalance: cashDrawer.closingBalance,
          expectedBalance: cashDrawer.expectedBalance,
          difference: cashDrawer.difference
        },
        severity: difference !== 0 ? 'high' : 'medium'
      });
      
      res.json({
        message: 'Caixa fechado com sucesso!',
        cashDrawer,
        summary: {
          cashSales,
          expectedBalance,
          difference
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Erro ao fechar caixa:', error);
      res.status(500).json({
        error: 'Erro ao fechar caixa.'
      });
    }
  }
  
  // Status do caixa
  async getCashDrawerStatus(req, res) {
    try {
      const userId = req.user.userId;
      
      const cashDrawer = await CashDrawer.findOne({
        where: { userId, status: 'open' }
      });
      
      if (!cashDrawer) {
        return res.json({
          isOpen: false,
          message: 'Caixa está fechado'
        });
      }
      
      // Calcular vendas desde a abertura
      const cashSales = await Sale.sum('total', {
        where: {
          userId,
          paymentMethod: 'cash',
          status: 'completed',
          createdAt: { [Op.gte]: cashDrawer.openedAt }
        }
      }) || 0;
      
      const expectedBalance = cashDrawer.openingBalance + cashSales;
      
      res.json({
        isOpen: true,
        cashDrawer,
        summary: {
          openingBalance: cashDrawer.openingBalance,
          cashSales,
          expectedBalance,
          openedAt: cashDrawer.openedAt,
          openDuration: Math.floor((new Date() - cashDrawer.openedAt) / (1000 * 60)) // minutos
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar status do caixa:', error);
      res.status(500).json({
        error: 'Erro ao buscar status do caixa.'
      });
    }
  }
  
  // Dashboard de vendas
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const yearStart = new Date(today.getFullYear(), 0, 1);
      
      // Estatísticas gerais
      const totalSales = await Sale.count({ where: { userId, status: 'completed' } });
      const totalRevenue = await Sale.sum('total', { 
        where: { userId, status: 'completed' } 
      }) || 0;
      
      const todaySales = await Sale.sum('total', {
        where: {
          userId,
          status: 'completed',
          createdAt: { [Op.gte]: new Date(today.setHours(0, 0, 0, 0)) }
        }
      }) || 0;
      
      const monthlySales = await Sale.sum('total', {
        where: {
          userId,
          status: 'completed',
          createdAt: { [Op.gte]: monthStart }
        }
      }) || 0;
      
      // Vendas por método de pagamento
      const paymentMethods = await Sale.findAll({
        where: { userId, status: 'completed' },
        attributes: [
          'paymentMethod',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('total')), 'total']
        ],
        group: ['paymentMethod']
      });
      
      // Vendas dos últimos 7 dias
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dailySales = await Sale.sum('total', {
          where: {
            userId,
            status: 'completed',
            createdAt: { [Op.between]: [date, nextDate] }
          }
        }) || 0;
        
        last7Days.push({
          date: date.toISOString().split('T')[0],
          total: dailySales
        });
      }
      
      // Produtos mais vendidos
      const topProducts = await Sale.findAll({
        where: { userId, status: 'completed' },
        attributes: [
          [Sequelize.literal("jsonb_array_elements(items)->>'name'"), 'productName'],
          [Sequelize.fn('SUM', Sequelize.literal("CAST(jsonb_array_elements(items)->>'quantity' AS INTEGER)")), 'totalQuantity'],
          [Sequelize.fn('SUM', Sequelize.literal("CAST(jsonb_array_elements(items)->>'subtotal' AS DECIMAL)")), 'totalRevenue']
        ],
        group: [Sequelize.literal("jsonb_array_elements(items)->>'name'")],
        order: [[Sequelize.literal('totalQuantity'), 'DESC']],
        limit: 10
      });
      
      res.json({
        statistics: {
          totalSales,
          totalRevenue: parseFloat(totalRevenue).toFixed(2),
          todaySales: parseFloat(todaySales).toFixed(2),
          monthlySales: parseFloat(monthlySales).toFixed(2),
          averageTicket: totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : 0
        },
        paymentMethods,
        last7Days,
        topProducts: topProducts.slice(0, 5),
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard de vendas:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
  
  // Gerar recibo
  async generateReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const sale = await Sale.findOne({
        where: { id, userId },
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['name', 'taxId']
        }]
      });
      
      if (!sale) {
        return res.status(404).json({
          error: 'Venda não encontrada.'
        });
      }
      
      const receipt = await this.generateReceiptData(sale);
      
      res.json({
        receipt,
        sale
      });
      
    } catch (error) {
      logger.error('Erro ao gerar recibo:', error);
      res.status(500).json({
        error: 'Erro ao gerar recibo.'
      });
    }
  }
  
  // Gerar dados do recibo
  async generateReceiptData(sale) {
    const company = await User.findByPk(sale.userId, {
      attributes: ['companyName', 'email', 'phone']
    });
    
    return {
      company: {
        name: company?.companyName || 'BizFlow',
        email: company?.email,
        phone: company?.phone
      },
      sale: {
        number: sale.saleNumber,
        date: sale.createdAt,
        customer: sale.customer?.name || 'Cliente não identificado',
        items: sale.items,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod
      },
      footer: 'Obrigado pela preferência!'
    };
  }
  
  // Relatório diário
  async getDailyReport(req, res) {
    try {
      const userId = req.user.userId;
      const { date } = req.query;
      
      const reportDate = date ? new Date(date) : new Date();
      reportDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(reportDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Vendas do dia
      const sales = await Sale.findAll({
        where: {
          userId,
          status: 'completed',
          createdAt: { [Op.between]: [reportDate, nextDate] }
        },
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['name']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Totais
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalItems = sales.reduce((sum, sale) => 
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
      
      // Por método de pagamento
      const paymentSummary = sales.reduce((acc, sale) => {
        if (!acc[sale.paymentMethod]) {
          acc[sale.paymentMethod] = { count: 0, total: 0 };
        }
        acc[sale.paymentMethod].count++;
        acc[sale.paymentMethod].total += sale.total;
        return acc;
      }, {});
      
      res.json({
        date: reportDate.toISOString().split('T')[0],
        summary: {
          totalSales,
          totalRevenue: parseFloat(totalRevenue).toFixed(2),
          totalItems,
          averageTicket: totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : 0
        },
        paymentSummary,
        sales: sales.map(s => ({
          id: s.id,
          saleNumber: s.saleNumber,
          customer: s.customer?.name,
          total: s.total,
          paymentMethod: s.paymentMethod,
          time: s.createdAt
        }))
      });
      
    } catch (error) {
      logger.error('Erro no relatório diário:', error);
      res.status(500).json({
        error: 'Erro ao gerar relatório.'
      });
    }
  }
  
  // Exportar vendas CSV
  async exportSalesCSV(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate } = req.query;
      
      const where = { userId, status: 'completed' };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      const sales = await Sale.findAll({
        where,
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['name']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Gerar CSV
      const headers = ['Data', 'Número', 'Cliente', 'Itens', 'Subtotal', 'Taxa', 'Desconto', 'Total', 'Pagamento', 'Status'];
      const rows = sales.map(sale => [
        sale.createdAt.toISOString().split('T')[0],
        sale.saleNumber,
        sale.customer?.name || '',
        sale.items.length,
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        sale.discount.toFixed(2),
        sale.total.toFixed(2),
        sale.paymentMethod,
        sale.status
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=vendas_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
      
    } catch (error) {
      logger.error('Erro ao exportar CSV:', error);
      res.status(500).json({
        error: 'Erro ao exportar vendas.'
      });
    }
  }
}

module.exports = new SaleController();
