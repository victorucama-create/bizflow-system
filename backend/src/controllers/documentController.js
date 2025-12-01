const Document = require('../models/Document');
const Customer = require('../models/Customer');
const securityService = require('../services/securityService');
const documentService = require('../services/documentService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

class DocumentController {
  // Listar documentos
  async listDocuments(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status, 
        startDate,
        endDate,
        customerId,
        requiresApproval,
        search,
        sortBy = 'date',
        sortOrder = 'DESC'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = { userId };
      
      // Filtros
      if (type) where.type = type;
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      
      if (requiresApproval !== undefined) {
        where.requiresApproval = requiresApproval === 'true';
      }
      
      // Filtro por data
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[Op.gte] = new Date(startDate);
        if (endDate) where.date[Op.lte] = new Date(endDate);
      }
      
      // Busca
      if (search) {
        where[Op.or] = [
          { documentNumber: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { '$customer.name$': { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Ordenação
      const order = [[sortBy, sortOrder.toUpperCase()]];
      
      // Buscar documentos
      const { count, rows: documents } = await Document.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        }]
      });
      
      // Estatísticas
      const stats = await Document.getStats(userId);
      
      res.json({
        documents,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        },
        statistics: stats
      });
      
    } catch (error) {
      logger.error('Erro ao listar documentos:', error);
      res.status(500).json({
        error: 'Erro ao listar documentos.'
      });
    }
  }
  
  // Buscar documento por ID
  async getDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const document = await Document.findOne({
        where: { id, userId },
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone', 'address', 'taxId']
          },
          {
            association: 'signedByUser',
            attributes: ['id', 'name', 'email']
          }
        ]
      });
      
      if (!document) {
        return res.status(404).json({
          error: 'Documento não encontrado.'
        });
      }
      
      res.json({ document });
      
    } catch (error) {
      logger.error('Erro ao buscar documento:', error);
      res.status(500).json({
        error: 'Erro ao buscar documento.'
      });
    }
  }
  
  // Criar documento
  async createDocument(req, res) {
    try {
      const userId = req.user.userId;
      const documentData = req.body;
      
      // Validar cliente se fornecido
      if (documentData.customerId) {
        const customer = await Customer.findOne({
          where: { id: documentData.customerId, userId }
        });
        
        if (!customer) {
          return res.status(404).json({
            error: 'Cliente não encontrado.'
          });
        }
      }
      
      // Criar documento
      const document = await Document.create({
        ...documentData,
        userId
      });
      
      // Se documento requer aprovação, atualizar status
      if (document.requiresApproval) {
        document.status = 'pending';
        await document.save();
        
        // Aqui poderia enviar notificação para aprovadores
      }
      
      // Log de criação
      await securityService.logSecurityEvent({
        userId,
        action: 'DOCUMENT_CREATED',
        description: `Documento criado: ${document.documentNumber} (${document.type})`,
        ipAddress: req.ip,
        details: {
          documentId: document.id,
          documentNumber: document.documentNumber,
          type: document.type,
          amount: document.amount,
          requiresApproval: document.requiresApproval
        }
      });
      
      res.status(201).json({
        message: 'Documento criado com sucesso!',
        document
      });
      
    } catch (error) {
      logger.error('Erro ao criar documento:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'DOCUMENT_CREATION_ERROR',
        description: 'Erro ao criar documento',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao criar documento.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Atualizar documento
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      // Buscar documento
      const document = await Document.findOne({
        where: { id, userId }
      });
      
      if (!document) {
        return res.status(404).json({
          error: 'Documento não encontrado.'
        });
      }
      
      // Verificar se pode editar
      if (document.status === 'signed') {
        return res.status(400).json({
          error: 'Não é possível editar documentos assinados.'
        });
      }
      
      // Validar cliente se fornecido
      if (updateData.customerId && updateData.customerId !== document.customerId) {
        const customer = await Customer.findOne({
          where: { id: updateData.customerId, userId }
        });
        
        if (!customer) {
          return res.status(404).json({
            error: 'Cliente não encontrado.'
          });
        }
      }
      
      // Atualizar documento
      await document.update(updateData);
      
      // Log de atualização
      await securityService.logSecurityEvent({
        userId,
        action: 'DOCUMENT_UPDATED',
        description: `Documento atualizado: ${document.documentNumber}`,
        ipAddress: req.ip,
        details: {
          documentId: document.id,
          updatedFields: Object.keys(updateData),
          newStatus: document.status
        }
      });
      
      res.json({
        message: 'Documento atualizado com sucesso!',
        document
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar documento:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'DOCUMENT_UPDATE_ERROR',
        description: 'Erro ao atualizar documento',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao atualizar documento.'
      });
    }
  }
  
  // Excluir documento
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const document = await Document.findOne({
        where: { id, userId }
      });
      
      if (!document) {
        return res.status(404).json({
          error: 'Documento não encontrado.'
        });
      }
      
      // Verificar se pode excluir
      if (document.status === 'signed') {
        return res.status(400).json({
          error: 'Não é possível excluir documentos assinados.'
        });
      }
      
      // Excluir arquivo físico se existir
      if (document.filePath) {
        try {
          await fs.unlink(path.join(process.cwd(), document.filePath));
        } catch (error) {
          logger.warn(`Arquivo do documento não encontrado: ${document.filePath}`);
        }
      }
      
      // Excluir documento
      await document.destroy();
      
      // Log de exclusão
      await securityService.logSecurityEvent({
        userId,
        action: 'DOCUMENT_DELETED',
        description: `Documento excluído: ${document.documentNumber}`,
        ipAddress: req.ip,
        details: { documentId: id }
      });
      
      res.json({
        message: 'Documento excluído com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao excluir documento:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'DOCUMENT_DELETION_ERROR',
        description: 'Erro ao excluir documento',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao excluir documento.'
      });
    }
  }
  
  // Assinar documento
  async signDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { password, signatureData, consent } = req.body;
      
      // Buscar documento
      const document = await Document.findOne({
        where: { id, userId }
      });
      
      if (!document) {
        return res.status(404).json({
          error: 'Documento não encontrado.'
        });
      }
      
      // Verificar se requer aprovação
      if (!document.requiresApproval) {
        return res.status(400).json({
          error: 'Este documento não requer assinatura.'
        });
      }
      
      // Verificar status
      if (document.status !== 'pending') {
        return res.status(400).json({
          error: `Documento não está aguardando assinatura. Status atual: ${document.status}`
        });
      }
      
      // Verificar consentimento
      if (!consent) {
        return res.status(400).json({
          error: 'É necessário consentir com os termos do documento.'
        });
      }
      
      // Verificar senha do usuário
      const user = await User.findByPk(userId);
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        await securityService.logSecurityEvent({
          userId,
          action: 'DOCUMENT_SIGNATURE_FAILED',
          description: 'Tentativa de assinatura com senha incorreta',
          ipAddress: req.ip,
          details: { documentId: id },
          severity: 'medium'
        });
        
        return res.status(400).json({
          error: 'Senha incorreta.'
        });
      }
      
      // Assinar documento
      await document.sign(userId, signatureData, password);
      
      // Gerar PDF do documento assinado
      const pdfBuffer = await documentService.generateSignedDocument(document);
      
      // Salvar arquivo PDF
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      const fileName = `document_${document.documentNumber}_${Date.now()}.pdf`;
      const filePath = path.join(uploadPath, 'documents', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdfBuffer);
      
      // Atualizar documento com caminho do arquivo
      document.filePath = filePath.replace(process.cwd(), '');
      await document.save();
      
      // Enviar e-mail de notificação
      if (document.customerId) {
        const customer = await Customer.findByPk(document.customerId);
        if (customer && customer.email) {
          await emailService.sendEmail({
            to: customer.email,
            subject: `Documento assinado: ${document.documentNumber}`,
            html: `
              <h1>Documento Assinado</h1>
              <p>Olá ${customer.name},</p>
              <p>O documento <strong>${document.documentNumber}</strong> foi assinado.</p>
              <p><strong>Tipo:</strong> ${document.type}</p>
              <p><strong>Descrição:</strong> ${document.description}</p>
              <p><strong>Valor:</strong> R$ ${document.amount.toFixed(2)}</p>
              <p><strong>Data da Assinatura:</strong> ${document.signedAt.toLocaleDateString('pt-BR')}</p>
              <p>O documento em PDF está disponível para download em seu painel.</p>
              <p>© ${new Date().getFullYear()} BizFlow - Todos os direitos reservados</p>
            `
          });
        }
      }
      
      // Log de assinatura
      await securityService.logSecurityEvent({
        userId,
        action: 'DOCUMENT_SIGNED',
        description: `Documento assinado: ${document.documentNumber}`,
        ipAddress: req.ip,
        details: {
          documentId: document.id,
          documentNumber: document.documentNumber,
          signedAt: document.signedAt
        },
        severity: 'high'
      });
      
      res.json({
        message: 'Documento assinado com sucesso!',
        document,
        pdfUrl: `/api/documents/${id}/download`
      });
      
    } catch (error) {
      logger.error('Erro ao assinar documento:', error);
      
      await securityService.logSecurityEvent({
        userId: req.user?.userId || 'unknown',
        action: 'DOCUMENT_SIGNATURE_ERROR',
        description: 'Erro ao assinar documento',
        ipAddress: req.ip,
        details: error.message
      });
      
      res.status(500).json({
        error: 'Erro ao assinar documento.'
      });
    }
  }
  
  // Rejeitar documento
  async rejectDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { reason } = req.body;
      
      // Buscar documento
      const document = await Document.findOne({
        where: { id, userId }
      });
      
      if (!document) {
        return res.status(404).json({
          error: 'Documento não encontrado.'
        });
      }
      
      // Verificar se pode rejeitar
      if (document.status !== 'pending') {
        return res.status(400).json({
          error: 'Apenas documentos pendentes podem ser rejeitados.'
        });
      }
      
      // Rejeitar documento
      await document.reject(userId, reason);
      
      // Log de rejeição
      await securityService.logSecurityEvent({
        userId,
