import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não está definida nas variáveis de ambiente');
}

const sql = neon(databaseUrl, { disableWarningInBrowsers: true });

async function query<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  const result = await sql.query(queryText, params);
  return result as T[];
}

export async function dbSelect<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  return await query<T>(queryText, params);
}

export async function dbSelectOne<T = any>(
  queryText: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] || null;
}

export async function dbInsert<T = any>(
  queryText: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] || null;
}

export async function dbInsertBatch(
  queryText: string,
  params: any[][]
): Promise<void> {
  for (const paramSet of params) {
    await query(queryText, paramSet);
  }
}

export async function dbExecute(
  queryText: string,
  params?: any[]
): Promise<void> {
  await query(queryText, params);
}

export async function dbCount(
  tableName: string,
  userId?: string
): Promise<number> {
  let queryText = `SELECT COUNT(*) as count FROM "${tableName}"`;
  const params: any[] = [];

  if (userId) {
    queryText += ' WHERE user_id = $1';
    params.push(userId);
  }

  const rows = await query<{ count: string }>(queryText, params);
  return parseInt(rows[0]?.count || '0');
}

export async function dbTableExists(tableName: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    ) as exists`,
    [tableName]
  );
  return Boolean(rows[0]?.exists);
}

export async function dbTestConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { sql };
