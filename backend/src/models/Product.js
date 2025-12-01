const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'uncategorized'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 0
    }
  },
  maxStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'un'
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true
  },
  dimensions: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
    defaultValue: 'active'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  supplierId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
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
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['sku'],
      unique: true
    },
    {
      fields: ['name']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    }
  ]
});

// Método para verificar se o estoque está baixo
Product.prototype.isLowStock = function() {
  return this.stock <= this.minStock;
};

// Método para calcular o valor total do estoque
Product.prototype.getStockValue = function() {
  return (this.cost * this.stock).toFixed(2);
};

// Método para calcular a margem de lucro
Product.prototype.getProfitMargin = function() {
  if (this.cost === 0) return 100;
  return (((this.price - this.cost) / this.cost) * 100).toFixed(2);
};

module.exports = Product;
