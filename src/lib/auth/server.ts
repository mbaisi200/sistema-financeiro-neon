import { cookies } from 'next/headers';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;

export async function getSession(): Promise<{ user: { id: string; email: string } | null; session: any } | null> {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const res = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
