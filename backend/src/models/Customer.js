const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome do cliente é obrigatório'],
        trim: true,
        maxlength: [200, 'Nome não pode ter mais de 200 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Email inválido'
        }
    },
    phone: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['individual', 'company'],
        default: 'individual'
    },
    taxId: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'Brasil'
        }
    },
    notes: {
        type: String,
        maxlength: [1000, 'Observações não podem ter mais de 1000 caracteres']
    },
    totalPurchases: {
        type: Number,
        default: 0,
        min: 0
    },
    lastPurchase: Date,
    status: {
        type: String,
        enum: ['active', 'inactive'],
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
customerSchema.index({ email: 1 });
customerSchema.index({ type: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ name: 'text', email: 'text' });

// Virtual para endereço completo
customerSchema.virtual('fullAddress').get(function() {
    if (!this.address.street) return '';
    
    const parts = [
        this.address.street,
        this.address.number,
        this.address.complement,
        this.address.neighborhood,
        this.address.city,
        this.address.state,
        this.address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
});

// Método para atualizar estatísticas de compra
customerSchema.methods.updatePurchaseStats = async function(amount) {
    this.totalPurchases += amount;
    this.lastPurchase = new Date();
    return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
