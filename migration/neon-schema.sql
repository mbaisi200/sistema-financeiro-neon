-- =====================================================
-- SCHEMA COMPLETO PARA NEON POSTGRES
-- Sistema Financeiro - Migrado do Supabase
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    expires_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- =====================================================
-- TABELA: banks
-- =====================================================
CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🏦',
    initial_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para banks
CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);

-- =====================================================
-- TABELA: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- =====================================================
-- TABELA: credit_cards
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    bank TEXT,
    credit_limit NUMERIC DEFAULT 0,
    icon TEXT DEFAULT '💳',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para credit_cards
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

-- =====================================================
-- TABELA: transactions
-- =====================================================
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

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank);

-- =====================================================
-- TABELA: credit_card_transactions
-- =====================================================
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

-- Índices para credit_card_transactions
CREATE INDEX IF NOT EXISTS idx_cc_transactions_user_id ON credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_card ON credit_card_transactions(card);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_invoice_month ON credit_card_transactions(invoice_month);

-- =====================================================
-- TABELA: pending_users
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    created_by TEXT,
    expires_at TIMESTAMPTZ,
    default_banks JSONB,
    default_categories JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pending_users
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);

-- =====================================================
-- TABELA: description_category_mappings
-- =====================================================
CREATE TABLE IF NOT EXISTS description_category_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para description_category_mappings
CREATE INDEX IF NOT EXISTS idx_mappings_user_id ON description_category_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_mappings_description ON description_category_mappings(description);

-- =====================================================
-- TABELA: scheduled_transactions
-- =====================================================
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

-- Índices para scheduled_transactions
CREATE INDEX IF NOT EXISTS idx_scheduled_user_id ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_due_date ON scheduled_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_transactions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_type ON scheduled_transactions(transaction_type);

-- =====================================================
-- FUNÇÃO E TRIGGER: Auto-atualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para scheduled_transactions
CREATE TRIGGER update_scheduled_transactions_updated_at
    BEFORE UPDATE ON scheduled_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para description_category_mappings
CREATE TRIGGER update_mappings_updated_at
    BEFORE UPDATE ON description_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE users IS 'Usuários do sistema financeiro';
COMMENT ON TABLE banks IS 'Bancos/contas dos usuários';
COMMENT ON TABLE categories IS 'Categorias de transações';
COMMENT ON TABLE credit_cards IS 'Cartões de crédito dos usuários';
COMMENT ON TABLE transactions IS 'Transações financeiras (débito/crédito)';
COMMENT ON TABLE credit_card_transactions IS 'Transações de cartão de crédito';
COMMENT ON TABLE pending_users IS 'Usuários pendentes de aprovação';
COMMENT ON TABLE description_category_mappings IS 'Mapeamento automático descrição-categoria';
COMMENT ON TABLE scheduled_transactions IS 'Transações agendadas/parceladas';
