const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 20]
    }
  },
  type: {
    type: DataTypes.ENUM('individual', 'company'),
    defaultValue: 'individual',
    allowNull: false
  },
  taxId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'Brasil',
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalPurchases: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  lastPurchase: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked'),
    defaultValue: 'active'
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
  tableName: 'customers',
  timestamps: true,
  indexes: [
    {
      fields: ['email'],
      unique: true
    },
    {
      fields: ['name']
    },
    {
      fields: ['type']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    }
  ]
});

// Método para incrementar compras
Customer.prototype.incrementPurchases = async function(amount) {
  this.totalPurchases = (this.totalPurchases || 0) + amount;
  this.lastPurchase = new Date();
  return this.save();
};

// Método para obter classificação do cliente
Customer.prototype.getClassification = function() {
  if (this.totalPurchases >= 10000) return 'VIP';
  if (this.totalPurchases >= 5000) return 'Premium';
  if (this.totalPurchases >= 1000) return 'Regular';
  return 'New';
};

// Método para obter estatísticas
Customer.getStatistics = async function(userId) {
  const totalCustomers = await Customer.count({ where: { userId } });
  const activeCustomers = await Customer.count({ 
    where: { userId, status: 'active' } 
  });
  
  const totalPurchases = await Customer.sum('totalPurchases', { 
    where: { userId, status: 'active' } 
  }) || 0;
  
  const avgPurchases = totalCustomers > 0 ? totalPurchases / totalCustomers : 0;
  
  // Clientes VIP
  const vipCustomers = await Customer.count({
    where: {
      userId,
      status: 'active',
      totalPurchases: { [Op.gte]: 10000 }
    }
  });
  
  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers: totalCustomers - activeCustomers,
    totalPurchases: parseFloat(totalPurchases).toFixed(2),
    averagePurchases: parseFloat(avgPurchases).toFixed(2),
    vipCustomers,
    vipPercentage: totalCustomers > 0 ? ((vipCustomers / totalCustomers) * 100).toFixed(2) : 0
  };
};

module.exports = Customer;
