const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    productSku: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    }
});

const saleSchema = new mongoose.Schema({
    saleNumber: {
        type: String,
        unique: true,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
    },
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cash', 'card', 'transfer', 'pix', 'other']
    },
    paymentDetails: {
        cardInstallments: {
            type: Number,
            default: 1
        },
        cashAmount: Number,
        change: Number,
        cardLastDigits: String
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    notes: {
        type: String,
        maxlength: [500, 'Observações não podem ter mais de 500 caracteres']
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
saleSchema.index({ saleNumber: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ 'items.product': 1 });

// Middleware para calcular totais antes de salvar
saleSchema.pre('save', function(next) {
    // Calcular subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Calcular total
    this.total = this.subtotal - this.discount + this.tax;
    
    // Garantir que total não seja negativo
    if (this.total < 0) {
        this.total = 0;
    }
    
    next();
});

// Middleware para items - calcular totalPrice
saleItemSchema.pre('save', function(next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});

// Método estático para gerar número de venda
saleSchema.statics.generateSaleNumber = async function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const baseNumber = `V${year}${month}${day}`;
    
    // Encontrar a última venda do dia
    const lastSale = await this.findOne({
        saleNumber: new RegExp(`^${baseNumber}`)
    }).sort({ saleNumber: -1 });
    
    if (!lastSale) {
        return `${baseNumber}001`;
    }
    
    const lastNumber = parseInt(lastSale.saleNumber.slice(-3));
    const newNumber = String(lastNumber + 1).padStart(3, '0');
    
    return `${baseNumber}${newNumber}`;
};

// Método para processar venda (atualizar estoque)
saleSchema.methods.processSale = async function() {
    if (this.status !== 'completed') {
        throw new Error('Apenas vendas completadas podem ser processadas');
    }
    
    const Product = mongoose.model('Product');
    
    // Atualizar estoque para cada item
    for (const item of this.items) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } }
        );
    }
    
    // Atualizar estatísticas do cliente se houver
    if (this.customer) {
        const Customer = mongoose.model('Customer');
        await Customer.findByIdAndUpdate(this.customer, {
            $inc: { totalPurchases: this.total },
            lastPurchase: new Date()
        });
    }
};

module.exports = mongoose.model('Sale', saleSchema);
