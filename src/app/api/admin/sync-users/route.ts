import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS, DEFAULT_BANKS, DEFAULT_CATEGORIES } from '@/lib/types';
import { apiQuery, apiInsert } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[SYNC] Iniciando sincronização...');

    const { adminEmail } = await request.json();

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      console.error('[SYNC] Não autorizado:', adminEmail);
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    console.log('[SYNC] Admin verificado:', adminEmail);

    const tableUsers = await apiQuery('SELECT id, email FROM users');
    const tableUserIds = new Set(tableUsers.map(u => u.id));
    console.log(`[SYNC] Encontrados ${tableUsers.length} usuários na tabela users`);

    const syncedUsers: string[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const tableUser of tableUsers) {
      if (!tableUserIds.has(tableUser.id)) {
        console.log(`[SYNC] Sincronizando usuário: ${tableUser.email} (${tableUser.id})`);

        try {
          await apiInsert(
            'INSERT INTO users (id, email, created_by, expires_at) VALUES ($1, $2, $3, $4)',
            [tableUser.id, tableUser.email, adminEmail, null]
          );

          syncedUsers.push(tableUser.email || '');
          console.log(`[SYNC] Usuário ${tableUser.email} inserido com sucesso`);

          for (const bank of Object.values(DEFAULT_BANKS)) {
            await apiInsert(
              'INSERT INTO banks (user_id, name, icon, initial_balance) VALUES ($1, $2, $3, $4)',
              [tableUser.id, bank.name, bank.icon, bank.initialBalance]
            );
          }

          for (const cat of Object.values(DEFAULT_CATEGORIES)) {
            await apiInsert(
              'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3)',
              [tableUser.id, cat.name, cat.icon]
            );
          }
          console.log(`[SYNC] Dados padrão criados para ${tableUser.email}`);
        } catch (dataError) {
          console.error(`[SYNC] Erro ao criar dados padrão:`, dataError);
          errors.push({ email: tableUser.email || '', error: dataError instanceof Error ? dataError.message : 'Erro desconhecido' });
        }
      }
    }

    console.log(`[SYNC] Sincronização concluída. Sincronizados: ${syncedUsers.length}, Erros: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída!`,
      tableUsers: tableUsers.length,
      synced: syncedUsers.length,
      syncedUsers,
      errors
    });

  } catch (error) {
    console.error('[SYNC] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}