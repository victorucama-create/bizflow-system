const { Op } = require('sequelize');
const Document = require('../models/Document');
const Customer = require('../models/Customer');
const SecurityLog = require('../models/SecurityLog');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class DocumentController {
    /**
     * @swagger
     * /api/documents:
     *   get:
     *     summary: Get all documents with filters
     *     tags: [Documents]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date
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
     *         description: List of documents
     */
    async getDocuments(req, res) {
        try {
            const userId = req.user.id;
            const {
                type,
                status,
                startDate,
                endDate,
                search,
                page = 1,
                limit = 20
            } = req.query;
            
            const where = { userId };
            
            // Apply filters
            if (type) where.type = type;
            if (status) where.status = status;
            
            if (startDate || endDate) {
                where.issueDate = {};
                if (startDate) where.issueDate[Op.gte] = new Date(startDate);
                if (endDate) where.issueDate[Op.lte] = new Date(endDate);
            }
            
            if (search) {
                where[Op.or] = [
                    { number: { [Op.iLike]: `%${search}%` } },
                    { notes: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            const offset = (page - 1) * limit;
            
            const { count, rows: documents } = await Document.findAndCountAll({
                where,
                include: [{
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'email']
                }],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            // Log access
            await SecurityLog.create({
                userId,
                action: 'VIEW_DOCUMENTS',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { filters: { type, status, startDate, endDate } }
            });
            
            res.json({
                success: true,
                data: documents,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    pages: Math.ceil(count / limit),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            logger.error('Get documents error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar documentos',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}:
     *   get:
     *     summary: Get document by ID
     *     tags: [Documents]
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
     *         description: Document details
     *       404:
     *         description: Document not found
     */
    async getDocumentById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const document = await Document.findOne({
                where: { id, userId },
                include: [{
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'documentNumber']
                }]
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            // Log view
            await SecurityLog.create({
                userId,
                action: 'VIEW_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { documentId: id, type: document.type }
            });
            
            res.json({
                success: true,
                data: document
            });
            
        } catch (error) {
            logger.error('Get document by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents:
     *   post:
     *     summary: Create a new document
     *     tags: [Documents]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [type, customerId]
     *             properties:
     *               type:
     *                 type: string
     *               customerId:
     *                 type: string
     *               items:
     *                 type: array
     *               dueDate:
     *                 type: string
     *                 format: date
     *               notes:
     *                 type: string
     *               terms:
     *                 type: string
     *     responses:
     *       201:
     *         description: Document created
     *       400:
     *         description: Invalid data
     */
    async createDocument(req, res) {
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
                type,
                customerId,
                items = [],
                dueDate,
                notes,
                terms,
                series = '001'
            } = req.body;
            
            // Validate customer
            const customer = await Customer.findOne({
                where: { id: customerId, userId }
            });
            
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }
            
            // Calculate totals
            let subtotal = 0;
            items.forEach(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                const discount = parseFloat(item.discount) || 0;
                const itemTotal = quantity * price;
                const itemDiscount = itemTotal * (discount / 100);
                subtotal += itemTotal - itemDiscount;
            });
            
            const tax = subtotal * 0.18; // 18% ICMS (example)
            const total = subtotal + tax;
            
            // Create document
            const document = await Document.create({
                userId,
                customerId,
                type,
                series,
                items,
                subtotal,
                tax,
                total,
                dueDate: dueDate ? new Date(dueDate) : null,
                notes,
                terms,
                status: 'draft'
            });
            
            // Log creation
            await SecurityLog.create({
                userId,
                action: 'CREATE_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    documentId: document.id,
                    type,
                    customerId,
                    total: document.total
                }
            });
            
            res.status(201).json({
                success: true,
                message: 'Documento criado com sucesso',
                data: document
            });
            
        } catch (error) {
            logger.error('Create document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}:
     *   put:
     *     summary: Update document
     *     tags: [Documents]
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
     *               items:
     *                 type: array
     *               dueDate:
     *                 type: string
     *                 format: date
     *               notes:
     *                 type: string
     *               terms:
     *                 type: string
     *               status:
     *                 type: string
     *     responses:
     *       200:
     *         description: Document updated
     *       404:
     *         description: Document not found
     */
    async updateDocument(req, res) {
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
            
            const document = await Document.findOne({
                where: { id, userId }
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            // Don't allow updating issued documents
            if (document.status === 'issued' || document.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: 'Documento já emitido, não pode ser alterado'
                });
            }
            
            // Update items if provided
            if (updateData.items) {
                document.items = updateData.items;
                document.calculateTotals();
            }
            
            // Update other fields
            const allowedFields = [
                'dueDate', 'notes', 'terms', 'status',
                'paymentTerms', 'discount'
            ];
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    document[field] = updateData[field];
                }
            });
            
            await document.save();
            
            // Log update
            await SecurityLog.create({
                userId,
                action: 'UPDATE_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    documentId: id,
                    changes: updateData
                }
            });
            
            res.json({
                success: true,
                message: 'Documento atualizado com sucesso',
                data: document
            });
            
        } catch (error) {
            logger.error('Update document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}/issue:
     *   post:
     *     summary: Issue document
     *     tags: [Documents]
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
     *         description: Document issued
     *       400:
     *         description: Cannot issue document
     */
    async issueDocument(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const document = await Document.findOne({
                where: { id, userId }
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            if (document.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Apenas documentos em rascunho podem ser emitidos'
                });
            }
            
            // Issue document
            document.status = 'issued';
            document.issueDate = new Date();
            await document.save();
            
            // Generate PDF
            await this.generatePDF(document);
            
            // Log issue
            await SecurityLog.create({
                userId,
                action: 'ISSUE_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { documentId: id, type: document.type }
            });
            
            res.json({
                success: true,
                message: 'Documento emitido com sucesso',
                data: document
            });
            
        } catch (error) {
            logger.error('Issue document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao emitir documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}/sign:
     *   post:
     *     summary: Sign document
     *     tags: [Documents]
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
     *             required: [signatureData]
     *             properties:
     *               signatureData:
     *                 type: object
     *               signedBy:
     *                 type: string
     *     responses:
     *       200:
     *         description: Document signed
     *       400:
     *         description: Cannot sign document
     */
    async signDocument(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { signatureData, signedBy } = req.body;
            
            const document = await Document.findOne({
                where: { id, userId }
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            if (document.isSigned) {
                return res.status(400).json({
                    success: false,
                    message: 'Documento já assinado'
                });
            }
            
            // Add signature
            document.addSignature(signatureData, signedBy || req.user.name);
            await document.save();
            
            // Update PDF with signature
            await this.generatePDF(document);
            
            // Log signature
            await SecurityLog.create({
                userId,
                action: 'SIGN_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { documentId: id, signedBy: document.signedBy }
            });
            
            res.json({
                success: true,
                message: 'Documento assinado com sucesso',
                data: {
                    isSigned: document.isSigned,
                    signedAt: document.signedAt,
                    signedBy: document.signedBy,
                    signatureVerified: document.verifySignature()
                }
            });
            
        } catch (error) {
            logger.error('Sign document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao assinar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}/download:
     *   get:
     *     summary: Download document PDF
     *     tags: [Documents]
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
     *         description: PDF file
     *       404:
     *         description: Document not found
     */
    async downloadDocument(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const document = await Document.findOne({
                where: { id, userId }
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            if (!document.filePath || !fs.existsSync(document.filePath)) {
                // Generate PDF if not exists
                await this.generatePDF(document);
            }
            
            // Log download
            await SecurityLog.create({
                userId,
                action: 'DOWNLOAD_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { documentId: id, type: document.type }
            });
            
            const filename = `${document.number}.pdf`;
            res.document(document.filePath, filename);
            
        } catch (error) {
            logger.error('Download document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao baixar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}/send:
     *   post:
     *     summary: Send document via email
     *     tags: [Documents]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: false
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *               message:
     *                 type: string
     *     responses:
     *       200:
     *         description: Document sent
     *       404:
     *         description: Document not found
     */
    async sendDocument(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { email, message } = req.body;
            
            const document = await Document.findOne({
                where: { id, userId },
                include: [{
                    model: Customer,
                    as: 'customer'
                }]
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            if (document.status !== 'issued') {
                return res.status(400).json({
                    success: false,
                    message: 'Apenas documentos emitidos podem ser enviados'
                });
            }
            
            const recipientEmail = email || document.customer?.email;
            
            if (!recipientEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum e-mail disponível para envio'
                });
            }
            
            // Generate PDF if not exists
            if (!document.filePath) {
                await this.generatePDF(document);
            }
            
            // Send email (implementation depends on email service)
            // await emailService.sendDocument(document, recipientEmail, message);
            
            // Update document status
            document.status = 'sent';
            await document.save();
            
            // Log send
            await SecurityLog.create({
                userId,
                action: 'SEND_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: {
                    documentId: id,
                    recipientEmail,
                    documentType: document.type
                }
            });
            
            res.json({
                success: true,
                message: 'Documento enviado com sucesso'
            });
            
        } catch (error) {
            logger.error('Send document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao enviar documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/{id}:
     *   delete:
     *     summary: Delete document
     *     tags: [Documents]
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
     *         description: Document deleted
     *       404:
     *         description: Document not found
     */
    async deleteDocument(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const document = await Document.findOne({
                where: { id, userId }
            });
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento não encontrado'
                });
            }
            
            // Don't allow deleting issued documents
            if (document.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Apenas rascunhos podem ser excluídos'
                });
            }
            
            // Delete PDF file if exists
            if (document.filePath && fs.existsSync(document.filePath)) {
                fs.unlinkSync(document.filePath);
            }
            
            await document.destroy();
            
            // Log deletion
            await SecurityLog.create({
                userId,
                action: 'DELETE_DOCUMENT',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { documentId: id, type: document.type }
            });
            
            res.json({
                success: true,
                message: 'Documento excluído com sucesso'
            });
            
        } catch (error) {
            logger.error('Delete document error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao excluir documento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @swagger
     * /api/documents/stats:
     *   get:
     *     summary: Get documents statistics
     *     tags: [Documents]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date
     *     responses:
     *       200:
     *         description: Statistics data
     */
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;
            
            const where = { userId };
            
            if (startDate || endDate) {
                where.issueDate = {};
                if (startDate) where.issueDate[Op.gte] = new Date(startDate);
                if (endDate) where.issueDate[Op.lte] = new Date(endDate);
            }
            
            const documents = await Document.findAll({
                where,
                attributes: [
                    'type',
                    'status',
                    [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['type', 'status'],
                raw: true
            });
            
            const stats = {
                totalDocuments: 0,
                totalValue: 0,
                byType: {},
                byStatus: {},
                overview: {
                    draft: 0,
                    issued: 0,
                    paid: 0,
                    overdue: 0
                }
            };
            
            documents.forEach(doc => {
                const total = parseFloat(doc.total) || 0;
                const count = parseInt(doc.count) || 0;
                
                stats.totalDocuments += count;
                stats.totalValue += total;
                
                // By type
                if (!stats.byType[doc.type]) {
                    stats.byType[doc.type] = { count: 0, total: 0 };
                }
                stats.byType[doc.type].count += count;
                stats.byType[doc.type].total += total;
                
                // By status
                if (!stats.byStatus[doc.status]) {
                    stats.byStatus[doc.status] = { count: 0, total: 0 };
                }
                stats.byStatus[doc.status].count += count;
                stats.byStatus[doc.status].total += total;
                
                // Overview
                if (doc.status === 'draft') stats.overview.draft += count;
                else if (doc.status === 'issued') stats.overview.issued += count;
                else if (doc.status === 'paid') stats.overview.paid += count;
                else if (doc.status === 'overdue') stats.overview.overdue += count;
            });
            
            // Calculate pending payments
            const pendingDocs = await Document.findAll({
                where: {
                    userId,
                    status: 'issued',
                    dueDate: { [Op.lt]: new Date() }
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'total']
                ],
                raw: true
            });
            
            stats.overdueAmount = parseFloat(pendingDocs[0]?.total) || 0;
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            logger.error('Get document stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar estatísticas',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Helper methods
    async generatePDF(document) {
        const uploadsDir = path.join(__dirname, '../../uploads/documents');
        
        // Create directory if not exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, `${document.number}.pdf`);
        
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const stream = fs.createWriteStream(filePath);
                
                doc.pipe(stream);
                
                // Header
                doc.fontSize(20).text('BIZFLOW', { align: 'center' });
                doc.fontSize(12).text('Sistema de Gestão Integrado', { align: 'center' });
                doc.moveDown();
                
                // Document info
                doc.fontSize(16).text(this.getDocumentTitle(document.type), { align: 'center' });
                doc.moveDown();
                
                doc.fontSize(10);
                doc.text(`Número: ${document.number}`);
                doc.text(`Data de Emissão: ${new Date(document.issueDate).toLocaleDateString('pt-BR')}`);
                if (document.dueDate) {
                    doc.text(`Data de Vencimento: ${new Date(document.dueDate).toLocaleDateString('pt-BR')}`);
                }
                doc.moveDown();
                
                // Customer info
                if (document.customer) {
                    doc.text('Cliente:');
                    doc.text(document.customer.name);
                    if (document.customer.documentNumber) {
                        doc.text(`CPF/CNPJ: ${document.customer.documentNumber}`);
                    }
                    if (document.customer.address) {
                        doc.text(`Endereço: ${document.customer.address}`);
                    }
                    doc.moveDown();
                }
                
                // Items table
                const tableTop = doc.y;
                const itemWidth = 250;
                const qtyWidth = 50;
                const priceWidth = 80;
                const totalWidth = 80;
                
                // Table header
                doc.text('Descrição', 50, tableTop);
                doc.text('Qtd', 50 + itemWidth, tableTop);
                doc.text('Preço', 50 + itemWidth + qtyWidth, tableTop);
                doc.text('Total', 50 + itemWidth + qtyWidth + priceWidth, tableTop);
                
                doc.moveTo(50, tableTop + 15)
                   .lineTo(50 + itemWidth + qtyWidth + priceWidth + totalWidth, tableTop + 15)
                   .stroke();
                
                // Table rows
                let y = tableTop + 30;
                document.items.forEach((item, index) => {
                    if (y > 650) { // New page if needed
                        doc.addPage();
                        y = 50;
                    }
                    
                    const itemTotal = (item.quantity * item.price) * (1 - (item.discount || 0) / 100);
                    
                    doc.text(item.description || item.name, 50, y, { width: itemWidth });
                    doc.text(item.quantity.toString(), 50 + itemWidth, y, { width: qtyWidth, align: 'right' });
                    doc.text(`R$ ${item.price.toFixed(2)}`, 50 + itemWidth + qtyWidth, y, { width: priceWidth, align: 'right' });
                    doc.text(`R$ ${itemTotal.toFixed(2)}`, 50 + itemWidth + qtyWidth + priceWidth, y, { width: totalWidth, align: 'right' });
                    
                    y += 20;
                });
                
                // Totals
                y = Math.max(y, 550);
                doc.text(`Subtotal: R$ ${document.subtotal.toFixed(2)}`, 400, y, { align: 'right' });
                doc.text(`Impostos: R$ ${document.tax.toFixed(2)}`, 400, y + 20, { align: 'right' });
                if (document.discount > 0) {
                    doc.text(`Desconto: R$ ${document.discount.toFixed(2)}`, 400, y + 40, { align: 'right' });
                    y += 20;
                }
                doc.text(`Total: R$ ${document.total.toFixed(2)}`, 400, y + 40, { align: 'right', bold: true });
                
                // Notes
                if (document.notes) {
                    doc.moveDown(3);
                    doc.text('Observações:', { underline: true });
                    doc.text(document.notes);
                }
                
                // Terms
                if (document.terms) {
                    doc.moveDown();
                    doc.text('Termos e Condições:', { underline: true });
                    doc.text(document.terms);
                }
                
                // Signature
                if (document.isSigned) {
                    doc.moveDown(3);
                    doc.text('Assinado digitalmente por:');
                    doc.text(document.signedBy);
                    doc.text(`Em: ${new Date(document.signedAt).toLocaleString('pt-BR')}`);
                }
                
                // Footer
                doc.fontSize(8);
                doc.text('Documento gerado automaticamente pelo sistema BizFlow', 50, 750, { align: 'center' });
                doc.text(`ID: ${document.id}`, 50, 765, { align: 'center' });
                
                doc.end();
                
                stream.on('finish', () => {
                    // Update document with file info
                    document.filePath = filePath;
                    document.fileName = `${document.number}.pdf`;
                    document.fileSize = fs.statSync(filePath).size;
                    document.save().then(resolve).catch(reject);
                });
                
                stream.on('error', reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    getDocumentTitle(type) {
        const titles = {
            'invoice': 'Fatura',
            'receipt': 'Recibo',
            'estimate': 'Orçamento',
            'contract': 'Contrato',
            'proposal': 'Proposta',
            'purchase_order': 'Pedido de Compra',
            'delivery_note': 'Nota de Entrega',
            'credit_note': 'Nota de Crédito',
            'debit_note': 'Nota de Débito',
            'tax_invoice': 'Nota Fiscal'
        };
        
        return titles[type] || 'Documento';
    }
}

module.exports = new DocumentController();
