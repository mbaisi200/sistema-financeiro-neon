import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;
const APP_ORIGIN = 'https://sistema-financeiro-neon.vercel.app';

export const dynamic = 'force-dynamic';

function httpsRequest(url: string, options: https.RequestOptions, body?: string): Promise<{ status: number; data: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          data,
          headers: res.headers as Record<string, string>,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const pathStr = path.join('/');
  const url = `${NEON_AUTH_URL}/${pathStr}`;
  const parsedUrl = new URL(url);

  try {
    const headers: Record<string, string> = {
      'Origin': APP_ORIGIN,
      'Content-Type': 'application/json',
    };

    const cookie = request.headers.get('cookie');
    if (cookie) headers['Cookie'] = cookie;

    const body = method === 'POST' ? await request.text() : undefined;

    const result = await httpsRequest(url, {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    }, body);

    const response = new NextResponse(result.data, { status: result.status });

    if (result.headers['set-cookie']) {
      const cookies = Array.isArray(result.headers['set-cookie'])
        ? result.headers['set-cookie']
        : [result.headers['set-cookie']];
      cookies.forEach((c) => response.headers.append('set-cookie', c));
    }

    response.headers.set('Content-Type', result.headers['content-type'] || 'application/json');

    return response;
  } catch (error: any) {
    return NextResponse.json({
      error: 'Proxy error',
      message: error.message,
      neonUrl: url,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'POST');
}
