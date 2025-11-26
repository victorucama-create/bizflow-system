const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Buscar todos os produtos
exports.getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const filter = { status: 'active' };
        
        // Filtros opcionais
        if (req.query.category) {
            filter.category = req.query.category;
        }
        if (req.query.minPrice) {
            filter.price = { $gte: parseFloat(req.query.minPrice) };
        }
        if (req.query.maxPrice) {
            filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
        }

        const products = await Product.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar produto específico
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        res.json({
            success: true,
            data: { product }
        });

    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Criar produto
exports.createProduct = async (req, res) => {
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
            sku,
            description,
            category,
            price,
            cost,
            stock,
            minStock,
            supplier,
            images
        } = req.body;

        // Verificar se SKU já existe
        const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um produto com este SKU'
            });
        }

        const product = await Product.create({
            name,
            sku: sku.toUpperCase(),
            description,
            category,
            price,
            cost,
            stock,
            minStock,
            supplier,
            images,
            createdBy: req.user._id
        });

        await product.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Produto criado com sucesso',
            data: { product }
        });

    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar produto
exports.updateProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados de entrada inválidos',
                errors: errors.array()
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        // Verificar se SKU já existe (se estiver sendo alterado)
        if (req.body.sku && req.body.sku !== product.sku) {
            const existingProduct = await Product.findOne({ 
                sku: req.body.sku.toUpperCase(),
                _id: { $ne: product._id }
            });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um produto com este SKU'
                });
            }
            req.body.sku = req.body.sku.toUpperCase();
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Produto atualizado com sucesso',
            data: { product: updatedProduct }
        });

    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Deletar produto
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        // Soft delete - marcar como inativo
        product.status = 'inactive';
        await product.save();

        res.json({
            success: true,
            message: 'Produto excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar produtos por categoria
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const products = await Product.find({ 
            category,
            status: 'active'
        })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);

        const total = await Product.countDocuments({ 
            category,
            status: 'active'
        });

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar produtos por categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar produtos
exports.searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Termo de busca é obrigatório'
            });
        }

        const products = await Product.find({
            $and: [
                { status: 'active' },
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { sku: { $regex: q, $options: 'i' } },
                        { description: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
        .sort({ name: 1 })
        .limit(20);

        res.json({
            success: true,
            data: { products }
        });

    } catch (error) {
        console.error('Erro na busca de produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
