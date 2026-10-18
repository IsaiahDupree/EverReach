import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders } from '@/lib/cors';

/**
 * Global middleware — applies to all /api/* routes.
 *
 * Responsibilities:
 *  1. CORS (delegates to lib/cors.ts allowlist — single source of truth)
 *  2. X-Request-ID on every response
 *  3. Lightweight structured request logging
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? undefined;
  const startMs = Date.now();

  // Generate a request ID for correlation
  const requestId =
    (globalThis as any).crypto?.randomUUID?.()?.replace(/-/g, '') ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const reqIdHeader = `req_${requestId}`;

  // Build CORS headers from the shared allowlist in lib/cors.ts
  // This respects STATIC_ALLOWED + CORS_ORIGINS env + localhost dev convenience.
  // No more ALLOW_ALL_ORIGINS bypass.
  const corsHeaders = buildCorsHeaders(origin) as Record<string, string>;

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: { ...corsHeaders, 'X-Request-ID': reqIdHeader },
    });
  }

  // For all other requests, add CORS + request ID headers to response
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', reqIdHeader);

  // Structured request log (single line, easy to grep in Vercel logs)
  const path = request.nextUrl.pathname;
  const method = request.method;
  console.log(`[API] ${method} ${path} origin=${origin ?? '-'} rid=${reqIdHeader}`);

  return response;
}

// Apply middleware to all API routes
export const config = {
  matcher: '/api/:path*',
};

