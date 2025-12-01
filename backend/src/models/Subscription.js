const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
    allowNull: false,
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'canceled', 'expired', 'pending', 'past_due'),
    defaultValue: 'active'
  },
  currentPeriodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  currentPeriodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canceledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trialStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trialEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  stripePriceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  limits: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['plan']
    },
    {
      fields: ['currentPeriodEnd']
    },
    {
      fields: ['stripeCustomerId'],
      unique: true
    },
    {
      fields: ['stripeSubscriptionId'],
      unique: true
    }
  ]
});

// Hook para definir data de término do período
Subscription.beforeCreate(async (subscription) => {
  if (!subscription.currentPeriodEnd) {
    const periodEnd = new Date(subscription.currentPeriodStart);
    
    // Definir período baseado no plano
    const periodMonths = {
      'free': 999, // "permanente" até upgrade
      'basic': 1,
      'pro': 1,
      'enterprise': 12
    }[subscription.plan] || 1;
    
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    subscription.currentPeriodEnd = periodEnd;
  }
  
  // Definir limites baseados no plano
  subscription.limits = Subscription.getPlanLimits(subscription.plan);
  subscription.features = Subscription.getPlanFeatures(subscription.plan);
});

// Método estático para obter limites do plano
Subscription.getPlanLimits = function(plan) {
  const plans = {
    'free': {
      products: 100,
      customers: 50,
      salesPerMonth: 100,
      documents: 10,
      users: 1,
      storageMB: 100,
      support: 'email',
      apiCalls: 1000
    },
    'basic': {
      products: 1000,
      customers: 500,
      salesPerMonth: 1000,
      documents: 100,
      users: 3,
      storageMB: 1024,
      support: 'priority_email',
      apiCalls: 10000
    },
    'pro': {
      products: 10000,
      customers: 5000,
      salesPerMonth: 10000,
      documents: 1000,
      users: 10,
      storageMB: 5120,
      support: 'phone',
      apiCalls: 50000
    },
    'enterprise': {
      products: 100000,
      customers: 50000,
      salesPerMonth: 100000,
      documents: 10000,
      users: 50,
      storageMB: 10240,
      support: 'dedicated',
      apiCalls: 200000
    }
  };
  
  return plans[plan] || plans.free;
};

// Método estático para obter features do plano
Subscription.getPlanFeatures = function(plan) {
  const features = {
    'free': {
      pos: true,
      inventory: true,
      customers: true,
      basicReports: true,
      emailSupport: true,
      digitalSignature: false,
      apiAccess: false,
      multiBranch: false,
      customBranding: false,
      advancedAnalytics: false,
      apiIntegrations: false
    },
    'basic': {
      pos: true,
      inventory: true,
      customers: true,
      basicReports: true,
      emailSupport: true,
      digitalSignature: true,
      apiAccess: true,
      multiBranch: false,
      customBranding: false,
      advancedAnalytics: false,
      apiIntegrations: true
    },
    'pro': {
      pos: true,
      inventory: true,
      customers: true,
      basicReports: true,
      emailSupport: true,
      digitalSignature: true,
      apiAccess: true,
      multiBranch: true,
      customBranding: true,
      advancedAnalytics: true,
      apiIntegrations: true
    },
    'enterprise': {
      pos: true,
      inventory: true,
      customers: true,
      basicReports: true,
      emailSupport: true,
      digitalSignature: true,
      apiAccess: true,
      multiBranch: true,
      customBranding: true,
      advancedAnalytics: true,
      apiIntegrations: true
    }
  };
  
  return features[plan] || features.free;
};

// Método para verificar se assinatura está ativa
Subscription.prototype.isActive = function() {
  const now = new Date();
  return this.status === 'active' && new Date(this.currentPeriodEnd) >= now;
};

// Método para verificar se está em trial
Subscription.prototype.isTrial = function() {
  if (!this.trialStart || !this.trialEnd) {
    return false;
  }
  
  const now = new Date();
  return now >= new Date(this.trialStart) && now <= new Date(this.trialEnd);
};

// Método para obter dias restantes
Subscription.prototype.daysRemaining = function() {
  const endDate = new Date(this.currentPeriodEnd);
  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Método para fazer upgrade/downgrade de plano
Subscription.prototype.changePlan = async function(newPlan, prorate = true) {
  const oldPlan = this.plan;
  
  if (oldPlan === newPlan) {
    return this;
  }
  
  // Atualizar plano e limites
  this.plan = newPlan;
  this.limits = Subscription.getPlanLimits(newPlan);
  this.features = Subscription.getPlanFeatures(newPlan);
  
  // Se for downgrade, verificar se excede novos limites
  const planHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  const oldIndex = planHierarchy.indexOf(oldPlan);
  const newIndex = planHierarchy.indexOf(newPlan);
  
  if (newIndex < oldIndex) {
    // Downgrade - poderia aqui verificar uso atual vs novos limites
    // e notificar usuário se excede
  }
  
  // Em uma implementação real, aqui integraria com Stripe
  // para atualizar a assinatura e cobrar/proratar
  
  return this.save();
};

// Método para cancelar assinatura
Subscription.prototype.cancel = async function(cancelImmediately = false) {
  if (cancelImmediately) {
    this.status = 'canceled';
    this.canceledAt = new Date();
    this.currentPeriodEnd = new Date(); // Termina agora
  } else {
    this.cancelAtPeriodEnd = true;
    this.canceledAt = new Date();
  }
  
  return this.save();
};

// Método para renovar assinatura
Subscription.prototype.renew = async function() {
  if (this.status !== 'active' && this.status !== 'past_due') {
    throw new Error('Somente assinaturas ativas ou em atraso podem ser renovadas');
  }
  
  const currentEnd = new Date(this.currentPeriodEnd);
  const periodMonths = {
    'free': 999,
    'basic': 1,
    'pro': 1,
    'enterprise': 12
  }[this.plan] || 1;
  
  currentEnd.setMonth(currentEnd.getMonth() + periodMonths);
  this.currentPeriodEnd = currentEnd;
  this.status = 'active';
  this.cancelAtPeriodEnd = false;
  
  // Em uma implementação real, aqui processaria o pagamento
  
  return this.save();
};

// Método para verificar se feature está disponível
Subscription.prototype.hasFeature = function(feature) {
  return !!this.features?.[feature];
};

// Método para verificar se está dentro dos limites
Subscription.prototype.checkLimit = async function(resource, currentUsage) {
  const limit = this.limits?.[resource];
  
  if (limit === undefined || limit === null) {
    return { withinLimit: true, remaining: null };
  }
  
  if (limit === -1) {
    return { withinLimit: true, remaining: -1 }; // Ilimitado
  }
  
  const remaining = limit - currentUsage;
  return {
    withinLimit: remaining > 0,
    remaining: Math.max(0, remaining)
  };
};

// Hook para notificar sobre expiração
Subscription.afterUpdate(async (subscription, options) => {
  if (subscription.changed('currentPeriodEnd')) {
    const daysRemaining = subscription.daysRemaining();
    
    if (daysRemaining <= 7 && daysRemaining > 0) {
     
