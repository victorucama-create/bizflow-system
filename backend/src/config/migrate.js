const { sequelize } = require('./database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class Migration {
    constructor() {
        this.migrationsDir = path.join(__dirname, '../../migrations');
        this.migrationsTable = 'migrations';
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        try {
            await sequelize.authenticate();
            logger.info('✅ Connected to database for migrations');
            
            // Create migrations table if not exists
            await this.createMigrationsTable();
            
            // Get applied migrations
            const appliedMigrations = await this.getAppliedMigrations();
            
            // Get migration files
            const migrationFiles = this.getMigrationFiles();
            
            // Run pending migrations
            for (const migrationFile of migrationFiles) {
                if (!appliedMigrations.includes(migrationFile)) {
                    await this.runMigration(migrationFile);
                }
            }
            
            logger.info('✅ All migrations completed successfully');
            return true;
            
        } catch (error) {
            logger.error('❌ Migration error:', error);
            return false;
        }
    }

    /**
     * Create migrations table
     */
    async createMigrationsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                batch INTEGER NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await sequelize.query(query);
    }

    /**
     * Get applied migrations
     */
    async getAppliedMigrations() {
        try {
            const [results] = await sequelize.query(
                `SELECT name FROM ${this.migrationsTable} ORDER BY executed_at`
            );
            return results.map(row => row.name);
        } catch (error) {
            return [];
        }
    }

    /**
     * Get migration files
     */
    getMigrationFiles() {
        try {
            const files = fs.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            return files;
        } catch (error) {
            logger.error('Error reading migration files:', error);
            return [];
        }
    }

    /**
     * Run single migration
     */
    async runMigration(filename) {
        const migrationPath = path.join(this.migrationsDir, filename);
        
        try {
            logger.info(`🚀 Running migration: ${filename}`);
            
            // Read migration SQL
            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            // Execute migration
            await sequelize.query(sql);
            
            // Record migration
            await this.recordMigration(filename);
            
            logger.info(`✅ Migration completed: ${filename}`);
            
        } catch (error) {
            logger.error(`❌ Migration failed: ${filename}`, error);
            throw error;
        }
    }

    /**
     * Record migration in database
     */
    async recordMigration(filename) {
        // Get current batch
        const [[{ maxBatch }]] = await sequelize.query(
            `SELECT COALESCE(MAX(batch), 0) as "maxBatch" FROM ${this.migrationsTable}`
        );
        
        const batch = maxBatch + 1;
        
        await sequelize.query(
            `INSERT INTO ${this.migrationsTable} (name, batch) VALUES (?, ?)`,
            {
                replacements: [filename, batch]
            }
        );
    }

    /**
     * Rollback last batch of migrations
     */
    async rollback() {
        try {
            // Get last batch
            const [[{ lastBatch }]] = await sequelize.query(
                `SELECT MAX(batch) as "lastBatch" FROM ${this.migrationsTable}`
            );
            
            if (!lastBatch) {
                logger.info('No migrations to rollback');
                return true;
            }
            
            // Get migrations in last batch
            const [migrations] = await sequelize.query(
                `SELECT name FROM ${this.migrationsTable} WHERE batch = ? ORDER BY id DESC`,
                {
                    replacements: [lastBatch]
                }
            );
            
            // Rollback each migration (in reverse order)
            for (const migration of migrations) {
                await this.rollbackMigration(migration.name);
            }
            
            logger.info(`✅ Rollback completed for batch ${lastBatch}`);
            return true;
            
        } catch (error) {
            logger.error('❌ Rollback error:', error);
            return false;
        }
    }

    /**
     * Rollback single migration
     */
    async rollbackMigration(filename) {
        logger.info(`↩️  Rolling back: ${filename}`);
        
        // For now, we just remove from migrations table
        // In production, you'd have separate down/up SQL files
        await sequelize.query(
            `DELETE FROM ${this.migrationsTable} WHERE name = ?`,
            {
                replacements: [filename]
            }
        );
        
        logger.info(`✅ Rollback completed: ${filename}`);
    }

    /**
     * Reset database (drop all tables)
     * WARNING: This will delete all data!
     */
    async reset() {
        try {
            logger.warn('⚠️  WARNING: This will delete all data!');
            
            // Disable foreign key checks
            await sequelize.query('SET CONSTRAINTS ALL DEFERRED');
            
            // Get all tables
            const [tables] = await sequelize.query(`
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename != 'spatial_ref_sys'
            `);
            
            // Drop all tables
            for (const table of tables) {
                logger.info(`Dropping table: ${table.tablename}`);
                await sequelize.query(`DROP TABLE IF EXISTS ${table.tablename} CASCADE`);
            }
            
            // Re-enable foreign key checks
            await sequelize.query('SET CONSTRAINTS ALL IMMEDIATE');
            
            logger.info('✅ Database reset completed');
            return true;
            
        } catch (error) {
            logger.error('❌ Reset error:', error);
            return false;
        }
    }

    /**
     * Check database status
     */
    async checkStatus() {
        try {
            await sequelize.authenticate();
            
            // Check migrations table
            const [tableExists] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '${this.migrationsTable}'
                )
            `);
            
            if (!tableExists[0].exists) {
                logger.info('📊 Database: Connected, no migrations table');
                return { connected: true, migrated: false };
            }
            
            // Get migration count
            const [[{ count }]] = await sequelize.query(
                `SELECT COUNT(*) as count FROM ${this.migrationsTable}`
            );
            
            // Get migration files count
            const migrationFiles = this.getMigrationFiles();
            
            const status = {
                connected: true,
                migrated: true,
                migrationCount: parseInt(count),
                pendingMigrations: migrationFiles.length - parseInt(count),
                allMigrations: migrationFiles.length
            };
            
            logger.info('📊 Database status:', status);
            return status;
            
        } catch (error) {
            logger.error('❌ Database status check error:', error);
            return { connected: false, error: error.message };
        }
    }
}

// If script is run directly
if (require.main === module) {
    const migration = new Migration();
    const command = process.argv[2];
    
    async function run() {
        switch (command) {
            case 'run':
                await migration.runMigrations();
                break;
                
            case 'rollback':
                await migration.rollback();
                break;
                
            case 'reset':
                await migration.reset();
                break;
                
            case 'status':
                await migration.checkStatus();
                break;
                
            default:
                console.log(`
Usage: node migrate.js [command]

Commands:
  run       - Run all pending migrations
  rollback  - Rollback last batch of migrations
  reset     - Reset database (WARNING: deletes all data!)
  status    - Check database and migration status
                `);
                break;
        }
        
        process.exit(0);
    }
    
    run().catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}

module.exports = Migration;
