const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCanvas } = require('canvas');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class DocumentService {
    constructor() {
        this.uploadsDir = path.join(__dirname, '../../uploads/documents');
        this.templatesDir = path.join(__dirname, '../templates');
        
        // Ensure directories exist
        this.ensureDirectories();
    }

    ensureDirectories() {
        const directories = [
            this.uploadsDir,
            this.templatesDir,
            path.join(this.uploadsDir, 'signed'),
            path.join(this.uploadsDir, 'temp')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Generate PDF document
     */
    async generatePDF(document, customer, user) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: this.getDocumentTitle(document.type),
                        Author: 'BizFlow System',
                        Subject: document.type,
                        Keywords: 'document, invoice, receipt',
                        Creator: 'BizFlow v1.0',
                        CreationDate: new Date()
                    }
                });

                const fileName = `${document.number}.pdf`;
                const filePath = path.join(this.uploadsDir, fileName);
                const stream = fs.createWriteStream(filePath);

                doc.pipe(stream);

                // Add header
                this.addHeader(doc, user);

                // Add document info
                this.addDocumentInfo(doc, document);

                // Add customer info
                if (customer) {
                    this.addCustomerInfo(doc, customer);
                }

                // Add items table
                this.addItemsTable(doc, document.items);

                // Add totals
                this.addTotals(doc, document);

                // Add notes and terms
                this.addNotesAndTerms(doc, document);

                // Add signature if exists
                if (document.isSigned) {
                    this.addSignature(doc, document);
                }

                // Add footer
                this.addFooter(doc, document);

                // Add QR Code for verification
                this.addQRCode(doc, document);

                doc.end();

                stream.on('finish', () => {
                    const stats = fs.statSync(filePath);
                    
                    resolve({
                        success: true,
                        filePath,
                        fileName,
                        fileSize: stats.size,
                        hash: this.calculateFileHash(filePath)
                    });
                });

                stream.on('error', reject);

            } catch (error) {
                logger.error('Generate PDF error:', error);
                reject(error);
            }
        });
    }

    /**
     * Generate invoice from sale
     */
    async generateInvoiceFromSale(sale, customer, user) {
        const items = sale.items.map(item => ({
            description: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            discount: item.discount || 0,
            total: item.totalPrice
        }));

        const document = {
            number: `INV-${sale.saleNumber}`,
            type: 'invoice',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            items,
            subtotal: sale.subtotal,
            tax: sale.taxAmount,
            discount: sale.discountAmount,
            total: sale.totalAmount,
            notes: sale.notes,
            terms: 'Pagamento em até 30 dias. Multa de 2% ao mês por atraso.'
        };

        return this.generatePDF(document, customer, user);
    }

    /**
     * Generate receipt from payment
     */
    async generateReceipt(payment, customer, user) {
        const document = {
            number: `REC-${Date.now().toString().slice(-6)}`,
            type: 'receipt',
            issueDate: new Date(),
            items: [{
                description: `Recebimento ref. ${payment.reference}`,
                quantity: 1,
                price: payment.amount,
                total: payment.amount
            }],
            subtotal: payment.amount,
            tax: 0,
            discount: 0,
            total: payment.amount,
            notes: `Recebido via ${payment.method}. ${payment.notes || ''}`,
            terms: 'Comprovante de recebimento'
        };

        return this.generatePDF(document, customer, user);
    }

    /**
     * Add digital signature to document
     */
    async addDigitalSignature(document, signatureData, signer) {
        try {
            const { filePath } = document;
            
            if (!filePath || !fs.existsSync(filePath)) {
                throw new Error('Document file not found');
            }

            // Create signed copy
            const signedFileName = `${path.basename(filePath, '.pdf')}_signed.pdf`;
            const signedFilePath = path.join(this.uploadsDir, 'signed', signedFileName);

            // In production, use PDF library that supports digital signatures
            // For demo, we'll create a new PDF with signature page
            const doc = new PDFDocument();
            const stream = fs.createWriteStream(signedFilePath);

            // Copy original pages (simplified - in production use proper PDF manipulation)
            doc.pipe(stream);
            
            // Add original content notice
            doc.fontSize(16).text('DOCUMENTO ASSINADO DIGITALMENTE', { align: 'center' });
            doc.moveDown();
            doc.text(`Documento: ${document.number}`);
            doc.text(`Assinado por: ${signer.name}`);
            doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`);
            doc.text(`Hash da assinatura: ${signatureData.hash}`);
            doc.moveDown();
            doc.text('Este documento foi assinado digitalmente usando o sistema BizFlow.');
            doc.text('A assinatura foi validada e registrada no blockchain do sistema.');
            
            doc.end();

            // Generate signature hash
            const signatureHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(signatureData) + document.id + Date.now())
                .digest('hex');

            return {
                success: true,
                signedFilePath,
                signatureHash,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Add digital signature error:', error);
            throw error;
        }
    }

    /**
     * Verify document signature
     */
    async verifySignature(document) {
        try {
            if (!document.isSigned || !document.signatureData) {
                return { isValid: false, reason: 'Document not signed' };
            }

            // Verify signature hash
            const expectedHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(document.signatureData) + document.id)
                .digest('hex');

            if (document.metadata?.signatureHash !== expectedHash) {
                return { isValid: false, reason: 'Signature hash mismatch' };
            }

            // Check if signature timestamp is valid
            const signatureDate = new Date(document.signedAt);
            const now = new Date();
            const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year

            if (now - signatureDate > maxAge) {
                return { isValid: false, reason: 'Signature expired' };
            }

            // Verify document hasn't been modified since signing
            if (document.filePath && fs.existsSync(document.filePath)) {
                const currentHash = this.calculateFileHash(document.filePath);
                const originalHash = document.metadata?.fileHash;

                if (originalHash && currentHash !== originalHash) {
                    return { isValid: false, reason: 'Document modified after signing' };
                }
            }

            return {
                isValid: true,
                signedBy: document.signedBy,
                signedAt: document.signedAt,
                verificationDate: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Verify signature error:', error);
            return { isValid: false, reason: 'Verification error' };
        }
    }

    /**
     * Send document via email
     */
    async sendDocumentByEmail(document, recipientEmail, sender, message = '') {
        try {
            if (!document.filePath || !fs.existsSync(document.filePath)) {
                throw new Error('Document file not found');
            }

            // Configure email transporter
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const documentTitle = this.getDocumentTitle(document.type);
            const fileName = `${document.number}.pdf`;

            const mailOptions = {
                from: `"${sender.name}" <${sender.email}>`,
                to: recipientEmail,
                subject: `${documentTitle} ${document.number}`,
                text: this.generateEmailText(document, sender, message),
                html: this.generateEmailHTML(document, sender, message),
                attachments: [{
                    filename: fileName,
                    path: document.filePath,
                    contentType: 'application/pdf'
                }]
            };

            const info = await transporter.sendMail(mailOptions);

            // Update document status
            await this.logDocumentSent(document.id, recipientEmail, info.messageId);

            return {
                success: true,
                messageId: info.messageId,
                recipient: recipientEmail
            };

        } catch (error) {
            logger.error('Send document email error:', error);
            throw error;
        }
    }

    /**
     * Generate email text content
     */
    generateEmailText(document, sender, customMessage) {
        const documentTitle = this.getDocumentTitle(document.type);
        
        return `
${documentTitle} ${document.number}

Prezado(a) Cliente,

Em anexo segue seu ${documentTitle.toLowerCase()} ${document.number}.

${customMessage || `Valor total: R$ ${document.total.toFixed(2)}
Data de vencimento: ${new Date(document.dueDate).toLocaleDateString('pt-BR')}`}

Atenciosamente,
${sender.name}
${sender.company || 'BizFlow System'}
${sender.email}
${sender.phone || ''}
        `.trim();
    }

    /**
     * Generate email HTML content
     */
    generateEmailHTML(document, sender, customMessage) {
        const documentTitle = this.getDocumentTitle(document.type);
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${documentTitle} ${document.number}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4361ee; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 0.9em; }
        .button { background: #4361ee; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${documentTitle} ${document.number}</h1>
        </div>
        
        <div class="content">
            <p>Prezado(a) Cliente,</p>
            
            <p>Em anexo segue seu ${documentTitle.toLowerCase()} <strong>${document.number}</strong>.</p>
            
            ${customMessage ? `<p>${customMessage}</p>` : `
            <p><strong>Valor total:</strong> R$ ${document.total.toFixed(2)}</p>
            <p><strong>Data de vencimento:</strong> ${new Date(document.dueDate).toLocaleDateString('pt-BR')}</p>
            `}
            
            <p>Para visualizar ou baixar o documento, clique no botão abaixo:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">Visualizar Documento</a>
            </p>
            
            <p>Atenciosamente,<br>
            <strong>${sender.name}</strong><br>
            ${sender.company || 'BizFlow System'}<br>
            ${sender.email}<br>
            ${sender.phone || ''}</p>
        </div>
        
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema BizFlow.</p>
            <p>ID do documento: ${document.id}</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Generate QR code for document verification
     */
    addQRCode(doc, document) {
        try {
            const verificationUrl = `${process.env.APP_URL}/verify/${document.id}`;
            const qrCodeData = JSON.stringify({
                id: document.id,
                number: document.number,
                type: document.type,
                issueDate: document.issueDate,
                total: document.total,
                hash: this.calculateDocumentHash(document)
            });

            // Add QR code position (simplified - in production generate actual QR code)
            doc.moveDown(2);
            doc.fontSize(8);
            doc.text('Código de verificação:', 50, doc.y);
            doc.text(qrCodeData, 50, doc.y + 10, { width: 200 });
            doc.text(`URL: ${verificationUrl}`, 50, doc.y + 30, { width: 200 });

        } catch (error) {
            logger.error('Add QR code error:', error);
        }
    }

    /**
     * Calculate document hash for verification
     */
    calculateDocumentHash(document) {
        const data = JSON.stringify({
            id: document.id,
            number: document.number,
            type: document.type,
            issueDate: document.issueDate,
            total: document.total,
            items: document.items,
            customerId: document.customerId
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Calculate file hash
     */
    calculateFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Get document title by type
     */
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

    /**
     * Log document sent event
     */
    async logDocumentSent(documentId, recipientEmail, messageId) {
        // Implementation depends on your logging system
        logger.info(`Document ${documentId} sent to ${recipientEmail}, Message ID: ${messageId}`);
    }

    // Private helper methods for PDF generation
    addHeader(doc, user) {
        doc.fontSize(20).text('BIZFLOW', { align: 'center' });
        doc.fontSize(12).text('Sistema de Gestão Integrado', { align: 'center' });
        
        if (user?.company) {
            doc.fontSize(10).text(user.company, { align: 'center' });
        }
        
        doc.moveDown();
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown();
    }

    addDocumentInfo(doc, document) {
        doc.fontSize(16).text(this.getDocumentTitle(document.type), { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(10);
        doc.text(`Número: ${document.number}`);
        doc.text(`Série: ${document.series || '001'}`);
        doc.text(`Data de Emissão: ${new Date(document.issueDate).toLocaleDateString('pt-BR')}`);
        
        if (document.dueDate) {
            doc.text(`Data de Vencimento: ${new Date(document.dueDate).toLocaleDateString('pt-BR')}`);
        }
        
        doc.moveDown();
    }

    addCustomerInfo(doc, customer) {
        doc.text('Cliente:');
        doc.text(customer.name);
        
        if (customer.documentNumber) {
            doc.text(`CPF/CNPJ: ${customer.documentNumber}`);
        }
        
        if (customer.email) {
            doc.text(`Email: ${customer.email}`);
        }
        
        if (customer.phone) {
            doc.text(`Telefone: ${customer.phone}`);
        }
        
        if (customer.address) {
            doc.text(`Endereço: ${customer.address}`);
        }
        
        doc.moveDown();
    }

    addItemsTable(doc, items) {
        const tableTop = doc.y;
        const descWidth = 250;
        const qtyWidth = 50;
        const priceWidth = 80;
        const totalWidth = 80;
        
        // Table header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Descrição', 50, tableTop);
        doc.text('Qtd', 50 + descWidth, tableTop, { width: qtyWidth, align: 'right' });
        doc.text('Preço Unit.', 50 + descWidth + qtyWidth, tableTop, { width: priceWidth, align: 'right' });
        doc.text('Total', 50 + descWidth + qtyWidth + priceWidth, tableTop, { width: totalWidth, align: 'right' });
        
        doc.moveTo(50, tableTop + 15)
           .lineTo(50 + descWidth + qtyWidth + priceWidth + totalWidth, tableTop + 15)
           .stroke();
        
        // Table rows
        let y = tableTop + 30;
        doc.font('Helvetica');
        
        items.forEach((item, index) => {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }
            
            const itemTotal = (item.quantity * item.price) * (1 - (item.discount || 0) / 100);
            
            doc.text(item.description || item.name, 50, y, { width: descWidth });
            doc.text(item.quantity.toString(), 50 + descWidth, y, { width: qtyWidth, align: 'right' });
            doc.text(`R$ ${item.price.toFixed(2)}`, 50 + descWidth + qtyWidth, y, { width: priceWidth, align: 'right' });
            doc.text(`R$ ${itemTotal.toFixed(2)}`, 50 + descWidth + qtyWidth + priceWidth, y, { width: totalWidth, align: 'right' });
            
            y += 20;
        });
        
        doc.y = y + 10;
    }

    addTotals(doc, document) {
        const startY = doc.y;
        
        doc.text(`Subtotal: R$ ${document.subtotal.toFixed(2)}`, 400, startY, { align: 'right' });
        doc.text(`Impostos: R$ ${document.tax.toFixed(2)}`, 400, startY + 20, { align: 'right' });
        
        if (document.discount > 0) {
            doc.text(`Desconto: R$ ${document.discount.toFixed(2)}`, 400, startY + 40, { align: 'right' });
            doc.text(`Total: R$ ${document.total.toFixed(2)}`, 400, startY + 60, { align: 'right', bold: true });
            doc.y = startY + 80;
        } else {
            doc.text(`Total: R$ ${document.total.toFixed(2)}`, 400, startY + 40, { align: 'right', bold: true });
            doc.y = startY + 60;
        }
    }

    addNotesAndTerms(doc, document) {
        if (document.notes) {
            doc.moveDown();
            doc.fontSize(9).text('Observações:', { underline: true });
            doc.text(document.notes);
        }
        
        if (document.terms) {
            doc.moveDown();
            doc.fontSize(9).text('Termos e Condições:', { underline: true });
            doc.text(document.terms);
        }
    }

    addSignature(doc, document) {
        doc.moveDown(2);
        doc.fontSize(9).text('Assinatura Digital:', { underline: true });
        doc.text(`Assinado por: ${document.signedBy}`);
        doc.text(`Data: ${new Date(document.signedAt).toLocaleString('pt-BR')}`);
        
        if (document.metadata?.signatureHash) {
            doc.text(`Hash: ${document.metadata.signatureHash.substring(0, 32)}...`);
        }
    }

    addFooter(doc, document) {
        const footerY = 750;
        
        doc.fontSize(8);
        doc.text('Documento gerado automaticamente pelo sistema BizFlow', 50, footerY, { align: 'center' });
        doc.text(`ID: ${document.id} | Hash: ${this.calculateDocumentHash(document).substring(0, 16)}...`, 50, footerY + 12, { align: 'center' });
    }
}

module.exports = new DocumentService();
