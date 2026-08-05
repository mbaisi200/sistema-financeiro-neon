'use client';

const NEON_AUTH_URL = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_NEON_AUTH_URL
  ? process.env.NEXT_PUBLIC_NEON_AUTH_URL
  : '/api/auth';

async function request(path: string, body?: any, method = 'POST') {
  const url = `${NEON_AUTH_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Erro de autenticação');
  return data;
}

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      try {
        const data = await request('/sign-in/email', { email, password });
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
  },
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      try {
        const data = await request('/sign-up/email', { email, password, name: name || email });
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
  },
  signOut: async () => {
    try {
      await request('/sign-out');
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },
  getSession: async () => {
    try {
      const res = await fetch(`${NEON_AUTH_URL}/get-session`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return { data: null, error: null };
      const data = await res.json();
      return { data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },
};
