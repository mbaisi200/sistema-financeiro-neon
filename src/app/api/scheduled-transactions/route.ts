import { NextRequest, NextResponse } from 'next/server';
import { toUpperCase } from '@/lib/types';
import { apiQuery, apiInsert, apiExecute } from '@/lib/api-helpers';
import { getUserId } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

// Listar lançamentos futuros
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await apiQuery(
      'SELECT * FROM scheduled_transactions WHERE user_id = $1 AND status = $2 ORDER BY due_date ASC',
      [userId, 'pending']
    );

    return NextResponse.json({
      scheduledTransactions: data.map((item: any) => ({
        id: item.id,
        description: item.description,
        type: item.type,
        value: parseFloat(item.value) || 0,
        totalInstallments: item.total_installments || 1,
        currentInstallment: item.current_installment || 1,
        dueDate: item.due_date,
        category: item.category,
        bank: item.bank,
        card: item.card,
        isPaid: item.is_paid || false,
        autoConfirm: item.auto_confirm || false,
        status: item.status
      }))
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Criar lançamento futuro
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      description,
      type,
      value,
      totalInstallments,
      dueDate,
      category,
      bank,
      card,
      autoConfirm
    } = body;

    if (!description || !dueDate || !value) {
      return NextResponse.json({ error: 'Descrição, data e valor são obrigatórios' }, { status: 400 });
    }

    const installments = type === 'parcel' ? (totalInstallments || 1) : 1;
    const createdItems = [];

    for (let i = 0; i < installments; i++) {
      const dueDateObj = new Date(dueDate);
      dueDateObj.setMonth(dueDateObj.getMonth() + i);
      const calculatedDueDate = dueDateObj.toISOString().split('T')[0];

      const data = await apiInsert(
        `INSERT INTO scheduled_transactions (user_id, description, type, transaction_type, value, total_installments, current_installment, due_date, category, bank, card, auto_confirm, status, is_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', false)
         RETURNING *`,
        [
          userId,
          toUpperCase(description) + (installments > 1 ? ` (${i + 1}/${installments})` : ''),
          type || 'single',
          'debit',
          value,
          installments,
          i + 1,
          calculatedDueDate,
          category || null,
          bank || null,
          card || null,
          autoConfirm || false
        ]
      );

      if (data) createdItems.push(data);
    }

    return NextResponse.json({
      success: true,
      message: `${createdItems.length} lançamento(s) criado(s)`,
      items: createdItems
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Atualizar lançamento
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.description !== undefined) { updateFields.push(`description = $${paramIndex++}`); values.push(toUpperCase(updates.description)); }
    if (updates.value !== undefined) { updateFields.push(`value = $${paramIndex++}`); values.push(updates.value); }
    if (updates.dueDate !== undefined) { updateFields.push(`due_date = $${paramIndex++}`); values.push(updates.dueDate); }
    if (updates.category !== undefined) { updateFields.push(`category = $${paramIndex++}`); values.push(updates.category); }
    if (updates.bank !== undefined) { updateFields.push(`bank = $${paramIndex++}`); values.push(updates.bank); }
    if (updates.card !== undefined) { updateFields.push(`card = $${paramIndex++}`); values.push(updates.card); }
    if (updates.autoConfirm !== undefined) { updateFields.push(`auto_confirm = $${paramIndex++}`); values.push(updates.autoConfirm); }
    if (updates.status !== undefined) { updateFields.push(`status = $${paramIndex++}`); values.push(updates.status); }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }

    values.push(id);
    values.push(userId);

    await apiExecute(
      `UPDATE scheduled_transactions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      values
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Excluir lançamento
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await apiExecute(
      'DELETE FROM scheduled_transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
