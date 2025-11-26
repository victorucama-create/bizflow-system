const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    documentNumber: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['invoice', 'purchase-order', 'requisition', 'contract', 'other']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Título não pode ter mais de 200 caracteres']
    },
    description: {
        type: String,
        maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    issueDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'signed', 'rejected', 'cancelled'],
        default: 'draft'
    },
    requiresApproval: {
        type: Boolean,
        default: false
    },
    signedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    signedAt: Date,
    signatureData: {
        type: String // Base64 da assinatura
    },
    fileUrl: {
        type: String // URL do arquivo PDF
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
documentSchema.index({ documentNumber: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ customer: 1 });
documentSchema.index({ dueDate: 1 });
documentSchema.index({ issueDate: -1 });

// Virtual para verificar se está vencido
documentSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate) return false;
    return this.dueDate < new Date() && this.status === 'pending';
});

// Virtual para dias até o vencimento
documentSchema.virtual('daysUntilDue').get(function() {
    if (!this.dueDate) return null;
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Método estático para gerar número de documento
documentSchema.statics.generateDocumentNumber = async function(type) {
    const prefixes = {
        'invoice': 'INV',
        'purchase-order': 'PO',
        'requisition': 'REQ',
        'contract': 'CTR',
        'other': 'DOC'
    };
    
    const prefix = prefixes[type] || 'DOC';
    const today = new Date();
    const year = today.getFullYear();
    
    const lastDoc = await this.findOne({
        documentNumber: new RegExp(`^${prefix}${year}`)
    }).sort({ documentNumber: -1 });
    
    if (!lastDoc) {
        return `${prefix}${year}0001`;
    }
    
    const lastNumber = parseInt(lastDoc.documentNumber.slice(-4));
    const newNumber = String(lastNumber + 1).padStart(4, '0');
    
    return `${prefix}${year}${newNumber}`;
};

// Método para assinar documento
documentSchema.methods.signDocument = async function(userId, signatureData) {
    if (this.status !== 'pending') {
        throw new Error('Apenas documentos pendentes podem ser assinados');
    }
    
    this.status = 'signed';
    this.signedBy = userId;
    this.signedAt = new Date();
    this.signatureData = signatureData;
    
    return this.save();
};

module.exports = mongoose.model('Document', documentSchema);
