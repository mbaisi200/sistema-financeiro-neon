import { NextRequest, NextResponse } from 'next/server';
import { apiQueryOne, apiExecute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, neonAuthUserId } = await request.json();

    if (!email || !neonAuthUserId) {
      return NextResponse.json({ error: 'email e neonAuthUserId são obrigatórios.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await apiQueryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (!existingUser) {
      await apiExecute(
        'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [neonAuthUserId, normalizedEmail]
      );
    } else if (existingUser.id !== neonAuthUserId) {
      const oldId = existingUser.id;

      await apiExecute('UPDATE transactions SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE credit_card_transactions SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE credit_cards SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE categories SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE banks SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE scheduled_transactions SET user_id = $1 WHERE user_id = $2', [neonAuthUserId, oldId]);
      await apiExecute('UPDATE users SET id = $1 WHERE id = $2', [neonAuthUserId, oldId]);
    }

    return NextResponse.json({ success: true, message: 'Dados associados com sucesso!' });
  } catch (error: any) {
    console.error('[LINK-USER] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro ao associar dados.' }, { status: 500 });
  }
}
