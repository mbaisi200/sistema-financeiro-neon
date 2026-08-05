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

async function migrateBatch(source, dest, table, rows) {
  if (rows.length === 0) {
    console.log(`  → ${table}: Nenhum dado`);
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const columnsStr = columns.map(c => `"${c}"`).join(', ');
  const BATCH_SIZE = 200;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    // Build multi-row INSERT
    const valueRows = [];
    const params = [];
    let paramIndex = 1;
    
    for (const row of batch) {
      const placeholders = columns.map(() => `$${paramIndex++}`).join(', ');
      valueRows.push(`(${placeholders})`);
      columns.forEach(c => params.push(row[c]));
    }
    
    const query = `INSERT INTO "${table}" (${columnsStr}) VALUES ${valueRows.join(', ')} ON CONFLICT DO NOTHING`;
    
    try {
      await dest.query(query, params);
      totalInserted += batch.length;
    } catch (e) {
      // Try one by one for failed batch
      for (const row of batch) {
        try {
          const vals = columns.map(c => row[c]);
          const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
          await dest.query(`INSERT INTO "${table}" (${columnsStr}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
          totalInserted++;
        } catch (e2) {
          // skip
        }
      }
    }
  }
  
  return totalInserted;
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('MIGRAÇÃO: Supabase → Neon Postgres');
  console.log('='.repeat(60));
  console.log(`Início: ${new Date().toLocaleString('pt-BR')}\n`);

  const source = new Client(SUPABASE_CONFIG);
  const dest = new Client(NEON_CONFIG);

  try {
    console.log('1. Conectando...');
    await source.connect();
    console.log('✓ Supabase conectado');
    await dest.connect();
    console.log('✓ Neon conectado\n');

    // Exportar
    console.log('2. Exportando do Supabase...');
    const exportedData = {};
    for (const table of TABLES) {
      try {
        const result = await source.query(`SELECT * FROM "${table}"`);
        exportedData[table] = result.rows;
        console.log(`  → ${table}: ${result.rows.length}`);
      } catch (e) {
        console.log(`  ⚠ ${table}: ${e.message}`);
        exportedData[table] = [];
      }
    }

    // Importar
    console.log('\n3. Importando no Neon...');
    for (const table of TABLES) {
      const count = await migrateBatch(source, dest, table, exportedData[table] || []);
      const total = (exportedData[table] || []).length;
      console.log(`  ✓ ${table}: ${count}/${total}`);
    }

    // Verificar
    console.log('\n4. Verificação final...');
    for (const table of TABLES) {
      try {
        const r = await dest.query(`SELECT COUNT(*) as c FROM "${table}"`);
        console.log(`  → ${table}: ${r.rows[0].c} registros`);
      } catch (e) {
        console.log(`  → ${table}: ${e.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ MIGRAÇÃO CONCLUÍDA!');
    console.log('='.repeat(60));

  } catch (e) {
    console.error(`\n✗ ERRO: ${e.message}`);
  } finally {
    await source.end();
    await dest.end();
  }
}

migrate();
