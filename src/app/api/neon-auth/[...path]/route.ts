import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL!;
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');

export const dynamic = 'force-dynamic';

function getRequestOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'null') return origin;

  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;

  return APP_ORIGIN;
}

// Verifica se o app está sendo servido via HTTPS.
// Em HTTP puro (ex.: acesso local por IP da rede, como http://192.168.x.x:81),
// navegadores móveis REJEITAM cookies com atributo Secure (ou SameSite=None,
// que exige Secure) e o login falha silenciosamente. Por isso os cookies
// precisam ser saneados quando a conexão não é segura.
function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) {
    return proto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return request.nextUrl.protocol === 'https:';
}

// Remove atributos de cookie incompatíveis com HTTP puro:
// - "Secure" não pode existir fora de HTTPS
// - "SameSite=None" exige Secure, então vira "SameSite=Lax"
function sanitizeSetCookie(setCookieValues: string[], secure: boolean): string[] {
  if (secure) return setCookieValues;
  return setCookieValues.map((cookie) =>
    cookie
      .replace(/;\s*Secure\b/gi, '')
      .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
  );
}

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
      'Origin': getRequestOrigin(request),
      'Content-Type': 'application/json',
    };

    const needsCookie = !(pathStr.startsWith('sign-in') || pathStr.startsWith('sign-up'));
    if (needsCookie) {
      const cookie = request.headers.get('cookie');
      if (cookie) headers['Cookie'] = cookie;
    }

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
      sanitizeSetCookie(cookies, isSecureRequest(request)).forEach((c) => response.headers.append('set-cookie', c));
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
