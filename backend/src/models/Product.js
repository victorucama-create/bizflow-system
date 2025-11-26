const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: [true, 'SKU é obrigatório'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [50, 'SKU não pode ter mais de 50 caracteres']
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
    // ✅ CAMPOS DE PREÇO MELHORADOS
    price: {
        type: Number,
        required: [true, 'Preço é obrigatório'],
        min: [0, 'Preço não pode ser negativo'],
        set: v => Math.round(v * 100) / 100 // Garante 2 casas decimais
    },
    cost: {
        type: Number,
        required: [true, 'Custo é obrigatório'],
        min: [0, 'Custo não pode ser negativo'],
        set: v => Math.round(v * 100) / 100
    },
    // ✅ NOVOS CAMPOS DE PREÇO
    wholesalePrice: {
        type: Number,
        min: [0, 'Preço atacado não pode ser negativo'],
        set: v => Math.round(v * 100) / 100
    },
    promotionalPrice: {
        type: Number,
        min: [0, 'Preço promocional não pode ser negativo'],
        set: v => Math.round(v * 100) / 100
    },
    isOnPromotion: {
        type: Boolean,
        default: false
    },
    promotionStart: Date,
    promotionEnd: Date,
    
    // ✅ ESTOQUE MELHORADO
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
    maxStock: {
        type: Number,
        min: [0, 'Estoque máximo não pode ser negativo']
    },
    reservedStock: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // ✅ INFORMAÇÕES DE FORNECEDOR MELHORADAS
    supplier: {
        name: String,
        contact: String,
        email: String,
        phone: String,
        leadTime: Number // Dias para entrega
    },
    
    // ✅ CAMPOS FISCAIS E TRIBUTÁRIOS
    ncm: String, // Nomenclatura Comum do Mercosul
    cest: String, // Código Especificador da Substituição Tributária
    origin: {
        type: String,
        enum: ['0', '1', '2', '3', '4', '5', '6', '7', '8'], // 0-Nacional, 1-Estrangeira, etc.
        default: '0'
    },
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    // ✅ INFORMAÇÕES DE PESO E DIMENSÕES
    weight: Number, // em gramas
    length: Number, // em cm
    width: Number,  // em cm
    height: Number, // em cm
    
    // ✅ CAMPOS DE MARKETING E VENDAS
    tags: [String],
    brand: String,
    model: String,
    barcode: String,
    images: [String],
    featured: {
        type: Boolean,
        default: false
    },
    
    // ✅ CONTROLE DE STATUS
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
        default: 'active'
    },
    
    // ✅ METADADOS E AUDITORIA
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastSold: Date,
    totalSold: {
        type: Number,
        default: 0
    },
    lowStockAlertSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ INDEXES PARA MELHOR PERFORMANCE
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ 'supplier.name': 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ isOnPromotion: 1 });
productSchema.index({ featured: 1 });

// ✅ VIRTUAL FIELDS
productSchema.virtual('profitMargin').get(function() {
    if (this.cost === 0) return 0;
    return ((this.price - this.cost) / this.cost) * 100;
});

productSchema.virtual('profitValue').get(function() {
    return this.price - this.cost;
});

productSchema.virtual('isLowStock').get(function() {
    return this.stock <= this.minStock;
});

productSchema.virtual('isOutOfStock').get(function() {
    return this.stock === 0;
});

productSchema.virtual('availableStock').get(function() {
    return this.stock - this.reservedStock;
});

productSchema.virtual('currentPrice').get(function() {
    return this.isOnPromotion && this.promotionalPrice ? this.promotionalPrice : this.price;
});

// ✅ MÉTODOS DE INSTÂNCIA
productSchema.methods.updateStock = async function(quantity, type = 'sale') {
    if (type === 'sale') {
        if (this.availableStock < quantity) {
            throw new Error(`Estoque insuficiente. Disponível: ${this.availableStock}, Solicitado: ${quantity}`);
        }
        this.stock -= quantity;
        this.totalSold += quantity;
        this.lastSold = new Date();
    } else if (type === 'purchase') {
        this.stock += quantity;
    } else if (type === 'adjustment') {
        this.stock = quantity;
    }
    
    // Atualizar status baseado no estoque
    if (this.stock === 0) {
        this.status = 'out_of_stock';
        this.lowStockAlertSent = false;
    } else if (this.stock <= this.minStock) {
        this.status = 'active';
    } else {
        this.status = 'active';
    }
    
    return this.save();
};

productSchema.methods.reserveStock = async function(quantity) {
    if (this.availableStock < quantity) {
        throw new Error(`Estoque disponível insuficiente para reserva. Disponível: ${this.availableStock}`);
    }
    this.reservedStock += quantity;
    return this.save();
};

productSchema.methods.releaseStock = async function(quantity) {
    if (this.reservedStock < quantity) {
        throw new Error('Quantidade a liberar maior que estoque reservado');
    }
    this.reservedStock -= quantity;
    return this.save();
};

productSchema.methods.checkPromotionStatus = function() {
    const now = new Date();
    if (this.isOnPromotion && this.promotionEnd && now > this.promotionEnd) {
        this.isOnPromotion = false;
        this.promotionStart = undefined;
        this.promotionEnd = undefined;
        this.promotionalPrice = undefined;
    }
    return this.isOnPromotion;
};

// ✅ MÉTODOS ESTÁTICOS
productSchema.statics.findLowStock = function() {
    return this.find({
        $expr: { $lte: ['$stock', '$minStock'] },
        status: 'active'
    });
};

productSchema.statics.findOutOfStock = function() {
    return this.find({
        stock: 0,
        status: { $in: ['active', 'out_of_stock'] }
    });
};

productSchema.statics.findByCategory = function(category) {
    return this.find({ 
        category,
        status: 'active'
    });
};

productSchema.statics.getInventoryValue = async function() {
    const result = await this.aggregate([
        { $match: { status: 'active' } },
        {
            $group: {
                _id: null,
                totalValue: { $sum: { $multiply: ['$stock', '$cost'] } },
                totalItems: { $sum: '$stock' },
                productCount: { $sum: 1 }
            }
        }
    ]);
    
    return result[0] || { totalValue: 0, totalItems: 0, productCount: 0 };
};

// ✅ MIDDLEWARE PARA ATUALIZAÇÕES AUTOMÁTICAS
productSchema.pre('save', function(next) {
    // Verificar status de promoção antes de salvar
    this.checkPromotionStatus();
    
    // Atualizar status baseado no estoque
    if (this.stock === 0 && this.status !== 'discontinued') {
        this.status = 'out_of_stock';
    } else if (this.stock > 0 && this.status === 'out_of_stock') {
        this.status = 'active';
    }
    
    next();
});

module.exports = mongoose.model('Product', productSchema);
