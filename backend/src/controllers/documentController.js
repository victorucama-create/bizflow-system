const Document = require('../models/Document');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

// Buscar todos os documentos
exports.getDocuments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const filter = {};
        
        // Filtros opcionais
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.customer) {
            filter.customer = req.query.customer;
        }
        if (req.query.startDate && req.query.endDate) {
            filter.issueDate = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const documents = await Document.find(filter)
            .populate('customer', 'name email')
            .populate('createdBy', 'name email')
            .populate('signedBy', 'name email')
            .sort({ issueDate: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Document.countDocuments(filter);

        res.json({
            success: true,
            data: {
                documents,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar documento específico
exports.getDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('customer')
            .populate('createdBy', 'name email')
            .populate('signedBy', 'name email');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
            });
        }

        res.json({
            success: true,
            data: { document }
        });

    } catch (error) {
        console.error('Erro ao buscar documento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Criar documento
exports.createDocument = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const {
            type,
            title,
            description,
            customer,
            amount,
            issueDate,
            dueDate,
            requiresApproval,
            notes
        } = req.body;

        // Verificar se cliente existe (se fornecido)
        if (customer) {
            const customerExists = await Customer.findById(customer);
            if (!customerExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }
        }

        // Gerar número do documento
        const documentNumber = await Document.generateDocumentNumber(type);

        // Determinar status inicial
        const status = requiresApproval ? 'pending' : 'draft';

        const document = await Document.create({
            documentNumber,
            type,
            title,
            description,
            customer: customer || null,
            amount,
            issueDate: issueDate || new Date(),
            dueDate,
            requiresApproval,
            status,
            notes,
            createdBy: req.user._id
        });

        await document.populate('customer', 'name email');
        await document.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Documento criado com sucesso',
            data: { document }
        });

    } catch (error) {
        console.error('Erro ao criar documento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar documento
exports.updateDocument = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
            });
        }

        // Não permitir alteração de documentos assinados ou cancelados
        if (document.status === 'signed' || document.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível alterar documentos assinados ou cancelados'
            });
        }

        // Verificar se cliente existe (se estiver sendo alterado)
        if (req.body.customer && req.body.customer !== document.customer?.toString()) {
            const customerExists = await Customer.findById(req.body.customer);
            if (!customerExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }
        }

        const updatedDocument = await Document.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('customer', 'name email')
        .populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Documento atualizado com sucesso',
            data: { document: updatedDocument }
        });

    } catch (error) {
        console.error('Erro ao atualizar documento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Assinar documento
exports.signDocument = async (req, res) => {
    try {
        const { signatureData, password } = req.body;

        if (!signatureData) {
            return res.status(400).json({
                success: false,
                message: 'Dados da assinatura são obrigatórios'
            });
        }

        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
            });
        }

        if (document.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Apenas documentos pendentes podem ser assinados'
            });
        }

        if (!document.requiresApproval) {
            return res.status(400).json({
                success: false,
                message: 'Este documento não requer aprovação por assinatura'
            });
        }

        // Em uma implementação real, verificar a senha do usuário aqui
        // const isPasswordValid = await req.user.comparePassword(password);
        // if (!isPasswordValid) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Senha incorreta'
        //     });
        // }

        await document.signDocument(req.user._id, signatureData);

        await document.populate('customer', 'name email');
        await document.populate('createdBy', 'name email');
        await document.populate('signedBy', 'name email');

        res.json({
            success: true,
            message: 'Documento assinado com sucesso',
            data: { document }
        });

    } catch (error) {
        console.error('Erro ao assinar documento:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
};

// Atualizar status do documento
exports.updateDocumentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['draft', 'pending', 'signed', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }

        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
            });
        }

        // Validações de transição de status
        if (document.status === 'signed' && status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Documentos assinados só podem ser cancelados'
            });
        }

        if (document.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Documentos cancelados não podem ser alterados'
            });
        }

        document.status = status;
        
        // Se rejeitado ou cancelado, limpar dados de assinatura
        if (status === 'rejected' || status === 'cancelled') {
            document.signedBy = undefined;
            document.signedAt = undefined;
            document.signatureData = undefined;
        }
        
        await document.save();

        await document.populate('customer', 'name email');
        await document.populate('createdBy', 'name email');
        await document.populate('signedBy', 'name email');

        res.json({
            success: true,
            message: `Status do documento atualizado para ${status}`,
            data: { document }
        });

    } catch (error) {
        console.error('Erro ao atualizar status do documento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar documentos pendentes de assinatura
exports.getPendingDocuments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const documents = await Document.find({
            status: 'pending',
            requiresApproval: true
        })
        .populate('customer', 'name email')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1, issueDate: -1 })
        .skip(skip)
        .limit(limit);

        const total = await Document.countDocuments({
            status: 'pending',
            requiresApproval: true
        });

        res.json({
            success: true,
            data: {
                documents,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar documentos pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar documentos vencidos
exports.getOverdueDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            status: 'pending',
            dueDate: { $lt: new Date() }
        })
        .populate('customer', 'name email')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1 });

        res.json({
            success: true,
            data: { documents }
        });

    } catch (error) {
        console.error('Erro ao buscar documentos vencidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Deletar documento
exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
            });
        }

        // Não permitir exclusão de documentos assinados
        if (document.status === 'signed') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir documentos assinados'
            });
        }

        await Document.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Documento excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
