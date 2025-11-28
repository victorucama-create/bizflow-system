const mongoose = require('mongoose');

/**
 * Conecta ao banco de dados MongoDB com configurações robustas para produção
 */
const connectDB = async () => {
    try {
        console.log('🔄 Iniciando conexão com MongoDB...');
        
        // Verificar se a URI está definida
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI não definida nas variáveis de ambiente');
        }

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,                    // Número máximo de conexões
            serverSelectionTimeoutMS: 30000,    // 30 segundos para seleção de servidor
            socketTimeoutMS: 45000,             // 45 segundos para timeout de socket
            bufferCommands: false,              // Desativar buffering de comandos
            bufferMaxEntries: 0,                // Desativar buffering de entries
            retryWrites: true,
            w: 'majority',
            // Configurações adicionais para melhor estabilidade
            heartbeatFrequencyMS: 10000,        // Heartbeat a cada 10 segundos
            maxIdleTimeMS: 30000,               // Tempo máximo ocioso
            minPoolSize: 1,                     // Pool mínimo de conexões
            maxIdleTimeMS: 30000,               // Tempo máximo ocioso
            waitQueueTimeoutMS: 0,              // Timeout da fila de espera
        };

        console.log('📡 Conectando ao MongoDB Atlas...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        console.log('='.repeat(50));
        console.log('✅ MONGODB CONECTADO COM SUCESSO');
        console.log('='.repeat(50));
        console.log(`🏢 Host: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(`👤 User: ${conn.connection.user || 'N/A'}`);
        console.log(`📡 Port: ${conn.connection.port || 'N/A'}`);
        console.log(`🔄 Ready State: ${getReadyStateText(conn.connection.readyState)}`);
        console.log(`🐄 Pool Size: ${conn.connection.poolSize}`);
        console.log('='.repeat(50));

        // ==================== EVENT LISTENERS PARA MONITORAMENTO ====================

        mongoose.connection.on('connecting', () => {
            console.log('🔄 MongoDB conectando...');
        });

        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB conectado!');
        });

        mongoose.connection.on('open', () => {
            console.log('🚀 Conexão MongoDB aberta e pronta para uso');
        });

        mongoose.connection.on('disconnecting', () => {
            console.log('🔄 MongoDB desconectando...');
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB desconectado! Tentando reconectar...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconectado com sucesso!');
        });

        mongoose.connection.on('error', (error) => {
            console.error('❌ Erro na conexão MongoDB:', {
                message: error.message,
                name: error.name,
                code: error.code
            });
        });

        mongoose.connection.on('fullsetup', () => {
            console.log('🎯 MongoDB replica set conectado completamente');
        });

        mongoose.connection.on('all', () => {
            console.log('🌐 Todas as conexões do replica set conectadas');
        });

        // ==================== HEALTH CHECK PERIÓDICO ====================

        // Verificar saúde da conexão a cada 5 minutos
        setInterval(async () => {
            try {
                await mongoose.connection.db.admin().ping();
                console.log('❤️  Health check MongoDB: OK');
            } catch (error) {
                console.error('💔 Health check MongoDB falhou:', error.message);
            }
        }, 300000); // 5 minutos

        return conn;

    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌ ERRO AO CONECTAR COM MONGODB:');
        console.error('='.repeat(50));
        console.error(`📝 Mensagem: ${error.message}`);
        console.error(`🔧 Código: ${error.code || 'N/A'}`);
        console.error(`🏷️ Nome: ${error.name}`);
        console.error('='.repeat(50));
        
        // Log mais detalhado em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.error('🔍 Stack Trace:', error.stack);
        }

        console.log('🔄 Tentando reconexão em 10 segundos...');
        
        // Tentativa de reconexão após 10 segundos
        setTimeout(() => {
            console.log('🔄 Iniciando tentativa de reconexão...');
            connectDB();
        }, 10000);

        // Não encerrar o processo imediatamente em produção
        // A aplicação pode tentar se reconectar
        if (process.env.NODE_ENV === 'production') {
            // Em produção, não encerre o processo, deixe tentar reconectar
            throw error;
        } else {
            // Em desenvolvimento, encerre para ver o erro
            process.exit(1);
        }
    }
};

/**
 * Helper function para converter readyState em texto
 */
function getReadyStateText(readyState) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized'
    };
    return states[readyState] || 'unknown';
}

/**
 * Função para verificar saúde da conexão
 */
const checkDatabaseHealth = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            return {
                status: 'healthy',
                readyState: getReadyStateText(mongoose.connection.readyState),
                poolSize: mongoose.connection.poolSize,
                lastPing: new Date().toISOString()
            };
        } else {
            return {
                status: 'unhealthy',
                readyState: getReadyStateText(mongoose.connection.readyState),
                lastCheck: new Date().toISOString()
            };
        }
    } catch (error) {
        return {
            status: 'error',
            readyState: getReadyStateText(mongoose.connection.readyState),
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
};

/**
 * Função para fechar conexão graciosamente
 */
const closeDatabase = async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ Conexão MongoDB fechada graciosamente');
        return true;
    } catch (error) {
        console.error('❌ Erro ao fechar conexão MongoDB:', error);
        return false;
    }
};

module.exports = {
    connectDB,
    checkDatabaseHealth,
    closeDatabase,
    getReadyState: () => getReadyStateText(mongoose.connection.readyState)
};
