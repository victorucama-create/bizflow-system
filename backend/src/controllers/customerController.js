const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const securityService = require('../services/securityService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class CustomerController {
  // Listar clientes
  async listCustomers(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status, 
        search,
        minPurchases,
        maxPurchases,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = { userId };
      
      // Filtros
      if (type) where.type = type;
      if (status) where.status = status;
      
      if (minPurchases || maxPurchases) {
        where.totalPurchases = {};
        if (minPurchases) where.totalPurchases[Op.gte] = parseFloat(minPurchases);
        if (maxPurchases) where.totalPurchases[Op.lte] = parseFloat(maxPurchases);
      }
      
      // Busca
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
          { taxId: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Ordenação
      const order = [];
      if (sortBy === 'purchases') {
        order.push(['totalPurchases', sortOrder.toUpperCase()]);
      } else if (sortBy === 'lastPurchase') {
        order.push(['lastPurchase', sortOrder.toUpperCase()]);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
      
      // Buscar clientes
      const { count, rows: customers } = await Customer.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order
      });
      
      // Estatísticas
      const stats = await Customer.getStatistics(userId);
      
      res.json({
        customers,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        statistics: stats
      });
      
    } catch (error) {
      logger.error('Erro ao listar clientes:', error);
      res.status(500).json({
        error: 'Erro ao listar clientes.'
      });
    }
  }
  
  // Buscar cliente por ID
  async getCustomer(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const customer = await Customer.findOne({
        where: { id, userId }
      });
      
      if (!customer) {
        return res.status(404).json({
          error: 'Cliente não encontrado.'
        });
      }
      
      // Buscar histórico de compras
      const sales = await Sale.findAll({
        where: {
          customerId: id,
          userId,
          status: 'completed'
        },
        limit: 10,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'saleNumber', 'total', 'paymentMethod', 'createdAt', 'items']
      });
      
      // Calcular estatísticas do cliente
      const totalSales = sales.length;
      const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);
      const avgTicket = totalSales > 0 ? totalSpent / totalSales : 0;
      
      // Produtos mais comprados
      const favoriteProducts = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!favoriteProducts[item.name]) {
            favoriteProducts[item.name] = {
              name: item.name,
              quantity: 0,
              totalSpent: 0
            };
          }
          favoriteProducts[item.name].quantity += item.quantity;
          favoriteProducts[item.name].totalSpent += item.subtotal;
        });
      });
      
      const topProducts = Object.values(favoriteProducts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      res.json({
        customer,
        history: {
          sales,
          totalSales,
          totalSpent: parseFloat(totalSpent).toFixed(2),
          avgTicket: parseFloat(avgTicket).toFixed(2),
          firstPurchase: sales.length > 0 ? sales[sales.length - 1].createdAt : null,
          lastPurchase: sales.length > 0 ? sales[0].createdAt : null
        },
        preferences: {
          topProducts,
          paymentMethods: [...new Set(sales.map(s => s.paymentMethod))]
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        error: 'Erro ao buscar cliente.'
      });
    }
  }
  
  // Criar cliente
  async createCustomer(req, res) {
    try {
      const userId = req.user.userId;
      const customerData = req.body;
      
      // Verificar se e-mail já existe
      const existingCustomer = await Customer.findOne({
        where: { 
          email: customerData.email,
          userId 
        }
      });
      
      if (existingCustomer) {
        return res.status(400).json({
          error: 'Já existe um cliente com este e-mail.'
        });
      }
      
      // Se for pessoa jurídica, verificar CNPJ
      if (customerData.type === 'company' && customerData.taxId) {
        const existingTaxId = await Customer.findOne({
          where: { 
            taxId: customerData.taxId,
            userId 
          }
        });
        
        if (existingTaxId) {
          return res.status(400).json({
            error: 'Já existe um cliente com este CNPJ.'
          });
        }
      }
      
      // Criar cliente
      const customer = await Customer.create({
        ...customerData,
        userId
      });
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId,
        action: 'CUSTOMER_CREATED',
        description: `Cliente criado: ${customer.name}`,
        ipAddress: req.ip,
        details: {
          customerId: customer.id,
          type: customer.type,
          email: customer.email
        }
      });
      
      res.status(201).json({
        message: 'Cliente criado com sucesso!',
        customer
      });
      
    } catch (error) {
      logger.error('Erro ao criar cliente:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'CUSTOMER_CREATION_ERROR',
        description: 'Erro ao criar cliente',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar cliente.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Atualizar cliente
  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      // Buscar cliente
      const customer = await Customer.findOne({
        where: { id, userId }
      });
      
      if (!customer) {
        return res.status(404).json({
          error: 'Cliente não encontrado.'
        });
      }
      
      // Verificar se novo e-mail já existe
      if (updateData.email && updateData.email !== customer.email) {
        const existingCustomer = await Customer.findOne({
          where: { 
            email: updateData.email,
            userId 
          }
        });
        
        if (existingCustomer) {
          return res.status(400).json({
            error: 'Já existe um cliente com este e-mail.'
          });
        }
      }
      
      // Atualizar cliente
      await customer.update(updateData);
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId,
        action: 'CUSTOMER_UPDATED',
        description: `Cliente atualizado: ${customer.name}`,
        ipAddress: req.ip,
        details: {
          customerId: customer.id,
          updatedFields: Object.keys(updateData)
        }
      });
      
      res.json({
        message: 'Cliente atualizado com sucesso!',
        customer
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar cliente:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'CUSTOMER_UPDATE_ERROR',
        description: 'Erro ao atualizar cliente',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao atualizar cliente.'
      });
    }
  }
  
  // Excluir cliente
  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const customer = await Customer.findOne({
        where: { id, userId }
      });
      
      if (!customer) {
        return res.status(404).json({
          error: 'Cliente não encontrado.'
        });
      }
      
      // Verificar se cliente tem compras
      const hasSales = await Sale.count({
        where: { customerId: id, userId }
      });
      
      if (hasSales > 0) {
        // Marcar como inativo em vez de excluir
        await customer.update({ status: 'inactive' });
        
        await securityService.logSecurityEvent({
          userId,
          action: 'CUSTOMER_DEACTIVATED',
          description: `Cliente marcado como inativo: ${customer.name}`,
          ipAddress: req.ip,
          details: {
            customerId: id,
            reason: 'Possui histórico de compras'
          }
        });
        
        return res.json({
          message: 'Cliente marcado como inativo (não pode ser excluído por ter histórico de compras).',
          customer
        });
      }
      
      // Excluir cliente
      await customer.destroy();
      
      // Log de exclusão
      await securityService.logSecurityEvent({
        userId,
        action: 'CUSTOMER_DELETED',
        description: `Cliente excluído: ${customer.name}`,
        ipAddress: req.ip,
        details: { customerId: id }
      });
      
      res.json({
        message: 'Cliente excluído com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao excluir cliente:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'CUSTOMER_DELETION_ERROR',
        description: 'Erro ao excluir cliente',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao excluir cliente.'
      });
    }
  }
  
  // Buscar cliente por e-mail
  async findByEmail(req, res) {
    try {
      const { email } = req.params;
      const userId = req.user.userId;
      
      const customer = await Customer.findOne({
        where: { email, userId }
      });
      
      if (!customer) {
        return res.status(404).json({
          error: 'Cliente não encontrado.'
        });
      }
      
      res.json({ customer });
      
    } catch (error) {
      logger.error('Erro ao buscar cliente por e-mail:', error);
      res.status(500).json({
        error: 'Erro ao buscar cliente.'
      });
    }
  }
  
  // Importar clientes em lote
  async importCustomers(req, res) {
    try {
      const userId = req.user.userId;
      const customers = req.body;
      
      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({
          error: 'Array de clientes é obrigatório.'
        });
      }
      
      if (customers.length > 100) {
        return res.status(400).json({
          error: 'Limite de 100 clientes por importação.'
        });
      }
      
      const results = {
        success: [],
        errors: []
      };
      
      for (const customerData of customers) {
        try {
          // Verificar e-mail único
          const existingCustomer = await Customer.findOne({
            where: { email: customerData.email, userId }
          });
          
          if (existingCustomer) {
            results.errors.push({
              email: customerData.email,
              error: 'E-mail já existe'
            });
            continue;
          }
          
          // Criar cliente
          const customer = await Customer.create({
            ...customerData,
            userId
          });
          
          results.success.push(customer);
        } catch (error) {
          results.errors.push({
            email: customerData.email,
            error: error.message
          });
        }
      }
      
      // Log de importação
      await securityService.logSecurityEvent({
        userId,
        action: 'CUSTOMERS_IMPORTED',
        description: `Clientes importados em lote: ${results.success.length} sucesso, ${results.errors.length} erros`,
        ipAddress: req.ip,
        details: {
          total: customers.length,
          success: results.success.length,
          errors: results.errors.length
        }
      });
      
      res.json({
        message: `Importação concluída: ${results.success.length} clientes importados, ${results.errors.length} erros.`,
        results
      });
      
    } catch (error) {
      logger.error('Erro na importação de clientes:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'CUSTOMERS_IMPORT_ERROR',
        description: 'Erro na importação de clientes em lote',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro na importação de clientes.'
      });
    }
  }
  
  // Exportar clientes
  async exportCustomers(req, res) {
    try {
      const userId = req.user.userId;
      const { format = 'json' } = req.query;
      
      const customers = await Customer.findAll({
        where: { userId },
        attributes: [
          'name', 'email', 'phone', 'type', 'taxId', 
          'address', 'city', 'state', 'zipCode', 'country',
          'totalPurchases', 'lastPurchase', 'status', 'notes'
        ]
      });
      
      // Log de exportação
      await securityService.logSecurityEvent({
        userId,
        action: 'CUSTOMERS_EXPORTED',
        description: `Clientes exportados: ${customers.length} registros`,
        ipAddress: req.ip,
        details: { format, count: customers.length }
      });
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSV(customers);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=clientes.csv');
        return res.send(csv);
      }
      
      res.json({ customers });
      
    } catch (error) {
      logger.error('Erro ao exportar clientes:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'CUSTOMERS_EXPORT_ERROR',
        description: 'Erro ao exportar clientes',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao exportar clientes.'
      });
    }
  }
  
  // Gerar CSV
  generateCSV(customers) {
    const headers = [
      'Nome', 'E-mail', 'Telefone', 'Tipo', 'CNPJ/CPF',
      'Endereço', 'Cidade', 'Estado', 'CEP', 'País',
      'Total Compras', 'Última Compra', 'Status', 'Observações'
    ];
    
    const rows = customers.map(c => [
      `"${c.name}"`,
      c.email,
      c.phone || '',
      c.type,
      c.taxId || '',
      `"${c.address || ''}"`,
      c.city || '',
      c.state || '',
      c.zipCode || '',
      c.country || '',
      c.totalPurchases,
      c.lastPurchase ? c.lastPurchase.toISOString().split('T')[0] : '',
      c.status,
      `"${c.notes || ''}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  // Dashboard de clientes
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;
      
      // Estatísticas
      const stats = await Customer.getStatistics(userId);
      
      // Clientes recentes
      const recentCustomers = await Customer.findAll({
        where: { userId, status: 'active' },
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      // Clientes VIP
      const vipCustomers = await Customer.findAll({
        where: {
          userId,
          status: 'active',
          totalPurchases: { [Op.gte]: 10000 }
        },
        limit: 10,
        order: [['totalPurchases', 'DESC']]
      });
      
      // Clientes inativos (sem compras nos últimos 90 dias)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const inactiveCustomers = await Customer.findAll({
        where: {
          userId,
          status: 'active',
          [Op.or]: [
            { lastPurchase: null },
            { lastPurchase: { [Op.lt]: ninetyDaysAgo } }
          ]
        },
        limit: 10
      });
      
      // Distribuição por tipo
      const typeDistribution = await Customer.findAll({
        where: { userId },
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['type']
      });
      
      res.json({
        statistics: stats,
        recentCustomers,
        vipCustomers,
        inactiveCustomers: {
          count: inactiveCustomers.length,
          customers: inactiveCustomers
        },
        typeDistribution,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard de clientes:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
}

module.exports = new CustomerController();
