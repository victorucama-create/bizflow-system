const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Email inválido'
        }
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [8, 'Senha deve ter no mínimo 8 caracteres'],
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'manager'],
        default: 'user'
    },
    company: {
        name: String,
        taxId: String,
        phone: String,
        email: String,
        address: String
    },
    // ✅ SISTEMA DE ASSINATURA ADICIONADO
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'pro'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'canceled', 'past_due'],
            default: 'active'
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        },
        features: {
            productLimit: { type: Number, default: 100 },
            customerLimit: { type: Number, default: 100 },
            pdvCount: { type: Number, default: 1 },
            digitalSignature: { type: Boolean, default: false },
            advancedReports: { type: Boolean, default: false },
            apiAccess: { type: Boolean, default: false }
        }
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    lastLoginIp: String,
    isActive: {
        type: Boolean,
        default: true
    },
    // ✅ NOVOS CAMPOS ADICIONADOS
    preferences: {
        language: { type: String, default: 'pt-BR' },
        timezone: { type: String, default: 'America/Sao_Paulo' },
        currency: { type: String, default: 'BRL' },
        notifications: {
            email: { type: Boolean, default: true },
            sales: { type: Boolean, default: true },
            lowStock: { type: Boolean, default: true },
            security: { type: Boolean, default: true }
        }
    },
    avatar: String,
    phone: String
}, {
    timestamps: true
});

// Index para melhor performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'subscription.plan': 1 });

// ✅ MÉTODO PARA VERIFICAR SE A CONTA ESTÁ BLOQUEADA
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ✅ MÉTODO PARA VERIFICAR LIMITES DA ASSINATURA
userSchema.methods.checkFeatureLimit = function(feature, currentUsage) {
    if (!this.subscription || !this.subscription.features) {
        return false;
    }
    
    const limit = this.subscription.features[feature];
    if (limit === undefined) return true; // Se não tem limite definido
    
    // -1 significa ilimitado
    if (limit === -1 || limit === 10000) return true;
    
    return currentUsage < limit;
};

// ✅ MÉTODO PARA OBTER LIMITES DA ASSINATURA
userSchema.methods.getPlanLimits = function() {
    const plans = {
        free: {
            productLimit: 100,
            customerLimit: 100,
            pdvCount: 1,
            digitalSignature: false,
            advancedReports: false,
            apiAccess: false
        },
        basic: {
            productLimit: 1000,
            customerLimit: 500,
            pdvCount: 3,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: false
        },
        pro: {
            productLimit: 10000, // Ilimitado
            customerLimit: 10000, // Ilimitado
            pdvCount: 10,
            digitalSignature: true,
            advancedReports: true,
            apiAccess: true
        }
    };
    
    return plans[this.subscription?.plan] || plans.free;
};

// ✅ MÉTODO PARA VERIFICAR SE É PRIMEIRO USUÁRIO (ADMIN)
userSchema.statics.isFirstUser = async function() {
    const count = await this.countDocuments();
    return count === 0;
};

// ✅ MIDDLEWARE PARA DEFINIR ADMIN NO PRIMEIRO USUÁRIO
userSchema.pre('save', async function(next) {
    if (this.isNew) {
        const isFirstUser = await this.constructor.isFirstUser();
        if (isFirstUser) {
            this.role = 'admin';
            // Configurar assinatura pro para admin
            this.subscription = {
                plan: 'pro',
                status: 'active',
                features: this.getPlanLimits().pro
            };
        }
    }
    
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// ✅ MÉTODO PARA COMPARAR SENHA
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ MÉTODO PARA INCREMENTAR TENTATIVAS DE LOGIN
userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutos
    }
    
    return this.updateOne(updates);
};

// ✅ MÉTODO PARA RESETAR TENTATIVAS DE LOGIN
userSchema.methods.resetLoginAttempts = async function() {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// ✅ MÉTODO PARA ATUALIZAR ASSINATURA
userSchema.methods.updateSubscription = async function(planData) {
    const plans = {
        free: this.getPlanLimits().free,
        basic: this.getPlanLimits().basic,
        pro: this.getPlanLimits().pro
    };
    
    this.subscription = {
        ...this.subscription,
        plan: planData.plan,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        features: plans[planData.plan]
    };
    
    return this.save();
};

// ✅ MÉTODO PARA CANCELAR ASSINATURA
userSchema.methods.cancelSubscription = async function() {
    this.subscription.status = 'canceled';
    this.subscription.cancelAtPeriodEnd = true;
    // Reverter para plano free
    this.subscription.features = this.getPlanLimits().free;
    return this.save();
};

module.exports = mongoose.model('User', userSchema);
