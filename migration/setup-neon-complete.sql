-- =====================================================
-- SCRIPT COMPLETO DE MIGRAÇÃO SQL
-- Execute este script no SQL Editor do Neon
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAR TABELAS
-- =====================================================

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    expires_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- Tabela banks
CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🏦',
    initial_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);

-- Tabela categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Tabela credit_cards
CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    bank TEXT,
    credit_limit NUMERIC DEFAULT 0,
    icon TEXT DEFAULT '💳',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

-- Tabela transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    bank TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    category TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Tabela credit_card_transactions
CREATE TABLE IF NOT EXISTS credit_card_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    card TEXT NOT NULL,
    category TEXT NOT NULL,
    value NUMERIC NOT NULL,
    is_payment BOOLEAN DEFAULT FALSE,
    invoice_month TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_transactions_user_id ON credit_card_transactions(user_id);

-- Tabela pending_users
CREATE TABLE IF NOT EXISTS pending_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    created_by TEXT,
    expires_at TIMESTAMPTZ,
    default_banks JSONB,
    default_categories JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);

-- Tabela description_category_mappings
CREATE TABLE IF NOT EXISTS description_category_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mappings_user_id ON description_category_mappings(user_id);

-- Tabela scheduled_transactions
CREATE TABLE IF NOT EXISTS scheduled_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('parcel', 'recurring', 'single')),
    transaction_type TEXT DEFAULT 'debit' CHECK (transaction_type IN ('debit', 'credit')),
    value DECIMAL(10,2) NOT NULL,
    total_installments INTEGER DEFAULT 1,
    current_installment INTEGER DEFAULT 1,
    due_date DATE NOT NULL,
    category TEXT,
    bank TEXT,
    card TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    auto_confirm BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_user_id ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_due_date ON scheduled_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_transactions(status);

-- =====================================================
-- PARTE 2: CRIAR FUNÇÃO E TRIGGERS
-- =====================================================

-- Função para auto-atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para scheduled_transactions
DROP TRIGGER IF EXISTS update_scheduled_transactions_updated_at ON scheduled_transactions;
CREATE TRIGGER update_scheduled_transactions_updated_at
    BEFORE UPDATE ON scheduled_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para description_category_mappings
DROP TRIGGER IF EXISTS update_mappings_updated_at ON description_category_mappings;
CREATE TRIGGER update_mappings_updated_at
    BEFORE UPDATE ON description_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 3: VERIFICAR CRIAÇÃO DAS TABELAS
-- =====================================================

-- Listar todas as tabelas criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar estrutura de cada tabela
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- PARTE 4: INSERTS DE EXEMPLO (PARA TESTE)
-- =====================================================

-- Inserir usuário de teste (substitua pelo ID do Clerk)
INSERT INTO users (id, email, is_admin) 
VALUES ('user_test_123', 'teste@email.com', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir bancos de teste
INSERT INTO banks (user_id, name, icon, initial_balance)
VALUES 
    ('user_test_123', 'Banco do Brasil', '🏦', 1500.00),
    ('user_test_123', 'Nubank', '💜', 2500.00),
    ('user_test_123', 'Itaú', '🟠', 800.00)
ON CONFLICT DO NOTHING;

-- Inserir categorias de teste
INSERT INTO categories (user_id, name, icon)
VALUES 
    ('user_test_123', 'Alimentação', '🍔'),
    ('user_test_123', 'Transporte', '🚗'),
    ('user_test_123', 'Moradia', '🏠'),
    ('user_test_123', 'Lazer', '🎮'),
    ('user_test_123', 'Saúde', '🏥')
ON CONFLICT DO NOTHING;

-- Inserir cartão de crédito de teste
INSERT INTO credit_cards (user_id, name, bank, credit_limit, icon)
VALUES ('user_test_123', 'Visa Gold', 'Nubank', 5000.00, '💳')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA!
-- =====================================================

-- Próximos passos:
-- 1. Exportar dados do Supabase (use o SQL Editor do Supabase)
-- 2. Importar dados no Neon (use o SQL Editor do Neon)
-- 3. Configurar Clerk no projeto
-- 4. Atualizar o código da aplicação
