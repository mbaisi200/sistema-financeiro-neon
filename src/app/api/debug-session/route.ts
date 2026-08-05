import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({
      sessionUser: session?.user || null,
      sessionId: session?.session || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
