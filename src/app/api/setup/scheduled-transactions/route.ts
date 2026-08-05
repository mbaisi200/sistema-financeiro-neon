import { NextRequest, NextResponse } from 'next/server';
import { apiQuery, apiExecute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// POST - Criar tabela scheduled_transactions se não existir
export async function POST(request: NextRequest) {
  try {
    // Verificar se a tabela já existe
    const existing = await apiQuery(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheduled_transactions'
      ) as exists`
    );

    if (existing[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: 'Tabela scheduled_transactions já existe.',
        exists: true
      });
    }

    // Criar a tabela
    await apiExecute(`
      CREATE TABLE IF NOT EXISTS scheduled_transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('parcel', 'recurring', 'single')),
        value DECIMAL(10,2) NOT NULL,
        total_installments INTEGER DEFAULT 1,
        current_installment INTEGER DEFAULT 1,
        due_date DATE NOT NULL,
        category TEXT,
        bank TEXT,
        card TEXT,
        is_paid BOOLEAN DEFAULT FALSE,
        auto_confirm BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Criar índices
    await apiExecute('CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_user_id ON scheduled_transactions(user_id)');
    await apiExecute('CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_due_date ON scheduled_transactions(due_date)');
    await apiExecute('CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_status ON scheduled_transactions(status)');

    return NextResponse.json({
      success: true,
      message: 'Tabela scheduled_transactions criada com sucesso!',
      exists: false
    });

  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    return NextResponse.json({
      error: 'Erro ao criar tabela: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}

// GET - Verificar se a tabela existe
export async function GET(request: NextRequest) {
  try {
    const result = await apiQuery(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheduled_transactions'
      ) as exists`
    );

    return NextResponse.json({
      exists: result[0]?.exists || false
    });

  } catch (error) {
    return NextResponse.json({
      exists: false,
      error: 'Erro ao verificar tabela'
    });
  }
}
