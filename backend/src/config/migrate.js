require('dotenv').config();
const { sequelize } = require('./database');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado ao banco de dados');
    
    // Ler e executar arquivo de migração
    const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Dividir por statements (separados por ;)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await sequelize.query(statement);
        logger.info(`✓ Executado: ${statement.substring(0, 100)}...`);
      } catch (error) {
        // Ignorar erros de "já existe" para desenvolvimento
        if (!error.message.includes('already exists')) {
          throw error;
        }
        logger.info(`⚠️  Já existe: ${statement.substring(0, 100)}...`);
      }
    }
    
    logger.info('✅ Migrações executadas com sucesso!');
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Erro nas migrações:', error);
    process.exit(1);
  }
}

runMigrations();
