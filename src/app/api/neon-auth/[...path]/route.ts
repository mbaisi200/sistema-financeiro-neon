import { NextRequest, NextResponse } from 'next/server';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;
const APP_ORIGIN = 'https://sistema-financeiro-neon.vercel.app';

export const dynamic = 'force-dynamic';

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const pathStr = path.join('/');
  const url = `${NEON_AUTH_URL}/${pathStr}`;

  try {
    const headers = new Headers();
    if (method === 'POST') {
      headers.set('Content-Type', request.headers.get('content-type') || 'application/json');
    }
    headers.set('Cookie', request.headers.get('cookie') || '');
    headers.set('Origin', APP_ORIGIN);

    const init: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };

    if (method === 'POST') {
      init.body = await request.text();
    }

    const res = await fetch(url, init);
    const data = await res.text();

    const response = new NextResponse(data, { status: res.status });

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append('set-cookie', value);
      }
    });
    response.headers.set('Content-Type', res.headers.get('content-type') || 'application/json');

    return response;
  } catch (error: any) {
    return NextResponse.json({
      error: 'Proxy error',
      message: error.message,
      neonUrl: url,
      envSet: !!NEON_AUTH_URL,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'POST');
}
