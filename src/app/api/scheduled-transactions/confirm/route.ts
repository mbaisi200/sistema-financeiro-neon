import { NextRequest, NextResponse } from 'next/server';
import { toUpperCase } from '@/lib/types';
import { apiQueryOne, apiExecute } from '@/lib/api-helpers';
import { getUserId } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

// Confirmar lançamento futuro e criar transação
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      scheduledId,
      confirmedValue,
      confirmedDate,
      confirmedDescription
    } = body;

    if (!scheduledId) {
      return NextResponse.json({ error: 'ID do lançamento é obrigatório' }, { status: 400 });
    }

    // Buscar lançamento agendado
    const scheduled = await apiQueryOne(
      'SELECT * FROM scheduled_transactions WHERE id = $1 AND user_id = $2',
      [scheduledId, userId]
    );

    if (!scheduled) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }

    const value = confirmedValue || scheduled.value;
    const date = confirmedDate || scheduled.due_date;
    const description = confirmedDescription || scheduled.description;

    // Criar transação
    if (scheduled.card) {
      // Transação de cartão de crédito
      await apiExecute(
        `INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [userId, date, toUpperCase(description), scheduled.card, scheduled.category, value]
      );
    } else if (scheduled.bank) {
      // Transação bancária
      await apiExecute(
        `INSERT INTO transactions (user_id, date, description, bank, type, category, value)
         VALUES ($1, $2, $3, $4, 'debit', $5, $6)`,
        [userId, date, toUpperCase(description), scheduled.bank, scheduled.category, value]
      );
    } else {
      return NextResponse.json({ error: 'Lançamento sem banco ou cartão definido' }, { status: 400 });
    }

    // Atualizar status do lançamento agendado
    await apiExecute(
      'UPDATE scheduled_transactions SET status = $1, is_paid = $2 WHERE id = $3',
      ['confirmed', true, scheduledId]
    );

    // Se for recorrente, criar próximo lançamento
    if (scheduled.type === 'recurring') {
      const nextDueDate = new Date(scheduled.due_date);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      await apiExecute(
        `INSERT INTO scheduled_transactions (user_id, description, type, value, total_installments, current_installment, due_date, category, bank, card, auto_confirm, status, is_paid)
         VALUES ($1, $2, 'recurring', $3, 999, $4, $5, $6, $7, $8, $9, 'pending', false)`,
        [
          userId,
          scheduled.description.replace(/\(\d+\/\d+\)/, '').trim(),
          scheduled.value,
          scheduled.current_installment + 1,
          nextDueDate.toISOString().split('T')[0],
          scheduled.category,
          scheduled.bank,
          scheduled.card,
          scheduled.auto_confirm
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lançamento confirmado com sucesso!',
      transactionCreated: true
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
