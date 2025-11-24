const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;
    
    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, company_name, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, company_name`,
      [name, email, hashedPassword, company]
    );

    // Generate token
    const token = jwt.sign(
      { userId: newUser.rows[0].id, email: newUser.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: newUser.rows[0].id,
        name: newUser.rows[0].name,
        email: newUser.rows[0].email,
        company: newUser.rows[0].company_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    const user = userResult.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Products routes
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(products.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { name, sku, category, price, cost, stock, description } = req.body;
    
    const newProduct = await pool.query(
      `INSERT INTO products (user_id, name, sku, category, price, cost, stock, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [req.user.userId, name, sku, category, price, cost, stock, description]
    );

    res.status(201).json(newProduct.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Sales routes
app.get('/api/sales', authenticateToken, async (req, res) => {
  try {
    const sales = await pool.query(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.user_id = $1 
       ORDER BY s.created_at DESC`,
      [req.user.userId]
    );
    res.json(sales.rows);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

app.post('/api/sales', authenticateToken, async (req, res) => {
  try {
    const { customer_id, items, total, payment_method, notes } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create sale
      const saleResult = await client.query(
        `INSERT INTO sales (user_id, customer_id, total, payment_method, notes, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [req.user.userId, customer_id, total, payment_method, notes]
      );
      
      const sale = saleResult.rows[0];
      
      // Add sale items and update stock
      for (const item of items) {
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, quantity, price) 
           VALUES ($1, $2, $3, $4)`,
          [sale.id, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      await client.query('COMMIT');
      res.status(201).json(sale);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

// Customers routes
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await pool.query(
      'SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(customers.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, document } = req.body;
    
    const newCustomer = await pool.query(
      `INSERT INTO customers (user_id, name, email, phone, address, document, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [req.user.userId, name, email, phone, address, document]
    );

    res.status(201).json(newCustomer.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// Dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Today's sales
    const todaySales = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM sales 
       WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );
    
    // Total customers
    const totalCustomers = await pool.query(
      'SELECT COUNT(*) as count FROM customers WHERE user_id = $1',
      [userId]
    );
    
    // Total products
    const totalProducts = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1',
      [userId]
    );
    
    // Monthly revenue
    const monthlyRevenue = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM sales 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)`,
      [userId]
    );
    
    // Recent sales
    const recentSales = await pool.query(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.user_id = $1 
       ORDER BY s.created_at DESC 
       LIMIT 5`,
      [userId]
    );

    res.json({
      todaySales: parseFloat(todaySales.rows[0].total),
      totalCustomers: parseInt(totalCustomers.rows[0].count),
      totalProducts: parseInt(totalProducts.rows[0].count),
      monthlyRevenue: parseFloat(monthlyRevenue.rows[0].total),
      recentSales: recentSales.rows
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BizFlow API está funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
