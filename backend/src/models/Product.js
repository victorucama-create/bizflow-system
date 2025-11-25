const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: [true, 'SKU é obrigatório'],
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Nome do produto é obrigatório'],
        trim: true,
        maxlength: [200, 'Nome não pode ter mais de 200 caracteres']
    },
    description: {
        type: String,
        maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
    },
    category: {
        type: String,
        required: [true, 'Categoria é obrigatória'],
        enum: ['eletronicos', 'informatica', 'audio', 'acessorios', 'outros']
    },
    price: {
        type: Number,
        required: [true, 'Preço é obrigatório'],
        min: [0, 'Preço não pode ser negativo']
    },
    cost: {
        type: Number,
        required: [true, 'Custo é obrigatório'],
        min: [0, 'Custo não pode ser negativo']
    },
    stock: {
        type: Number,
        required: [true, 'Estoque é obrigatório'],
        min: [0, 'Estoque não pode ser negativo'],
        default: 0
    },
    minStock: {
        type: Number,
        required: [true, 'Estoque mínimo é obrigatório'],
        min: [0, 'Estoque mínimo não pode ser negativo'],
        default: 5
    },
    images: [String],
    supplier: {
        name: String,
        contact: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued'],
        default: 'active'
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
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ stock: 1 });

// Virtual para calcular margem de lucro
productSchema.virtual('profitMargin').get(function() {
    if (this.cost === 0) return 0;
    return ((this.price - this.cost) / this.cost) * 100;
});

// Virtual para verificar se está com estoque baixo
productSchema.virtual('isLowStock').get(function() {
    return this.stock <= this.minStock;
});

// Método para atualizar estoque
productSchema.methods.updateStock = async function(quantity) {
    if (this.stock + quantity < 0) {
        throw new Error('Estoque insuficiente');
    }
    this.stock += quantity;
    return this.save();
};

module.exports = mongoose.model('Product', productSchema);
