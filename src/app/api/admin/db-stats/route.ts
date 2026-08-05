import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';
import { apiQuery, apiQueryOne } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

const ROW_SIZE_ESTIMATES: Record<string, number> = {
  banks: 150,
  categories: 200,
  credit_cards: 250,
  transactions: 400,
  credit_card_transactions: 350,
  scheduled_transactions: 500
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');
    const clientEmail = searchParams.get('clientEmail');

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const tables = ['banks', 'categories', 'credit_cards', 'transactions', 'credit_card_transactions', 'scheduled_transactions'];

    let stats: { clientEmail: string; clientId: string; stats: Record<string, number>; total: number; sizeMB: number }[] = [];
    let totalStats: Record<string, number> = {};
    let totalSizeMB = 0;

    if (clientEmail) {
      const userData = await apiQueryOne('SELECT id, email FROM users WHERE email = $1', [clientEmail]);

      if (!userData) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }

      const clientStats: Record<string, number> = {};
      let clientTotal = 0;
      let clientSizeBytes = 0;

      for (const table of tables) {
        try {
          const countResult = await apiQueryOne(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1`, [userData.id]);
          clientStats[table] = parseInt(countResult?.count || '0', 10);
          clientSizeBytes += clientStats[table] * ROW_SIZE_ESTIMATES[table];
        } catch (error) {
          console.error(`[DB-STATS] Erro ao contar ${table}:`, error);
          clientStats[table] = 0;
        }
        clientTotal += clientStats[table];
      }

      stats = [{ clientEmail: userData.email, clientId: userData.id, stats: clientStats, total: clientTotal, sizeMB: parseFloat((clientSizeBytes / (1024 * 1024)).toFixed(2)) }];
      totalStats = clientStats;
      totalSizeMB = stats[0].sizeMB;
    } else {
      const users = await apiQuery('SELECT id, email FROM users ORDER BY email');

      for (const table of tables) {
        totalStats[table] = 0;
      }

      for (const u of users) {
        const clientStats: Record<string, number> = {};
        let clientTotal = 0;
        let clientSizeBytes = 0;

        for (const table of tables) {
          try {
            const countResult = await apiQueryOne(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1`, [u.id]);
            clientStats[table] = parseInt(countResult?.count || '0', 10);
            clientSizeBytes += clientStats[table] * ROW_SIZE_ESTIMATES[table];
          } catch (error) {
            console.error(`[DB-STATS] Erro ao contar ${table}:`, error);
            clientStats[table] = 0;
          }
          clientTotal += clientStats[table];
          totalStats[table] = (totalStats[table] || 0) + clientStats[table];
        }

        const sizeMB = parseFloat((clientSizeBytes / (1024 * 1024)).toFixed(2));
        stats.push({ clientEmail: u.email, clientId: u.id, stats: clientStats, total: clientTotal, sizeMB });
        totalSizeMB += sizeMB;
      }

      stats.sort((a, b) => a.clientEmail.localeCompare(b.clientEmail));
    }

    const response = NextResponse.json({
      stats,
      totalStats,
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      tables,
      clientEmail: clientEmail || null
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('[DB-STATS] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}