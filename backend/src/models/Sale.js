const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  saleNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
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
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'pix', 'multiple'),
    allowNull: false
  },
  paymentDetails: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'refunded'),
    defaultValue: 'completed'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cashDrawerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceInfo: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'sales',
  timestamps: true,
  indexes: [
    {
      fields: ['saleNumber'],
      unique: true
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['status']
    }
  ]
});

// Método para gerar número de venda
Sale.beforeCreate(async (sale) => {
  if (!sale.saleNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Buscar última venda do dia
    const lastSale = await Sale.findOne({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(date.setHours(0, 0, 0, 0)),
          [sequelize.Sequelize.Op.lt]: new Date(date.setHours(23, 59, 59, 999))
        }
      },
      order: [['saleNumber', 'DESC']]
    });
    
    let sequence = 1;
    if (lastSale && lastSale.saleNumber) {
      const lastSequence = parseInt(lastSale.saleNumber.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    sale.saleNumber = `V${year}${month}${day}-${sequence.toString().padStart(4, '0')}`;
  }
});

// Método para calcular totais
Sale.prototype.calculateTotals = function() {
  const items = this.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
  
  this.subtotal = subtotal;
  this.tax = tax;
  this.total = subtotal + tax - this.discount;
};

// Método para obter resumo da venda
Sale.prototype.getSummary = function() {
  return {
    saleNumber: this.saleNumber,
    customerId: this.customerId,
    itemsCount: this.items.length,
    subtotal: this.subtotal,
    tax: this.tax,
    discount: this.discount,
    total: this.total,
    paymentMethod: this.paymentMethod,
    status: this.status,
    createdAt: this.createdAt
  };
};

module.exports = Sale;
