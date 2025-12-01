const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

describe('Products API', () => {
  let token;
  let userId;
  
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Criar usuário de teste
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123',
      companyName: 'Test Company',
      role: 'admin'
    });
    
    userId = user.id;
    
    // Login para obter token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });
    
    token = res.body.token;
  });
  
  afterAll(async () => {
    await sequelize.close();
  });
  
  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sku: 'TEST001',
          name: 'Test Product',
          category: 'test',
          price: 99.99,
          cost: 50.00,
          stock: 100,
          minStock: 10
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('product');
      expect(res.body.product.sku).toBe('TEST001');
      expect(res.body.product.name).toBe('Test Product');
    });
    
    it('should not create product with duplicate SKU', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sku: 'TEST001',
          name: 'Another Product',
          category: 'test',
          price: 199.99,
          cost: 100.00,
          stock: 50
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
  
  describe('GET /api/products', () => {
    it('should list products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.products)).toBe(true);
    });
    
    it('should filter products by category', async () => {
      const res = await request(app)
        .get('/api/products?category=test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.products.every(p => p.category === 'test')).toBe(true);
    });
  });
  
  describe('GET /api/products/:id', () => {
    let productId;
    
    beforeAll(async () => {
      const product = await Product.create({
        sku: 'TEST002',
        name: 'Specific Product',
        category: 'test',
        price: 49.99,
        cost: 25.00,
        stock: 50,
        minStock: 5,
        userId
      });
      
      productId = product.id;
    });
    
    it('should get product by id', async () => {
      const res = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('product');
      expect(res.body.product.id).toBe(productId);
      expect(res.body.product.name).toBe('Specific Product');
    });
    
    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
  
  describe('PUT /api/products/:id', () => {
    let productId;
    
    beforeAll(async () => {
      const product = await Product.create({
        sku: 'TEST003',
        name: 'Product to Update',
        category: 'test',
        price: 29.99,
        cost: 15.00,
        stock: 30,
        minStock: 3,
        userId
      });
      
      productId = product.id;
    });
    
    it('should update product', async () => {
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Product',
          price: 39.99,
          stock: 25
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('product');
      expect(res.body.product.name).toBe('Updated Product');
      expect(res.body.product.price).toBe('39.99');
      expect(res.body.product.stock).toBe(25);
    });
  });
  
  describe('DELETE /api/products/:id', () => {
    let productId;
    
    beforeAll(async () => {
      const product = await Product.create({
        sku: 'TEST004',
        name: 'Product to Delete',
        category: 'test',
        price: 19.99,
        cost: 10.00,
        stock: 0, // Sem estoque para poder excluir
        minStock: 2,
        userId
      });
      
      productId = product.id;
    });
    
    it('should delete product', async () => {
      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should not delete product with stock', async () => {
      const product = await Product.create({
        sku: 'TEST005',
        name: 'Product with Stock',
        category: 'test',
        price: 59.99,
        cost: 30.00,
        stock: 10,
        minStock: 2,
        userId
      });
      
      const res = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
