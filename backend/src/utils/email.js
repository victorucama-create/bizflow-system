const nodemailer = require('nodemailer');

// Configurar transporter de email
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Enviar email de boas-vindas
exports.sendWelcomeEmail = async (user) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.SMTP_FROM || 'BizFlow <noreply@bizflow.com>',
            to: user.email,
            subject: 'Bem-vindo ao BizFlow!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4361ee;">Bem-vindo ao BizFlow!</h2>
                    <p>Olá <strong>${user.name}</strong>,</p>
                    <p>Sua conta foi criada com sucesso no sistema BizFlow.</p>
                    <p>Agora você pode acessar todas as funcionalidades do nosso sistema de gestão integrado.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Conta criada em:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p>Se você tiver qualquer dúvida, não hesite em entrar em contato conosco.</p>
                    <p>Atenciosamente,<br>Equipe BizFlow</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email de boas-vindas enviado para: ${user.email}`);
        
    } catch (error) {
        console.error('Erro ao enviar email de boas-vindas:', error);
        // Não falhar a aplicação se o email falhar
    }
};

// Enviar código de verificação 2FA
exports.send2FACode = async (email, code) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.SMTP_FROM || 'BizFlow <noreply@bizflow.com>',
            to: email,
            subject: 'Código de Verificação - BizFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4361ee;">Código de Verificação</h2>
                    <p>Use o código abaixo para completar seu login no BizFlow:</p>
                    <div style="background-color: #4361ee; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Este código expira em 10 minutos.<br>
                        Se você não solicitou este código, ignore este email.
                    </p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Código 2FA enviado para: ${email}`);
        
    } catch (error) {
        console.error('Erro ao enviar código 2FA:', error);
        throw new Error('Falha ao enviar código de verificação');
    }
};

// Enviar email de recuperação de senha
exports.sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const transporter = createTransporter();
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.SMTP_FROM || 'BizFlow <noreply@bizflow.com>',
            to: email,
            subject: 'Recuperação de Senha - BizFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4361ee;">Recuperação de Senha</h2>
                    <p>Recebemos uma solicitação para redefinir sua senha.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #4361ee; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Redefinir Senha
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Se você não solicitou a redefinição de senha, ignore este email.<br>
                        Este link expira em 1 hora.
                    </p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email de recuperação enviado para: ${email}`);
        
    } catch (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        throw new Error('Falha ao enviar email de recuperação');
    }
};
