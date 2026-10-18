import { NextResponse } from 'next/server';
import { buildCorsHeaders } from './cors';

/**
 * Helper to add CORS headers to NextResponse objects
 * This allows gradual migration from NextResponse.json() to CORS-aware responses
 */

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? undefined;
  return buildCorsHeaders(origin);
}

export function corsJson(data: any, req: Request, init?: ResponseInit): NextResponse {
  try {
    const headers = new Headers(init?.headers);
    const corsHeadersObj = corsHeaders(req);
    
    // Add CORS headers
    Object.entries(corsHeadersObj).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return NextResponse.json(data, {
      ...init,
      headers,
    });
  } catch (error) {
    console.error('[CORS] Error in corsJson:', error);
    // Return with basic CORS headers as fallback
    const fallbackHeaders = new Headers(init?.headers);
    fallbackHeaders.set('Access-Control-Allow-Origin', 'http://localhost:3007');
    fallbackHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    return NextResponse.json(data, {
      ...init,
      headers: fallbackHeaders,
    });
  }
}

export function corsOptions(req: Request): NextResponse {
  try {
    const headers = corsHeaders(req);
    return new NextResponse(null, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[CORS] Error in corsOptions:', error);
    // Return basic CORS headers as fallback
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3007',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
}
