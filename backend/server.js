require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');
const securityService = require('./src/services/securityService');

const PORT = process.env.PORT || 3000;

// Testar conexão com o banco
sequelize.authenticate()
  .then(() => {
    logger.info('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    
    // Sincronizar modelos (em produção, usar migrações)
    if (process.env.NODE_ENV !== 'production') {
      sequelize.sync({ alter: true })
        .then(() => logger.info('✅ Modelos sincronizados com o banco de dados'))
        .catch(err => logger.error('❌ Erro ao sincronizar modelos:', err));
    }
    
    // Log de inicialização do sistema
    securityService.logSecurityEvent({
      userId: 'system',
      action: 'SYSTEM_STARTUP',
      description: 'Servidor BizFlow iniciado',
      ipAddress: '127.0.0.1'
    });
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor BizFlow rodando na porta ${PORT}`);
      logger.info(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📁 Diretório: ${__dirname}`);
    });
  })
  .catch(err => {
    logger.error('❌ Não foi possível conectar ao PostgreSQL:', err);
    process.exit(1);
  });

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('⚠️  Erro não capturado:', error);
  securityService.logSecurityEvent({
    userId: 'system',
    action: 'UNCAUGHT_EXCEPTION',
    description: `Erro não capturado: ${error.message}`,
    details: error.stack
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('⚠️  Rejeição não tratada em:', promise, 'motivo:', reason);
  securityService.logSecurityEvent({
    userId: 'system',
    action: 'UNHANDLED_REJECTION',
    description: `Rejeição não tratada: ${reason}`,
    details: promise
  });
});

module.exports = app;
