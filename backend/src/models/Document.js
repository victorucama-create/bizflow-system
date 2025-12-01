const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('invoice', 'purchase_order', 'requisition', 'contract', 'other'),
    allowNull: false
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  requiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'signed', 'rejected', 'cancelled'),
    defaultValue: 'draft'
  },
  signedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  signatureHash: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'documents',
  timestamps: true,
  indexes: [
    {
      fields: ['documentNumber'],
      unique: true
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['date']
    },
    {
      fields: ['dueDate']
    },
    {
      fields: ['signedBy']
    },
    {
      fields: ['signatureHash'],
      unique: true
    }
  ]
});

// Hook para gerar número do documento
Document.beforeCreate(async (document) => {
  if (!document.documentNumber) {
    const prefix = {
      'invoice': 'INV',
      'purchase_order': 'PO',
      'requisition': 'REQ',
      'contract': 'CTR',
      'other': 'DOC'
    }[document.type] || 'DOC';
    
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Buscar último documento do mesmo tipo no ano/mês
    const lastDocument = await Document.findOne({
      where: {
        type: document.type,
        documentNumber: {
          [sequelize.Sequelize.Op.like]: `${prefix}${year}${month}%`
        }
      },
      order: [['documentNumber', 'DESC']]
    });
    
    let sequence = 1;
    if (lastDocument && lastDocument.documentNumber) {
      const lastSequence = parseInt(lastDocument.documentNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    document.documentNumber = `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
});

// Método para assinar documento
Document.prototype.sign = async function(userId, signatureData, password) {
  if (this.status === 'signed') {
    throw new Error('Documento já está assinado');
  }
  
  if (this.status !== 'pending') {
    throw new Error('Documento não está aguardando assinatura');
  }
  
  // Gerar hash da assinatura
  const signatureString = JSON.stringify({
    documentId: this.id,
    userId: userId,
    timestamp: new Date().toISOString(),
    data: signatureData
  });
  
  const signatureHash = crypto
    .createHash('sha256')
    .update(signatureString)
    .digest('hex');
  
  this.signedBy = userId;
  this.signedAt = new Date();
  this.signatureHash = signatureHash;
  this.status = 'signed';
  this.metadata = {
    ...this.metadata,
    signature: {
      method: 'digital',
      timestamp: new Date().toISOString(),
      hash: signatureHash
    }
  };
  
  return this.save();
};

// Método para verificar assinatura
Document.prototype.verifySignature = function() {
  if (!this.signatureHash || !this.signedAt) {
    return false;
  }
  
  // Em uma implementação real, aqui verificaria a assinatura digital
  // com chaves públicas/privadas
  return !!this.signatureHash;
};

// Método para rejeitar documento
Document.prototype.reject = async function(userId, reason) {
  this.status = 'rejected';
  this.notes = this.notes ? `${this.notes}\nRejeitado: ${reason}` : `Rejeitado: ${reason}`;
  this.metadata = {
    ...this.metadata,
    rejection: {
      by: userId,
      at: new Date().toISOString(),
      reason: reason
    }
  };
  
  return this.save();
};

// Método para obter resumo do documento
Document.prototype.getSummary = function() {
  return {
    id: this.id,
    documentNumber: this.documentNumber,
    type: this.type,
    date: this.date,
    dueDate: this.dueDate,
    amount: this.amount,
    status: this.status,
    requiresApproval: this.requiresApproval,
    signedBy: this.signedBy,
    signedAt: this.signedAt
  };
};

// Método para obter documentos pendentes de assinatura
Document.getPendingSignatures = async function(userId) {
  return await Document.findAll({
    where: {
      status: 'pending',
      requiresApproval: true,
      userId: userId
    },
    include: [{
      association: 'customer',
      attributes: ['id', 'name', 'email']
    }],
    order: [['dueDate', 'ASC']]
  });
};

// Método para obter estatísticas de documentos
Document.getStats = async function(userId) {
  const stats = await sequelize.query(`
    SELECT 
      type,
      status,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM documents
    WHERE user_id = :userId
    GROUP BY type, status
    ORDER BY type, status
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return stats.reduce((acc, stat) => {
    if (!acc[stat.type]) {
      acc[stat.type] = {
        draft: { count: 0, total: 0 },
        pending: { count: 0, total: 0 },
        signed: { count: 0, total: 0 },
        rejected: { count: 0, total: 0 },
        cancelled: { count: 0, total: 0 }
      };
    }
    
    acc[stat.type][stat.status] = {
      count: parseInt(stat.count),
      total: parseFloat(stat.total_amount || 0)
    };
    
    return acc;
  }, {});
};

// Hook para notificar quando documento requer aprovação
Document.afterUpdate(async (document, options) => {
  if (document.changed('status') && document.status === 'pending' && document.requiresApproval) {
    // Aqui poderia enviar notificação por e-mail ou push
    // para os aprovadores necessários
  }
});

module.exports = Document;
