import { NextRequest, NextResponse } from 'next/server';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;
const ORIGIN = NEON_AUTH_URL.replace(/\/auth$/, '');

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${NEON_AUTH_URL}/${path}`;

  const headers = new Headers();
  headers.set('Cookie', request.headers.get('cookie') || '');
  headers.set('Content-Type', 'application/json');
  headers.set('Origin', ORIGIN);

  const res = await fetch(url, { headers, cache: 'no-store' });
  const data = await res.text();
  const response = new NextResponse(data, { status: res.status });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) response.headers.set('set-cookie', setCookie);
  response.headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');

  return response;
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${NEON_AUTH_URL}/${path}`;
  const body = await request.text();

  const headers = new Headers();
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  headers.set('Cookie', request.headers.get('cookie') || '');
  headers.set('Origin', ORIGIN);
  headers.set('Referer', `${ORIGIN}/`);

  const res = await fetch(url, { method: 'POST', headers, body });
  const data = await res.text();
  const response = new NextResponse(data, { status: res.status });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) response.headers.set('set-cookie', setCookie);
  response.headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');

  return response;
}
