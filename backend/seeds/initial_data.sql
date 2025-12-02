-- ====================================================
-- BIZFLOW - DADOS INICIAIS DE DEMONSTRAÇÃO
-- ====================================================
-- Este arquivo popula o banco de dados com dados de exemplo
-- para desenvolvimento e testes
-- ====================================================

-- Limpar tabelas (em ordem reversa devido a FK constraints)
DELETE FROM security_logs;
DELETE FROM audit_logs;
DELETE FROM documents;
DELETE FROM subscriptions;
DELETE FROM transactions;
DELETE FROM sales;
DELETE FROM sale_items;
DELETE FROM inventory_movements;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM users;
DELETE FROM user_sessions;

-- Resetar sequences (se estiver usando PostgreSQL)
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;
-- ALTER SEQUENCE customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_id_seq RESTART WITH 1;
-- ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE documents_id_seq RESTART WITH 1;

-- ====================================================
-- USUÁRIOS
-- ====================================================
INSERT INTO users (name, email, password, role, company, phone, address, city, state, postal_code, country, 
                   is_active, email_verified, two_factor_enabled, two_factor_secret, failed_login_attempts, 
                   locked_until, last_login, last_password_change, created_at, updated_at) VALUES
(
    'Administrador do Sistema',
    'admin@bizflow.com',
    -- Senha: BizFlowAdmin2023! (já encriptada - bcrypt hash)
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'super_admin',
    'BizFlow Corporation',
    '+55 11 99999-9999',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    'Brasil',
    TRUE,
    TRUE,
    FALSE,
    NULL,
    0,
    NULL,
    NOW(),
    NOW(),
    NOW(),
    NOW()
),
(
    'Gerente de Vendas',
    'vendas@bizflow.com',
    -- Senha: Vendas2023!
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'manager',
    'BizFlow Corporation',
    '+55 11 98888-8888',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    'Brasil',
    TRUE,
    TRUE,
    FALSE,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
),
(
    'Operador de Caixa',
    'caixa@bizflow.com',
    -- Senha: Caixa123!
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'operator',
    'BizFlow Corporation',
    '+55 11 97777-7777',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    'Brasil',
    TRUE,
    TRUE,
    FALSE,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
);

-- ====================================================
-- CLIENTES
-- ====================================================
INSERT INTO customers (name, email, phone, cpf_cnpj, customer_type, address, city, state, postal_code, country,
                      status, credit_limit, current_balance, last_purchase_date, total_purchases, notes, 
                      created_at, updated_at) VALUES
(
    'Empresa Tech Solutions LTDA',
    'contato@techsolutions.com.br',
    '+55 11 3333-4444',
    '12.345.678/0001-90',
    'business',
    'Rua das Flores, 123',
    'São Paulo',
    'SP',
    '01234-567',
    'Brasil',
    'active',
    50000.00,
    12500.00,
    NOW() - INTERVAL '5 days',
    87500.00,
    'Cliente corporativo, pagamento em 30 dias',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '5 days'
),
(
    'Maria da Silva',
    'maria.silva@gmail.com',
    '+55 11 98888-1111',
    '123.456.789-00',
    'individual',
    'Av. Brasil, 456',
    'São Paulo',
    'SP',
    '04578-900',
    'Brasil',
    'active',
    5000.00,
    0.00,
    NOW() - INTERVAL '2 days',
    12000.00,
    'Cliente preferencial, compras frequentes',
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '2 days'
),
(
    'João Santos',
    'joao.santos@hotmail.com',
    '+55 11 97777-2222',
    '987.654.321-00',
    'individual',
    'Rua Augusta, 789',
    'São Paulo',
    'SP',
    '01345-678',
    'Brasil',
    'active',
    3000.00,
    750.00,
    NOW() - INTERVAL '15 days',
    4500.00,
    'Paga sempre no prazo',
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '15 days'
),
(
    'Digital Store Comércio Eletrônico',
    'vendas@digitalstore.com.br',
    '+55 11 2666-7777',
    '98.765.432/0001-10',
    'business',
    'Alameda Santos, 1001',
    'São Paulo',
    'SP',
    '01418-001',
    'Brasil',
    'active',
    100000.00,
    25000.00,
    NOW() - INTERVAL '30 days',
    325000.00,
    'Grande cliente, pedidos mensais',
    NOW() - INTERVAL '365 days',
    NOW() - INTERVAL '30 days'
),
(
    'Ana Oliveira',
    'ana.oliveira@outlook.com',
    '+55 11 95555-3333',
    '456.789.123-00',
    'individual',
    'Rua Oscar Freire, 200',
    'São Paulo',
    'SP',
    '01426-000',
    'Brasil',
    'inactive',
    2000.00,
    0.00,
    NOW() - INTERVAL '90 days',
    8000.00,
    'Não compra há 3 meses',
    NOW() - INTERVAL '200 days',
    NOW() - INTERVAL '90 days'
);

-- ====================================================
-- PRODUTOS
-- ====================================================
INSERT INTO products (sku, name, description, category, brand, unit, price, cost_price, 
                     tax_rate, min_stock, current_stock, max_stock, location, weight, dimensions,
                     barcode, supplier, is_active, last_purchase_date, last_sale_date, 
                     total_sold, created_at, updated_at) VALUES
(
    'NBK-MBP-2023',
    'Notebook MacBook Pro 16"',
    'Notebook Apple MacBook Pro 16" M2 Pro, 16GB RAM, 512GB SSD',
    'eletronicos',
    'Apple',
    'un',
    15999.90,
    13500.00,
    18.0,
    3,
    12,
    20,
    'Prateleira A1',
    2.1,
    '35.6 x 24.8 x 1.7 cm',
    '1234567890123',
    'Apple Distribuidor',
    TRUE,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '2 days',
    8,
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '2 days'
),
(
    'CEL-S23-256',
    'Smartphone Samsung Galaxy S23',
    'Smartphone Samsung Galaxy S23 5G, 256GB, 8GB RAM',
    'eletronicos',
    'Samsung',
    'un',
    4599.90,
    3800.00,
    18.0,
    5,
    25,
    40,
    'Prateleira B2',
    0.168,
    '14.6 x 7.0 x 0.7 cm',
    '2345678901234',
    'Samsung Brasil',
    TRUE,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    15,
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '1 day'
),
(
    'MON-LG-27UL',
    'Monitor LG UltraGear 27" 4K',
    'Monitor Gamer LG UltraGear 27" 4K UHD, 144Hz, IPS',
    'eletronicos',
    'LG',
    'un',
    2899.90,
    2300.00,
    18.0,
    4,
    18,
    30,
    'Prateleira C3',
    6.3,
    '61.3 x 36.8 x 23.1 cm',
    '3456789012345',
    'LG Eletronics',
    TRUE,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '5 days',
    12,
    NOW() - INTERVAL '150 days',
    NOW() - INTERVAL '5 days'
),
(
    'MOU-LOG-GPRO',
    'Mouse Gamer Logitech G Pro X',
    'Mouse Gamer Logitech G Pro X Superlight Wireless',
    'acessorios',
    'Logitech',
    'un',
    799.90,
    550.00,
    18.0,
    10,
    45,
    80,
    'Prateleira D4',
    0.063,
    '12.5 x 6.3 x 3.9 cm',
    '4567890123456',
    'Logitech Brasil',
    TRUE,
    NOW() - INTERVAL '5 days',
    NOW(),
    35,
    NOW() - INTERVAL '90 days',
    NOW()
),
(
    'TEC-MEC-RAZER',
    'Teclado Mecânico Razer BlackWidow',
    'Teclado Mecânico Gamer Razer BlackWidow V3',
    'acessorios',
    'Razer',
    'un',
    899.90,
    650.00,
    18.0,
    8,
    32,
    60,
    'Prateleira E5',
    1.2,
    '44.5 x 15.3 x 3.6 cm',
    '5678901234567',
    'Razer Store',
    TRUE,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    28,
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '2 days'
),
(
    'CAB-USB-TYPE3',
    'Cabo USB-C 2m',
    'Cabo USB-C para USB-C 2m, 100W, Transmissão de Dados',
    'acessorios',
    'Baseus',
    'un',
    49.90,
    25.00,
    18.0,
    20,
    120,
    200,
    'Prateleira F6',
    0.05,
    '2m',
    '6789012345678',
    'Baseus China',
    TRUE,
    NOW() - INTERVAL '2 days',
    NOW(),
    80,
    NOW() - INTERVAL '60 days',
    NOW()
),
(
    'CAR-SD-128GB',
    'Cartão de Memória SD 128GB',
    'Cartão de Memória SanDisk Extreme SDXC 128GB, 150MB/s',
    'acessorios',
    'SanDisk',
    'un',
    129.90,
    85.00,
    18.0,
    15,
    75,
    120,
    'Prateleira G7',
    0.002,
    '3.2 x 2.4 x 0.1 cm',
    '7890123456789',
    'Western Digital',
    TRUE,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    45,
    NOW() - INTERVAL '75 days',
    NOW() - INTERVAL '1 day'
),
(
    'FON-BLU-SONY',
    'Fone de Ouvido Bluetooth Sony',
    'Fone de Ouvido Bluetooth Sony WH-1000XM4, Cancelamento de Ruído',
    'eletronicos',
    'Sony',
    'un',
    1999.90,
    1600.00,
    18.0,
    3,
    15,
    25,
    'Prateleira H8',
    0.254,
    '18.5 x 16.8 x 7.9 cm',
    '8901234567890',
    'Sony Brasil',
    TRUE,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '8 days',
    10,
    NOW() - INTERVAL '160 days',
    NOW() - INTERVAL '8 days'
);

-- ====================================================
-- INVENTÁRIO (MOVIMENTAÇÕES INICIAIS)
-- ====================================================
INSERT INTO inventory_movements (product_id, movement_type, quantity, unit_cost, total_cost, 
                                reference_id, reference_type, notes, location, movement_date, 
                                created_by, created_at) VALUES
-- Entradas iniciais de estoque
(1, 'entrada', 20, 13500.00, 270000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira A1', NOW() - INTERVAL '180 days', 1, NOW() - INTERVAL '180 days'),
(2, 'entrada', 40, 3800.00, 152000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira B2', NOW() - INTERVAL '120 days', 1, NOW() - INTERVAL '120 days'),
(3, 'entrada', 30, 2300.00, 69000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira C3', NOW() - INTERVAL '150 days', 1, NOW() - INTERVAL '150 days'),
(4, 'entrada', 80, 550.00, 44000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira D4', NOW() - INTERVAL '90 days', 1, NOW() - INTERVAL '90 days'),
(5, 'entrada', 60, 650.00, 39000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira E5', NOW() - INTERVAL '100 days', 1, NOW() - INTERVAL '100 days'),
(6, 'entrada', 200, 25.00, 5000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira F6', NOW() - INTERVAL '60 days', 1, NOW() - INTERVAL '60 days'),
(7, 'entrada', 120, 85.00, 10200.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira G7', NOW() - INTERVAL '75 days', 1, NOW() - INTERVAL '75 days'),
(8, 'entrada', 25, 1600.00, 40000.00, NULL, 'initial_stock', 'Estoque inicial', 'Prateleira H8', NOW() - INTERVAL '160 days', 1, NOW() - INTERVAL '160 days');

-- ====================================================
-- VENDAS
-- ====================================================
INSERT INTO sales (sale_number, customer_id, customer_name, sale_date, status, payment_method, 
                  subtotal, tax_amount, discount_amount, shipping_amount, total_amount, 
                  paid_amount, change_amount, notes, seller_id, created_at, updated_at) VALUES
(
    'VEN-2023-001',
    1,
    'Empresa Tech Solutions LTDA',
    NOW() - INTERVAL '5 days',
    'completed',
    'credit_card',
    31999.80,
    5759.96,
    1600.00,
    0.00,
    36159.76,
    36159.76,
    0.00,
    'Venda corporativa com desconto especial',
    2,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    'VEN-2023-002',
    2,
    'Maria da Silva',
    NOW() - INTERVAL '2 days',
    'completed',
    'debit_card',
    5499.80,
    989.96,
    0.00,
    15.00,
    6504.76,
    6504.76,
    0.00,
    'Cliente preferencial',
    3,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'VEN-2023-003',
    3,
    'João Santos',
    NOW() - INTERVAL '15 days',
    'pending_payment',
    'bank_slip',
    899.90,
    161.98,
    0.00,
    10.00,
    1071.88,
    0.00,
    0.00,
    'Aguardando pagamento do boleto',
    2,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'VEN-2023-004',
    4,
    'Digital Store Comércio Eletrônico',
    NOW() - INTERVAL '30 days',
    'completed',
    'bank_transfer',
    7499.70,
    1349.95,
    750.00,
    0.00,
    8099.65,
    8099.65,
    0.00,
    'Pedido mensal da Digital Store',
    2,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
),
(
    'VEN-2023-005',
    2,
    'Maria da Silva',
    NOW() - INTERVAL '1 day',
    'completed',
    'pix',
    1699.80,
    305.96,
    85.00,
    0.00,
    1920.76,
    1920.76,
    0.00,
    'Compra com PIX instantâneo',
    3,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
);

-- Itens das vendas
INSERT INTO sale_items (sale_id, product_id, product_sku, product_name, quantity, unit_price, 
                       unit_cost, discount_percentage, discount_amount, tax_rate, subtotal, 
                       tax_amount, total, created_at) VALUES
-- Venda 1
(1, 1, 'NBK-MBP-2023', 'Notebook MacBook Pro 16"', 2, 15999.90, 13500.00, 5.0, 1599.99, 18.0, 31999.80, 5759.96, 36159.76, NOW() - INTERVAL '5 days'),
-- Venda 2
(2, 2, 'CEL-S23-256', 'Smartphone Samsung Galaxy S23', 1, 4599.90, 3800.00, 0.0, 0.00, 18.0, 4599.90, 827.98, 5427.88, NOW() - INTERVAL '2 days'),
(2, 6, 'CAB-USB-TYPE3', 'Cabo USB-C 2m', 2, 49.90, 25.00, 0.0, 0.00, 18.0, 99.80, 17.96, 117.76, NOW() - INTERVAL '2 days'),
(2, 7, 'CAR-SD-128GB', 'Cartão de Memória SD 128GB', 1, 129.90, 85.00, 0.0, 0.00, 18.0, 129.90, 23.38, 153.28, NOW() - INTERVAL '2 days'),
-- Venda 3
(3, 5, 'TEC-MEC-RAZER', 'Teclado Mecânico Razer BlackWidow', 1, 899.90, 650.00, 0.0, 0.00, 18.0, 899.90, 161.98, 1071.88, NOW() - INTERVAL '15 days'),
-- Venda 4
(4, 3, 'MON-LG-27UL', 'Monitor LG UltraGear 27" 4K', 2, 2899.90, 2300.00, 5.0, 289.99, 18.0, 5799.80, 1043.96, 6843.76, NOW() - INTERVAL '30 days'),
(4, 4, 'MOU-LOG-GPRO', 'Mouse Gamer Logitech G Pro X', 1, 799.90, 550.00, 5.0, 40.00, 18.0, 759.90, 136.78, 896.68, NOW() - INTERVAL '30 days'),
(4, 8, 'FON-BLU-SONY', 'Fone de Ouvido Bluetooth Sony', 1, 1999.90, 1600.00, 0.0, 0.00, 18.0, 1999.90, 359.98, 2359.88, NOW() - INTERVAL '30 days'),
-- Venda 5
(5, 4, 'MOU-LOG-GPRO', 'Mouse Gamer Logitech G Pro X', 2, 799.90, 550.00, 5.0, 79.99, 18.0, 1519.81, 273.57, 1793.38, NOW() - INTERVAL '1 day'),
(5, 6, 'CAB-USB-TYPE3', 'Cabo USB-C 2m', 1, 49.90, 25.00, 10.0, 5.00, 18.0, 44.91, 8.08, 52.99, NOW() - INTERVAL '1 day'),
(5, 7, 'CAR-SD-128GB', 'Cartão de Memória SD 128GB', 1, 129.90, 85.00, 0.0, 0.00, 18.0, 129.90, 23.38, 153.28, NOW() - INTERVAL '1 day');

-- Atualizar saídas de estoque com base nas vendas
INSERT INTO inventory_movements (product_id, movement_type, quantity, unit_cost, total_cost, 
                                reference_id, reference_type, notes, location, movement_date, 
                                created_by, created_at)
SELECT 
    si.product_id,
    'saida',
    si.quantity,
    si.unit_cost,
    si.unit_cost * si.quantity,
    si.sale_id,
    'sale',
    'Venda ' || s.sale_number,
    p.location,
    s.sale_date,
    s.seller_id,
    s.sale_date
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
JOIN products p ON si.product_id = p.id;

-- ====================================================
-- TRANSAÇÕES FINANCEIRAS
-- ====================================================
INSERT INTO transactions (transaction_number, transaction_date, transaction_type, 
                         category, description, amount, payment_method, status,
                         reference_id, reference_type, notes, created_by, created_at, updated_at) VALUES
-- Recebimentos de vendas
('REC-2023-001', NOW() - INTERVAL '5 days', 'receipt', 'sales', 'Recebimento VEN-2023-001', 36159.76, 'credit_card', 'completed', 1, 'sale', 'Recebimento cartão de crédito', 2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('REC-2023-002', NOW() - INTERVAL '2 days', 'receipt', 'sales', 'Recebimento VEN-2023-002', 6504.76, 'debit_card', 'completed', 2, 'sale', 'Recebimento cartão de débito', 3, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('REC-2023-004', NOW() - INTERVAL '30 days', 'receipt', 'sales', 'Recebimento VEN-2023-004', 8099.65, 'bank_transfer', 'completed', 4, 'sale', 'Transferência bancária', 2, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('REC-2023-005', NOW() - INTERVAL '1 day', 'receipt', 'sales', 'Recebimento VEN-2023-005', 1920.76, 'pix', 'completed', 5, 'sale', 'Pagamento via PIX', 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- Pagamentos de fornecedores
('PAG-2023-001', NOW() - INTERVAL '15 days', 'payment', 'supplier', 'Pagamento Apple Distribuidor', 270000.00, 'bank_transfer', 'completed', NULL, 'supplier', 'Pagamento estoque MacBooks', 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('PAG-2023-002', NOW() - INTERVAL '7 days', 'payment', 'supplier', 'Pagamento Samsung Brasil', 152000.00, 'bank_transfer', 'completed', NULL, 'supplier', 'Pagamento estoque smartphones', 1, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('PAG-2023-003', NOW() - INTERVAL '3 days', 'payment', 'supplier', 'Pagamento Razer Store', 39000.00, 'bank_transfer', 'pending', NULL, 'supplier', 'Pagamento teclados gamer', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

-- Despesas operacionais
('DES-2023-001', NOW() - INTERVAL '10 days', 'expense', 'rent', 'Aluguel do escritório', 8500.00, 'bank_transfer', 'completed', NULL, 'rent', 'Aluguel mensal', 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('DES-2023-002', NOW() - INTERVAL '5 days', 'expense', 'utilities', 'Conta de energia', 1200.50, 'bank_slip', 'completed', NULL, 'utilities', 'Energia mês atual', 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('DES-2023-003', NOW() - INTERVAL '2 days', 'expense', 'salary', 'Salários equipe', 25000.00, 'bank_transfer', 'completed', NULL, 'salary', 'Folha de pagamento', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- ====================================================
-- ASSINATURAS
-- ====================================================
INSERT INTO subscriptions (plan_id, user_id, company_id, plan_name, billing_cycle, price, 
                          status, current_period_start, current_period_end, cancel_at_period_end,
                          trial_start, trial_end, payment_method, notes, created_at, updated_at) VALUES
(
    'premium_annual',
    1,
    1,
    'Plano Premium Anual',
    'yearly',
    2999.90,
    'active',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '335 days',
    FALSE,
    NULL,
    NULL,
    'credit_card',
    'Assinatura ativa com todos os recursos',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
);

-- ====================================================
-- DOCUMENTOS
-- ====================================================
INSERT INTO documents (document_number, document_type, customer_id, customer_name, issue_date, 
                      due_date, status, amount, tax_amount, discount_amount, total_amount, 
                      paid_amount, description, file_path, digital_signature, signed_by, 
                      signed_at, notes, created_by, created_at, updated_at) VALUES
(
    'NF-2023-001',
    'invoice',
    1,
    'Empresa Tech Solutions LTDA',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    'paid',
    36159.76,
    5759.96,
    1600.00,
    36159.76,
    36159.76,
    'Nota Fiscal Venda MacBooks',
    '/documents/invoices/nf-2023-001.pdf',
    '-----BEGIN SIGNATURE-----\nMOCK_SIGNATURE_123\n-----END SIGNATURE-----',
    'Administrador do Sistema',
    NOW() - INTERVAL '5 days',
    'Nota fiscal emitida automaticamente',
    2,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    'CTE-2023-001',
    'shipping',
    2,
    'Maria da Silva',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '3 days',
    'pending',
    6504.76,
    989.96,
    0.00,
    6504.76,
    6504.76,
    'Conhecimento de Transporte Eletrônico',
    '/documents/shipping/cte-2023-001.pdf',
    NULL,
    NULL,
    NULL,
    'Aguardando assinatura digital',
    3,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'CON-2023-001',
    'contract',
    4,
    'Digital Store Comércio Eletrônico',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '335 days',
    'active',
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    'Contrato de Fornecimento Anual',
    '/documents/contracts/con-2023-001.pdf',
    '-----BEGIN SIGNATURE-----\nMOCK_SIGNATURE_456\n-----END SIGNATURE-----',
    'Administrador do Sistema',
    NOW() - INTERVAL '30 days',
    'Contrato assinado digitalmente',
    1,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
);

-- ====================================================
-- LOGS DE SEGURANÇA
-- ====================================================
INSERT INTO security_logs (user_id, ip_address, user_agent, event_type, severity, description, 
                          metadata, created_at) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'login', 'info', 'Login realizado com sucesso', '{"method": "password", "two_factor": false}', NOW()),
(2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'login', 'info', 'Login realizado com sucesso', '{"method": "password", "two_factor": false}', NOW() - INTERVAL '2 hours'),
(1, '203.0.113.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'failed_login', 'warning', 'Tentativa de login falhou', '{"email": "admin@bizflow.com", "reason": "senha incorreta"}', NOW() - INTERVAL '1 day'),
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'password_change', 'info', 'Senha alterada com sucesso', '{}', NOW() - INTERVAL '30 days'),
(3, '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36', 'logout', 'info', 'Logout realizado', '{}', NOW() - INTERVAL '3 hours'),
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'security_alert', 'warning', 'Múltiplas tentativas de login detectadas', '{"count": 5, "ip": "203.0.113.1"}', NOW() - INTERVAL '12 hours');

-- ====================================================
-- LOGS DE AUDITORIA
-- ====================================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, 
                       ip_address, user_agent, created_at) VALUES
(1, 'create', 'product', 1, '{}', '{"sku": "NBK-MBP-2023", "name": "Notebook MacBook Pro 16\"", "price": 15999.90}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '180 days'),
(1, 'update', 'product', 1, '{"price": 15999.90}', '{"price": 16999.90}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '150 days'),
(2, 'create', 'sale', 1, '{}', '{"sale_number": "VEN-2023-001", "total_amount": 36159.76}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '5 days'),
(2, 'update', 'customer', 1, '{"credit_limit": 40000.00}', '{"credit_limit": 50000.00}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '10 days'),
(3, 'create', 'sale', 5, '{}', '{"sale_number": "VEN-2023-005", "total_amount": 1920.76}', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),
(1, 'delete', 'product', 9, '{"id": 9, "sku": "TEST-PROD", "name": "Produto Teste"}', '{}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '20 days');

-- ====================================================
-- SESSÕES DE USUÁRIO
-- ====================================================
INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at, 
                          last_activity, is_active, created_at, updated_at) VALUES
(1, 'sess_' || floor(random() * 1000000)::text, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() + INTERVAL '8 hours', NOW(), TRUE, NOW(), NOW()),
(2, 'sess_' || floor(random() * 1000000)::text, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() + INTERVAL '6 hours', NOW() - INTERVAL '30 minutes', TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'),
(3, 'sess_' || floor(random() * 1000000)::text, '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36', NOW() + INTERVAL '4 hours', NOW() - INTERVAL '1 hour', FALSE, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour');

-- ====================================================
-- ATUALIZAR ESTATÍSTICAS DERIVADAS
-- ====================================================

-- Atualizar total vendido em produtos
UPDATE products p
SET total_sold = (
    SELECT COALESCE(SUM(si.quantity), 0)
    FROM sale_items si
    WHERE si.product_id = p.id
);

-- Atualizar última data de venda em produtos
UPDATE products p
SET last_sale_date = (
    SELECT MAX(s.sale_date)
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id = p.id
    AND s.status = 'completed'
)
WHERE EXISTS (
    SELECT 1 FROM sale_items si 
    JOIN sales s ON si.sale_id = s.id 
    WHERE si.product_id = p.id 
    AND s.status = 'completed'
);

-- Atualizar saldo atual de clientes
UPDATE customers c
SET current_balance = (
    SELECT COALESCE(SUM(s.total_amount - s.paid_amount), 0)
    FROM sales s
    WHERE s.customer_id = c.id
    AND s.status != 'cancelled'
);

-- Atualizar última data de compra de clientes
UPDATE customers c
SET last_purchase_date = (
    SELECT MAX(sale_date)
    FROM sales
    WHERE customer_id = c.id
    AND status = 'completed'
)
WHERE EXISTS (
    SELECT 1 FROM sales 
    WHERE customer_id = c.id 
    AND status = 'completed'
);

-- Atualizar total de compras de clientes
UPDATE customers c
SET total_purchases = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM sales
    WHERE customer_id = c.id
    AND status = 'completed'
);

-- ====================================================
-- RESUMO FINAL
-- ====================================================
SELECT 'Dados iniciais inseridos com sucesso!' as message;
SELECT 'Usuários: ' || COUNT(*) as total_users FROM users;
SELECT 'Clientes: ' || COUNT(*) as total_customers FROM customers;
SELECT 'Produtos: ' || COUNT(*) as total_products FROM products;
SELECT 'Vendas: ' || COUNT(*) as total_sales FROM sales;
SELECT 'Transações: ' || COUNT(*) as total_transactions FROM transactions;
SELECT 'Documentos: ' || COUNT(*) as total_documents FROM documents;
