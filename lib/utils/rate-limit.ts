/**
 * Rate Limiting Utility
 * BACK-UTIL-003: Rate Limiter
 *
 * Provides rate limiting middleware for API routes.
 * Supports per-user and per-IP rate limiting with configurable windows.
 *
 * @module lib/utils/rate-limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './errors';

/**
 * Rate limit record stored in the store
 */
export interface RateLimitRecord {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp when the current window resets (ms) */
  resetTime: number;
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Optional custom key generator function */
  keyGenerator?: (req: any) => string;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum number of requests allowed */
  limit: number;
  /** Number of requests remaining in the window */
  remaining: number;
  /** Timestamp when the window resets (ms) */
  resetTime: number;
  /** Seconds until the limit resets (only set when blocked) */
  retryAfter?: number;
}

/**
 * Interface for rate limit storage
 * Can be implemented with different backends (memory, Redis, etc.)
 */
export interface RateLimitStore {
  /**
   * Get the current rate limit record for a key
   * @param key - The rate limit key (e.g., "user:123" or "ip:192.168.1.1")
   * @returns The rate limit record or null if not found
   */
  get(key: string): Promise<RateLimitRecord | null>;

  /**
   * Increment the request count for a key
   * @param key - The rate limit key
   * @param windowMs - The time window in milliseconds
   * @returns The updated rate limit record
   */
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;

  /**
   * Clean up expired entries (optional optimization)
   */
  cleanup?(): Promise<void>;
}

/**
 * In-memory rate limit store
 * For production, consider using Redis or another distributed store
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, RateLimitRecord> = new Map();

  async get(key: string): Promise<RateLimitRecord | null> {
    const record = this.store.get(key);
    if (!record) {
      return null;
    }

    // Check if the record has expired
    if (Date.now() > record.resetTime) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = await this.get(key);

    if (existing && now <= existing.resetTime) {
      // Increment existing record
      existing.count += 1;
      this.store.set(key, existing);
      return existing;
    }

    // Create new record
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    this.store.set(key, newRecord);
    return newRecord;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Default in-memory store instance
 * Shared across all rate limiters unless a custom store is provided
 */
const defaultStore = new MemoryRateLimitStore();

/**
 * Check if a request is within the rate limit
 *
 * @param key - The rate limit key (e.g., "user:123" or "ip:192.168.1.1")
 * @param config - Rate limit configuration
 * @param store - Optional custom store (defaults to in-memory store)
 * @returns Rate limit check result
 *
 * @example
 * ```ts
 * const result = await checkRateLimit('user:123', {
 *   windowMs: 60000,
 *   maxRequests: 100
 * });
 *
 * if (!result.allowed) {
 *   console.log(`Rate limit exceeded. Retry after ${result.retryAfter}s`);
 * }
 * ```
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore = defaultStore
): Promise<RateLimitResult> {
  const record = await store.increment(key, config.windowMs);
  const now = Date.now();

  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const retryAfter = allowed ? undefined : Math.ceil((record.resetTime - now) / 1000);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTime: record.resetTime,
    retryAfter,
  };
}

/**
 * Create a rate limiter function
 *
 * @param config - Rate limit configuration
 * @param store - Optional custom store
 * @returns Rate limiter function
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({
 *   windowMs: 60000,
 *   maxRequests: 100,
 *   keyGenerator: (req) => `user:${req.userId}`
 * });
 *
 * const result = await limiter(request);
 * if (!result.allowed) {
 *   // Handle rate limit exceeded
 * }
 * ```
 */
export function createRateLimiter(
  config: RateLimitConfig,
  store: RateLimitStore = defaultStore
): (req: any) => Promise<RateLimitResult> {
  return async (req: any) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : 'default';
    return checkRateLimit(key, config, store);
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 *
 * Wraps a route handler with rate limiting. Returns 429 when limit is exceeded.
 * Adds standard rate limit headers to all responses.
 *
 * @param handler - The Next.js route handler to wrap
 * @param config - Rate limit configuration
 * @param store - Optional custom store
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * ```ts
 * // Per-user rate limiting
 * export const GET = withRateLimit(
 *   async (req) => {
 *     return NextResponse.json({ data: 'protected' });
 *   },
 *   {
 *     windowMs: 60000, // 1 minute
 *     maxRequests: 100,
 *     keyGenerator: (req) => `user:${req.userId}`
 *   }
 * );
 *
 * // Per-IP rate limiting
 * export const POST = withRateLimit(
 *   async (req) => {
 *     return NextResponse.json({ data: 'created' });
 *   },
 *   {
 *     windowMs: 60000,
 *     maxRequests: 20,
 *     keyGenerator: (req) => {
 *       const forwarded = req.headers.get('x-forwarded-for');
 *       const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
 *       return `ip:${ip || 'unknown'}`;
 *     }
 *   }
 * );
 * ```
 */
export function withRateLimit(
  handler: (req: any, context?: any) => Promise<NextResponse>,
  config: RateLimitConfig,
  store: RateLimitStore = defaultStore
): (req: any, context?: any) => Promise<NextResponse> {
  return async (req: any, context?: any) => {
    // Generate rate limit key
    const key = config.keyGenerator ? config.keyGenerator(req) : 'default';

    // Check rate limit
    const result = await checkRateLimit(key, config, store);

    // If rate limited, return 429
    if (!result.allowed) {
      const errorResponse = createErrorResponse(
        'Too many requests. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        {
          limit: result.limit,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
        }
      );

      const response = NextResponse.json(errorResponse, { status: 429 });

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', String(result.limit));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)));

      if (result.retryAfter) {
        response.headers.set('Retry-After', String(result.retryAfter));
      }

      return response;
    }

    // Call the original handler
    const response = await handler(req, context);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)));

    return response;
  };
}

/**
 * Helper function to extract IP from request
 * Handles x-forwarded-for header for proxied requests
 *
 * @param req - The Next.js request object
 * @returns The client IP address
 *
 * @example
 * ```ts
 * const ip = getClientIp(req);
 * const key = `ip:${ip}`;
 * ```
 */
export function getClientIp(req: NextRequest | any): string {
  // Try x-forwarded-for header (common in production behind proxies)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, use the first IP
    return forwarded.split(',')[0].trim();
  }

  // Try x-real-ip header
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to req.ip or unknown
  return req.ip || 'unknown';
}

/**
 * Helper function to extract user ID from request
 * Assumes the request has been authenticated and has a userId property
 *
 * @param req - The Next.js request object
 * @returns The user ID or 'anonymous'
 *
 * @example
 * ```ts
 * const userId = getUserId(req);
 * const key = `user:${userId}`;
 * ```
 */
export function getUserId(req: any): string {
  return req.userId || req.user?.id || 'anonymous';
}

/**
 * Pre-configured rate limiters for common use cases
 */

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = (handler: any) =>
  withRateLimit(handler, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (req) => `auth:${getClientIp(req)}`,
  });

/**
 * Standard rate limiter for authenticated API endpoints
 * 100 requests per minute per user
 */
export const apiRateLimiter = (handler: any) =>
  withRateLimit(handler, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `api:${getUserId(req)}`,
  });

/**
 * Lenient rate limiter for public endpoints
 * 20 requests per minute per IP
 */
export const publicRateLimiter = (handler: any) =>
  withRateLimit(handler, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: (req) => `public:${getClientIp(req)}`,
  });
