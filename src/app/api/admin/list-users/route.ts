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

    const users = await apiQuery('SELECT * FROM users ORDER BY created_at DESC');

    const pendingUsers = await apiQuery('SELECT * FROM pending_users');

    console.log('[LIST-USERS] Retornando', users.length, 'usuários');

    const usersWithAdmin = users.map(u => ({
      ...u,
      is_admin: adminEmailsLower.includes((u.email || '').toLowerCase())
    }));

    const response = NextResponse.json({
      users: usersWithAdmin,
      pendingUsers: pendingUsers || [],
      _timestamp: new Date().toISOString()
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('[LIST-USERS] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}