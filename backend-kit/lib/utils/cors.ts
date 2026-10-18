/**
 * CORS Configuration Utility
 * BACK-UTIL-001: CORS Utility
 *
 * Provides configurable CORS (Cross-Origin Resource Sharing) headers
 * for API routes. Supports environment-based origin whitelisting,
 * preflight request handling, and custom CORS options.
 *
 * @module lib/utils/cors
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allow credentials (cookies, authorization headers) */
  credentials?: boolean;
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed request headers */
  headers?: string[];
  /** Max age for preflight cache in seconds */
  maxAge?: string;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_OPTIONS: Required<CorsOptions> = {
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: '86400', // 24 hours
};

/**
 * Get the list of allowed origins from environment variables
 *
 * @returns Array of allowed origin URLs
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS || '';

  if (origins === '*') {
    return ['*'];
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Check if an origin is allowed based on the ALLOWED_ORIGINS environment variable
 *
 * @param origin - The origin to check (e.g., 'https://example.com')
 * @returns true if the origin is allowed, false otherwise
 *
 * @example
 * ```ts
 * // With ALLOWED_ORIGINS='https://example.com,https://app.example.com'
 * isOriginAllowed('https://example.com') // true
 * isOriginAllowed('https://malicious.com') // false
 * ```
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins();

  // Allow all origins if wildcard is set
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // Check if the origin is in the allowed list
  return allowedOrigins.includes(origin);
}

/**
 * Generate CORS headers for a given origin
 *
 * @param origin - The request origin
 * @param options - CORS configuration options
 * @returns Object containing CORS headers
 *
 * @example
 * ```ts
 * const headers = corsHeaders('https://example.com', { credentials: true });
 * // {
 * //   'Access-Control-Allow-Origin': 'https://example.com',
 * //   'Access-Control-Allow-Credentials': 'true',
 * //   ...
 * // }
 * ```
 */
export function corsHeaders(
  origin: string | undefined,
  options: CorsOptions = {}
): Record<string, string> {
  const config = { ...DEFAULT_CORS_OPTIONS, ...options };
  const headers: Record<string, string> = {};

  // Only set CORS headers if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    // Handle wildcard case
    if (getAllowedOrigins().includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    } else {
      headers['Access-Control-Allow-Origin'] = origin;
    }

    // Set credentials header if requested (can't use with wildcard)
    if (config.credentials && !getAllowedOrigins().includes('*')) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  // Set other CORS headers (always set for preflight requests)
  headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
  headers['Access-Control-Allow-Headers'] = config.headers.join(', ');
  headers['Access-Control-Max-Age'] = config.maxAge;

  return headers;
}

/**
 * Higher-order function that wraps an API route handler with CORS support
 *
 * Automatically handles:
 * - OPTIONS preflight requests (returns 204 with CORS headers)
 * - Adding CORS headers to all responses
 * - Origin validation
 *
 * @param handler - The original Next.js API route handler
 * @param options - CORS configuration options
 * @returns Wrapped handler with CORS support
 *
 * @example
 * ```ts
 * // In app/api/items/route.ts
 * export const GET = withCors(async (request: NextRequest) => {
 *   return NextResponse.json({ items: [] });
 * });
 *
 * // With custom options
 * export const POST = withCors(
 *   async (request: NextRequest) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { credentials: true, methods: ['POST', 'OPTIONS'] }
 * );
 * ```
 */
export function withCors(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: CorsOptions = {}
): (request: NextRequest, context?: any) => Promise<NextResponse> {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const origin = request.headers.get('origin') || undefined;

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const headers = corsHeaders(origin, options);
      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // Execute the original handler
    const response = await handler(request, context);

    // Add CORS headers to the response
    const headers = corsHeaders(origin, options);
    Object.entries(headers).forEach(([key, value]) => {
      // Only set Access-Control-Allow-Origin if it was set by corsHeaders
      // (meaning the origin was allowed)
      if (key === 'Access-Control-Allow-Origin' && !headers['Access-Control-Allow-Origin']) {
        return;
      }
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Create a NextResponse with CORS headers already set
 *
 * Convenience function for manually creating responses with CORS headers
 *
 * @param body - Response body (will be JSON stringified)
 * @param origin - The request origin
 * @param options - CORS and response options
 * @returns NextResponse with CORS headers
 *
 * @example
 * ```ts
 * return corsResponse(
 *   { message: 'Success' },
 *   request.headers.get('origin'),
 *   { status: 200, credentials: true }
 * );
 * ```
 */
export function corsResponse(
  body: any,
  origin: string | undefined,
  options: CorsOptions & { status?: number } = {}
): NextResponse {
  const { status = 200, ...corsOpts } = options;
  const headers = corsHeaders(origin, corsOpts);

  return NextResponse.json(body, {
    status,
    headers,
  });
}
