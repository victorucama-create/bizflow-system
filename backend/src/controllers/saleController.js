const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

// Buscar todas as vendas
exports.getSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const filter = {};
        
        // Filtros opcionais
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.customer) {
            filter.customer = req.query.customer;
        }
        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const sales = await Sale.find(filter)
            .populate('customer', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Sale.countDocuments(filter);

        // Estatísticas
        const stats = await Sale.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    averageSale: { $avg: '$total' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                sales,
                stats: stats[0] || { totalSales: 0, totalRevenue: 0, averageSale: 0 },
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Buscar venda específica
exports.getSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('customer')
            .populate('createdBy', 'name email')
            .populate('items.product');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venda não encontrada'
            });
        }

        res.json({
            success: true,
            data: { sale }
        });

    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Criar venda
exports.createSale = async (req, res) => {
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
            customer,
            items,
            discount = 0,
            tax = 0,
            paymentMethod,
            paymentDetails,
            notes
        } = req.body;

        // Verificar estoque e preços dos produtos
        const saleItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Produto não encontrado: ${item.productId}`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`
                });
            }

            const unitPrice = item.unitPrice || product.price;
            const totalPrice = unitPrice * item.quantity;

            saleItems.push({
                product: product._id,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice
            });

            subtotal += totalPrice;
        }

        // Calcular total
        const total = subtotal - discount + tax;

        // Gerar número da venda
        const saleNumber = await Sale.generateSaleNumber();

        // Criar venda
        const sale = await Sale.create({
            saleNumber,
            customer: customer || null,
            items: saleItems,
            subtotal,
            discount,
            tax,
            total,
            paymentMethod,
            paymentDetails,
            notes,
            createdBy: req.user._id
        });

        await sale.populate('customer', 'name email');
        await sale.populate('createdBy', 'name email');

        // Se a venda estiver completada, processar (atualizar estoque)
        if (sale.status === 'completed') {
            await sale.processSale();
        }

        res.status(201).json({
            success: true,
            message: 'Venda criada com sucesso',
            data: { sale }
        });

    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar status da venda
exports.updateSaleStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }

        const sale = await Sale.findById(req.params.id);
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venda não encontrada'
            });
        }

        // Se mudando para completed, processar a venda
        if (status === 'completed' && sale.status !== 'completed') {
            await sale.processSale();
        }

        // Se cancelando ou estornando, reverter estoque
        if ((status === 'cancelled' || status === 'refunded') && 
            (sale.status === 'completed' || sale.status === 'pending')) {
            await revertStock(sale);
        }

        sale.status = status;
        await sale.save();

        await sale.populate('customer', 'name email');
        await sale.populate('createdBy', 'name email');

        res.json({
            success: true,
            message: `Status da venda atualizado para ${status}`,
            data: { sale }
        });

    } catch (error) {
        console.error('Erro ao atualizar status da venda:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Função para reverter estoque
async function revertStock(sale) {
    for (const item of sale.items) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
        );
    }
    
    // Reverter estatísticas do cliente se houver
    if (sale.customer) {
        await Customer.findByIdAndUpdate(sale.customer, {
            $inc: { totalPurchases: -sale.total }
        });
    }
}

// Buscar vendas por período
exports.getSalesByPeriod = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Data inicial e final são obrigatórias'
            });
        }

        const sales = await Sale.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: 'completed'
        })
        .populate('customer', 'name')
        .sort({ createdAt: -1 });

        const stats = await Sale.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    averageSale: { $avg: '$total' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                sales,
                stats: stats[0] || { totalSales: 0, totalRevenue: 0, averageSale: 0 }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar vendas por período:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
