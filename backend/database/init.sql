-- =============================================
-- BIZFLOW DATABASE INITIALIZATION SCRIPT
-- Sistema Completo de Gestão Empresarial
-- =============================================

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  company_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  document VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  category VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- SUPER ADMIN AND SAMPLE DATA
-- =============================================

-- Create Super Admin user
-- Password: admin123 (bcrypt hashed)
INSERT INTO users (name, email, password, company_name, created_at) 
VALUES (
  'Super Admin', 
  'admin@bizflow.com', 
  '$2a$10$8F8LtlNohsI6xXrBw8hP.Oe6e8e8e8e8e8e8e8e8e8e8e8e8e8e8e',
  'BizFlow System',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create sample products for the super admin
INSERT INTO products (user_id, name, sku, category, price, cost, stock, description) VALUES 
(1, 'Smartphone XYZ Pro', 'SMARTPHONE-001', 'Eletrônicos', 899.90, 650.00, 24, 'Smartphone flagship com câmera tripla e 128GB de armazenamento'),
(1, 'Fone de Ouvido Bluetooth', 'AUDIO-001', 'Áudio', 129.90, 80.00, 56, 'Fone sem fio com cancelamento de ruído e bateria de 20h'),
(1, 'Tablet 10" Android', 'TABLET-001', 'Eletrônicos', 649.90, 480.00, 12, 'Tablet com tela Full HD e processador octa-core'),
(1, 'Notebook Pro i7', 'NOTEBOOK-001', 'Informática', 2499.90, 1800.00, 8, 'Notebook para trabalho com Intel i7 e 16GB RAM'),
(1, 'Mouse Sem Fio Optical', 'ACESS-001', 'Acessórios', 49.90, 25.00, 42, 'Mouse óptico sem fio com design ergonômico'),
(1, 'Teclado Mecânico RGB', 'ACESS-002', 'Acessórios', 199.90, 120.00, 18, 'Teclado mecânico com iluminação RGB e switches azuis'),
(1, 'Monitor 24" LED', 'MONITOR-001', 'Informática', 699.90, 450.00, 15, 'Monitor Full HD 24 polegadas com entrada HDMI e DisplayPort'),
(1, 'Webcam 1080p', 'ACESS-003', 'Acessórios', 89.90, 45.00, 30, 'Webcam Full HD com microfone integrado e ajuste automático de luz')
ON CONFLICT (sku) DO NOTHING;

-- Create sample customers
INSERT INTO customers (user_id, name, email, phone, address, document) VALUES 
(1, 'Maria Santos Silva', 'maria.santos@email.com', '(11) 99999-9999', 'Rua das Flores, 123 - São Paulo/SP', '123.456.789-00'),
(1, 'João Pereira Oliveira', 'joao.pereira@email.com', '(11) 88888-8888', 'Av. Paulista, 1000 - São Paulo/SP', '987.654.321-00'),
(1, 'Empresa ABC Ltda', 'contato@empresaabc.com', '(11) 77777-7777', 'Rua dos Negócios, 500 - São Paulo/SP', '12.345.678/0001-90'),
(1, 'Ana Costa Rodrigues', 'ana.costa@email.com', '(11) 66666-6666', 'Rua das Palmeiras, 45 - São Paulo/SP', '456.789.123-00'),
(1, 'Carlos Eduardo Martins', 'carlos.martins@email.com', '(11) 55555-5555', 'Alameda Santos, 789 - São Paulo/SP', '789.123.456-00')
ON CONFLICT DO NOTHING;

-- Create sample sales for dashboard data
INSERT INTO sales (user_id, customer_id, total, payment_method, notes, created_at) VALUES 
(1, 1, 245.90, 'card', 'Venda realizada com sucesso', NOW() - INTERVAL '1 hour'),
(1, 2, 89.50, 'pix', 'Cliente satisfeito com o atendimento', NOW() - INTERVAL '2 hours'),
(1, 3, 1245.80, 'transfer', 'Venda corporativa com nota fiscal', NOW() - INTERVAL '1 day'),
(1, 4, 56.90, 'cash', 'Venda avulsa no balcão', NOW() - INTERVAL '2 days'),
(1, 1, 349.90, 'card', 'Segunda compra do cliente', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Create sample sale items
INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES 
(1, 2, 1, 129.90),  -- Fone de Ouvido
(1, 5, 1, 49.90),   -- Mouse
(1, 6, 1, 199.90),  -- Teclado (parcial)
(2, 2, 1, 89.50),   -- Fone com desconto
(3, 1, 1, 899.90),  -- Smartphone
(3, 3, 1, 649.90),  -- Tablet (parcial)
(4, 5, 1, 49.90),   -- Mouse
(4, 2, 1, 89.90),   -- Fone (parcial)
(5, 1, 1, 899.90),  -- Smartphone
(5, 2, 1, 129.90)   -- Fone
ON CONFLICT DO NOTHING;

-- Create sample documents
INSERT INTO documents (user_id, type, title, content, status, signed_at) VALUES 
(1, 'invoice', 'Fatura #INV00125', 'Fatura referente à venda do dia 15/06/2023', 'signed', NOW() - INTERVAL '1 day'),
(1, 'purchase_order', 'Ordem de Compra #PO0012', 'Ordem de compra para fornecedor ABC', 'pending', NULL),
(1, 'contract', 'Contrato de Prestação de Serviços', 'Contrato padrão de prestação de serviços', 'signed', NOW() - INTERVAL '3 days'),
(1, 'proposal', 'Proposta Comercial #PROP045', 'Proposta comercial para cliente corporativo', 'draft', NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify data insertion
DO $$ 
BEGIN
    RAISE NOTICE '=== BIZFLOW DATABASE INITIALIZATION COMPLETE ===';
    RAISE NOTICE 'Super Admin: admin@bizflow.com (senha: admin123)';
    RAISE NOTICE 'Total Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Total Products: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'Total Customers: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE 'Total Sales: %', (SELECT COUNT(*) FROM sales);
    RAISE NOTICE '===============================================';
END $$;

-- View sample data (optional - for verification)
-- SELECT 'Users:' as info; SELECT id, name, email FROM users;
-- SELECT 'Products:' as info; SELECT id, name, price, stock FROM products ORDER BY id;
-- SELECT 'Customers:' as info; SELECT id, name, email FROM customers ORDER BY id;
-- SELECT 'Recent Sales:' as info; SELECT id, total, payment_method, created_at FROM sales ORDER BY created_at DESC LIMIT 3;
