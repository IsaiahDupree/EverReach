/**
 * Middleware utilities for automatic request logging and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId, createRequestLogger } from './logger';

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  userId?: string;
  orgId?: string;
  apiKeyId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Wrap API route handler with automatic logging and monitoring
 */
export function withMonitoring(
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Extract request metadata
    const method = req.method;
    const path = new URL(req.url).pathname;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create request context
    const context: RequestContext = {
      requestId,
      method,
      path,
      startTime,
      ip,
      userAgent,
    };

    // Create request-scoped logger
    const reqLogger = createRequestLogger({
      requestId,
      method,
      path,
      ip,
      userAgent,
    });

    // Log request start
    reqLogger.info('Request started', {
      method,
      path,
    });

    try {
      // Call the handler
      const response = await handler(req, context);

      // Calculate duration
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // Log request completion
      reqLogger.http('Request completed', {
        statusCode,
        duration,
      });

      // Add monitoring headers to response
      const headers = new Headers(response.headers);
      headers.set('X-Request-ID', requestId);
      headers.set('X-Response-Time', `${duration}ms`);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      reqLogger.error('Request failed', error as Error, {
        duration,
      });

      // Return error response
      return NextResponse.json(
        {
          error: 'Internal server error',
          requestId,
        },
        { 
          status: 500,
          headers: {
            'X-Request-ID': requestId,
            'X-Response-Time': `${duration}ms`,
          },
        }
      );
    }
  };
}

/**
 * Extract user context from request (for authenticated endpoints)
 */
export async function extractUserContext(
  req: NextRequest,
  context: RequestContext
): Promise<void> {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // For now, just log that auth is present
    // In production, decode token to get userId/orgId
    context.userId = 'extracted_from_token';
    context.orgId = 'extracted_from_token';
  }
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;
      logger.metric(`${operation}.duration_ms`, duration);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.metric(`${operation}.duration_ms`, duration);
      logger.error(`${operation} failed`, error, { duration });
      throw error;
    });
}

/**
 * Rate limit monitoring helper
 */
export async function checkAndLogRateLimit(
  key: string,
  limit: number,
  window: number,
  current: number
): Promise<void> {
  const utilizationPct = (current / limit) * 100;

  if (utilizationPct >= 90) {
    logger.warn('Rate limit high utilization', {
      key,
      limit,
      current,
      utilizationPct,
      window,
    });
  }

  logger.metric('rate_limit.utilization_pct', utilizationPct, {
    key,
  });
}

/**
 * Database query performance tracking
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    logger.metric(`db.query.${queryName}.duration_ms`, duration);
    
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${queryName}`, {
        queryName,
        duration,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Query failed: ${queryName}`, error as Error, {
      queryName,
      duration,
    });
    throw error;
  }
}

/**
 * External API call monitoring
 */
export async function trackExternalAPI<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.metric(`external_api.${service}.duration_ms`, duration, {
      service,
      endpoint,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`External API call failed: ${service}`, error as Error, {
      service,
      endpoint,
      duration,
    });
    
    logger.metric(`external_api.${service}.error`, 1, {
      service,
      endpoint,
    });
    
    throw error;
  }
}
