import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';
import { apiQuery } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const tableUsers = await apiQuery('SELECT id, email, created_at, expires_at FROM users ORDER BY created_at DESC');

    return NextResponse.json({
      table: {
        count: tableUsers.length,
        error: null,
        users: tableUsers.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          expires_at: u.expires_at
        }))
      }
    });

  } catch (error) {
    console.error('[DEBUG] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}