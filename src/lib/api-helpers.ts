import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não está definida');
}

const neonSql = neon(databaseUrl);

async function query<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  const result = await neonSql.query(queryText, params);
  return result as T[];
}

export async function apiQuery<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  return await query<T>(queryText, params);
}

export async function apiQueryOne<T = any>(
  queryText: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] || null;
}

export async function apiInsert<T = any>(
  queryText: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] || null;
}

export async function apiExecute(
  queryText: string,
  params?: any[]
): Promise<void> {
  await query(queryText, params);
}
