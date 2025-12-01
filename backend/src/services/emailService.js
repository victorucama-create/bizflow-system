const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Verificar conexão SMTP
    this.verifyConnection();
  }
  
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Conexão SMTP verificada com sucesso!');
    } catch (error) {
      logger.error('❌ Erro na conexão SMTP:', error);
    }
  }
  
  // Enviar e-mail de verificação
  async sendVerificationEmail(email, name, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      
      const html = await this.loadTemplate('verification', {
        name,
        verificationUrl,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: 'Verifique seu e-mail - BizFlow',
        html
      });
      
      logger.info(`✅ E-mail de verificação enviado para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar e-mail de verificação:', error);
      return false;
    }
  }
  
  // Enviar e-mail de redefinição de senha
  async sendPasswordResetEmail(email, name, resetUrl) {
    try {
      const html = await this.loadTemplate('password-reset', {
        name,
        resetUrl,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: 'Redefinição de Senha - BizFlow',
        html
      });
      
      logger.info(`✅ E-mail de redefinição de senha enviado para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar e-mail de redefinição de senha:', error);
      return false;
    }
  }
  
  // Enviar notificação de nova venda
  async sendSaleNotification(email, name, saleData) {
    try {
      const html = await this.loadTemplate('sale-notification', {
        name,
        saleNumber: saleData.saleNumber,
        total: saleData.total.toFixed(2),
        date: saleData.date,
        items: saleData.items,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: `Nova venda realizada: ${saleData.saleNumber}`,
        html
      });
      
      logger.info(`✅ Notificação de venda enviada para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar notificação de venda:', error);
      return false;
    }
  }
  
  // Enviar fatura
  async sendInvoiceEmail(email, name, invoiceData) {
    try {
      const html = await this.loadTemplate('invoice', {
        name,
        invoiceNumber: invoiceData.invoiceNumber,
        dueDate: invoiceData.dueDate,
        amount: invoiceData.amount.toFixed(2),
        items: invoiceData.items,
        company: invoiceData.company,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: `Fatura #${invoiceData.invoiceNumber} - ${invoiceData.company.name}`,
        html,
        attachments: invoiceData.attachments
      });
      
      logger.info(`✅ Fatura enviada para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar fatura:', error);
      return false;
    }
  }
  
  // Enviar alerta de estoque baixo
  async sendLowStockAlert(email, name, products) {
    try {
      const html = await this.loadTemplate('low-stock-alert', {
        name,
        products,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: 'Alerta: Produtos com estoque baixo',
        html
      });
      
      logger.info(`✅ Alerta de estoque baixo enviado para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar alerta de estoque baixo:', error);
      return false;
    }
  }
  
  // Enviar relatório mensal
  async sendMonthlyReport(email, name, reportData) {
    try {
      const html = await this.loadTemplate('monthly-report', {
        name,
        month: reportData.month,
        year: reportData.year,
        sales: reportData.sales,
        revenue: reportData.revenue,
        expenses: reportData.expenses,
        profit: reportData.profit,
        topProducts: reportData.topProducts,
        year: new Date().getFullYear()
      });
      
      await this.sendEmail({
        to: email,
        subject: `Relatório Mensal - ${reportData.month}/${reportData.year}`,
        html,
        attachments: reportData.attachments
      });
      
      logger.info(`✅ Relatório mensal enviado para: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Erro ao enviar relatório mensal:', error);
      return false;
    }
  }
  
  // Método genérico para enviar e-mail
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_NAME || 'BizFlow'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text,
        attachments
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      logger.debug(`📧 E-mail enviado: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('❌ Erro ao enviar e-mail:', error);
      throw error;
    }
  }
  
  // Carregar template de e-mail
  async loadTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
      let html = await fs.readFile(templatePath, 'utf8');
      
      // Substituir variáveis no template
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
      });
      
      return html;
    } catch (error) {
      logger.error(`❌ Erro ao carregar template ${templateName}:`, error);
      
      // Template fallback
      return this.getFallbackTemplate(templateName, data);
    }
  }
  
  // Template fallback
  getFallbackTemplate(templateName, data) {
    const templates = {
      'verification': `
        <h1>Verifique seu e-mail</h1>
        <p>Olá ${data.name},</p>
        <p>Clique no link abaixo para verificar seu e-mail:</p>
        <a href="${data.verificationUrl}">Verificar E-mail</a>
        <p>Se você não criou esta conta, ignore este e-mail.</p>
        <p>© ${data.year} BizFlow - Todos os direitos reservados</p>
      `,
      'password-reset': `
        <h1>Redefinição de Senha</h1>
        <p>Olá ${data.name},</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${data.resetUrl}">Redefinir Senha</a>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
        <p>© ${data.year} BizFlow - Todos os direitos reservados</p>
      `,
      'default': `
        <p>Olá ${data.name || 'usuário'},</p>
        <p>${data.message || 'Esta é uma notificação do sistema BizFlow.'}</p>
        <p>© ${data.year} BizFlow - Todos os direitos reservados</p>
      `
    };
    
    return templates[templateName] || templates.default;
  }
}

module.exports = new EmailService();
