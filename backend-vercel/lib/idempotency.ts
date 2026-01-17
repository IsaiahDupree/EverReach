/**
 * Idempotency Key Support
 * 
 * Prevents duplicate operations by tracking idempotency keys.
 * Uses Vercel KV (Redis) for fast lookups with TTL.
 * Falls back to in-memory cache if KV not configured.
 */

import { randomUUID } from 'crypto';

// In-memory cache for idempotency keys (fallback when KV not available)
const memoryCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up old entries from memory cache
 */
function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      memoryCache.delete(key);
    }
  }
}

// Clean cache every hour
setInterval(cleanMemoryCache, 60 * 60 * 1000);

/**
 * Get idempotency key from request headers
 */
export function getIdempotencyKey(req: Request): string | null {
  return req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || null;
}

/**
 * Generate a cache key for idempotency
 */
function getCacheKey(userId: string, idempotencyKey: string, endpoint: string): string {
  return `idem:${userId}:${endpoint}:${idempotencyKey}`;
}

/**
 * Check if an idempotency key has been used before
 * Returns cached response if found, null otherwise
 */
export async function checkIdempotency(
  userId: string,
  idempotencyKey: string,
  endpoint: string
): Promise<any | null> {
  const cacheKey = getCacheKey(userId, idempotencyKey, endpoint);
  
  // Try Vercel KV first (if configured)
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(cacheKey)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return JSON.parse(data.result);
        }
      }
    }
  } catch (e) {
    console.error('[Idempotency] KV check failed:', e);
  }
  
  // Fall back to memory cache
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }
  
  return null;
}

/**
 * Store a response for an idempotency key
 */
export async function storeIdempotency(
  userId: string,
  idempotencyKey: string,
  endpoint: string,
  response: any
): Promise<void> {
  const cacheKey = getCacheKey(userId, idempotencyKey, endpoint);
  
  // Try Vercel KV first (if configured)
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(cacheKey)}`;
      await fetch(url, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(response),
          ex: 86400, // 24 hours TTL
        }),
      });
    }
  } catch (e) {
    console.error('[Idempotency] KV store failed:', e);
  }
  
  // Always store in memory cache as backup
  memoryCache.set(cacheKey, { response, timestamp: Date.now() });
}

/**
 * Middleware wrapper for idempotent operations
 * 
 * Usage:
 * ```typescript
 * return await withIdempotency(req, user.id, '/v1/interactions', async () => {
 *   // ... perform operation
 *   return ok({ interaction: data }, req);
 * });
 * ```
 */
export async function withIdempotency<T>(
  req: Request,
  userId: string,
  endpoint: string,
  operation: () => Promise<T>
): Promise<T> {
  const idempotencyKey = getIdempotencyKey(req);
  
  // If no idempotency key provided, just run the operation
  if (!idempotencyKey) {
    return await operation();
  }
  
  // Check if this key was used before
  const cached = await checkIdempotency(userId, idempotencyKey, endpoint);
  if (cached) {
    // Return cached response
    return new Response(JSON.stringify(cached.body), {
      status: cached.status,
      headers: cached.headers,
    }) as any;
  }
  
  // Run the operation
  const result = await operation();
  
  // Store the response for future requests
  if (result instanceof Response) {
    const clonedResponse = result.clone();
    const body = await clonedResponse.json().catch(() => null);
    await storeIdempotency(userId, idempotencyKey, endpoint, {
      body,
      status: result.status,
      headers: Object.fromEntries(result.headers.entries()),
    });
  }
  
  return result;
}
