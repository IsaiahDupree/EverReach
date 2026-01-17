import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Global CORS middleware - applies to all routes
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/');
  
  // Build CORS headers
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Requested-With,x-vercel-protection-bypass,Idempotency-Key,idempotency-key,X-Platform,X-App-Version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  // Allow all origins in development, or if ALLOW_ALL_ORIGINS is set
  const allowAll = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_ORIGINS === 'true';
  
  if (allowAll) {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // Production: use allowlist
    const allowedOrigins = [
      'https://ai-enhanced-personal-crm.rork.app',
      'https://rork.com',
      'https://everreach.app',
      'https://www.everreach.app',
      ...(process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [])
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    } else {
      corsHeaders['Access-Control-Allow-Origin'] = '*';
    }
  }

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // For all other requests, add CORS headers to response
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Apply middleware to all API routes
export const config = {
  matcher: '/api/:path*',
};

