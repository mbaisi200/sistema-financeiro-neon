import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não está definida nas variáveis de ambiente');
}

const neonSql = neon(databaseUrl);

async function runQuery<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  const result = await neonSql.query(queryText, params);
  return result as T[];
}

export async function query<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  try {
    return await runQuery<T>(queryText, params);
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
}

export async function insert<T = any>(
  queryText: string,
  params?: any[]
): Promise<T> {
  try {
    const rows = await runQuery<T>(queryText, params);
    return rows as T;
  } catch (error) {
    console.error('Erro no insert:', error);
    throw error;
  }
}

export async function count(tableName: string, userId?: string): Promise<number> {
  try {
    let queryText = `SELECT COUNT(*) as count FROM "${tableName}"`;
    const params: any[] = [];
    
    if (userId) {
      queryText += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    const rows = await runQuery<{ count: string }>(queryText, params);
    return parseInt(rows[0]?.count || '0');
  } catch (error) {
    console.error('Erro ao contar registros:', error);
    return 0;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await runQuery('SELECT 1');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com Neon:', error);
    return false;
  }
}
