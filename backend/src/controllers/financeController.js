const Transaction = require('../models/Transaction');
const Sale = require('../models/Sale');
const securityService = require('../services/securityService');
const logger = require('../utils/logger');
const { Op, Sequelize } = require('sequelize');

class FinanceController {
  // Listar transações
  async listTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 50, 
        type, 
        category, 
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = { userId };
      
      // Filtros
      if (type) where.type = type;
      if (category) where.category = category;
      if (status) where.status = status;
      
      // Filtro por data
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[Op.gte] = new Date(startDate);
        if (endDate) where.date[Op.lte] = new Date(endDate);
      }
      
      // Filtro por valor
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount[Op.gte] = parseFloat(minAmount);
        if (maxAmount) where.amount[Op.lte] = parseFloat(maxAmount);
      }
      
      // Busca
      if (search) {
        where[Op.or] = [
          { description: { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Buscar transações
      const { count, rows: transactions } = await Transaction.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date', 'DESC'], ['createdAt', 'DESC']]
      });
      
      // Calcular totais
      const totals = await Transaction.findAll({
        where,
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
        ],
        group: ['type']
      });
      
      const incomeTotal = totals.find(t => t.type === 'income')?.total || 0;
      const expenseTotal = totals.find(t => t.type === 'expense')?.total || 0;
      const balance = incomeTotal - expenseTotal;
      
      res.json({
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        totals: {
          income: parseFloat(incomeTotal).toFixed(2),
          expense: parseFloat(expenseTotal).toFixed(2),
          balance: parseFloat(balance).toFixed(2)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar transações:', error);
      res.status(500).json({
        error: 'Erro ao listar transações.'
      });
    }
  }
  
  // Buscar transação por ID
  async getTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const transaction = await Transaction.findOne({
        where: { id, userId }
      });
      
      if (!transaction) {
        return res.status(404).json({
          error: 'Transação não encontrada.'
        });
      }
      
      res.json({ transaction });
      
    } catch (error) {
      logger.error('Erro ao buscar transação:', error);
      res.status(500).json({
        error: 'Erro ao buscar transação.'
      });
    }
  }
  
  // Criar transação
  async createTransaction(req, res) {
    try {
      const userId = req.user.userId;
      const transactionData = req.body;
      
      // Criar transação
      const transaction = await Transaction.create({
        ...transactionData,
        userId
      });
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId,
        action: transaction.type === 'income' ? 'INCOME_CREATED' : 'EXPENSE_CREATED',
        description: `Transação criada: ${transaction.description}`,
        ipAddress: req.ip,
        details: {
          transactionId: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category
        }
      });
      
      res.status(201).json({
        message: 'Transação criada com sucesso!',
        transaction
      });
      
    } catch (error) {
      logger.error('Erro ao criar transação:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'TRANSACTION_CREATION_ERROR',
        description: 'Erro ao criar transação',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar transação.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Atualizar transação
  async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      // Buscar transação
      const transaction = await Transaction.findOne({
        where: { id, userId }
      });
      
      if (!transaction) {
        return res.status(404).json({
          error: 'Transação não encontrada.'
        });
      }
      
      // Verificar se pode editar (apenas pendentes)
      if (transaction.status === 'completed' && !req.user.role === 'admin') {
        return res.status(400).json({
          error: 'Só é possível editar transações pendentes.'
        });
      }
      
      // Atualizar transação
      await transaction.update(updateData);
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId,
        action: 'TRANSACTION_UPDATED',
        description: `Transação atualizada: ${transaction.description}`,
        ipAddress: req.ip,
        details: {
          transactionId: transaction.id,
          updatedFields: Object.keys(updateData)
        }
      });
      
      res.json({
        message: 'Transação atualizada com sucesso!',
        transaction
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar transação:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'TRANSACTION_UPDATE_ERROR',
        description: 'Erro ao atualizar transação',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao atualizar transação.'
      });
    }
  }
  
  // Excluir transação
  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const transaction = await Transaction.findOne({
        where: { id, userId }
      });
      
      if (!transaction) {
        return res.status(404).json({
          error: 'Transação não encontrada.'
        });
      }
      
      // Verificar se pode excluir (apenas pendentes)
      if (transaction.status === 'completed') {
        return res.status(400).json({
          error: 'Não é possível excluir transações concluídas.'
        });
      }
      
      // Excluir transação
      await transaction.destroy();
      
      // Log de exclusão
      await securityService.logSecurityEvent({
        userId,
        action: 'TRANSACTION_DELETED',
        description: `Transação excluída: ${transaction.description}`,
        ipAddress: req.ip,
        details: { transactionId: id }
      });
      
      res.json({
        message: 'Transação excluída com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao excluir transação:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'TRANSACTION_DELETION_ERROR',
        description: 'Erro ao excluir transação',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao excluir transação.'
      });
    }
  }
  
  // Dashboard financeiro
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const yearStart = new Date(today.getFullYear(), 0, 1);
      
      // Receitas do mês
      const monthlyIncome = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'income',
          status: 'completed',
          date: { [Op.gte]: monthStart }
        }
      }) || 0;
      
      // Despesas do mês
      const monthlyExpense = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'expense',
          status: 'completed',
          date: { [Op.gte]: monthStart }
        }
      }) || 0;
      
      // Saldo do mês
      const monthlyBalance = monthlyIncome - monthlyExpense;
      
      // Receitas do ano
      const yearlyIncome = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'income',
          status: 'completed',
          date: { [Op.gte]: yearStart }
        }
      }) || 0;
      
      // Despesas do ano
      const yearlyExpense = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'expense',
          status: 'completed',
          date: { [Op.gte]: yearStart }
        }
      }) || 0;
      
      // Saldo do ano
      const yearlyBalance = yearlyIncome - yearlyExpense;
      
      // Transações pendentes
      const pendingTransactions = await Transaction.count({
        where: {
          userId,
          status: 'pending'
        }
      });
      
      // Categorias de receita
      const incomeCategories = await Transaction.findAll({
        where: {
          userId,
          type: 'income',
          status: 'completed',
          date: { [Op.gte]: monthStart }
        },
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
        ],
        group: ['category'],
        order: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'DESC']]
      });
      
      // Categorias de despesa
      const expenseCategories = await Transaction.findAll({
        where: {
          userId,
          type: 'expense',
          status: 'completed',
          date: { [Op.gte]: monthStart }
        },
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
        ],
        group: ['category'],
        order: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'DESC']]
      });
      
      // Fluxo de caixa últimos 12 meses
      const cashFlow = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
        
        const monthIncome = await Transaction.sum('amount', {
          where: {
            userId,
            type: 'income',
            status: 'completed',
            date: { [Op.between]: [monthDate, nextMonth] }
          }
        }) || 0;
        
        const monthExpense = await Transaction.sum('amount', {
          where: {
            userId,
            type: 'expense',
            status: 'completed',
            date: { [Op.between]: [monthDate, nextMonth] }
          }
        }) || 0;
        
        cashFlow.push({
          month: monthDate.toLocaleString('default', { month: 'short' }),
          year: monthDate.getFullYear(),
          income: monthIncome,
          expense: monthExpense,
          balance: monthIncome - monthExpense
        });
      }
      
      res.json({
        statistics: {
          monthly: {
            income: parseFloat(monthlyIncome).toFixed(2),
            expense: parseFloat(monthlyExpense).toFixed(2),
            balance: parseFloat(monthlyBalance).toFixed(2)
          },
          yearly: {
            income: parseFloat(yearlyIncome).toFixed(2),
            expense: parseFloat(yearlyExpense).toFixed(2),
            balance: parseFloat(yearlyBalance).toFixed(2)
          },
          pendingTransactions
        },
        categories: {
          income: incomeCategories,
          expense: expenseCategories
        },
        cashFlow,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no dashboard financeiro:', error);
      res.status(500).json({
        error: 'Erro ao carregar dashboard.'
      });
    }
  }
  
  // Relatório financeiro
  async getReport(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, type, category } = req.query;
      
      const where = { 
        userId,
        status: 'completed' 
      };
      
      if (type) where.type = type;
      if (category) where.category = category;
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[Op.gte] = new Date(startDate);
        if (endDate) where.date[Op.lte] = new Date(endDate);
      }
      
      // Buscar transações
      const transactions = await Transaction.findAll({
        where,
        order: [['date', 'ASC']]
      });
      
      // Calcular totais
      const totals = transactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
          acc.incomeCount++;
        } else {
          acc.expense += transaction.amount;
          acc.expenseCount++;
        }
        return acc;
      }, { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 });
      
      // Agrupar por categoria
      const categories = {};
      transactions.forEach(transaction => {
        if (!categories[transaction.category]) {
          categories[transaction.category] = {
            income: 0,
            expense: 0,
            count: 0
          };
        }
        
        if (transaction.type === 'income') {
          categories[transaction.category].income += transaction.amount;
        } else {
          categories[transaction.category].expense += transaction.amount;
        }
        categories[transaction.category].count++;
      });
      
      res.json({
        period: {
          startDate: startDate || 'Início',
          endDate: endDate || 'Hoje'
        },
        totals: {
          income: parseFloat(totals.income).toFixed(2),
          expense: parseFloat(totals.expense).toFixed(2),
          balance: parseFloat(totals.income - totals.expense).toFixed(2),
          incomeCount: totals.incomeCount,
          expenseCount: totals.expenseCount
        },
        categories,
        transactions,
        generatedAt: new Date()
      });
      
    } catch (error) {
      logger.error('Erro no relatório financeiro:', error);
      res.status(500).json({
        error: 'Erro ao gerar relatório.'
      });
    }
  }
  
  // Exportar transações
  async exportTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, format = 'csv' } = req.query;
      
      const where = { userId };
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[Op.gte] = new Date(startDate);
        if (endDate) where.date[Op.lte] = new Date(endDate);
      }
      
      const transactions = await Transaction.findAll({
        where,
        order: [['date', 'DESC']]
      });
      
      // Log de exportação
      await securityService.logSecurityEvent({
        userId,
        action: 'TRANSACTIONS_EXPORTED',
        description: `Transações exportadas: ${transactions.length} registros`,
        ipAddress: req.ip,
        details: { format, count: transactions.length }
      });
      
      if (format === 'csv') {
        // Gerar CSV
        const csv = this.generateCSV(transactions);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transacoes_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      }
      
      res.json({ transactions });
      
    } catch (error) {
      logger.error('Erro ao exportar transações:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'TRANSACTIONS_EXPORT_ERROR',
        description: 'Erro ao exportar transações',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao exportar transações.'
      });
    }
  }
  
  // Gerar CSV
  generateCSV(transactions) {
    const headers = [
      'Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Observações'
    ];
    
    const rows = transactions.map(t => [
      t.date.toISOString().split('T')[0],
      `"${t.description}"`,
      t.category,
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.amount.toFixed(2),
      t.status === 'completed' ? 'Concluída' : 'Pendente',
      `"${t.notes || ''}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
}

module.exports = new FinanceController();
