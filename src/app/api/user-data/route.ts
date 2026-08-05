import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/server';
import { apiQuery } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    const banks = await apiQuery('SELECT id, name, icon, initial_balance FROM banks WHERE user_id = $1', [userId]);
    const categories = await apiQuery('SELECT id, name, icon FROM categories WHERE user_id = $1', [userId]);
    const creditCards = await apiQuery('SELECT id, name, bank, credit_limit, icon FROM credit_cards WHERE user_id = $1', [userId]);
    const transactions = await apiQuery('SELECT id, date, description, bank, type, category, value FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const creditCardTransactions = await apiQuery('SELECT id, date, description, card, category, value, is_payment, invoice_month FROM credit_card_transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const scheduledTransactions = await apiQuery('SELECT * FROM scheduled_transactions WHERE user_id = $1 ORDER BY due_date ASC', [userId]).catch(() => []);
    const descriptionMappings = await apiQuery('SELECT * FROM description_category_mappings WHERE user_id = $1', [userId]).catch(() => []);

    return NextResponse.json({
      userId,
      banks,
      categories,
      creditCards,
      transactions,
      creditCardTransactions,
      scheduledTransactions,
      descriptionMappings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
