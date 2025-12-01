const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { validateDocument } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management
 */

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents
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
 *         description: List of documents
 */
router.get('/', documentController.getDocuments);

/**
 * @swagger
 * /api/documents/stats:
 *   get:
 *     summary: Get documents statistics
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics data
 */
router.get('/stats', documentController.getStats);

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
 */
router.get('/:id', documentController.getDocumentById);

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
 */
router.post('/', validateDocument, documentController.createDocument);

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
 */
router.put('/:id', validateDocument, documentController.updateDocument);

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
 */
router.post('/:id/issue', documentController.issueDocument);

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
 */
router.post('/:id/sign', documentController.signDocument);

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
 */
router.get('/:id/download', documentController.downloadDocument);

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
 */
router.post('/:id/send', documentController.sendDocument);

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
 */
router.delete('/:id', documentController.deleteDocument);

/**
 * @swagger
 * /api/documents/{id}/upload:
 *   post:
 *     summary: Upload document file
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 */
router.post('/:id/upload', upload.single('file'), async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        document.filePath = req.file.path;
        document.fileName = req.file.originalname;
        document.fileSize = req.file.size;
        await document.save();
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading file'
        });
    }
});

/**
 * @swagger
 * /api/documents/{id}/duplicate:
 *   post:
 *     summary: Duplicate document
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
 *         description: Document duplicated
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Create duplicate
        const duplicate = await Document.create({
            ...document.toJSON(),
            id: undefined,
            number: undefined,
            status: 'draft',
            isSigned: false,
            signatureData: null,
            signedAt: null,
            signedBy: null,
            filePath: null,
            fileName: null,
            fileSize: null,
            createdAt: undefined,
            updatedAt: undefined,
            deletedAt: null
        });
        
        // Generate new number
        duplicate.number = `${duplicate.type.toUpperCase().substring(0, 3)}-${Date.now().toString().slice(-6)}`;
        await duplicate.save();
        
        res.json({
            success: true,
            message: 'Document duplicated successfully',
            data: duplicate
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error duplicating document'
        });
    }
});

/**
 * @swagger
 * /api/documents/{id}/verify:
 *   get:
 *     summary: Verify document signature
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
 *         description: Signature verification result
 */
router.get('/:id/verify', async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        const documentService = require('../services/documentService');
        const verification = await documentService.verifySignature(document);
        
        res.json({
            success: true,
            data: verification
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying signature'
        });
    }
});

module.exports = router;
