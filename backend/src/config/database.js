const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Configuração do banco de dados
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bizflow',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? msg => logger.debug(msg) : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Testar conexão
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexão com PostgreSQL estabelecida.');
    return true;
  } catch (error) {
    logger.error('❌ Erro ao conectar ao PostgreSQL:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection,
  Sequelize
};
