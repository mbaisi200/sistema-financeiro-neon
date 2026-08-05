import { NextRequest, NextResponse } from 'next/server';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${NEON_AUTH_URL}/${path}`;
  const cookieHeader = request.headers.get('cookie') || '';

  const res = await fetch(url, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Set-Cookie': res.headers.get('Set-Cookie') || '',
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${NEON_AUTH_URL}/${path}`;
  const cookieHeader = request.headers.get('cookie') || '';
  const body = await request.text();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      Cookie: cookieHeader,
    },
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Set-Cookie': res.headers.get('Set-Cookie') || '',
    },
  });
}
