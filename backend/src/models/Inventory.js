const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('./Product');
const User = require('./User');

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
    quantity: {
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
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    reorderPoint: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    lastRestock: {
        type: DataTypes.DATE,
        allowNull: true
    },
    nextRestock: {
        type: DataTypes.DATE,
        allowNull: true
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'normal',
        validate: {
            isIn: [['normal', 'low', 'out', 'overstock', 'expired']]
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'inventory',
    timestamps: true,
    paranoid: true,
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
            fields: ['status']
        },
        {
            unique: false,
            fields: ['location']
        },
        {
            unique: false,
            fields: ['expiryDate']
        }
    ]
});

// Associations
Inventory.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

Inventory.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Product.hasOne(Inventory, {
    foreignKey: 'productId',
    as: 'inventory'
});

// Hooks
Inventory.beforeSave(async (inventory) => {
    // Update status based on quantity
    if (inventory.quantity <= 0) {
        inventory.status = 'out';
    } else if (inventory.quantity <= inventory.minStock) {
        inventory.status = 'low';
    } else if (inventory.maxStock && inventory.quantity > inventory.maxStock) {
        inventory.status = 'overstock';
    } else {
        inventory.status = 'normal';
    }
    
    // Check expiry date
    if (inventory.expiryDate && new Date(inventory.expiryDate) < new Date()) {
        inventory.status = 'expired';
    }
    
    // Auto-calculate reorder point if not set
    if (!inventory.reorderPoint) {
        inventory.reorderPoint = Math.ceil(inventory.minStock * 1.5);
    }
});

// Instance methods
Inventory.prototype.checkAvailability = function(requiredQuantity) {
    if (this.status === 'out' || this.quantity < requiredQuantity) {
        return {
            available: false,
            availableQuantity: this.quantity,
            needed: requiredQuantity - this.quantity,
            status: this.status
        };
    }
    
    return {
        available: true,
        availableQuantity: this.quantity,
        remaining: this.quantity - requiredQuantity,
        status: this.status
    };
};

Inventory.prototype.adjustQuantity = async function(adjustment, reason, reference = null) {
    const oldQuantity = this.quantity;
    this.quantity += adjustment;
    
    await this.save();
    
    // Log the movement
    const InventoryMovement = require('./InventoryMovement');
    await InventoryMovement.create({
        inventoryId: this.id,
        productId: this.productId,
        userId: this.userId,
        type: adjustment > 0 ? 'entry' : 'withdrawal',
        quantity: Math.abs(adjustment),
        previousQuantity: oldQuantity,
        newQuantity: this.quantity,
        unitCost: this.cost || 0,
        totalValue: Math.abs(adjustment) * (this.cost || 0),
        notes: reason,
        referenceId: reference?.id,
        referenceType: reference?.type
    });
    
    return this;
};

Inventory.prototype.transfer = async function(toLocation, quantity, notes = '') {
    if (quantity > this.quantity) {
        throw new Error('Quantidade insuficiente em estoque');
    }
    
    // Reduce current inventory
    this.quantity -= quantity;
    await this.save();
    
    // Find or create inventory at destination
    let destinationInventory = await Inventory.findOne({
        where: {
            productId: this.productId,
            userId: this.userId,
            location: toLocation
        }
    });
    
    if (!destinationInventory) {
        destinationInventory = await Inventory.create({
            productId: this.productId,
            userId: this.userId,
            location: toLocation,
            quantity: 0,
            minStock: this.minStock,
            cost: this.cost
        });
    }
    
    // Add to destination
    destinationInventory.quantity += quantity;
    await destinationInventory.save();
    
    // Log the transfer
    const InventoryMovement = require('./InventoryMovement');
    await InventoryMovement.create({
        inventoryId: this.id,
        productId: this.productId,
        userId: this.userId,
        type: 'transfer',
        quantity: quantity,
        previousQuantity: this.quantity + quantity,
        newQuantity: this.quantity,
        unitCost: this.cost || 0,
        totalValue: quantity * (this.cost || 0),
        notes: `Transferido para ${toLocation}. ${notes}`.trim(),
        metadata: {
            fromLocation: this.location,
            toLocation: toLocation
        }
    });
    
    return {
        from: this,
        to: destinationInventory
    };
};

// Static methods
Inventory.getLowStockItems = async function(userId) {
    return await Inventory.findAll({
        where: {
            userId,
            status: 'low'
        },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'category']
        }],
        order: [['quantity', 'ASC']]
    });
};

Inventory.getOutOfStockItems = async function(userId) {
    return await Inventory.findAll({
        where: {
            userId,
            status: 'out'
        },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'category']
        }],
        order: [['updatedAt', 'DESC']]
    });
};

Inventory.getExpiringItems = async function(userId, days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return await Inventory.findAll({
        where: {
            userId,
            expiryDate: {
                [DataTypes.Op.lte]: expiryDate,
                [DataTypes.Op.gt]: new Date()
            }
        },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'category']
        }],
        order: [['expiryDate', 'ASC']]
    });
};

Inventory.getInventoryValue = async function(userId) {
    const result = await Inventory.findOne({
        where: { userId },
        attributes: [
            [sequelize.fn('SUM', sequelize.literal('quantity * COALESCE(cost, 0)')), 'totalValue'],
            [sequelize.fn('SUM', sequelize.col('quantity')), 'totalItems']
        ],
        raw: true
    });
    
    return {
        totalValue: parseFloat(result.totalValue) || 0,
        totalItems: parseInt(result.totalItems) || 0
    };
};

module.exports = Inventory;
