const { sequelize } = require('./database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Seeder {
    constructor() {
        this.models = {};
        this.loadModels();
    }

    /**
     * Load Sequelize models
     */
    loadModels() {
        const modelsPath = path.join(__dirname, '../models');
        
        // Load all models
        fs.readdirSync(modelsPath)
            .filter(file => file.endsWith('.js'))
            .forEach(file => {
                const modelPath = path.join(modelsPath, file);
                const model = require(modelPath);
                const modelName = file.replace('.js', '');
                this.models[modelName] = model;
            });
    }

    /**
     * Run all seeders
     */
    async seed() {
        try {
            await sequelize.authenticate();
            logger.info('✅ Connected to database for seeding');
            
            // Run seeders in order
            await this.seedUsers();
            await this.seedProducts();
            await this.seedCustomers();
            await this.seedSales();
            await this.seedInventory();
            await this.seedDocuments();
            await this.seedTransactions();
            await this.seedSubscriptions();
            
            logger.info('✅ All seeders completed successfully');
            return true;
            
        } catch (error) {
            logger.error('❌ Seeding error:', error);
            return false;
        }
    }

    /**
     * Seed users table
     */
    async seedUsers() {
        try {
            const { User } = this.models;
            const count = await User.count();
            
            if (count > 0) {
                logger.info('📝 Users table already has data, skipping');
                return;
            }
            
            const users = [
                {
                    id: '11111111-1111-1111-1111-111111111111',
                    name: 'Administrador BizFlow',
                    email: 'admin@bizflow.com',
                    password: await bcrypt.hash('BizFlowAdmin2023!', 10),
                    role: 'super_admin',
                    company: 'BizFlow Corporation',
                    companyName: 'BizFlow Corporation',
                    phone: '(11) 99999-9999',
                    plan: 'enterprise',
                    emailVerified: true,
                    isActive: true,
                    lastLogin: new Date(),
                    tokenVersion: 0
                },
                {
                    id: '22222222-2222-2222-2222-222222222222',
                    name: 'Empresa Exemplo Ltda',
                    email: 'empresa@exemplo.com',
                    password: await bcrypt.hash('Exemplo2023!', 10),
                    role: 'admin',
                    company: 'Empresa Exemplo Ltda',
                    companyName: 'Empresa Exemplo Ltda',
                    phone: '(11) 88888-8888',
                    plan: 'professional',
                    emailVerified: true,
                    isActive: true,
                    tokenVersion: 0
                },
                {
                    id: '33333333-3333-3333-3333-333333333333',
                    name: 'Loja Teste',
                    email: 'teste@loja.com',
                    password: await bcrypt.hash('Teste2023!', 10),
                    role: 'user',
                    company: 'Loja Teste ME',
                    companyName: 'Loja Teste ME',
                    phone: '(11) 77777-7777',
                    plan: 'basic',
                    emailVerified: true,
                    isActive: true,
                    tokenVersion: 0
                }
            ];
            
            await User.bulkCreate(users);
            logger.info(`✅ Seeded ${users.length} users`);
            
        } catch (error) {
            logger.error('❌ Error seeding users:', error);
            throw error;
        }
    }

    /**
     * Seed products table
     */
    async seedProducts() {
        try {
            const { Product } = this.models;
            const count = await Product.count();
            
            if (count > 0) {
                logger.info('📝 Products table already has data, skipping');
                return;
            }
            
            const categories = [
                'Eletrônicos',
                'Informática',
                'Móveis',
                'Eletrodomésticos',
                'Material Escritório',
                'Limpeza',
                'Alimentos',
                'Bebidas',
                'Vestuário',
                'Acessórios'
            ];
            
            const products = [];
            const userId = '11111111-1111-1111-1111-111111111111'; // Admin user
            
            for (let i = 1; i <= 50; i++) {
                const category = categories[Math.floor(Math.random() * categories.length)];
                const price = Math.random() * 1000 + 10;
                const cost = price * 0.6;
                const stock = Math.floor(Math.random() * 100);
                const minStock = Math.floor(Math.random() * 10) + 1;
                
                products.push({
                    id: `product-${i.toString().padStart(8, '0')}`,
                    sku: `SKU-${(10000 + i).toString().padStart(5, '0')}`,
                    name: `Produto ${i} ${category}`,
                    description: `Descrição do produto ${i} na categoria ${category}. Produto de alta qualidade com garantia.`,
                    category: category,
                    price: parseFloat(price.toFixed(2)),
                    cost: parseFloat(cost.toFixed(2)),
                    stock: stock,
                    minStock: minStock,
                    maxStock: minStock * 5,
                    barcode: `789${(100000000000 + i).toString().padStart(12, '0')}`.slice(0, 13),
                    unit: i % 3 === 0 ? 'kg' : i % 3 === 1 ? 'lt' : 'un',
                    weight: parseFloat((Math.random() * 10).toFixed(3)),
                    dimensions: `${Math.floor(Math.random() * 100)}x${Math.floor(Math.random() * 100)}x${Math.floor(Math.random() * 50)}cm`,
                    imageUrl: `https://picsum.photos/400/400?random=${i}`,
                    status: 'active',
                    taxRate: i % 4 === 0 ? 12 : 18,
                    location: `Prateleira ${Math.floor(Math.random() * 10) + 1}`,
                    userId: userId,
                    createdAt: moment().subtract(Math.floor(Math.random() * 365), 'days').toDate(),
                    updatedAt: moment().subtract(Math.floor(Math.random() * 30), 'days').toDate()
                });
            }
            
            await Product.bulkCreate(products);
            logger.info(`✅ Seeded ${products.length} products`);
            
        } catch (error) {
            logger.error('❌ Error seeding products:', error);
            throw error;
        }
    }

    /**
     * Seed customers table
     */
    async seedCustomers() {
        try {
            const { Customer } = this.models;
            const count = await Customer.count();
            
            if (count > 0) {
                logger.info('📝 Customers table already has data, skipping');
                return;
            }
            
            const firstNames = [
                'João', 'Maria', 'José', 'Ana', 'Pedro', 'Paula', 'Carlos', 'Carla',
                'Antônio', 'Fernanda', 'Ricardo', 'Patrícia', 'Luiz', 'Amanda',
                'Marcos', 'Juliana', 'Rafael', 'Camila', 'Daniel', 'Larissa'
            ];
            
            const lastNames = [
                'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira',
                'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro',
                'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Nunes'
            ];
            
            const companies = [
                'Comércio Ltda', 'Indústria S/A', 'Serviços ME', 'Distribuidora EIRELI',
                'Atacado & Varejo', 'Importadora', 'Exportadora', 'Representações'
            ];
            
            const customers = [];
            const userId = '11111111-1111-1111-1111-111111111111';
            
            // Individual customers
            for (let i = 1; i <= 30; i++) {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const name = `${firstName} ${lastName}`;
                const cpf = `${(10000000000 + i).toString().padStart(11, '0')}`;
                
                customers.push({
                    id: `customer-ind-${i.toString().padStart(8, '0')}`,
                    name: name,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
                    phone: `(11) 9${(8000 + i).toString().padStart(4, '0')}-${(1000 + i).toString().padStart(4, '0')}`,
                    type: 'individual',
                    taxId: cpf,
                    address: `Rua das Flores, ${100 + i}, Centro, São Paulo - SP`,
                    totalPurchases: parseFloat((Math.random() * 10000).toFixed(2)),
                    lastPurchase: moment().subtract(Math.floor(Math.random() * 90), 'days').toDate(),
                    notes: i % 5 === 0 ? 'Cliente preferencial' : null,
                    userId: userId,
                    createdAt: moment().subtract(Math.floor(Math.random() * 365), 'days').toDate()
                });
            }
            
            // Company customers
            for (let i = 1; i <= 20; i++) {
                const companyName = `Empresa ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${companies[Math.floor(Math.random() * companies.length)]}`;
                const cnpj = `${(10000000000000 + i).toString().padStart(14, '0')}`;
                
                customers.push({
                    id: `customer-emp-${i.toString().padStart(8, '0')}`,
                    name: companyName,
                    email: `contato@empresa${i}.com.br`,
                    phone: `(11) ${(3000 + i).toString().padStart(4, '0')}-${(1000 + i).toString().padStart(4, '0')}`,
                    type: 'company',
                    taxId: cnpj,
                    address: `Av. Paulista, ${1000 + i}, Bela Vista, São Paulo - SP`,
                    totalPurchases: parseFloat((Math.random() * 50000).toFixed(2)),
                    lastPurchase: moment().subtract(Math.floor(Math.random() * 60), 'days').toDate(),
                    notes: i % 3 === 0 ? 'Contrato corporativo' : null,
                    userId: userId,
                    createdAt: moment().subtract(Math.floor(Math.random() * 365), 'days').toDate()
                });
            }
            
            await Customer.bulkCreate(customers);
            logger.info(`✅ Seeded ${customers.length} customers`);
            
        } catch (error) {
            logger.error('❌ Error seeding customers:', error);
            throw error;
        }
    }

    /**
     * Seed sales table
     */
    async seedSales() {
        try {
            const { Sale, Customer, Product } = this.models;
            const count = await Sale.count();
            
            if (count > 0) {
                logger.info('📝 Sales table already has data, skipping');
                return;
            }
            
            const userId = '11111111-1111-1111-1111-111111111111';
            const customers = await Customer.findAll({ where: { userId } });
            const products = await Product.findAll({ where: { userId } });
            
            if (customers.length === 0 || products.length === 0) {
                logger.warn('⚠️  No customers or products found, skipping sales seeding');
                return;
            }
            
            const sales = [];
            const paymentMethods = ['cash', 'credit_card', 'debit_card', 'pix', 'transfer'];
            
            // Generate sales for last 90 days
            for (let day = 0; day < 90; day++) {
                const salesPerDay = Math.floor(Math.random() * 5) + 1; // 1-5 sales per day
                
                for (let s = 0; s < salesPerDay; s++) {
                    const saleDate = moment().subtract(day, 'days').add(s * 2, 'hours').toDate();
                    const customer = customers[Math.floor(Math.random() * customers.length)];
                    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    
                    // Generate sale items
                    const itemsCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per sale
                    const items = [];
                    let subtotal = 0;
                    
                    for (let i = 0; i < itemsCount; i++) {
                        const product = products[Math.floor(Math.random() * products.length)];
                        const quantity = Math.floor(Math.random() * 5) + 1;
                        const price = product.price;
                        const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 20) : 0; // 20% chance of discount
                        const itemTotal = quantity * price * (1 - discount / 100);
                        
                        items.push({
                            productId: product.id,
                            productName: product.name,
                            productSku: product.sku,
                            quantity: quantity,
                            unitPrice: price,
                            discount: discount,
                            totalPrice: parseFloat(itemTotal.toFixed(2))
                        });
                        
                        subtotal += itemTotal;
                    }
                    
                    const tax = subtotal * 0.18;
                    const discount = Math.random() > 0.9 ? subtotal * 0.1 : 0; // 10% chance of sale discount
                    const total = subtotal + tax - discount;
                    
                    const saleNumber = `SALE-${moment(saleDate).format('YYYYMMDD')}-${(s + 1).toString().padStart(4, '0')}`;
                    
                    sales.push({
                        id: `sale-${moment(saleDate).format('YYYYMMDD')}-${s.toString().padStart(3, '0')}`,
                        saleNumber: saleNumber,
                        customerId: customer.id,
                        userId: userId,
                        items: items,
                        subtotal: parseFloat(subtotal.toFixed(2)),
                        taxAmount: parseFloat(tax.toFixed(2)),
                        discountAmount: parseFloat(discount.toFixed(2)),
                        totalAmount: parseFloat(total.toFixed(2)),
                        paymentMethod: paymentMethod,
                        paymentDetails: {
                            method: paymentMethod,
                            transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                        },
                        status: 'completed',
                        notes: itemsCount > 3 ? 'Venda com múltiplos itens' : null,
                        location: 'Loja Principal',
                        createdAt: saleDate,
                        updatedAt: saleDate
                    });
                }
            }
            
            await Sale.bulkCreate(sales);
            logger.info(`✅ Seeded ${sales.length} sales`);
            
        } catch (error) {
            logger.error('❌ Error seeding sales:', error);
            throw error;
        }
    }

    /**
     * Seed inventory table
     */
    async seedInventory() {
        try {
            const { Inventory, Product } = this.models;
            const count = await Inventory.count();
            
            if (count > 0) {
                logger.info('📝 Inventory table already has data, skipping');
                return;
            }
            
            const userId = '11111111-1111-1111-1111-111111111111';
            const products = await Product.findAll({ where: { userId } });
            
            if (products.length === 0) {
                logger.warn('⚠️  No products found, skipping inventory seeding');
                return;
            }
            
            const inventory = [];
            
            for (const product of products) {
                const locations = ['Prateleira A', 'Prateleira B', 'Depósito 1', 'Depósito 2', 'Vitrine'];
                const location = locations[Math.floor(Math.random() * locations.length)];
                const quantity = product.stock;
                const minStock = product.minStock;
                const maxStock = product.maxStock || minStock * 5;
                
                inventory.push({
                    id: `inv-${product.id}`,
                    productId: product.id,
                    userId: userId,
                    quantity: quantity,
                    minStock: minStock,
                    maxStock: maxStock,
                    location: location,
                    cost: product.cost,
                    reorderPoint: minStock * 2,
                    lastRestock: moment().subtract(Math.floor(Math.random() * 30), 'days').toDate(),
                    nextRestock: moment().add(Math.floor(Math.random() * 30), 'days').toDate(),
                    status: quantity <= minStock ? 'low' : quantity === 0 ? 'out' : 'normal',
                    notes: `Produto ${product.name} em ${location}`,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt
                });
            }
            
            await Inventory.bulkCreate(inventory);
            logger.info(`✅ Seeded ${inventory.length} inventory records`);
            
        } catch (error) {
            logger.error('❌ Error seeding inventory:', error);
            throw error;
        }
    }

    /**
     * Seed documents table
     */
    async seedDocuments() {
        try {
            const { Document, Customer } = this.models;
            const count = await Document.count();
            
            if (count > 0) {
                logger.info('📝 Documents table already has data, skipping');
                return;
            }
            
            const userId = '11111111-1111-1111-1111-111111111111';
            const customers = await Customer.findAll({ where: { userId } });
            
            if (customers.length === 0) {
                logger.warn('⚠️  No customers found, skipping documents seeding');
                return;
            }
            
            const documents = [];
            const documentTypes = ['invoice', 'receipt', 'estimate', 'contract', 'proposal'];
            
            for (let i = 1; i <= 30; i++) {
                const customer = customers[Math.floor(Math.random() * customers.length)];
                const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
                const issueDate = moment().subtract(Math.floor(Math.random() * 90), 'days').toDate();
                const dueDate = moment(issueDate).add(30, 'days').toDate();
                const amount = parseFloat((Math.random() * 10000 + 100).toFixed(2));
                
                const statuses = ['draft', 'issued', 'sent', 'paid', 'overdue'];
                const weights = [0.1, 0.3, 0.3, 0.2, 0.1]; // Probabilities
                let statusIndex = 0;
                let random = Math.random();
                
                for (let j = 0; j < weights.length; j++) {
                    random -= weights[j];
                    if (random <= 0) {
                        statusIndex = j;
                        break;
                    }
                }
                
                const status = statuses[statusIndex];
                const isSigned = status === 'paid' && Math.random() > 0.5;
                
                documents.push({
                    id: `doc-${i.toString().padStart(8, '0')}`,
                    number: `${docType.toUpperCase().substring(0, 3)}-${moment(issueDate).format('YYYYMM')}-${i.toString().padStart(4, '0')}`,
                    type: docType,
                    customerId: customer.id,
                    userId: userId,
                    issueDate: issueDate,
                    dueDate: dueDate,
                    subtotal: amount * 0.85,
                    tax: amount * 0.15,
                    total: amount,
                    items: [
                        {
                            description: `Produto/Serviço ${i}`,
                            quantity: Math.floor(Math.random() * 5) + 1,
                            price: parseFloat((amount / 5).toFixed(2)),
                            discount: 0,
                            total: parseFloat((amount / 5).toFixed(2))
                        }
                    ],
                    paymentTerms: 'Pagamento em 30 dias',
                    notes: `Documento ${docType} para ${customer.name}`,
                    status: status,
                    isSigned: isSigned,
                    signedBy: isSigned ? 'Administrador BizFlow' : null,
                    signedAt: isSigned ? moment(issueDate).add(1, 'days').toDate() : null,
                    filePath: `/uploads/documents/${docType}-${i}.pdf`,
                    createdAt: issueDate,
                    updatedAt: moment(issueDate).add(Math.floor(Math.random() * 10), 'days').toDate()
                });
            }
            
            await Document.bulkCreate(documents);
            logger.info(`✅ Seeded ${documents.length} documents`);
            
        } catch (error) {
            logger.error('❌ Error seeding documents:', error);
            throw error;
        }
    }

    /**
     * Seed transactions table
     */
    async seedTransactions() {
        try {
            const { Transaction } = this.models;
            const count = await Transaction.count();
            
            if (count > 0) {
                logger.info('📝 Transactions table already has data, skipping');
                return;
            }
            
            const userId = '11111111-1111-1111-1111-111111111111';
            const transactions = [];
            
            const categories = {
                income: ['Vendas', 'Serviços', 'Investimentos', 'Reembolsos', 'Outros'],
                expense: ['Salários', 'Fornecedores', 'Aluguel', 'Energia', 'Água', 'Internet', 'Marketing', 'Manutenção', 'Outros']
            };
            
            // Income transactions (last 90 days)
            for (let day = 0; day < 90; day++) {
                const transactionsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 income transactions per day
                
                for (let t = 0; t < transactionsPerDay; t++) {
                    const date = moment().subtract(day, 'days').toDate();
                    const category = categories.income[Math.floor(Math.random() * categories.income.length)];
                    const amount = parseFloat((Math.random() * 5000 + 100).toFixed(2));
                    
                    transactions.push({
                        id: `inc-${moment(date).format('YYYYMMDD')}-${t.toString().padStart(3, '0')}`,
                        userId: userId,
                        date: date,
                        description: `Recebimento de ${category.toLowerCase()}`,
                        category: category,
                        amount: amount,
                        type: 'income',
                        status: 'completed',
                        paymentMethod: ['cash', 'transfer', 'pix'][Math.floor(Math.random() * 3)],
                        reference: `INC-${moment(date).format('YYYYMMDD')}-${(t + 1).toString().padStart(4, '0')}`,
                        notes: `Transação de receita do dia ${moment(date).format('DD/MM/YYYY')}`,
                        createdAt: date,
                        updatedAt: date
                    });
                }
            }
            
            // Expense transactions (last 90 days)
            for (let day = 0; day < 90; day++) {
                const transactionsPerDay = Math.floor(Math.random() * 5) + 1; // 1-5 expense transactions per day
                
                for (let t = 0; t < transactionsPerDay; t++) {
                    const date = moment().subtract(day, 'days').toDate();
                    const category = categories.expense[Math.floor(Math.random() * categories.expense.length)];
                    const amount = parseFloat((Math.random() * 2000 + 50).toFixed(2));
                    
                    transactions.push({
                        id: `exp-${moment(date).format('YYYYMMDD')}-${t.toString().padStart(3, '0')}`,
                        userId: userId,
                        date: date,
                        description: `Pagamento de ${category.toLowerCase()}`,
                        category: category,
                        amount: amount,
                        type: 'expense',
                        status: 'completed',
                        paymentMethod: ['transfer', 'boleto', 'card'][Math.floor(Math.random() * 3)],
                        reference: `EXP-${moment(date).format('YYYYMMDD')}-${(t + 1).toString().padStart(4, '0')}`,
                        notes: `Transação de despesa do dia ${moment(date).format('DD/MM/YYYY')}`,
                        createdAt: date,
                        updatedAt: date
                    });
                }
            }
            
            await Transaction.bulkCreate(transactions);
            logger.info(`✅ Seeded ${transactions.length} transactions`);
            
        } catch (error) {
            logger.error('❌ Error seeding transactions:', error);
            throw error;
        }
    }

    /**
     * Seed subscriptions table
     */
    async seedSubscriptions() {
        try {
            const { Subscription, User } = this.models;
            const count = await Subscription.count();
            
            if (count > 0) {
                logger.info('📝 Subscriptions table already has data, skipping');
                return;
            }
            
            const users = await User.findAll();
            const subscriptions = [];
            
            for (const user of users) {
                const startDate = moment(user.createdAt).toDate();
                let plan = 'free';
                
                // Assign plans based on user role/email
                if (user.email === 'admin@bizflow.com') {
                    plan = 'enterprise';
                } else if (user.email === 'empresa@exemplo.com') {
                    plan = 'professional';
                } else if (user.email === 'teste@loja.com') {
                    plan = 'basic';
                }
                
                const price = {
                    free: 0,
                    basic: 79.90,
                    professional: 199.90,
                    enterprise: 499.90
                }[plan];
                
                const endDate = moment(startDate).add(1, 'year').toDate();
                const nextBillingDate = moment(startDate).add(1, 'month').toDate();
                
                const features = {
                    free: { users: 1, products: 50, customers: 100, storage: 100, monthlySales: 100 },
                    basic: { users: 3, products: 500, customers: 1000, storage: 1024, monthlySales: 1000 },
                    professional: { users: 10, products: 5000, customers: 10000, storage: 5120, monthlySales: 10000 },
                    enterprise: { users: 100, products: 50000, customers: 100000, storage: 10240, monthlySales: 100000 }
                }[plan];
                
                subscriptions.push({
                    id: `sub-${user.id}`,
                    userId: user.id,
                    plan: plan,
                    status: 'active',
                    billingCycle: 'monthly',
                    price: price,
                    currency: 'BRL',
                    startDate: startDate,
                    endDate: endDate,
                    nextBillingDate: nextBillingDate,
                    trialEndDate: moment(startDate).add(14, 'days').toDate(),
                    paymentMethod: 'credit_card',
                    paymentStatus: 'paid',
                    features: features,
                    limits: {
                        monthlySales: features.monthlySales,
                        monthlyDocuments: features.monthlySales / 2,
                        apiCalls: 10000
                    },
                    metadata: {
                        signupSource: 'web',
                        usage: {
                            products: Math.floor(Math.random() * features.products * 0.3),
                            customers: Math.floor(Math.random() * features.customers * 0.2),
                            monthlySales: Math.floor(Math.random() * features.monthlySales * 0.4)
                        }
                    },
                    isAutoRenew: true,
                    createdAt: startDate,
                    updatedAt: startDate
                });
            }
            
            await Subscription.bulkCreate(subscriptions);
            logger.info(`✅ Seeded ${subscriptions.length} subscriptions`);
            
        } catch (error) {
            logger.error('❌ Error seeding subscriptions:', error);
            throw error;
        }
    }

    /**
     * Clear all seeded data
     */
    async clear() {
        try {
            logger.warn('⚠️  Clearing all seeded data...');
            
            // Delete in reverse order to respect foreign keys
            const tables = [
                'SecurityLogs', 'InventoryMovements', 'Transactions',
                'Documents', 'Sales', 'Inventory', 'Subscriptions',
                'Customers', 'Products', 'Users'
            ];
            
            for (const table of tables) {
                const model = this.models[table];
                if (model) {
                    await model.destroy({ where: {}, force: true });
                    logger.info(`Cleared ${table}`);
                }
            }
            
            logger.info('✅ All seeded data cleared');
            return true;
            
        } catch (error) {
            logger.error('❌ Error clearing data:', error);
            return false;
        }
    }

    /**
     * Check seeding status
     */
    async checkStatus() {
        try {
            const status = {};
            
            for (const [modelName, model] of Object.entries(this.models)) {
                const count = await model.count();
                status[modelName] = count;
            }
            
            logger.info('📊 Seeding status:', status);
            return status;
            
        } catch (error) {
            logger.error('❌ Error checking seeding status:', error);
            return null;
        }
    }
}

// If script is run directly
if (require.main === module) {
    const seeder = new Seeder();
    const command = process.argv[2];
    
    async function run() {
        switch (command) {
            case 'run':
                await seeder.seed();
                break;
                
            case 'clear':
                await seeder.clear();
                break;
                
            case 'status':
                await seeder.checkStatus();
                break;
                
            default:
                console.log(`
Usage: node seed.js [command]

Commands:
  run     - Run all seeders
  clear   - Clear all seeded data
  status  - Check seeding status
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

module.exports = Seeder;
