import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    return NextResponse.json({
      sessionUser: session?.user || null,
      sessionId: session?.session || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
