/**
 * API Rate Limiting
 * 
 * Token bucket algorithm with Redis (Upstash/Vercel KV)
 */

import { getSupabaseServiceClient } from '@/lib/supabase';

// Build-safe: Do not create a Supabase client at module load. Always obtain
// a client at runtime inside functions via getSupabaseServiceClient().

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowSeconds: number; // Time window in seconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when window resets
  retryAfter?: number; // Seconds until next request allowed
}

export class RateLimitError extends Error {
  constructor(
    public result: RateLimitResult
  ) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Per API key (STRICTER: 600 → 100)
  api_key: {
    maxRequests: 100, // 100 requests
    windowSeconds: 60, // per minute
  },
  
  // Per IP (for requests without API key) (STRICTER: 60 → 10)
  ip: {
    maxRequests: 10, // 10 requests
    windowSeconds: 60, // per minute
  },
  
  // Per org (total across all keys) (STRICTER: 10k → 3k)
  org: {
    maxRequests: 3000, // 3k requests
    windowSeconds: 3600, // per hour
  },
  
  // ========================================================================
  // EXPENSIVE AI/COMPUTE OPERATIONS (Very Strict)
  // ========================================================================
  
  'POST:/v1/messages/generate': {
    maxRequests: 30, // 30 per hour (was 100)
    windowSeconds: 3600,
  },
  'POST:/v1/warmth/recompute': {
    maxRequests: 20, // 20 per hour (was 50)
    windowSeconds: 3600,
  },
  'GET:/v1/contacts/:id/context-bundle': {
    maxRequests: 60, // 60 per hour (complex query)
    windowSeconds: 3600,
  },
  'POST:/v1/outbox': {
    maxRequests: 50, // 50 per hour (prevents spam)
    windowSeconds: 3600,
  },
  
  // ========================================================================
  // WRITE OPERATIONS (Strict)
  // ========================================================================
  
  'POST:/v1/contacts': {
    maxRequests: 50, // 50 per minute
    windowSeconds: 60,
  },
  'PATCH:/v1/contacts/:id': {
    maxRequests: 50, // 50 per minute
    windowSeconds: 60,
  },
  'DELETE:/v1/contacts/:id': {
    maxRequests: 20, // 20 per minute (destructive)
    windowSeconds: 60,
  },
  'POST:/v1/contacts/:id/channels': {
    maxRequests: 30, // 30 per minute
    windowSeconds: 60,
  },
  'PATCH:/v1/contacts/:id/channels/:channelId': {
    maxRequests: 50, // 50 per minute
    windowSeconds: 60,
  },
  'DELETE:/v1/contacts/:id/channels/:channelId': {
    maxRequests: 20, // 20 per minute (destructive)
    windowSeconds: 60,
  },
  'PATCH:/v1/contacts/:id/preferences': {
    maxRequests: 50, // 50 per minute
    windowSeconds: 60,
  },
  'POST:/v1/interactions': {
    maxRequests: 100, // 100 per minute (common operation)
    windowSeconds: 60,
  },
  'PATCH:/v1/interactions/:id': {
    maxRequests: 50, // 50 per minute
    windowSeconds: 60,
  },
  'DELETE:/v1/interactions/:id': {
    maxRequests: 20, // 20 per minute (destructive)
    windowSeconds: 60,
  },
  'POST:/v1/policies/autopilot': {
    maxRequests: 10, // 10 per hour (sensitive operation)
    windowSeconds: 3600,
  },
  
  // ========================================================================
  // READ OPERATIONS (Moderate)
  // ========================================================================
  
  'GET:/v1/contacts': {
    maxRequests: 200, // 200 per hour (listing)
    windowSeconds: 3600,
  },
  'GET:/v1/contacts/:id': {
    maxRequests: 300, // 300 per hour
    windowSeconds: 3600,
  },
  'GET:/v1/contacts/:id/preferences': {
    maxRequests: 100, // 100 per hour
    windowSeconds: 3600,
  },
  'GET:/v1/contacts/:id/channels': {
    maxRequests: 100, // 100 per hour
    windowSeconds: 3600,
  },
  'GET:/v1/contacts/:id/effective-channel': {
    maxRequests: 150, // 150 per hour (used frequently by AI)
    windowSeconds: 3600,
  },
  'GET:/v1/interactions': {
    maxRequests: 200, // 200 per hour
    windowSeconds: 3600,
  },
  'GET:/v1/policies/autopilot': {
    maxRequests: 100, // 100 per hour
    windowSeconds: 3600,
  },
  
  // ========================================================================
  // BURST PROTECTION (Short Windows)
  // ========================================================================
  
  // Prevent rapid-fire bulk operations
  'bulk_writes': {
    maxRequests: 5, // 5 per 10 seconds
    windowSeconds: 10,
  },
  // Prevent search/query abuse
  'search': {
    maxRequests: 20, // 20 per 30 seconds
    windowSeconds: 30,
  },
};

// ============================================================================
// RATE LIMITING LOGIC (DATABASE-BASED)
// ============================================================================

/**
 * Check rate limit for a key
 */
export async function checkRateLimit(
  keyType: string,
  keyValue: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (config.windowSeconds * 1000)) * (config.windowSeconds * 1000));
  const reset = Math.floor(windowStart.getTime() / 1000) + config.windowSeconds;

  // Try to get existing window
  const { data: existing, error: selectError } = await getSupabaseServiceClient()
    .from('api_rate_limits')
    .select('*')
    .eq('key_type', keyType)
    .eq('key_value', keyValue)
    .eq('window_start', windowStart.toISOString())
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // Not found is OK
    console.error('Rate limit check error:', selectError);
    // Fail open (allow request if database is down)
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset,
    };
  }

  if (existing) {
    // Window exists, check if limit exceeded
    if (existing.request_count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset,
        retryAfter: reset - Math.floor(Date.now() / 1000),
      };
    }

    // Increment count
    const { error: updateError } = await getSupabaseServiceClient()
      .from('api_rate_limits')
      .update({
        request_count: existing.request_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - existing.request_count - 1,
      reset,
    };
  } else {
    // Create new window
    const { error: insertError } = await getSupabaseServiceClient()
      .from('api_rate_limits')
      .insert({
        key_type: keyType,
        key_value: keyValue,
        window_start: windowStart.toISOString(),
        window_duration_seconds: config.windowSeconds,
        request_count: 1,
        limit_max: config.maxRequests,
      });

    if (insertError) {
      // If duplicate key error, another request created the window - fetch it
      if (insertError.code === '23505') {
        const { data: existing } = await getSupabaseServiceClient()
          .from('api_rate_limits')
          .select('*')
          .eq('key_type', keyType)
          .eq('key_value', keyValue)
          .eq('window_start', windowStart.toISOString())
          .single();

        if (existing) {
          // Increment the existing window
          const { data: updated } = await getSupabaseServiceClient()
            .from('api_rate_limits')
            .update({ request_count: existing.request_count + 1 })
            .eq('key_type', keyType)
            .eq('key_value', keyValue)
            .eq('window_start', windowStart.toISOString())
            .select()
            .single();

          if (updated && updated.request_count > config.maxRequests) {
            return {
              success: false,
              limit: config.maxRequests,
              remaining: 0,
              reset,
              retryAfter: Math.ceil((reset - Date.now()) / 1000),
            };
          }

          return {
            success: true,
            limit: config.maxRequests,
            remaining: config.maxRequests - (updated?.request_count || 1),
            reset,
          };
        }
      }
      console.error('Rate limit insert error:', insertError);
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset,
    };
  }
}

/**
 * Check multiple rate limits (API key + IP + org)
 */
export async function checkMultipleRateLimits(
  apiKeyId: string,
  orgId: string,
  ipAddress: string,
  endpoint?: string
): Promise<RateLimitResult> {
  const checks: Promise<RateLimitResult>[] = [];

  // Check API key rate limit
  checks.push(checkRateLimit('api_key', apiKeyId, RATE_LIMIT_CONFIGS.api_key));

  // Check org rate limit
  checks.push(checkRateLimit('org', orgId, RATE_LIMIT_CONFIGS.org));

  // Check endpoint-specific limit if applicable
  if (endpoint && RATE_LIMIT_CONFIGS[endpoint]) {
    checks.push(checkRateLimit('api_key', `${apiKeyId}:${endpoint}`, RATE_LIMIT_CONFIGS[endpoint]));
  }

  const results = await Promise.all(checks);

  // Return first failed check
  for (const result of results) {
    if (!result.success) {
      return result;
    }
  }

  // All passed, return most restrictive remaining count
  const minRemaining = Math.min(...results.map(r => r.remaining));
  return {
    ...results[0],
    remaining: minRemaining,
  };
}

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (result.retryAfter !== undefined) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old rate limit windows (call periodically)
 */
export async function cleanupOldRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  const { error, count } = await getSupabaseServiceClient()
    .from('api_rate_limits')
    .delete()
    .lt('window_start', cutoff.toISOString());

  if (error) {
    console.error('Rate limit cleanup error:', error);
    return 0;
  }

  return count || 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  checkRateLimit,
  checkMultipleRateLimits,
  addRateLimitHeaders,
  cleanupOldRateLimits,
  RATE_LIMIT_CONFIGS,
};
