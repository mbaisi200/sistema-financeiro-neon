'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { authClient } from '@/lib/auth/client';
import { dbSelectOne, dbInsert, dbExecute } from '@/lib/db-helpers';
import { Bank, Category, CreditCard, Transaction, CreditCardTransaction, ScheduledTransaction, DEFAULT_BANKS, DEFAULT_CATEGORIES, ADMIN_EMAILS } from '@/lib/types';

export interface DescriptionMapping {
  description: string;
  categoryId: string;
  usageCount: number;
}

interface AuthUser {
  id: string;
  email: string;
}

interface FinanceContextType {
   user: AuthUser | null;
   loading: boolean;
   isOnline: boolean;
   isExpired: boolean;
   expiresAt: string | null;
   banks: Bank[];
   categories: Category[];
   creditCards: CreditCard[];
   transactions: Transaction[];
   creditCardTransactions: CreditCardTransaction[];
   scheduledTransactions: ScheduledTransaction[];
   scheduledTransactionsTableExists: boolean;
   descriptionMappings: Map<string, string>;
   descriptionMappingsTableExists: boolean;
   login: (email: string, password: string) => Promise<void>;
   register: (email: string, password: string) => Promise<void>;
   logout: () => Promise<void>;
   changePassword: (newPassword: string) => Promise<void>;
   addBank: (bank: Omit<Bank, 'id'>) => Promise<void>;
   updateBank: (id: string, bank: Partial<Bank>) => Promise<void>;
   deleteBank: (id: string) => Promise<void>;
   getBankBalance: (bankId: string) => number;
   addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
   updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
   deleteCategory: (id: string) => Promise<void>;
   addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
   updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
   deleteCreditCard: (id: string) => Promise<void>;
   getCardInvoice: (cardId: string) => number;
   getCardTotalDebt: (cardId: string) => number;
   addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
   updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
   deleteTransaction: (id: string) => Promise<void>;
    addCreditCardTransaction: (transaction: Omit<CreditCardTransaction, 'id'>) => Promise<void>;
    bulkAddCreditCardTransactions: (transactions: Omit<CreditCardTransaction, 'id'>[]) => Promise<number>;
    reloadCreditCardTransactions: () => Promise<void>;
    updateCreditCardTransaction: (id: string, transaction: Partial<CreditCardTransaction>) => Promise<void>;
    deleteCreditCardTransaction: (id: string) => Promise<void>;
   payCardInvoice: (cardId: string, bankId: string, value: number, date: string) => Promise<void>;
   loadScheduledTransactions: () => Promise<void>;
   addScheduledTransaction: (transaction: Omit<ScheduledTransaction, 'id'>) => Promise<ScheduledTransaction | null>;
   updateScheduledTransaction: (id: string, transaction: Partial<ScheduledTransaction>) => Promise<void>;
   deleteScheduledTransaction: (id: string) => Promise<void>;
   confirmScheduledTransaction: (id: string, confirmedValue?: number, confirmedDate?: string, useCreditCard?: boolean) => Promise<void>;
   getCategoryName: (id: string) => string;
   getCategoryIcon: (id: string) => string;
   getBankName: (id: string) => string;
   getBankIcon: (id: string) => string;
   getCardName: (id: string) => string;
   getCardIcon: (id: string) => string;
   exportToCSV: () => string;
   exportToJSON: () => string;
   saveDescriptionMapping: (description: string, categoryId: string) => Promise<void>;
   getCategoryForDescription: (description: string) => string | undefined;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);
   const [scheduledTransactions, setScheduledTransactions] = useState<ScheduledTransaction[]>([]);

   const normalizeDate = (d: string): string => {
     if (!d) return d;
     if (d.includes('T')) return d.split('T')[0];
     return d;
   };
   const [scheduledTransactionsTableExists, setScheduledTransactionsTableExists] = useState<boolean>(true);
   const [descriptionMappings, setDescriptionMappings] = useState<Map<string, string>>(new Map());
   const [descriptionMappingsTableExists, setDescriptionMappingsTableExists] = useState<boolean>(true);

   const initializingRef = useRef(false);
   const lastUserIdRef = useRef<string | null>(null);

  // Verificar expiração da conta
  const checkExpiration = useCallback(async (uid: string) => {
    try {
      const userData = await dbSelectOne<{ expires_at: string | null; email: string }>(
        'SELECT expires_at, email FROM users WHERE id = $1',
        [uid]
      );

      if (!userData) {
        setIsExpired(false);
        return false;
      }

      setExpiresAt(userData.expires_at);

      // Admin nunca expira
      if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes((userData.email || '').toLowerCase())) {
        setIsExpired(false);
        return false;
      }

      if (userData.expires_at) {
        const expDate = new Date(userData.expires_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        const expired = today > expDate;
        setIsExpired(expired);
        return expired;
      }

      setIsExpired(false);
      return false;
    } catch (error) {
      console.error('Erro ao verificar expiração:', error);
      setIsExpired(false);
      return false;
    }
  }, []);

   // Carregar dados do usuário
   const loadUserData = useCallback(async (uid: string) => {
     try {
       const res = await fetch('/api/user-data', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: uid }),
       });
        console.log('[FINANCE] user-data response status:', res.status);
        const data = await res.json();
        console.log('[FINANCE] user-data response:', JSON.stringify(data).substring(0, 200));
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados');

        setBanks((data.banks || []).map((b: any) => ({
         id: b.id,
         name: b.name,
         icon: b.icon,
         initialBalance: parseFloat(b.initial_balance)
       })));

       setCategories((data.categories || []).map((c: any) => ({
         id: c.id,
         name: c.name,
         icon: c.icon
       })).sort((a: any, b: any) => a.name.localeCompare(b.name)));

       setCreditCards((data.creditCards || []).map((c: any) => ({
         id: c.id,
         name: c.name,
         bank: c.bank || '',
         limit: parseFloat(c.credit_limit),
         icon: c.icon
       })));

        setTransactions((data.transactions || []).map((t: any) => ({
          id: t.id,
          date: normalizeDate(t.date),
          description: t.description,
          bank: t.bank,
          type: t.type,
          category: t.category,
          value: parseFloat(t.value)
        })));

        setCreditCardTransactions((data.creditCardTransactions || []).map((t: any) => ({
          id: t.id,
          date: normalizeDate(t.date),
          description: t.description,
          card: t.card,
          category: t.category,
          value: parseFloat(t.value),
          isPayment: t.is_payment,
          invoice_month: t.invoice_month
        })));

       setScheduledTransactionsTableExists(true);
       setScheduledTransactions((data.scheduledTransactions || []).map((t: any) => ({
         id: t.id,
         description: t.description,
         type: t.type,
         transactionType: t.transaction_type || 'debit',
         value: parseFloat(t.value),
          totalInstallments: parseFloat(t.total_installments),
          currentInstallment: parseFloat(t.current_installment),
         dueDate: t.due_date,
         category: t.category || '',
         bank: t.bank || '',
         card: t.card || '',
         isPaid: t.is_paid,
         autoConfirm: t.auto_confirm,
         status: t.status
       })));

       setDescriptionMappingsTableExists(true);
       const mappings = new Map<string, string>();
       (data.descriptionMappings || []).forEach((m: any) => {
         mappings.set(m.description.toUpperCase(), m.category_id);
       });
        setDescriptionMappings(mappings);
        console.log('[FINANCE] loadUserData concluída, banks:', data.banks?.length, 'tx:', data.transactions?.length, 'scheduled:', data.scheduledTransactions?.length);
      } catch (error) {
        console.error('[FINANCE] Erro ao carregar dados:', error);
     }
   }, []);

  // Inicializar dados padrão para novo usuário
  const initDefaultData = async (uid: string) => {
    const existingBanks = await dbSelect<{ id: string }>(
      'SELECT id FROM banks WHERE user_id = $1 LIMIT 1',
      [uid]
    );

    if (existingBanks.length > 0) return;

    for (const [, bank] of Object.entries(DEFAULT_BANKS)) {
      await dbInsert(
        'INSERT INTO banks (user_id, name, icon, initial_balance) VALUES ($1, $2, $3, $4)',
        [uid, bank.name, bank.icon, bank.initialBalance]
      );
    }

    for (const [, cat] of Object.entries(DEFAULT_CATEGORIES)) {
      await dbInsert(
        'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3)',
        [uid, cat.name, cat.icon]
      );
    }
  };

  // Auth state listener - using Neon Auth
  useEffect(() => {
    const initAuth = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        // Obter sessão do Neon Auth
        const { data: session } = await authClient.getSession();

        if (session?.user) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || session.user.name || ''
          };
          setUser(authUser);
          lastUserIdRef.current = session.user.id;

          // Verificar se usuário existe na tabela users
          const existingUser = await dbSelectOne<{ id: string }>(
            'SELECT id FROM users WHERE id = $1',
            [session.user.id]
          );

          if (!existingUser) {
            // Verificar se já existe registro com este email (migrado do Supabase)
            const existingByEmail = await dbSelectOne<{ id: string }>(
              'SELECT id FROM users WHERE email = $1',
              [authUser.email]
            );

            if (existingByEmail) {
              const oldId = existingByEmail.id;
              const newId = session.user.id;

              // Atualizar id na tabela users
              await dbExecute('UPDATE users SET id = $1 WHERE id = $2', [newId, oldId]);

              // Migrar dados das outras tabelas para o novo id
              const tables = ['banks', 'categories', 'credit_cards', 'transactions', 'credit_card_transactions', 'description_category_mappings', 'scheduled_transactions'];
              for (const table of tables) {
                await dbExecute(
                  `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
                  [newId, oldId]
                ).catch(() => {});
              }
            } else {
              // Novo usuário - criar registro
              await dbInsert(
                'INSERT INTO users (id, email) VALUES ($1, $2)',
                [session.user.id, authUser.email]
              );
              await initDefaultData(session.user.id);
            }
          }

          await checkExpiration(session.user.id);
          await loadUserData(session.user.id).catch(err => {
            console.error('[FINANCE] Erro ao carregar dados:', err);
          });
        } else {
          setUser(null);
          setBanks([]);
          setCategories([]);
          setCreditCards([]);
          setTransactions([]);
          setCreditCardTransactions([]);
          setScheduledTransactions([]);
          setIsExpired(false);
          setExpiresAt(null);
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
        setUser(null);
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    };

    initAuth();
  }, [checkExpiration, loadUserData]);

  // Online status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { dbTestConnection } = await import('@/lib/db-helpers');
        setIsOnline(await dbTestConnection());
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth functions - Neon Auth
  const login = async (email: string, password: string) => {
    const { data, error } = await authClient.signIn.email({
      email,
      password
    });
    if (error) throw new Error(error.message || 'Erro ao fazer login');
    // Vincular dados existentes ao Neon Auth user
    try {
      const sessionRes = await authClient.getSession();
      const neonUserId = sessionRes.data?.session?.userId || sessionRes.data?.user?.id;
      if (neonUserId) {
        await fetch('/api/admin/link-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, neonAuthUserId: neonUserId }),
        });
      }
    } catch {}
    window.location.reload();
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0]
    });
    if (error) throw new Error(error.message || 'Erro ao criar conta');
    // Vincular dados existentes ao Neon Auth user
    try {
      const sessionRes = await authClient.getSession();
      const neonUserId = sessionRes.data?.session?.userId || sessionRes.data?.user?.id;
      if (neonUserId) {
        await fetch('/api/admin/link-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, neonAuthUserId: neonUserId }),
        });
      }
    } catch {}
  };

  const logout = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const changePassword = async (newPassword: string) => {
    // Neon Auth pode não ter essa função diretamente
    // Por enquanto, apenas informar o usuário
    throw new Error('Use o painel do Neon Auth para alterar sua senha');
  };

  // Bank functions
  const addBank = async (bank: Omit<Bank, 'id'>) => {
    if (!user) return;
    await dbInsert(
      'INSERT INTO banks (user_id, name, icon, initial_balance) VALUES ($1, $2, $3, $4)',
      [user.id, bank.name, bank.icon, bank.initialBalance]
    );
    await loadUserData(user.id);
  };

  const updateBank = async (id: string, bank: Partial<Bank>) => {
    if (!user) return;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (bank.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(bank.name); }
    if (bank.icon !== undefined) { updates.push(`icon = $${paramIndex++}`); values.push(bank.icon); }
    if (bank.initialBalance !== undefined) { updates.push(`initial_balance = $${paramIndex++}`); values.push(bank.initialBalance); }

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE banks SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    await loadUserData(user.id);
  };

  const deleteBank = async (id: string) => {
    if (!user) return;
    await dbExecute('DELETE FROM banks WHERE id = $1', [id]);
    await loadUserData(user.id);
  };

  const getBankBalance = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return 0;
    return bank.initialBalance + transactions.filter(t => t.bank === bankId).reduce((s, t) => s + (t.type === 'credit' ? t.value : -t.value), 0);
  };

  // Category functions
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;
    await dbInsert(
      'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3)',
      [user.id, category.name, category.icon]
    );
    await loadUserData(user.id);
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user) return;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (category.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(category.name); }
    if (category.icon !== undefined) { updates.push(`icon = $${paramIndex++}`); values.push(category.icon); }

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    await loadUserData(user.id);
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    await dbExecute('DELETE FROM categories WHERE id = $1', [id]);
    await loadUserData(user.id);
  };

  // Credit Card functions
  const addCreditCard = async (card: Omit<CreditCard, 'id'>) => {
    if (!user) return;
    await dbInsert(
      'INSERT INTO credit_cards (user_id, name, bank, credit_limit, icon) VALUES ($1, $2, $3, $4, $5)',
      [user.id, card.name, card.bank, card.limit, card.icon]
    );
    await loadUserData(user.id);
  };

  const updateCreditCard = async (id: string, card: Partial<CreditCard>) => {
    if (!user) return;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (card.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(card.name); }
    if (card.bank !== undefined) { updates.push(`bank = $${paramIndex++}`); values.push(card.bank); }
    if (card.limit !== undefined) { updates.push(`credit_limit = $${paramIndex++}`); values.push(card.limit); }
    if (card.icon !== undefined) { updates.push(`icon = $${paramIndex++}`); values.push(card.icon); }

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE credit_cards SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    await loadUserData(user.id);
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return;
    await dbExecute('DELETE FROM credit_cards WHERE id = $1', [id]);
    await loadUserData(user.id);
  };

  const getCardInvoice = (cardId: string) => {
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    return creditCardTransactions
      .filter(t => t.card === cardId && t.date.startsWith(thisMonthStr) && t.date <= today && !t.isPayment && t.value > 0)
      .reduce((s, t) => s + t.value, 0);
  };

  const getCardTotalDebt = (cardId: string) => {
    return creditCardTransactions
      .filter(t => t.card === cardId)
      .reduce((s, t) => s + t.value, 0);
  };

  // Transaction functions
    const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
     if (!user) throw new Error('Usuário não está logado');

     const data = await dbInsert<{ id: string }>(
       `INSERT INTO transactions (user_id, date, description, bank, type, category, value)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
       [user.id, normalizeDate(transaction.date), transaction.description, transaction.bank, transaction.type, transaction.category, parseFloat(transaction.value)]
     );

     if (data) {
       setTransactions(prev => [{
         id: data.id,
         date: normalizeDate(transaction.date),
         description: transaction.description,
         bank: transaction.bank,
         type: transaction.type,
         category: transaction.category,
         value: parseFloat(transaction.value)
       }, ...prev]);
     }
   };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    if (!user) return;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (transaction.date !== undefined) { updates.push(`date = $${paramIndex++}`); values.push(normalizeDate(transaction.date)); }
    if (transaction.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(transaction.description); }
    if (transaction.bank !== undefined) { updates.push(`bank = $${paramIndex++}`); values.push(transaction.bank); }
    if (transaction.type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(transaction.type); }
    if (transaction.category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(transaction.category); }
     if (transaction.value !== undefined) { updates.push(`value = $${paramIndex++}`); values.push(parseFloat(transaction.value)); }

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE transactions SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    await dbExecute('DELETE FROM transactions WHERE id = $1', [id]);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Credit Card Transaction functions
  const addCreditCardTransaction = async (transaction: Omit<CreditCardTransaction, 'id'>) => {
    if (!user) return;
    const data = await dbInsert<{ id: string }>(
      `INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment, invoice_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
       [user.id, normalizeDate(transaction.date), transaction.description, transaction.card, transaction.category, parseFloat(transaction.value), transaction.isPayment, transaction.invoice_month]
    );

     if (data) {
        setCreditCardTransactions(prev => [{
          id: data.id,
          date: normalizeDate(transaction.date),
          description: transaction.description,
          card: transaction.card,
          category: transaction.category,
          value: parseFloat(transaction.value),
          isPayment: transaction.isPayment,
          invoice_month: transaction.invoice_month
        }, ...prev]);
     }
   };

  const bulkAddCreditCardTransactions = async (transactions: Omit<CreditCardTransaction, 'id'>[]): Promise<number> => {
    if (!user || transactions.length === 0) return 0;

    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const params = batch.map(tx => [
        user.id, tx.date, tx.description, tx.card, tx.category, parseFloat(tx.value), tx.isPayment, tx.invoice_month
      ]);

      for (const paramSet of params) {
        await dbInsert(
          `INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment, invoice_month)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          paramSet
        );
        totalInserted++;
      }
    }

    // Reload
    await reloadCreditCardTransactions();
    return totalInserted;
  };

  const reloadCreditCardTransactions = async () => {
    if (!user) return;

    const data = await dbSelect(
      'SELECT * FROM credit_card_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    setCreditCardTransactions(data.map((t: any) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      card: t.card,
      category: t.category,
       value: parseFloat(t.value),
      isPayment: t.is_payment,
      invoice_month: t.invoice_month
    })));
  };

  const updateCreditCardTransaction = async (id: string, transaction: Partial<CreditCardTransaction>) => {
    if (!user) throw new Error('Usuário não está logado');

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (transaction.date !== undefined) { updates.push(`date = $${paramIndex++}`); values.push(normalizeDate(transaction.date)); }
    if (transaction.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(transaction.description); }
    if (transaction.card !== undefined) { updates.push(`card = $${paramIndex++}`); values.push(transaction.card); }
    if (transaction.category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(transaction.category); }
     if (transaction.value !== undefined) { updates.push(`value = $${paramIndex++}`); values.push(parseFloat(transaction.value)); }
    if (transaction.isPayment !== undefined) { updates.push(`is_payment = $${paramIndex++}`); values.push(transaction.isPayment); }
    if (transaction.invoice_month !== undefined) { updates.push(`invoice_month = $${paramIndex++}`); values.push(transaction.invoice_month); }

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE credit_card_transactions SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    setCreditCardTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteCreditCardTransaction = async (id: string) => {
    if (!user) throw new Error('Usuário não está logado');
    await dbExecute('DELETE FROM credit_card_transactions WHERE id = $1', [id]);
    setCreditCardTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Pay card invoice
  const payCardInvoice = async (cardId: string, bankId: string, value: number, date: string) => {
    if (!user) throw new Error('Usuário não logado');

    // Create credit card transaction
    const ccData = await dbInsert<{ id: string }>(
      `INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment, invoice_month)
       VALUES ($1, $2, 'Pagamento Fatura', $3, 'pagamento_cartao', $4, true, $5) RETURNING id`,
      [user.id, date, cardId, -value, date.substring(0, 7)]
    );

    // Create bank transaction
    try {
      const txData = await dbInsert<{ id: string }>(
        `INSERT INTO transactions (user_id, date, description, bank, type, category, value)
         VALUES ($1, $2, 'Pagamento Fatura', $3, 'debit', 'pagamento_cartao', $4) RETURNING id`,
        [user.id, date, bankId, value]
      );
    } catch (error) {
      // Rollback
      if (ccData) await dbExecute('DELETE FROM credit_card_transactions WHERE id = $1', [ccData.id]);
      throw error;
    }
  };

  // Scheduled Transactions functions
  const loadScheduledTransactions = async () => {
    if (!user) return;

    const hasTable = await dbTableExists('scheduled_transactions');
    if (!hasTable) {
      setScheduledTransactionsTableExists(false);
      setScheduledTransactions([]);
      return;
    }

    const data = await dbSelect(
      'SELECT * FROM scheduled_transactions WHERE user_id = $1 ORDER BY due_date ASC',
      [user.id]
    );

    setScheduledTransactionsTableExists(true);
    setScheduledTransactions(data.map((t: any) => ({
      id: t.id,
      description: t.description,
      type: t.type,
      transactionType: t.transaction_type || 'debit',
      value: parseFloat(t.value),
      totalInstallments: t.total_installments,
      currentInstallment: t.current_installment,
      dueDate: t.due_date,
      category: t.category || '',
      bank: t.bank || '',
      card: t.card || '',
      isPaid: t.is_paid,
      autoConfirm: t.auto_confirm,
      status: t.status
    })));
  };

  const addScheduledTransaction = async (transaction: Omit<ScheduledTransaction, 'id'>): Promise<ScheduledTransaction | null> => {
    if (!user) return null;

    const hasTable = await dbTableExists('scheduled_transactions');
    if (!hasTable) {
      setScheduledTransactionsTableExists(false);
      throw new Error('Tabela scheduled_transactions não existe');
    }

    const data = await dbInsert<any>(
      `INSERT INTO scheduled_transactions (user_id, description, type, transaction_type, value, total_installments, current_installment, due_date, category, bank, card, auto_confirm, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
       RETURNING *`,
      [
        user.id, transaction.description.toUpperCase(), transaction.type, transaction.transactionType || 'debit',
         parseFloat(transaction.value), transaction.totalInstallments, transaction.currentInstallment,
         normalizeDate(transaction.dueDate), transaction.category || null, transaction.bank || null,
        transaction.card || null, transaction.autoConfirm
      ]
    );

    if (data) {
      const newTx: ScheduledTransaction = {
        id: data.id,
        description: data.description,
        type: data.type,
        transactionType: data.transaction_type || 'debit',
        value: parseFloat(data.value),
        totalInstallments: data.total_installments,
        currentInstallment: data.current_installment,
        dueDate: data.due_date,
        category: data.category || '',
        bank: data.bank || '',
        card: data.card || '',
        isPaid: data.is_paid,
        autoConfirm: data.auto_confirm,
        status: data.status
      };
       setScheduledTransactions(prev => [...prev, newTx].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
       return newTx;
    }
    return null;
  };

  const updateScheduledTransaction = async (id: string, transaction: Partial<ScheduledTransaction>) => {
    if (!user) return;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (transaction.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(transaction.description.toUpperCase()); }
    if (transaction.type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(transaction.type); }
    if (transaction.value !== undefined) { updates.push(`value = $${paramIndex++}`); values.push(parseFloat(transaction.value)); }
    if (transaction.totalInstallments !== undefined) { updates.push(`total_installments = $${paramIndex++}`); values.push(transaction.totalInstallments); }
    if (transaction.currentInstallment !== undefined) { updates.push(`current_installment = $${paramIndex++}`); values.push(transaction.currentInstallment); }
    if (transaction.dueDate !== undefined) { updates.push(`due_date = $${paramIndex++}`); values.push(normalizeDate(transaction.dueDate)); }
    if (transaction.category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(transaction.category); }
    if (transaction.bank !== undefined) { updates.push(`bank = $${paramIndex++}`); values.push(transaction.bank); }
    if (transaction.card !== undefined) { updates.push(`card = $${paramIndex++}`); values.push(transaction.card); }
    if (transaction.isPaid !== undefined) { updates.push(`is_paid = $${paramIndex++}`); values.push(transaction.isPaid); }
    if (transaction.autoConfirm !== undefined) { updates.push(`auto_confirm = $${paramIndex++}`); values.push(transaction.autoConfirm); }
    if (transaction.status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(transaction.status); }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) return;

    values.push(id);
    await dbExecute(`UPDATE scheduled_transactions SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    setScheduledTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteScheduledTransaction = async (id: string) => {
    if (!user) return;
    await dbExecute('DELETE FROM scheduled_transactions WHERE id = $1', [id]);
    setScheduledTransactions(prev => prev.filter(t => t.id !== id));
  };

  const confirmScheduledTransaction = async (id: string, confirmedValue?: number, confirmedDate?: string, useCreditCard?: boolean) => {
    if (!user) return;

    const scheduledTx = scheduledTransactions.find(t => t.id === id);
    if (!scheduledTx) throw new Error('Lançamento não encontrado');

    const value = confirmedValue || scheduledTx.value;
    const date = confirmedDate || new Date().toISOString().split('T')[0];
    const transactionType = scheduledTx.transactionType || 'debit';

    if (useCreditCard && scheduledTx.card) {
      await dbInsert(
        `INSERT INTO credit_card_transactions (user_id, date, description, card, category, value, is_payment)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [user.id, date, scheduledTx.description, scheduledTx.card, scheduledTx.category || '', value]
      );

      setCreditCardTransactions(prev => [{
        id: Date.now().toString(),
        date, description: scheduledTx.description,
        card: scheduledTx.card, category: scheduledTx.category || '',
        value, isPayment: false
      }, ...prev]);
    } else if (scheduledTx.bank) {
      await dbInsert(
        `INSERT INTO transactions (user_id, date, description, bank, type, category, value)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, date, scheduledTx.description, scheduledTx.bank, transactionType, scheduledTx.category || '', value]
      );

      setTransactions(prev => [{
        id: Date.now().toString(),
        date, description: scheduledTx.description,
        bank: scheduledTx.bank, type: transactionType as 'debit' | 'credit',
        category: scheduledTx.category || '', value
      }, ...prev]);
    } else {
      throw new Error('Lançamento deve ter banco ou cartão definido');
    }

    // Update scheduled transaction
    let updateData: Partial<ScheduledTransaction> = { isPaid: true };

    if (scheduledTx.type === 'parcel') {
      const nextInstallment = scheduledTx.currentInstallment + 1;
      if (nextInstallment >= scheduledTx.totalInstallments) {
        updateData.status = 'confirmed';
        updateData.currentInstallment = nextInstallment;
      } else {
        updateData.currentInstallment = nextInstallment;
        const nextDueDate = new Date(scheduledTx.dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        updateData.dueDate = nextDueDate.toISOString().split('T')[0];
        updateData.isPaid = false;
      }
    } else if (scheduledTx.type === 'recurring') {
      const nextDueDate = new Date(scheduledTx.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      updateData.dueDate = nextDueDate.toISOString().split('T')[0];
      updateData.isPaid = false;
    } else {
      updateData.status = 'confirmed';
    }

    await updateScheduledTransaction(id, updateData);
  };

   // Helper functions
   const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
   const getCategoryIcon = (id: string) => categories.find(c => c.id === id)?.icon || '📦';
   const getBankName = (id: string) => banks.find(b => b.id === id)?.name || id;
   const getBankIcon = (id: string) => banks.find(b => b.id === id)?.icon || '🏦';
   const getCardName = (id: string) => creditCards.find(c => c.id === id)?.name || id;
   const getCardIcon = (id: string) => creditCards.find(c => c.id === id)?.icon || '💳';

   const getCategoryForDescription = (description: string): string | undefined => {
     return descriptionMappings.get(description.toUpperCase());
   };

   const saveDescriptionMapping = async (description: string, categoryId: string) => {
     if (!user) return;

     const upperDesc = description.toUpperCase();
     const existing = await dbSelectOne<{ id: string; usage_count: number }>(
       'SELECT id, usage_count FROM description_category_mappings WHERE user_id = $1 AND description = $2',
       [user.id, upperDesc]
     );

     if (existing) {
       await dbExecute(
         'UPDATE description_category_mappings SET category_id = $1, usage_count = $2, updated_at = NOW() WHERE id = $3',
         [categoryId, existing.usage_count + 1, existing.id]
       );
     } else {
       await dbInsert(
         'INSERT INTO description_category_mappings (user_id, description, category_id, usage_count) VALUES ($1, $2, $3, 1)',
         [user.id, upperDesc, categoryId]
       );
     }

     setDescriptionMappings(prev => {
       const updated = new Map(prev);
       updated.set(upperDesc, categoryId);
       return updated;
     });
   };

   // Export functions
   const exportToCSV = () => 'Data,Descricao,Banco,Tipo,Categoria,Valor\n' + transactions.map(t => `${t.date},${t.description},${getBankName(t.bank)},${t.type},${getCategoryName(t.category)},${t.value}`).join('\n');
   const exportToJSON = () => JSON.stringify({ transactions, banks, categories, creditCards, creditCardTransactions }, null, 2);

   return (
     <FinanceContext.Provider value={{
       user, loading, isOnline, isExpired, expiresAt,
       banks, categories, creditCards, transactions, creditCardTransactions,
       scheduledTransactions, scheduledTransactionsTableExists,
       descriptionMappings, descriptionMappingsTableExists,
       login, register, logout, changePassword,
       addBank, updateBank, deleteBank, getBankBalance,
       addCategory, updateCategory, deleteCategory,
       addCreditCard, updateCreditCard, deleteCreditCard, getCardInvoice, getCardTotalDebt,
       addTransaction, updateTransaction, deleteTransaction,
        addCreditCardTransaction, bulkAddCreditCardTransactions, reloadCreditCardTransactions, updateCreditCardTransaction, deleteCreditCardTransaction,
       payCardInvoice, loadScheduledTransactions, addScheduledTransaction, updateScheduledTransaction,
       deleteScheduledTransaction, confirmScheduledTransaction,
       getCategoryName, getCategoryIcon, getBankName, getBankIcon, getCardName, getCardIcon,
       exportToCSV, exportToJSON,
       saveDescriptionMapping, getCategoryForDescription
     }}>
       {children}
     </FinanceContext.Provider>
   );
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
