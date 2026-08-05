import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/server';
import { apiQuery, apiExecute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

const SOURCE_USER_ID = 'c40258bf-a068-466e-affe-64df023ce466';

export async function GET() {
  try {
    const targetUserId = await getUserId();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tables = [
      'banks',
      'categories',
      'credit_cards',
      'transactions',
      'credit_card_transactions',
      'description_category_mappings',
      'scheduled_transactions'
    ];

    const results: Record<string, number> = {};
    let total = 0;

    for (const table of tables) {
      const before = await apiQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1`,
        [SOURCE_USER_ID]
      );
      const count = parseInt(before[0]?.count || '0');

      if (count > 0) {
        await apiExecute(
          `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
          [targetUserId, SOURCE_USER_ID]
        );
      }

      results[table] = count;
      total += count;
    }

    return NextResponse.json({
      message: 'Migração concluída!',
      targetUserId,
      sourceUserId: SOURCE_USER_ID,
      migrated: results,
      totalMigrated: total
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
