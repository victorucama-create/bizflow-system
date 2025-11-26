const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    type: {
        type: String,
        enum: ['in', 'out', 'adjustment', 'return'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'purchase', 
            'sale', 
            'adjustment', 
            'return', 
            'damaged', 
            'expired', 
            'other'
        ]
    },
    reference: {
        type: String // Número da venda, nota fiscal, etc.
    },
    notes: {
        type: String,
        maxlength: [500, 'Observações não podem ter mais de 500 caracteres']
    },
    cost: {
        type: Number,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes para melhor performance
inventoryMovementSchema.index({ product: 1 });
inventoryMovementSchema.index({ type: 1 });
inventoryMovementSchema.index({ createdAt: -1 });
inventoryMovementSchema.index({ reason: 1 });

// Middleware para calcular novo estoque
inventoryMovementSchema.pre('save', function(next) {
    if (this.isNew) {
        switch (this.type) {
            case 'in':
                this.newStock = this.previousStock + this.quantity;
                break;
            case 'out':
                this.newStock = this.previousStock - this.quantity;
                break;
            case 'adjustment':
                this.newStock = this.quantity; // Para ajustes, quantity é o novo valor
                break;
            case 'return':
                this.newStock = this.previousStock + this.quantity;
                break;
        }
        
        // Garantir que estoque não fique negativo
        if (this.newStock < 0) {
            return next(new Error('Estoque não pode ficar negativo'));
        }
    }
    next();
});

// Método estático para registrar movimentação
inventoryMovementSchema.statics.recordMovement = async function(movementData) {
    const Product = mongoose.model('Product');
    
    // Buscar produto para obter estoque atual
    const product = await Product.findById(movementData.product);
    if (!product) {
        throw new Error('Produto não encontrado');
    }
    
    movementData.previousStock = product.stock;
    
    // Criar movimentação
    const movement = await this.create(movementData);
    
    // Atualizar estoque do produto
    product.stock = movement.newStock;
    await product.save();
    
    return movement;
};

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
