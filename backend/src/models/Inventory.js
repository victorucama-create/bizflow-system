const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('entry', 'withdrawal', 'adjustment', 'initial', 'sale', 'return', 'loss', 'transfer'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previousQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  newQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  locationFrom: {
    type: DataTypes.STRING,
    allowNull: true
  },
  locationTo: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'inventory_movements',
  timestamps: true,
  indexes: [
    {
      fields: ['productId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['referenceId']
    }
  ]
});

// Método para obter histórico do produto
Inventory.getProductHistory = async function(productId, userId, limit = 100) {
  return await Inventory.findAll({
    where: { productId, userId },
    limit,
    order: [['createdAt', 'DESC']],
    include: [{
      association: 'product',
      attributes: ['name', 'sku']
    }]
  });
};

// Método para obter relatório de movimentação
Inventory.getMovementReport = async function(userId, startDate, endDate, type = null) {
  const where = { userId };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }
  
  if (type) where.type = type;
  
  const movements = await Inventory.findAll({
    where,
    include: [{
      association: 'product',
      attributes: ['name', 'sku', 'category']
    }],
    order: [['createdAt', 'DESC']]
  });
  
  // Calcular totais
  const totals = movements.reduce((acc, movement) => {
    if (movement.type === 'entry' || movement.type === 'return') {
      acc.entries += movement.quantity;
      acc.entryValue += movement.totalValue;
    } else if (movement.type === 'withdrawal' || movement.type === 'sale' || movement.type === 'loss') {
      acc.withdrawals += Math.abs(movement.quantity);
      acc.withdrawalValue += Math.abs(movement.totalValue);
    }
    return acc;
  }, { entries: 0, withdrawals: 0, entryValue: 0, withdrawalValue: 0 });
  
  return {
    movements,
    totals,
    netMovement: totals.entries - totals.withdrawals,
    netValue: totals.entryValue - totals.withdrawalValue
  };
};

module.exports = Inventory;
