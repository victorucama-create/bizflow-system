const { Op } = require('sequelize');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const SecurityLog = require('../models/SecurityLog');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class InventoryController {
    /**
     * @swagger
     * /api/inventory:
     *   get:
     *     summary: Get all inventory items
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: lowStock
     *         schema:
     *           type: boolean
     *       - in: query
     *         name: outOfStock
     *         schema:
     *           type: boolean
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *     responses:
     *       200:
     *         description: List of inventory items
     */
    async getInventory(req, res) {
        try {
            const userId = req.user.id;
            const {
                lowStock,
                outOfStock,
                category,
                search,
                page = 1,
                limit = 20
            } = req.query;
            
            const where = { userId };
            
            // Apply filters
            if (lowStock === 'true') {
                where.status = 'low';
            }
            
            if (outOfStock === 'true') {
                where.status = 'out';
            }
            
            if (category) {
                where['$product.category$'] = category;
            }
            
            if (search) {
                where[Op.or] = [
                    { '$product.name$': { [Op.iLike]: `%${search}%` } },
                    { '$product.sku$': { [Op.iLike]: `%${search}%` } },
                    { location: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            const offset = (page - 1) * limit;
            
            const { count, rows: inventory } = await Inventory.findAndCountAll({
                where,
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'category', 'price', 'imageUrl']
                }],
                order: [
                    ['status', 'ASC'],
                    ['quantity', 'ASC']
                ],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            // Log access
            await SecurityLog.create({
                userId,
                action: 'VIEW_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { 
                    filters: { lowStock, outOfStock, category, search },
                    count
                }
            });
            
            res.json({
                success: true,
                data: inventory,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    pages: Math.ceil(count / limit),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            logger.error('Get inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/stats:
     *   get:
     *     summary: Get inventory statistics
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Statistics data
     */
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            
            // Get total inventory value
            const inventoryValue = await Inventory.getInventoryValue(userId);
            
            // Get low stock count
            const lowStockCount = await Inventory.count({
                where: {
                    userId,
                    status: 'low'
                }
            });
            
            // Get out of stock count
            const outOfStockCount = await Inventory.count({
                where: {
                    userId,
                    status: 'out'
                }
            });
            
            // Get expiring items (next 30 days)
            const expiringItems = await Inventory.getExpiringItems(userId, 30);
            
            // Get recent movements
            const recentMovements = await InventoryMovement.findAll({
                where: { userId },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name', 'sku']
                }],
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            
            // Get category distribution
            const categoryStats = await Inventory.findAll({
                where: { userId },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['category']
                }],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('Inventory.id')), 'count'],
                    [sequelize.fn('SUM', sequelize.literal('quantity * COALESCE(Inventory.cost, 0)')), 'value']
                ],
                group: ['product.category'],
                raw: true
            });
            
            const stats = {
                summary: {
                    totalValue: inventoryValue.totalValue,
                    totalItems: inventoryValue.totalItems,
                    lowStockCount,
                    outOfStockCount,
                    expiringCount: expiringItems.length
                },
                categories: categoryStats.map(stat => ({
                    category: stat['product.category'],
                    count: parseInt(stat.count),
                    value: parseFloat(stat.value) || 0
                })),
                recentMovements: recentMovements.map(movement => ({
                    id: movement.id,
                    productName: movement.product?.name,
                    type: movement.type,
                    quantity: movement.quantity,
                    date: movement.createdAt
                }))
            };
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            logger.error('Get inventory stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar estatísticas',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/{id}:
     *   get:
     *     summary: Get inventory item by ID
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Inventory item details
     */
    async getInventoryById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const inventory = await Inventory.findOne({
                where: { id, userId },
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku', 'category', 'price', 'description', 'imageUrl']
                    },
                    {
                        model: InventoryMovement,
                        as: 'movements',
                        limit: 20,
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });
            
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: 'Item de inventário não encontrado'
                });
            }
            
            // Log view
            await SecurityLog.create({
                userId,
                action: 'VIEW_INVENTORY_ITEM',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { inventoryId: id, productId: inventory.productId }
            });
            
            res.json({
                success: true,
                data: inventory
            });
            
        } catch (error) {
            logger.error('Get inventory by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar item de inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory:
     *   post:
     *     summary: Create a new inventory item
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [productId, quantity]
     *             properties:
     *               productId:
     *                 type: string
     *               quantity:
     *                 type: number
     *               location:
     *                 type: string
     *               cost:
     *                 type: number
     *               expiryDate:
     *                 type: string
     *                 format: date
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Inventory item created
     */
    async createInventory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const {
                productId,
                quantity,
                location,
                cost,
                expiryDate,
                notes
            } = req.body;
            
            // Check if product exists and belongs to user
            const product = await Product.findOne({
                where: { id: productId, userId }
            });
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
            
            // Check if inventory already exists for this product
            let inventory = await Inventory.findOne({
                where: { productId, userId }
            });
            
            if (inventory) {
                return res.status(400).json({
                    success: false,
                    message: 'Inventário para este produto já existe. Use a atualização.'
                });
            }
            
            // Create inventory
            inventory = await Inventory.create({
                productId,
                userId,
                quantity: quantity || 0,
                location,
                cost,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                notes,
                minStock: product.minStock || 5
            });
            
            // If initial quantity > 0, log as initial stock
            if (quantity > 0) {
                await InventoryMovement.create({
                    inventoryId: inventory.id,
                    productId,
                    userId,
                    type: 'initial',
                    quantity,
                    previousQuantity: 0,
                    newQuantity: quantity,
                    unitCost: cost || product.cost || 0,
                    notes: 'Estoque inicial'
                });
            }
            
            // Log creation
            await SecurityLog.create({
                userId,
                action: 'CREATE_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    inventoryId: inventory.id,
                    productId,
                    quantity,
                    location
                }
            });
            
            res.status(201).json({
                success: true,
                message: 'Item de inventário criado com sucesso',
                data: inventory
            });
            
        } catch (error) {
            logger.error('Create inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar item de inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/{id}:
     *   put:
     *     summary: Update inventory item
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               quantity:
     *                 type: number
     *               location:
     *                 type: string
     *               cost:
     *                 type: number
     *               expiryDate:
     *                 type: string
     *                 format: date
     *               notes:
     *                 type: string
     *     responses:
     *       200:
     *         description: Inventory item updated
     */
    async updateInventory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;
            
            const inventory = await Inventory.findOne({
                where: { id, userId }
            });
            
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: 'Item de inventário não encontrado'
                });
            }
            
            // Check if quantity is being updated
            if (updateData.quantity !== undefined && updateData.quantity !== inventory.quantity) {
                const adjustment = updateData.quantity - inventory.quantity;
                const reason = updateData.reason || 'Ajuste manual';
                
                // Log the adjustment
                await InventoryMovement.create({
                    inventoryId: inventory.id,
                    productId: inventory.productId,
                    userId,
                    type: 'adjustment',
                    quantity: adjustment,
                    previousQuantity: inventory.quantity,
                    newQuantity: updateData.quantity,
                    unitCost: inventory.cost || 0,
                    notes: reason
                });
            }
            
            // Update other fields
            const allowedFields = ['location', 'cost', 'expiryDate', 'notes', 'minStock', 'maxStock'];
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    inventory[field] = updateData[field];
                }
            });
            
            // Update quantity if provided
            if (updateData.quantity !== undefined) {
                inventory.quantity = updateData.quantity;
            }
            
            await inventory.save();
            
            // Log update
            await SecurityLog.create({
                userId,
                action: 'UPDATE_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    inventoryId: id,
                    changes: updateData
                }
            });
            
            res.json({
                success: true,
                message: 'Item de inventário atualizado com sucesso',
                data: inventory
            });
            
        } catch (error) {
            logger.error('Update inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar item de inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/{id}/adjust:
     *   post:
     *     summary: Adjust inventory quantity
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [adjustment, reason]
     *             properties:
     *               adjustment:
     *                 type: number
     *               reason:
     *                 type: string
     *               notes:
     *                 type: string
     *     responses:
     *       200:
     *         description: Inventory adjusted
     */
    async adjustInventory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const { id } = req.params;
            const { adjustment, reason, notes = '' } = req.body;
            
            const inventory = await Inventory.findOne({
                where: { id, userId }
            });
            
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: 'Item de inventário não encontrado'
                });
            }
            
            // Adjust quantity
            await inventory.adjustQuantity(adjustment, reason + (notes ? `: ${notes}` : ''));
            
            // Log adjustment
            await SecurityLog.create({
                userId,
                action: 'ADJUST_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    inventoryId: id,
                    productId: inventory.productId,
                    adjustment,
                    reason,
                    newQuantity: inventory.quantity
                }
            });
            
            res.json({
                success: true,
                message: 'Inventário ajustado com sucesso',
                data: {
                    inventoryId: inventory.id,
                    productId: inventory.productId,
                    adjustment,
                    previousQuantity: inventory.quantity - adjustment,
                    newQuantity: inventory.quantity,
                    status: inventory.status
                }
            });
            
        } catch (error) {
            logger.error('Adjust inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao ajustar inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/{id}/transfer:
     *   post:
     *     summary: Transfer inventory between locations
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [quantity, toLocation]
     *             properties:
     *               quantity:
     *                 type: number
     *               toLocation:
     *                 type: string
     *               notes:
     *                 type: string
     *     responses:
     *       200:
     *         description: Inventory transferred
     */
    async transferInventory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const { id } = req.params;
            const { quantity, toLocation, notes = '' } = req.body;
            
            const inventory = await Inventory.findOne({
                where: { id, userId }
            });
            
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: 'Item de inventário não encontrado'
                });
            }
            
            // Transfer inventory
            const result = await inventory.transfer(toLocation, quantity, notes);
            
            // Log transfer
            await SecurityLog.create({
                userId,
                action: 'TRANSFER_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    inventoryId: id,
                    productId: inventory.productId,
                    quantity,
                    fromLocation: inventory.location,
                    toLocation
                }
            });
            
            res.json({
                success: true,
                message: 'Inventário transferido com sucesso',
                data: {
                    from: {
                        id: result.from.id,
                        location: result.from.location,
                        quantity: result.from.quantity
                    },
                    to: {
                        id: result.to.id,
                        location: result.to.location,
                        quantity: result.to.quantity
                    }
                }
            });
            
        } catch (error) {
            logger.error('Transfer inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao transferir inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/{id}:
     *   delete:
     *     summary: Delete inventory item
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Inventory item deleted
     */
    async deleteInventory(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const inventory = await Inventory.findOne({
                where: { id, userId }
            });
            
            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: 'Item de inventário não encontrado'
                });
            }
            
            // Check if inventory has quantity
            if (inventory.quantity > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir item com estoque. Ajuste para zero primeiro.'
                });
            }
            
            await inventory.destroy();
            
            // Log deletion
            await SecurityLog.create({
                userId,
                action: 'DELETE_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { inventoryId: id, productId: inventory.productId }
            });
            
            res.json({
                success: true,
                message: 'Item de inventário excluído com sucesso'
            });
            
        } catch (error) {
            logger.error('Delete inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao excluir item de inventário',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/low-stock:
     *   get:
     *     summary: Get low stock items
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of low stock items
     */
    async getLowStock(req, res) {
        try {
            const userId = req.user.id;
            
            const lowStockItems = await Inventory.getLowStockItems(userId);
            
            res.json({
                success: true,
                data: lowStockItems
            });
            
        } catch (error) {
            logger.error('Get low stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar itens com estoque baixo'
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/out-of-stock:
     *   get:
     *     summary: Get out of stock items
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of out of stock items
     */
    async getOutOfStock(req, res) {
        try {
            const userId = req.user.id;
            
            const outOfStockItems = await Inventory.getOutOfStockItems(userId);
            
            res.json({
                success: true,
                data: outOfStockItems
            });
            
        } catch (error) {
            logger.error('Get out of stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar itens sem estoque'
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/expiring:
     *   get:
     *     summary: Get expiring items
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: days
     *         schema:
     *           type: integer
     *           default: 30
     *     responses:
     *       200:
     *         description: List of expiring items
     */
    async getExpiring(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 30;
            
            const expiringItems = await Inventory.getExpiringItems(userId, days);
            
            res.json({
                success: true,
                data: {
                    days,
                    items: expiringItems
                }
            });
            
        } catch (error) {
            logger.error('Get expiring items error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar itens próximos do vencimento'
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/history/{productId}:
     *   get:
     *     summary: Get inventory history for product
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: productId
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 50
     *     responses:
     *       200:
     *         description: Inventory history
     */
    async getHistory(req, res) {
        try {
            const userId = req.user.id;
            const { productId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            
            // Check if product belongs to user
            const product = await Product.findOne({
                where: { id: productId, userId }
            });
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
            
            const history = await InventoryMovement.getProductHistory(productId, userId, limit);
            
            res.json({
                success: true,
                data: history
            });
            
        } catch (error) {
            logger.error('Get inventory history error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar histórico'
            });
        }
    }

    /**
     * @swagger
     * /api/inventory/bulk-update:
     *   post:
     *     summary: Bulk update inventory
     *     tags: [Inventory]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [updates]
     *             properties:
     *               updates:
     *                 type: array
     *                 items:
     *                   type: object
     *                   required: [id, quantity]
     *                   properties:
     *                     id:
     *                       type: string
     *                     quantity:
     *                       type: number
     *                     cost:
     *                       type: number
     *                     location:
     *                       type: string
     *     responses:
     *       200:
     *         description: Inventory bulk updated
     */
    async bulkUpdate(req, res) {
        try {
            const userId = req.user.id;
            const { updates } = req.body;
            
            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhuma atualização fornecida'
                });
            }
            
            const results = [];
            
            for (const update of updates) {
                const inventory = await Inventory.findOne({
                    where: { id: update.id, userId }
                });
                
                if (inventory) {
                    const oldQuantity = inventory.quantity;
                    
                    if (update.quantity !== undefined) {
                        const adjustment = update.quantity - oldQuantity;
                        
                        if (adjustment !== 0) {
                            await inventory.adjustQuantity(adjustment, 'Atualização em massa');
                        }
                    }
                    
                    if (update.cost !== undefined) {
                        inventory.cost = update.cost;
                    }
                    
                    if (update.location !== undefined) {
                        inventory.location = update.location;
                    }
                    
                    await inventory.save();
                    
                    results.push({
                        id: inventory.id,
                        success: true,
                        newQuantity: inventory.quantity
                    });
                } else {
                    results.push({
                        id: update.id,
                        success: false,
                        error: 'Não encontrado'
                    });
                }
            }
            
            // Log bulk update
            await SecurityLog.create({
                userId,
                action: 'BULK_UPDATE_INVENTORY',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    totalUpdates: updates.length,
                    successful: results.filter(r => r.success).length
                }
            });
            
            res.json({
                success: true,
                message: 'Atualização em massa concluída',
                data: results
            });
            
        } catch (error) {
            logger.error('Bulk update inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro na atualização em massa'
            });
        }
    }
}

module.exports = new InventoryController();
