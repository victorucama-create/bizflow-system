require('dotenv').config();
const app = require('./src/app');
const { connectDB, checkDatabaseHealth } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// ==================== MANIPULADORES DE ERRO GLOBAL ====================

process.on('uncaughtException', (err) => {
    console.error('='.repeat(60));
    console.error('❌ ERRO NÃO CAPTURADO (Uncaught Exception):');
    console.error('='.repeat(60));
    console.error(`📝 Mensagem: ${err.message}`);
    console.error(`🔧 Stack: ${err.stack}`);
    console.error('='.repeat(60));
    console.log('🔄 Reiniciando servidor em 5 segundos...');
    
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('='.repeat(60));
    console.error('❌ REJEIÇÃO DE PROMISE NÃO TRATADA:');
    console.error('='.repeat(60));
    console.error(`📝 Razão:`, reason);
    console.error(`🔧 Promise:`, promise);
    console.error('='.repeat(60));
    console.log('🔄 Reiniciando servidor em 5 segundos...');
    
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

async function startServer() {
    try {
        console.log('🚀 Iniciando BizFlow System...');
        console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📁 Diretório: ${process.cwd()}`);
        
        // Conectar ao banco de dados
        console.log('🔄 Conectando ao banco de dados...');
        await connectDB();
        
        // Iniciar servidor
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('='.repeat(60));
            console.log('🎯 BIZFLOW - SISTEMA DE GESTÃO INTEGRADO');
            console.log('='.repeat(60));
            console.log(`📡 Servidor rodando na porta: ${PORT}`);
            console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🏠 Host: 0.0.0.0 (aceita conexões externas)`);
            console.log(`🕒 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
            console.log(`🔗 URL Local: http://localhost:${PORT}`);
            console.log(`👤 User: ${process.env.USER || 'N/A'}`);
            console.log(`📁 Diretório: ${process.cwd()}`);
            console.log('='.repeat(60));
            
            // Verificar variáveis de ambiente críticas
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
                console.warn('⚠️  AVISO: JWT_SECRET não configurado ou usando valor padrão');
            }
            
            if (!process.env.MONGODB_URI) {
                console.warn('⚠️  AVISO: MONGODB_URI não configurado');
            }
            
            if (!process.env.CORS_ORIGIN) {
                console.warn('⚠️  AVISO: CORS_ORIGIN não configurado');
            }

            // Log de informações do sistema
            console.log('💻 Informações do Sistema:');
            console.log(`   Node.js: ${process.version}`);
            console.log(`   Plataforma: ${process.platform}`);
            console.log(`   Arquitetura: ${process.arch}`);
            console.log(`   Memória: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
            console.log(`   PID: ${process.pid}`);
            console.log('='.repeat(60));
        });

        // ==================== MANIPULADORES DO SERVIDOR ====================

        server.on('error', (error) => {
            console.error('='.repeat(60));
            console.error('❌ ERRO NO SERVIDOR:');
            console.error('='.repeat(60));
            
            if (error.code === 'EADDRINUSE') {
                console.error(`🚫 Porta ${PORT} já está em uso!`);
                console.log('💡 Dica: Altere a porta via variável de ambiente PORT');
            } else if (error.code === 'EACCES') {
                console.error(`🔒 Sem permissão para usar a porta ${PORT}`);
                console.log('💡 Dica: Use uma porta acima de 1024');
            } else {
                console.error(`🔧 Código: ${error.code}`);
                console.error(`📝 Mensagem: ${error.message}`);
                console.error(`🔍 Stack: ${error.stack}`);
            }
            
            console.error('='.repeat(60));
            process.exit(1);
        });

        // Health check adicional do servidor
        server.on('listening', () => {
            console.log('✅ Servidor ouvindo conexões...');
        });

        // ==================== HEALTH CHECK ENDPOINT ====================

        app.get('/health', async (req, res) => {
            try {
                const dbHealth = await checkDatabaseHealth();
                
                res.status(200).json({
                    status: 'OK',
                    service: 'BizFlow API',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    environment: process.env.NODE_ENV || 'development',
                    memory: process.memoryUsage(),
                    version: '1.0.0',
                    nodeVersion: process.version,
                    platform: process.platform,
                    database: dbHealth
                });
            } catch (error) {
                res.status(500).json({
                    status: 'ERROR',
                    service: 'BizFlow API',
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    database: {
                        status: 'unreachable',
                        error: error.message
                    }
                });
            }
        });

        // ==================== GRACEFUL SHUTDOWN ====================

        const gracefulShutdown = (signal) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`👋 ${signal} recebido. Encerrando servidor graciosamente...`);
            console.log('='.repeat(60));
            
            server.close(() => {
                console.log('✅ Servidor HTTP fechado');
                
                // Fechar conexão com MongoDB
                const mongoose = require('mongoose');
                if (mongoose.connection.readyState !== 0) {
                    mongoose.connection.close(false, () => {
                        console.log('✅ Conexão MongoDB fechada');
                        console.log('👋 Servidor encerrado com sucesso!');
                        process.exit(0);
                    });
                } else {
                    console.log('👋 Servidor encerrado com sucesso!');
                    process.exit(0);
                }
            });

            // Forçar fechamento após 30 segundos (aumentado para Railway)
            setTimeout(() => {
                console.error('❌ Shutdown forçado após timeout de 30 segundos');
                process.exit(1);
            }, 30000);
        };

        // Listeners para graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // ==================== MONITORAMENTO DE MEMÓRIA ====================

        if (process.env.NODE_ENV === 'production') {
            setInterval(() => {
                const memoryUsage = process.memoryUsage();
                const memoryMB = {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                };
                
                if (memoryMB.heapUsed > 500) { // Alertar se usar mais de 500MB
                    console.warn(`⚠️  Uso alto de memória: ${memoryMB.heapUsed}MB`);
                }
                
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`💾 Memória: ${memoryMB.heapUsed}MB usados de ${memoryMB.heapTotal}MB`);
                }
            }, 60000); // Verificar a cada 1 minuto
        }

        return server;

    } catch (error) {
        console.error('='.repeat(60));
        console.error('❌ ERRO AO INICIAR SERVIDOR:');
        console.error('='.repeat(60));
        console.error(`📝 Mensagem: ${error.message}`);
        console.error(`🔧 Stack: ${error.stack}`);
        console.error('='.repeat(60));
        
        // Tentar reiniciar em produção
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Tentando reiniciar em 10 segundos...');
            setTimeout(startServer, 10000);
        } else {
            process.exit(1);
        }
    }
}

// Verificar se é o módulo principal
if (require.main === module) {
    // Iniciar o servidor apenas se este arquivo for executado diretamente
    startServer();
} else {
    // Exportar para testes
    module.exports = startServer;
}
