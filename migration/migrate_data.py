#!/usr/bin/env python3
"""
Script de Migração: Supabase → Neon Postgres
Executa no terminal: python3 migrate_data.py
"""

import psycopg2
import json
from datetime import datetime

# =====================================================
# CONFIGURAÇÕES - PREENCHA COM SEUS DADOS
# =====================================================

# Conexão com Supabase (origem)
SUPABASE_CONFIG = {
    'host': 'db.nqvlgvgxzfkskwwrshpj.supabase.co',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'Jutuvyb99@@',
    'port': 5432,
    'sslmode': 'require'
}

# Conexão com Neon (destino)
NEON_CONFIG = {
    'host': 'ep-jolly-band-axxfusty-pooler.c-4.us-east-2.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_8k4ePrahOwgu',
    'port': 5432,
    'sslmode': 'require'
}

# Tabelas para migrar (na ordem correta para dependências)
TABLES_TO_MIGRATE = [
    'users',
    'banks',
    'categories',
    'credit_cards',
    'transactions',
    'credit_card_transactions',
    'pending_users',
    'description_category_mappings',
    'scheduled_transactions'
]

# =====================================================
# FUNÇÕES DE MIGRAÇÃO
# =====================================================

def get_connection(config):
    """Estabelece conexão com o banco de dados"""
    try:
        conn = psycopg2.connect(**config)
        print(f"✓ Conectado: {config['host']}")
        return conn
    except Exception as e:
        print(f"✗ Erro ao conectar: {e}")
        raise

def export_table_data(cursor, table_name):
    """Exporta todos os dados de uma tabela"""
    try:
        cursor.execute(f'SELECT * FROM "{table_name}"')
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        print(f"  → {table_name}: {len(rows)} registros encontrados")
        return {
            'columns': columns,
            'rows': rows,
            'count': len(rows)
        }
    except Exception as e:
        print(f"  ✗ Erro ao exportar {table_name}: {e}")
        return None

def import_table_data(cursor, table_name, data):
    """Importa dados para uma tabela"""
    if not data or data['count'] == 0:
        print(f"  → {table_name}: Nenhum dado para importar")
        return
    
    columns = data['columns']
    rows = data['rows']
    
    # Construir query de insert
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join([f'"{col}"' for col in columns])
    insert_query = f'INSERT INTO "{table_name}" ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
    
    try:
        # Inserir em batches de 1000
        batch_size = 1000
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            cursor.executemany(insert_query, batch)
            print(f"  → {table_name}: Inseridos {len(batch)} registros (batch {i // batch_size + 1})")
        
        print(f"  ✓ {table_name}: {len(rows)} registros importados com sucesso!")
    except Exception as e:
        print(f"  ✗ Erro ao importar {table_name}: {e}")
        raise

def migrate():
    """Função principal de migração"""
    print("=" * 60)
    print("MIGRAÇÃO: Supabase → Neon Postgres")
    print("=" * 60)
    print(f"Início: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Conectar aos bancos
    print("1. Conectando aos bancos de dados...")
    source_conn = get_connection(SUPABASE_CONFIG)
    dest_conn = get_connection(NEON_CONFIG)
    
    source_cursor = source_conn.cursor()
    dest_cursor = dest_conn.cursor()
    
    try:
        # Exportar dados do Supabase
        print("\n2. Exportando dados do Supabase...")
        exported_data = {}
        
        for table in TABLES_TO_MIGRATE:
            data = export_table_data(source_cursor, table)
            if data:
                exported_data[table] = data
        
        print(f"\n✓ Total de tabelas exportadas: {len(exported_data)}")
        
        # Importar dados no Neon
        print("\n3. Importando dados no Neon...")
        
        for table in TABLES_TO_MIGRATE:
            if table in exported_data:
                import_table_data(dest_cursor, table, exported_data[table])
                dest_conn.commit()
        
        # Verificar importação
        print("\n4. Verificando importação...")
        for table in TABLES_TO_MIGRATE:
            dest_cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
            count = dest_cursor.fetchone()[0]
            print(f"  → {table}: {count} registros")
        
        print("\n" + "=" * 60)
        print("✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ ERRO DURANTE A MIGRAÇÃO: {e}")
        source_conn.rollback()
        dest_conn.rollback()
        raise
    finally:
        source_cursor.close()
        dest_cursor.close()
        source_conn.close()
        dest_conn.close()
        print("\nConexões fechadas.")

# =====================================================
# PONTO DE ENTRADA
# =====================================================

if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════════════════╗
║  SCRIPT DE MIGRAÇÃO SUPABASE → NEON POSTGRES        ║
╚══════════════════════════════════════════════════════╝
""")
    
    migrate()
