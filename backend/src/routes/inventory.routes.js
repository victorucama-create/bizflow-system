const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { validateInventory } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management
 */

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
router.get('/', inventoryController.getInventory);

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
router.get('/stats', inventoryController.getStats);

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
router.get('/:id', inventoryController.getInventoryById);

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
router.post('/', validateInventory, inventoryController.createInventory);

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
router.put('/:id', validateInventory, inventoryController.updateInventory);

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
router.post('/:id/adjust', inventoryController.adjustInventory);

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
router.post('/:id/transfer', inventoryController.transferInventory);

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
router.delete('/:id', inventoryController.deleteInventory);

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
router.get('/low-stock', async (req, res) => {
    try {
        const inventory = await Inventory.findAll({
            where: {
                userId: req.user.id,
                quantity: {
                    [Op.lte]: sequelize.literal('"Inventory"."minStock"')
                }
            },
            include: [{
                model: Product,
                as: 'product'
            }],
            order: [['quantity', 'ASC']]
        });
        
        res.json({
            success: true,
            data: inventory
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching low stock items'
        });
    }
});

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
router.get('/out-of-stock', async (req, res) => {
    try {
        const inventory = await Inventory.findAll({
            where: {
                userId: req.user.id,
                quantity: 0
            },
            include: [{
                model: Product,
                as: 'product'
            }],
            order: [['updatedAt', 'DESC']]
        });
        
        res.json({
            success: true,
            data: inventory
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching out of stock items'
        });
    }
});

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
router.post('/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided'
            });
        }
        
        const results = [];
        
        for (const update of updates) {
            const inventory = await Inventory.findOne({
                where: { id: update.id, userId: req.user.id }
            });
            
            if (inventory) {
                const oldQuantity = inventory.quantity;
                
                if (update.quantity !== undefined) {
                    inventory.quantity = update.quantity;
                }
                
                if (update.cost !== undefined) {
                    inventory.cost = update.cost;
                }
                
                if (update.location !== undefined) {
                    inventory.location = update.location;
                }
                
                await inventory.save();
                
                // Log adjustment
                await InventoryLog.create({
                    inventoryId: inventory.id,
                    productId: inventory.productId,
                    userId: req.user.id,
                    type: 'bulk_update',
                    adjustment: update.quantity - oldQuantity,
                    previousQuantity: oldQuantity,
                    newQuantity: inventory.quantity,
                    notes: 'Bulk update'
                });
                
                results.push({
                    id: inventory.id,
                    success: true
                });
            } else {
                results.push({
                    id: update.id,
                    success: false,
                    error: 'Not found'
                });
            }
        }
        
        res.json({
            success: true,
            message: 'Bulk update completed',
            data: results
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in bulk update'
        });
    }
});

/**
 * @swagger
 * /api/inventory/export:
 *   get:
 *     summary: Export inventory to CSV
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 */
router.get('/export', async (req, res) => {
    try {
        const inventory = await Inventory.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['name', 'sku', 'category']
            }],
            order: [['product.name', 'ASC']]
        });
        
        // Generate CSV
        const csvData = [];
        csvData.push(['SKU', 'Produto', 'Categoria', 'Quantidade', 'Estoque Mínimo', 'Localização', 'Custo Unitário', 'Valor Total']);
        
        inventory.forEach(item => {
            csvData.push([
                item.product?.sku || '',
                item.product?.name || '',
                item.product?.category || '',
                item.quantity,
                item.minStock,
                item.location || '',
                item.cost || 0,
                (item.quantity * (item.cost || 0)).toFixed(2)
            ]);
        });
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        
        res.header('Content-Type', 'text/csv');
        res.attachment('inventory.csv');
        res.send(csvContent);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting inventory'
        });
    }
});

/**
 * @swagger
 * /api/inventory/logs/{productId}:
 *   get:
 *     summary: Get inventory logs for a product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory logs
 */
router.get('/logs/:productId', async (req, res) => {
    try {
        const logs = await InventoryLog.findAll({
            where: { productId: req.params.productId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['name', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        res.json({
            success: true,
            data: logs
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory logs'
        });
    }
});

module.exports = router;
