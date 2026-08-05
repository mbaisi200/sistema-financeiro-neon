import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Por enquanto, permitir todas as rotas
  // A autenticação será verificada nos componentes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
