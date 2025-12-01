-- Banco de dados BizFlow
CREATE DATABASE bizflow;
\c bizflow;

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    token_version INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para usuários
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company ON users(company_name);

-- Tabela de produtos
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'uncategorized',
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0.01),
    cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    max_stock INTEGER CHECK (max_stock >= 0),
    barcode VARCHAR(100) UNIQUE,
    unit VARCHAR(20) NOT NULL DEFAULT 'un',
    weight DECIMAL(10,3),
    dimensions VARCHAR(100),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    supplier_id UUID,
    location VARCHAR(100),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para produtos
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_stock ON products(stock) WHERE stock <= min_stock;

-- Tabela de clientes
CREATE TABLE customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
    tax_id VARCHAR(50),
    address TEXT,
    total_purchases DECIMAL(10,2) DEFAULT 0,
    last_purchase TIMESTAMP,
    notes TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para clientes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- Tabela de vendas
CREATE TABLE sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0.01),
    tax DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0.01),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'pix', 'multiple')),
    payment_details JSONB,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    notes TEXT,
    cash_drawer_id UUID,
    location VARCHAR(100),
    device_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para vendas
CREATE INDEX idx_sales_sale_number ON sales(sale_number);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);

-- Tabela de transações financeiras
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    reference_id UUID,
    reference_type VARCHAR(50),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para transações
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Tabela de documentos
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_number VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('invoice', 'purchase_order', 'requisition', 'contract', 'other')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    due_date DATE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    content JSONB,
    requires_approval BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'rejected', 'cancelled')),
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMP,
    signature_hash VARCHAR(255),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para documentos
CREATE INDEX idx_documents_number ON documents(document_number);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_date ON documents(date);

-- Tabela de movimentações de inventário
CREATE TABLE inventory_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entry', 'withdrawal', 'adjustment', 'initial', 'sale', 'return')),
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    notes TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para movimentações
CREATE INDEX idx_inventory_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_user_id ON inventory_movements(user_id);
CREATE INDEX idx_inventory_type ON inventory_movements(type);
CREATE INDEX idx_inventory_created_at ON inventory_movements(created_at);

-- Tabela de logs de segurança
CREATE TABLE security_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    status_code INTEGER,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para logs de segurança
CREATE INDEX idx_security_user_id ON security_logs(user_id);
CREATE INDEX idx_security_action ON security_logs(action);
CREATE INDEX idx_security_created_at ON security_logs(created_at);
CREATE INDEX idx_security_severity ON security_logs(severity);
CREATE INDEX idx_security_resolved ON security_logs(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_security_ip_address ON security_logs(ip_address);

-- Tabela de assinaturas
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para assinaturas
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);

-- Tabela de caixa
CREATE TABLE cash_drawers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2),
    expected_balance DECIMAL(10,2),
    difference DECIMAL(10,2),
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para caixa
CREATE INDEX idx_cash_drawers_user_id ON cash_drawers(user_id);
CREATE INDEX idx_cash_drawers_status ON cash_drawers(status);
CREATE INDEX idx_cash_drawers_opened_at ON cash_drawers(opened_at);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers a todas as tabelas
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de venda
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
    today DATE := CURRENT_DATE;
    sequence_num INTEGER;
    sale_number VARCHAR(50);
BEGIN
    -- Formato: VYYYYMMDD-0001
    SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM '-(\\d+)$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM sales
    WHERE DATE(created_at) = today;
    
    sale_number := 'V' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.sale_number := sale_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número de venda
DROP TRIGGER IF EXISTS trigger_generate_sale_number ON sales;
CREATE TRIGGER trigger_generate_sale_number
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.sale_number IS NULL)
EXECUTE FUNCTION generate_sale_number();

-- Views para relatórios

-- View para dashboard
CREATE VIEW dashboard_stats AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT s.id) as total_sales,
    COALESCE(SUM(s.total), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN DATE(s.created_at) = CURRENT_DATE THEN s.total ELSE 0 END), 0) as today_revenue,
    COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM s.created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
                      AND EXTRACT(YEAR FROM s.created_at) = EXTRACT(YEAR FROM CURRENT_DATE) 
                 THEN s.total ELSE 0 END), 0) as monthly_revenue,
    COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_products,
    COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_products,
    COALESCE(SUM(p.cost * p.stock), 0) as inventory_value
FROM users u
LEFT JOIN products p ON u.id = p.user_id
LEFT JOIN customers c ON u.id = c.user_id
LEFT JOIN sales s ON u.id = s.user_id AND s.status = 'completed'
GROUP BY u.id;

-- View para produtos com estoque baixo
CREATE VIEW low_stock_products AS
SELECT 
    p.*,
    u.name as user_name,
    u.email as user_email,
    CASE 
        WHEN p.stock = 0 THEN 'Sem estoque'
        WHEN p.stock <= p.min_stock THEN 'Estoque baixo'
        ELSE 'Normal'
    END as stock_status
FROM products p
JOIN users u ON p.user_id = u.id
WHERE p.status = 'active' AND (p.stock = 0 OR p.stock <= p.min_stock);

-- Insert de dados iniciais (admin)
INSERT INTO users (name, email, password, role, company_name, email_verified, is_active) 
VALUES (
    'Administrador BizFlow',
    'admin@bizflow.com',
    crypt('admin123', gen_salt('bf', 10)),
    'admin',
    'BizFlow Corp',
    TRUE,
    TRUE
);

-- Criar usuário do PostgreSQL para aplicação (execute separadamente)
-- CREATE USER bizflow_app WITH PASSWORD 'StrongPassword123!';
-- GRANT ALL PRIVILEGES ON DATABASE bizflow TO bizflow_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bizflow_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bizflow_app;
