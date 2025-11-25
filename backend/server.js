require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Conectar ao banco de dados
connectDB();

// Manipulador de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não capturado:', err);
    console.log('🔄 Reiniciando servidor...');
    process.exit(1);
});

// Manipulador de rejeições de Promise não tratadas
process.on('unhandledRejection', (err) => {
    console.error('❌ Rejeição de Promise não tratada:', err);
    console.log('🔄 Reiniciando servidor...');
    process.exit(1);
});

// Manipulador de sinal de término (SIGTERM)
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM recebido. Encerrando servidor graciosamente...');
    process.exit(0);
});

// Manipulador de sinal de interrupção (Ctrl+C)
process.on('SIGINT', () => {
    console.log('👋 SIGINT recebido. Encerrando servidor graciosamente...');
    process.exit(0);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 BIZFLOW - SISTEMA DE GESTÃO INTEGRADO');
    console.log('='.repeat(60));
    console.log(`📡 Servidor rodando na porta: ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕒 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log('='.repeat(60));
    
    // Verificar variáveis de ambiente críticas
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
        console.warn('⚠️  AVISO: JWT_SECRET não configurado ou usando valor padrão');
    }
    
    if (!process.env.MONGODB_URI) {
        console.warn('⚠️  AVISO: MONGODB_URI não configurado - usando MongoDB local');
    }
});

// Manipulador de erro do servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso!`);
        console.log('💡 Dica: Altere a porta via variável de ambiente PORT');
    } else {
        console.error('❌ Erro no servidor:', error);
    }
    process.exit(1);
});

// Health check endpoint (para Render.com)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('🔄 Iniciando shutdown gracioso...');
    
    server.close(() => {
        console.log('✅ Servidor HTTP fechado');
        
        // Fechar conexão com MongoDB
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
            mongoose.connection.close(false, () => {
                console.log('✅ Conexão MongoDB fechada');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });

    // Forçar fechamento após 10 segundos
    setTimeout(() => {
        console.error('❌ Shutdown forçado após timeout');
        process.exit(1);
    }, 10000);
};

// Listeners para graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server;
