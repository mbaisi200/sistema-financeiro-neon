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

const TARGET_USER_ID = '3f53a3dd-670e-4ca3-97fc-55b1c485ec22';

const TABLES = [
  'banks',
  'categories',
  'credit_cards',
  'transactions',
  'credit_card_transactions',
  'description_category_mappings',
  'scheduled_transactions'
];

async function migrate() {
  const source = new Client(SUPABASE_CONFIG);
  const dest = new Client(NEON_CONFIG);

  try {
    await source.connect();
    console.log('Conectado ao Supabase');
    await dest.connect();
    console.log('Conectado ao Neon\n');

    const userIdsResult = await source.query('SELECT DISTINCT user_id FROM transactions');
    const userIds = userIdsResult.rows.map(r => r.user_id);
    console.log('User IDs no Supabase:', userIds);

    for (const table of TABLES) {
      let totalMigrated = 0;

      for (const srcUserId of userIds) {
        const result = await source.query(`SELECT * FROM "${table}" WHERE user_id = $1`, [srcUserId]);
        if (result.rows.length === 0) continue;

        const columns = Object.keys(result.rows[0]);
        const columnsStr = columns.map(c => `"${c}"`).join(', ');

        // Replace user_id in all rows
        for (const row of result.rows) {
          row['user_id'] = TARGET_USER_ID;
        }

        // Multi-row inserts in batches of 50
        const BATCH = 50;
        for (let i = 0; i < result.rows.length; i += BATCH) {
          const batch = result.rows.slice(i, i + BATCH);
          const allValues = [];
          const placeholders = [];
          let paramIdx = 1;

          for (const row of batch) {
            const rowPlaceholders = columns.map(() => `$${paramIdx++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            for (const col of columns) {
              allValues.push(row[col]);
            }
          }

          const query = `INSERT INTO "${table}" (${columnsStr}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`;
          try {
            await dest.query(query, allValues);
            totalMigrated += batch.length;
          } catch (e) {
            console.log(`  Erro batch ${table}: ${e.message.substring(0, 80)}`);
          }
        }
      }

      console.log(`${table}: ${totalMigrated} registros migrados`);
    }

    console.log('\n--- Verificacao ---');
    for (const table of TABLES) {
      const r = await dest.query(`SELECT COUNT(*) as c FROM "${table}" WHERE user_id = $1`, [TARGET_USER_ID]);
      console.log(`${table}: ${r.rows[0].c} registros`);
    }

    console.log('\nMigracao concluida!');

  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    await source.end();
    await dest.end();
  }
}

migrate();
