const InventoryMovement = require('../models/Inventory');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Buscar todas as movimentações
exports.getInventoryMovements = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const filter = {};
        
        // Filtros opcionais
        if (req.query.product) {
            filter.product = req.query.product;
        }
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.reason) {
            filter.reason = req.query.reason;
        }
        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const movements = await InventoryMovement.find(filter)
            .populate('product', 'name sku category')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await InventoryMovement.countDocuments(filter);

        res.json({
            success: true,
            data: {
                movements,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar movimentação específica
exports.getInventoryMovement = async (req, res) => {
    try {
        const movement = await InventoryMovement.findById(req.params.id)
            .populate('product')
            .populate('createdBy', 'name email');

        if (!movement) {
            return res.status(404).json({
                success: false,
                message: 'Movimentação não encontrada'
            });
        }

        res.json({
            success: true,
            data: { movement }
        });

    } catch (error) {
        console.error('Erro ao buscar movimentação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Registrar movimentação de entrada
exports.recordEntry = async (req, res) => {
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
            product,
            quantity,
            reason,
            reference,
            notes,
            cost
        } = req.body;

        const movement = await InventoryMovement.recordMovement({
            product,
            type: 'in',
            quantity,
            reason: reason || 'purchase',
            reference,
            notes,
            cost,
            createdBy: req.user._id
        });

        await movement.populate('product', 'name sku');
        await movement.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Entrada de estoque registrada com sucesso',
            data: { movement }
        });

    } catch (error) {
        console.error('Erro ao registrar entrada:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
};

// Registrar movimentação de saída
exports.recordOut = async (req, res) => {
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
            product,
            quantity,
            reason,
            reference,
            notes
        } = req.body;

        const movement = await InventoryMovement.recordMovement({
            product,
            type: 'out',
            quantity,
            reason: reason || 'sale',
            reference,
            notes,
            createdBy: req.user._id
        });

        await movement.populate('product', 'name sku');
        await movement.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Saída de estoque registrada com sucesso',
            data: { movement }
        });

    } catch (error) {
        console.error('Erro ao registrar saída:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
};

// Ajustar estoque manualmente
exports.adjustStock = async (req, res) => {
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
            product,
            newStock,
            reason,
            notes
        } = req.body;

        const productDoc = await Product.findById(product);
        if (!productDoc) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        const movement = await InventoryMovement.recordMovement({
            product,
            type: 'adjustment',
            quantity: newStock, // Para ajustes, quantity é o novo valor
            reason: reason || 'adjustment',
            notes,
            createdBy: req.user._id
        });

        await movement.populate('product', 'name sku');
        await movement.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Estoque ajustado com sucesso',
            data: { movement }
        });

    } catch (error) {
        console.error('Erro ao ajustar estoque:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
};

// Buscar relatório de estoque
exports.getInventoryReport = async (req, res) => {
    try {
        const products = await Product.find({ status: 'active' })
            .select('name sku category price cost stock minStock')
            .sort({ category: 1, name: 1 });

        // Calcular estatísticas
        const totalItems = products.reduce((sum, product) => sum + product.stock, 0);
        const totalValue = products.reduce((sum, product) => sum + (product.stock * product.cost), 0);
        const lowStockItems = products.filter(product => product.stock <= product.minStock).length;
        const outOfStockItems = products.filter(product => product.stock === 0).length;

        // Produtos com estoque baixo
        const lowStockProducts = products.filter(product => 
            product.stock <= product.minStock && product.stock > 0
        );

        // Produtos sem estoque
        const outOfStockProducts = products.filter(product => product.stock === 0);

        res.json({
            success: true,
            data: {
                summary: {
                    totalProducts: products.length,
                    totalItems,
                    totalValue: parseFloat(totalValue.toFixed(2)),
                    lowStockItems,
                    outOfStockItems
                },
                lowStockProducts,
                outOfStockProducts,
                allProducts: products
            }
        });

    } catch (error) {
        console.error('Erro ao gerar relatório de estoque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar histórico de um produto
exports.getProductHistory = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const movements = await InventoryMovement.find({ product: productId })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await InventoryMovement.countDocuments({ product: productId });

        // Estatísticas do produto
        const product = await Product.findById(productId)
            .select('name sku category stock minStock');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        res.json({
            success: true,
            data: {
                product,
                movements,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico do produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
