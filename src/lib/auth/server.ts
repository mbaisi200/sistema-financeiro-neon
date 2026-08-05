import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

export async function getUserId(): Promise<string | null> {
  try {
    const { data: session } = await auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
