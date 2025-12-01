const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('./Product');
const User = require('./User');
const Inventory = require('./Inventory');

const InventoryMovement = sequelize.define('InventoryMovement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inventoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'inventory',
            key: 'id'
        }
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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['entry', 'withdrawal', 'adjustment', 'initial', 'sale', 'return', 'transfer', 'damage', 'expired']]
        }
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
        allowNull: false,
        defaultValue: 0
    },
    totalValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
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
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'inventory_movements',
    timestamps: true,
    indexes: [
        {
            unique: false,
            fields: ['productId']
        },
        {
            unique: false,
            fields: ['userId']
        },
        {
            unique: false,
            fields: ['type']
        },
        {
            unique: false,
            fields: ['referenceId', 'referenceType']
        },
        {
            unique: false,
            fields: ['createdAt']
        }
    ]
});

// Associations
InventoryMovement.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

InventoryMovement.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

InventoryMovement.belongsTo(Inventory, {
    foreignKey: 'inventoryId',
    as: 'inventory'
});

Product.hasMany(InventoryMovement, {
    foreignKey: 'productId',
    as: 'movements'
});

User.hasMany(InventoryMovement, {
    foreignKey: 'userId',
    as: 'movements'
});

// Hooks
InventoryMovement.beforeCreate(async (movement) => {
    // Calculate total value
    movement.totalValue = Math.abs(movement.quantity) * movement.unitCost;
    
    // Set default reason based on type
    if (!movement.reason) {
        const reasonMap = {
            'entry': 'Entrada de estoque',
            'withdrawal': 'Saída de estoque',
            'adjustment': 'Ajuste de estoque',
            'initial': 'Estoque inicial',
            'sale': 'Venda',
            'return': 'Devolução',
            'transfer': 'Transferência',
            'damage': 'Danificado',
            'expired': 'Vencido'
        };
        
        movement.reason = reasonMap[movement.type] || 'Movimentação de estoque';
    }
});

// Instance methods
InventoryMovement.prototype.getMovementDetails = function() {
    const direction = this.quantity > 0 ? '+' : '-';
    
    return {
        id: this.id,
        productId: this.productId,
        type: this.type,
        quantity: this.quantity,
        direction: direction,
        previousQuantity: this.previousQuantity,
        newQuantity: this.newQuantity,
        unitCost: this.unitCost,
        totalValue: this.totalValue,
        reason: this.reason,
        date: this.createdAt,
        reference: this.referenceId ? `${this.referenceType}#${this.referenceId}` : null
    };
};

// Static methods
InventoryMovement.getProductHistory = async function(productId, userId, limit = 100) {
    return await InventoryMovement.findAll({
        where: {
            productId,
            userId
        },
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: limit
    });
};

InventoryMovement.getSummary = async function(userId, startDate, endDate) {
    const where = { userId };
    
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[DataTypes.Op.gte] = startDate;
        if (endDate) where.createdAt[DataTypes.Op.lte] = endDate;
    }
    
    const movements = await InventoryMovement.findAll({
        where,
        attributes: [
            'type',
            [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
            [sequelize.fn('SUM', sequelize.col('totalValue')), 'totalValue'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['type'],
        raw: true
    });
    
    const summary = {
        totalMovements: 0,
        totalQuantity: 0,
        totalValue: 0,
        byType: {}
    };
    
    movements.forEach(movement => {
        const quantity = parseFloat(movement.totalQuantity) || 0;
        const value = parseFloat(movement.totalValue) || 0;
        const count = parseInt(movement.count) || 0;
        
        summary.totalMovements += count;
        summary.totalQuantity += Math.abs(quantity);
        summary.totalValue += value;
        
        summary.byType[movement.type] = {
            quantity: quantity,
            value: value,
            count: count
        };
    });
    
    return summary;
};

module.exports = InventoryMovement;
