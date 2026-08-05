import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS, DEFAULT_BANKS, DEFAULT_CATEGORIES } from '@/lib/types';
import { apiQueryOne, apiInsert, apiExecute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

interface CreateUserData {
  email: string;
  password: string;
  adminEmail: string;
  expiresAt?: string;
  operation?: 'create' | 'update';
  uid?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, adminEmail, expiresAt, operation = 'create', uid }: CreateUserData = await request.json();

    // Verify admin
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json(
        { error: 'Não autorizado. Apenas administradores podem realizar esta ação.' },
        { status: 403 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (operation === 'create') {
      // Verificar se o usuário já existe
      const existingUser = await apiQueryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (existingUser) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado no sistema.' },
          { status: 400 }
        );
      }

      // NOTA: Com Clerk, a criação do usuário é feita pelo Clerk
      // Aqui apenas criamos o registro na tabela users
      // O uid deve ser fornecido pelo Clerk após a criação

      return NextResponse.json({
        success: true,
        message: 'Use o Clerk para criar o usuário. Esta API é apenas para gerenciar dados.',
        note: 'O Clerk cuida da autenticação. Use o painel do Clerk para criar usuários.'
      });

    } else if (operation === 'update') {
      if (!uid) {
        return NextResponse.json(
          { error: 'UID é obrigatório para atualização.' },
          { status: 400 }
        );
      }

      // Verificar se o usuário existe
      const existingUser = await apiQueryOne<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [uid]
      );

      if (!existingUser) {
        // Criar registro se não existir
        await apiInsert(
          'INSERT INTO users (id, email, expires_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [uid, normalizedEmail, expiresAt || null]
        );
      } else {
        // Atualizar dados
        await apiExecute(
          'UPDATE users SET expires_at = $1 WHERE id = $2',
          [expiresAt || null, uid]
        );
      }

      return NextResponse.json({
        success: true,
        uid,
        email: normalizedEmail,
        message: 'Usuário atualizado com sucesso!'
      });
    }

    return NextResponse.json({ error: 'Operação inválida.' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const adminEmail = searchParams.get('adminEmail');

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID é obrigatório.' }, { status: 400 });
    }

    const userData = await apiQueryOne(
      'SELECT * FROM users WHERE id = $1',
      [uid]
    );

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      uid,
      ...userData
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
