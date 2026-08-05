const { Client } = require('pg');

const SUPABASE_CONFIG = {
  host: 'db.nqvlgvgxzfkskwwrshpj.supabase.co',
  database: 'postgres',
  user: 'postgres',
  password: 'Jutuvyb99@@',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

const NEON_CONFIG = {
  host: 'ep-jolly-band-axxfusty-pooler.c-4.us-east-2.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_8k4ePrahOwgu',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

const TABLES = [
  'users',
  'banks',
  'categories',
  'credit_cards',
  'transactions',
  'credit_card_transactions',
  'pending_users',
  'description_category_mappings',
  'scheduled_transactions'
];

async function migrate() {
  console.log('='.repeat(60));
  console.log('MIGRAÇÃO: Supabase → Neon Postgres');
  console.log('='.repeat(60));
  console.log(`Início: ${new Date().toLocaleString('pt-BR')}\n`);

  const source = new Client(SUPABASE_CONFIG);
  const dest = new Client(NEON_CONFIG);

  try {
    // Conectar
    console.log('1. Conectando aos bancos de dados...');
    await source.connect();
    console.log('✓ Conectado ao Supabase');
    await dest.connect();
    console.log('✓ Conectado ao Neon\n');

    // Exportar dados do Supabase
    console.log('2. Exportando dados do Supabase...');
    const exportedData = {};

    for (const table of TABLES) {
      try {
        const result = await source.query(`SELECT * FROM "${table}"`);
        exportedData[table] = result.rows;
        console.log(`  → ${table}: ${result.rows.length} registros encontrados`);
      } catch (e) {
        console.log(`  ⚠ ${table}: ${e.message}`);
      }
    }

    const totalExported = Object.values(exportedData).reduce((s, r) => s + r.length, 0);
    console.log(`\n✓ Total exportado: ${totalExported} registros\n`);

    // Importar dados no Neon
    console.log('3. Importando dados no Neon...');

    for (const table of TABLES) {
      const rows = exportedData[table];
      if (!rows || rows.length === 0) {
        console.log(`  → ${table}: Nenhum dado`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const columnsStr = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO "${table}" (${columnsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let inserted = 0;
      for (const row of rows) {
        const values = columns.map(c => row[c]);
        try {
          await dest.query(insertQuery, values);
          inserted++;
        } catch (e) {
          // Ignorar erros individuais
        }
      }
      console.log(`  ✓ ${table}: ${inserted}/${rows.length} registros importados`);
    }

    // Verificar importação
    console.log('\n4. Verificando importação...');
    for (const table of TABLES) {
      try {
        const result = await dest.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`  → ${table}: ${result.rows[0].count} registros`);
      } catch (e) {
        console.log(`  → ${table}: não verificável`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));

  } catch (e) {
    console.error(`\n✗ ERRO: ${e.message}`);
  } finally {
    await source.end();
    await dest.end();
    console.log('\nConexões fechadas.');
  }
}

migrate();
