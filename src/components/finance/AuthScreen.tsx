'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';

export function AuthScreen() {
  const { user, loading } = useFinance();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Redirecionar para a página de login do Neon Auth
      router.push('/auth/sign-in');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <p style={{ color: '#4b5563', fontWeight: 600 }}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Esta página não deve ser acessada diretamente
  // O Neon Auth redirecionará automaticamente para /auth/sign-in
  return null;
}
