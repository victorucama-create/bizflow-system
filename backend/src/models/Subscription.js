const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    plan: {
        type: String,
        enum: ['free', 'basic', 'pro'],
        required: true,
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'expired', 'past_due'],
        default: 'active'
    },
    price: {
        type: Number,
        default: 0
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    currentPeriodStart: {
        type: Date,
        default: Date.now
    },
    currentPeriodEnd: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    // IDs para integração com gateway de pagamento (Stripe)
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    // Limites e features do plano
    features: {
        pdvCount: {
            type: Number,
            default: 1
        },
        productLimit: {
            type: Number,
            default: 100
        },
        customerLimit: {
            type: Number,
            default: 500
        },
        digitalSignature: {
            type: Boolean,
            default: false
        },
        advancedReports: {
            type: Boolean,
            default: false
        },
        apiAccess: {
            type: Boolean,
            default: false
        },
        prioritySupport: {
            type: Boolean,
            default: false
        }
    },
    // Histórico de mudanças de plano
    planHistory: [{
        plan: String,
        changedAt: Date,
        price: Number,
        reason: String
    }]
}, {
    timestamps: true
});

// Indexes para melhor performance
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual para verificar se a assinatura está ativa
subscriptionSchema.virtual('isActive').get(function() {
    return this.status === 'active' && this.currentPeriodEnd > new Date();
});

// Virtual para dias restantes
subscriptionSchema.virtual('daysUntilExpiration').get(function() {
    const now = new Date();
    const diffTime = this.currentPeriodEnd - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar se está perto de expirar
subscriptionSchema.virtual('isExpiringSoon').get(function() {
    return this.daysUntilExpiration <= 7 && this.daysUntilExpiration > 0;
});

// Método para atualizar plano
subscriptionSchema.methods.updatePlan = async function(newPlan, price, reason = 'upgrade') {
    const oldPlan = this.plan;
    
    // Adicionar ao histórico
    this.planHistory.push({
        plan: oldPlan,
        changedAt: new Date(),
        price: this.price,
        reason: 'downgrade'
    });
    
    // Atualizar plano atual
    this.plan = newPlan;
    this.price = price;
    this.currentPeriodStart = new Date();
    this.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Atualizar features baseadas no plano
    this.updateFeatures(newPlan);
    
    await this.save();
    
    return this;
};

// Método para atualizar features baseadas no plano
subscriptionSchema.methods.updateFeatures = function(plan) {
    const planFeatures = {
        free: {
            pdvCount: 1,
            productLimit: 100,
            customerLimit: 500,
            digitalSignature: false,
            advancedReports: false,
            apiAccess: false,
            prioritySupport: false
        },
        basic: {
            pdvCount: 3,
            productLimit: 1000,
            customerLimit: 2000,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: false,
            prioritySupport: false
        },
        pro: {
            pdvCount: 10,
            productLimit: 10000,
            customerLimit: 10000,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: true,
            prioritySupport: true
        }
    };
    
    this.features = planFeatures[plan] || planFeatures.free;
};

// Middleware para definir features baseadas no plano
subscriptionSchema.pre('save', function(next) {
    if (this.isModified('plan') || this.isNew) {
        this.updateFeatures(this.plan);
        
        // Definir preço baseado no plano
        const planPrices = {
            free: 0,
            basic: 99.90,
            pro: 199.90
        };
        
        this.price = planPrices[this.plan] || 0;
    }
    next();
});

// Método estático para criar assinatura inicial
subscriptionSchema.statics.createInitialSubscription = async function(userId) {
    return this.create({
        user: userId,
        plan: 'free',
        status: 'active',
        price: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano para free
    });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
