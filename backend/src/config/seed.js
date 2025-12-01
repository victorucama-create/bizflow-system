require('dotenv').config();
const { sequelize } = require('./database');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado ao banco de dados para seed');
    
    // Criar usuário admin
    const adminExists = await User.findOne({ where: { email: 'admin@bizflow.com' } });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const admin = await User.create({
        name: 'Administrador BizFlow',
        email: 'admin@bizflow.com',
        password: hashedPassword,
        companyName: 'BizFlow Corporation',
        role: 'admin',
        emailVerified: true,
        isActive: true
      });
      
      logger.info('✅ Usuário admin criado');
      
      // Criar produtos de exemplo
      const products = [
        {
          sku: 'PROD001',
          name: 'Smartphone XYZ',
          description: 'Smartphone Android com 128GB, 6.5"',
          category: 'eletronicos',
          price: 899.90,
          cost: 650.00,
          stock: 24,
          minStock: 5,
          taxRate: 18,
          userId: admin.id
        },
        {
          sku: 'PROD002',
          name: 'Fone de Ouvido Bluetooth',
          description: 'Fone com cancelamento de ruído ativo',
          category: 'audio',
          price: 129.90,
          cost: 80.00,
          stock: 56,
          minStock: 10,
          taxRate: 18,
          userId: admin.id
        },
        {
          sku: 'PROD003',
          name: 'Notebook Pro',
          description: 'Notebook com processador i7 e 16GB RAM',
          category: 'informatica',
          price: 2499.90,
          cost: 1800.00,
          stock: 8,
          minStock: 3,
          taxRate: 18,
          userId: admin.id
        },
        {
          sku: 'PROD004',
          name: 'Mouse Sem Fio',
          description: 'Mouse óptico sem fio',
          category: 'acessorios',
          price: 49.90,
          cost: 25.00,
          stock: 42,
          minStock: 15,
          taxRate: 18,
          userId: admin.id
        },
        {
          sku: 'PROD005',
          name: 'Teclado Mecânico',
          description: 'Teclado mecânico com iluminação RGB',
          category: 'acessorios',
          price: 199.90,
          cost: 120.00,
          stock: 18,
          minStock: 8,
          taxRate: 18,
          userId: admin.id
        }
      ];
      
      await Product.bulkCreate(products);
      logger.info(`✅ ${products.length} produtos criados`);
      
      // Criar clientes de exemplo
      const customers = [
        {
          name: 'Maria Santos',
          email: 'maria@exemplo.com',
          phone: '(11) 99999-1111',
          type: 'individual',
          address: 'Rua das Flores, 123 - Centro',
          city: 'São Paulo',
          state: 'SP',
          totalPurchases: 245.90,
          lastPurchase: new Date('2023-06-15'),
          userId: admin.id
        },
        {
          name: 'João Pereira',
          email: 'joao@exemplo.com',
          phone: '(11) 99999-2222',
          type: 'individual',
          address: 'Avenida Principal, 456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          totalPurchases: 89.50,
          lastPurchase: new Date('2023-06-13'),
          userId: admin.id
        },
        {
          name: 'Empresa ABC Ltda',
          email: 'contato@empresaabc.com',
          phone: '(11) 3333-3333',
          type: 'company',
          taxId: '12.345.678/0001-90',
          address: 'Rua Comercial, 789',
          city: 'Belo Horizonte',
          state: 'MG',
          totalPurchases: 1245.80,
          lastPurchase: new Date('2023-06-15'),
          userId: admin.id
        }
      ];
      
      await Customer.bulkCreate(customers);
      logger.info(`✅ ${customers.length} clientes criados`);
      
      logger.info('✅ Seed concluído com sucesso!');
    } else {
      logger.info('✅ Usuário admin já existe');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

seedDatabase();
