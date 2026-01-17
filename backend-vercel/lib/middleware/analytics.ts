/**
 * Analytics Middleware
 * 
 * Automatically tracks all API requests with:
 * - Request ID (for correlation)
 * - Method, route, status code
 * - Duration (response time)
 * - User ID (if authenticated)
 * - IP address and user agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../analytics';

export interface AnalyticsContext {
  requestId: string;
  startTime: number;
  userId?: string;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Extract IP address from request
 */
export function getClientIp(req: NextRequest): string | undefined {
  // Check common headers for IP address
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * Extract route path from URL (without query params)
 */
export function getRoutePath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Middleware to track API requests
 * 
 * Usage in API route:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const context = startRequestTracking(req);
 *   
 *   try {
 *     // Your API logic here
 *     const response = NextResponse.json({ data: '...' });
 *     await endRequestTracking(context, response.status);
 *     return response;
 *   } catch (error) {
 *     await endRequestTracking(context, 500);
 *     throw error;
 *   }
 * }
 * ```
 */
export function startRequestTracking(req: NextRequest, userId?: string): AnalyticsContext {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Attach to request for later use
  return {
    requestId,
    startTime,
    userId,
  };
}

/**
 * End request tracking and send event
 */
export async function endRequestTracking(
  context: AnalyticsContext,
  statusCode: number,
  req?: NextRequest
): Promise<void> {
  const duration = Date.now() - context.startTime;

  await api.request(context.userId || null, {
    request_id: context.requestId,
    method: req?.method || 'UNKNOWN',
    route: req ? getRoutePath(req.url) : 'UNKNOWN',
    status_code: statusCode,
    duration_ms: duration,
    user_agent: req ? getUserAgent(req) : undefined,
    ip: req ? getClientIp(req) : undefined,
  });
}

/**
 * Higher-order function to wrap API routes with automatic tracking
 * 
 * Usage:
 * ```typescript
 * export const GET = withAnalytics(async (req: NextRequest) => {
 *   // Your API logic here
 *   return NextResponse.json({ data: '...' });
 * });
 * ```
 */
export function withAnalytics<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  getUserId?: (req: NextRequest) => Promise<string | undefined>
): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest;
    
    // Get user ID if function provided
    const userId = getUserId ? await getUserId(req) : undefined;
    
    const context = startRequestTracking(req, userId);
    
    try {
      const response = await handler(...args);
      await endRequestTracking(context, response.status, req);
      
      // Add request ID to response headers
      response.headers.set('X-Request-ID', context.requestId);
      
      return response;
    } catch (error) {
      await endRequestTracking(context, 500, req);
      throw error;
    }
  }) as T;
}

/**
 * Extract user ID from JWT token in Authorization header
 */
export async function extractUserIdFromToken(req: NextRequest): Promise<string | undefined> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  // This is a placeholder - implement actual JWT verification
  // You'll need to verify the token against Supabase
  try {
    // TODO: Implement JWT verification
    // const token = authHeader.replace('Bearer ', '');
    // const { data: { user } } = await supabase.auth.getUser(token);
    // return user?.id;
    return undefined;
  } catch {
    return undefined;
  }
}

export default {
  startRequestTracking,
  endRequestTracking,
  withAnalytics,
  generateRequestId,
  getClientIp,
  getUserAgent,
  getRoutePath,
  extractUserIdFromToken,
};
