import { NextRequest, NextResponse } from 'next/server';
import { apiQuery, apiExecute } from '@/lib/api-helpers';
import { getUserId } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

// GET - Exportar backup
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'user_id é obrigatório.' }, { status: 400 });
    }

    if (targetUserId !== userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [banks, categories, creditCards, transactions, creditCardTransactions] = await Promise.all([
      apiQuery('SELECT * FROM banks WHERE user_id = $1', [userId]),
      apiQuery('SELECT * FROM categories WHERE user_id = $1', [userId]),
      apiQuery('SELECT * FROM credit_cards WHERE user_id = $1', [userId]),
      apiQuery('SELECT * FROM transactions WHERE user_id = $1', [userId]),
      apiQuery('SELECT * FROM credit_card_transactions WHERE user_id = $1', [userId])
    ]);

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      userId: userId,
      data: {
        banks,
        categories,
        creditCards,
        transactions,
        creditCardTransactions
      },
      stats: {
        banks: banks.length,
        categories: categories.length,
        creditCards: creditCards.length,
        transactions: transactions.length,
        creditCardTransactions: creditCardTransactions.length
      }
    };

    return NextResponse.json(backup);

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    return NextResponse.json({
      error: 'Erro ao criar backup: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}

// POST - Restaurar backup
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { data, mode = 'merge' } = body;

    if (!data) {
      return NextResponse.json({ error: 'data é obrigatório.' }, { status: 400 });
    }

    const results = {
      banks: { inserted: 0, errors: [] as string[] },
      categories: { inserted: 0, errors: [] as string[] },
      creditCards: { inserted: 0, errors: [] as string[] },
      transactions: { inserted: 0, errors: [] as string[] },
      creditCardTransactions: { inserted: 0, errors: [] as string[] }
    };

    // Se modo 'replace', excluir dados existentes primeiro
    if (mode === 'replace') {
      await apiExecute('DELETE FROM credit_card_transactions WHERE user_id = $1', [userId]);
      await apiExecute('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await apiExecute('DELETE FROM credit_cards WHERE user_id = $1', [userId]);
      await apiExecute('DELETE FROM categories WHERE user_id = $1', [userId]);
      await apiExecute('DELETE FROM banks WHERE user_id = $1', [userId]);
    }

    // Inserir bancos
    if (data.banks && data.banks.length > 0) {
      for (const bank of data.banks) {
        try {
          await apiExecute(
            'INSERT INTO banks (user_id, name, icon, initial_balance) VALUES ($1, $2, $3, $4)',
            [userId, bank.name, bank.icon || '🏦', bank.initial_balance || 0]
          );
          results.banks.inserted++;
        } catch (error) {
          results.banks.errors.push(`Banco "${bank.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    // Inserir categorias
    if (data.categories && data.categories.length > 0) {
      for (const cat of data.categories) {
        try {
          await apiExecute(
            'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3)',
            [userId, cat.name, cat.icon || '📦']
          );
          results.categories.inserted++;
        } catch (error) {
          results.categories.errors.push(`Categoria "${cat.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    // Inserir cartões de crédito
    if (data.creditCards && data.creditCards.length > 0) {
      for (const card of data.creditCards) {
        try {
          await apiExecute(
            'INSERT INTO credit_cards (user_id, name, bank, credit_limit, icon) VALUES ($1, $2, $3, $4, $5)',
            [userId, card.name, card.bank || null, card.credit_limit || 0, card.icon || '💳']
          );
          results.creditCards.inserted++;
        } catch (error) {
          results.creditCards.errors.push(`Cartão "${card.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    // Inserir transações
    if (data.transactions && data.transactions.length > 0) {
      for (const trans of data.transactions) {
        try {
          await apiExecute(
            'INSERT INTO transactions (user_id, date, description, bank, type, category, value) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, trans.date, trans.description, trans.bank, trans.type, trans.category, trans.value]
          );
          results.transactions.inserted++;
        } catch (error) {
          results.transactions.errors.push(`Transação "${trans.description}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    // Inserir transações de cartão
    if (data.creditCardTransactions && data.creditCardTransactions.length > 0) {
      for (const trans of data.creditCardTransactions) {
        try {
          await apiExecute(
            'INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, trans.date, trans.description, trans.card, trans.category, trans.value, trans.is_payment || false]
          );
          results.creditCardTransactions.inserted++;
        } catch (error) {
          results.creditCardTransactions.errors.push(`Transação cartão "${trans.description}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
      results
    });

  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return NextResponse.json({
      error: 'Erro ao restaurar backup: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
