const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200]
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01
    }
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'completed'
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 50]
    }
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 50]
    }
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['category']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['referenceId']
    },
    {
      fields: ['dueDate']
    }
  ]
});

// Método para obter resumo da transação
Transaction.prototype.getSummary = function() {
  return {
    id: this.id,
    date: this.date,
    description: this.description,
    category: this.category,
    amount: this.amount,
    type: this.type,
    status: this.status,
    paymentMethod: this.paymentMethod
  };
};

// Método para marcar como pago
Transaction.prototype.markAsPaid = function(paymentMethod = null) {
  this.status = 'completed';
  this.paidAt = new Date();
  if (paymentMethod) {
    this.paymentMethod = paymentMethod;
  }
  return this.save();
};

// Método para obter estatísticas por período
Transaction.getStatsByPeriod = async function(userId, startDate, endDate) {
  const stats = await sequelize.query(`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(amount) as total,
      AVG(amount) as average
    FROM transactions
    WHERE 
      user_id = :userId 
      AND date BETWEEN :startDate AND :endDate
      AND status = 'completed'
    GROUP BY type
    ORDER BY type
  `, {
    replacements: { userId, startDate, endDate },
    type: sequelize.QueryTypes.SELECT
  });

  const income = stats.find(s => s.type === 'income') || { count: 0, total: 0, average: 0 };
  const expense = stats.find(s => s.type === 'expense') || { count: 0, total: 0, average: 0 };
  const balance = (income.total || 0) - (expense.total || 0);

  return {
    income: {
      count: parseInt(income.count),
      total: parseFloat(income.total || 0),
      average: parseFloat(income.average || 0)
    },
    expense: {
      count: parseInt(expense.count),
      total: parseFloat(expense.total || 0),
      average: parseFloat(expense.average || 0)
    },
    balance: parseFloat(balance)
  };
};

// Método para obter transações por categoria
Transaction.getByCategory = async function(userId, startDate, endDate) {
  return await sequelize.query(`
    SELECT 
      category,
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM transactions
    WHERE 
      user_id = :userId 
      AND date BETWEEN :startDate AND :endDate
      AND status = 'completed'
    GROUP BY category, type
    ORDER BY total DESC
  `, {
    replacements: { userId, startDate, endDate },
    type: sequelize.QueryTypes.SELECT
  });
};

// Método para obter transações pendentes
Transaction.getPendingTransactions = async function(userId) {
  return await Transaction.findAll({
    where: {
      userId,
      status: 'pending'
    },
    order: [['dueDate', 'ASC']]
  });
};

// Hook para registrar criação de transação
Transaction.afterCreate(async (transaction, options) => {
  if (transaction.type === 'expense' && transaction.status === 'completed') {
    // Aqui poderia ser integrado com sistema de orçamento
    // ou notificações de despesas
  }
});

// Hook para atualizar transações relacionadas
Transaction.afterUpdate(async (transaction, options) => {
  if (transaction.status === 'cancelled' && transaction.referenceId) {
    // Aqui poderia ser implementada lógica para reverter
    // transações relacionadas (ex: cancelar venda)
  }
});

module.exports = Transaction;
