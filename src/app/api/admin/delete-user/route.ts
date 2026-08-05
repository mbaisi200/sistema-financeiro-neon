import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';
import { apiExecute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { uid, email, adminEmail } = await request.json();

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    if (adminEmailsLower.includes((email || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não é possível excluir um administrador.' }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID é obrigatório.' }, { status: 400 });
    }

    console.log(`[DELETE USER] Iniciando exclusão do usuário: ${email} (${uid})`);

    await apiExecute('DELETE FROM transactions WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Transações excluídas');

    await apiExecute('DELETE FROM credit_card_transactions WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Transações de cartão excluídas');

    await apiExecute('DELETE FROM credit_cards WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Cartões excluídos');

    await apiExecute('DELETE FROM categories WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Categorias excluídas');

    await apiExecute('DELETE FROM banks WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Bancos excluídos');

    await apiExecute('DELETE FROM scheduled_transactions WHERE user_id = $1', [uid]);
    console.log('[DELETE USER] Transações agendadas excluídas');

    await apiExecute('DELETE FROM pending_users WHERE email = $1', [email]);
    console.log('[DELETE USER] Pending users excluídos');

    await apiExecute('DELETE FROM users WHERE id = $1', [uid]);
    console.log('[DELETE USER] Registro de usuário excluído');

    console.log(`[DELETE USER] Usuário ${email} excluído com sucesso!`);

    return NextResponse.json({
      success: true,
      message: `Usuário ${email} excluído com sucesso! Todos os dados foram removidos.`
    });

  } catch (error) {
    console.error('[DELETE USER] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}