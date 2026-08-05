'use client';

import React from 'react';
import { FinanceProvider } from '@/contexts/FinanceContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FinanceProvider>
      {children}
    </FinanceProvider>
  );
}
