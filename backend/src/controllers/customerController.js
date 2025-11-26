const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

// Buscar todos os clientes
exports.getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const filter = { status: 'active' };
        
        // Filtros opcionais
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const customers = await Customer.find(filter)
            .populate('createdBy', 'name email')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Customer.countDocuments(filter);

        res.json({
            success: true,
            data: {
                customers,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar cliente específico
exports.getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        res.json({
            success: true,
            data: { customer }
        });

    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Criar cliente
exports.createCustomer = async (req, res) => {
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
            name,
            email,
            phone,
            type,
            taxId,
            address,
            notes
        } = req.body;

        // Verificar se email já existe
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um cliente com este email'
            });
        }

        const customer = await Customer.create({
            name,
            email,
            phone,
            type,
            taxId,
            address,
            notes,
            createdBy: req.user._id
        });

        await customer.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Cliente criado com sucesso',
            data: { customer }
        });

    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar cliente
exports.updateCustomer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        // Verificar se email já existe (se estiver sendo alterado)
        if (req.body.email && req.body.email !== customer.email) {
            const existingCustomer = await Customer.findOne({ 
                email: req.body.email,
                _id: { $ne: customer._id }
            });
            if (existingCustomer) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um cliente com este email'
                });
            }
        }

        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Cliente atualizado com sucesso',
            data: { customer: updatedCustomer }
        });

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Deletar cliente
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        // Soft delete - marcar como inativo
        customer.status = 'inactive';
        await customer.save();

        res.json({
            success: true,
            message: 'Cliente excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar clientes
exports.searchCustomers = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Termo de busca é obrigatório'
            });
        }

        const customers = await Customer.find({
            $and: [
                { status: 'active' },
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } },
                        { phone: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
        .sort({ name: 1 })
        .limit(20);

        res.json({
            success: true,
            data: { customers }
        });

    } catch (error) {
        console.error('Erro na busca de clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
