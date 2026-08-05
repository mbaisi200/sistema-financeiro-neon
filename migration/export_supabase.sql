-- =====================================================
-- SCRIPT DE EXPORTAÇÃO DO SUPABASE
-- Execute no SQL Editor do Supabase para verificar dados
-- =====================================================

-- Contar registros em cada tabela
SELECT 'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'banks', COUNT(*) FROM banks
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'credit_cards', COUNT(*) FROM credit_cards
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'credit_card_transactions', COUNT(*) FROM credit_card_transactions
UNION ALL
SELECT 'pending_users', COUNT(*) FROM pending_users
UNION ALL
SELECT 'description_category_mappings', COUNT(*) FROM description_category_mappings
UNION ALL
SELECT 'scheduled_transactions', COUNT(*) FROM scheduled_transactions;

-- =====================================================
-- EXPORTAR DADOS (execute cada um e baixe o CSV)
-- =====================================================

-- Exportar users
SELECT * FROM users ORDER BY created_at;

-- Exportar banks
SELECT * FROM banks ORDER BY created_at;

-- Exportar categories
SELECT * FROM categories ORDER BY created_at;

-- Exportar credit_cards
SELECT * FROM credit_cards ORDER BY created_at;

-- Exportar transactions
SELECT * FROM transactions ORDER BY date DESC;

-- Exportar credit_card_transactions
SELECT * FROM credit_card_transactions ORDER BY date DESC;

-- Exportar pending_users
SELECT * FROM pending_users ORDER BY created_at;

-- Exportar description_category_mappings
SELECT * FROM description_category_mappings ORDER BY usage_count DESC;

-- Exportar scheduled_transactions
SELECT * FROM scheduled_transactions ORDER BY due_date;

-- =====================================================
-- VERIFICAR ESTRUTURA DAS TABELAS
-- =====================================================

-- Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Ver colunas de uma tabela específica (substitua 'users')
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
