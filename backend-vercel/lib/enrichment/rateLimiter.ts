// lib/enrichment/rateLimiter.ts
// Redis token bucket rate limiter

import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await redis.connect();
    isConnected = true;
  }
}

export function bucketKey(workspaceId: string): string {
  return `rl:enrichment:${workspaceId}`;
}

/**
 * Token bucket algorithm with atomic refill
 * @param workspaceId - Workspace identifier
 * @param config - Rate limit configuration
 * @returns true if request allowed, false if rate limited
 */
export async function allow(
  workspaceId: string,
  config: { rps: number; burst?: number }
): Promise<boolean> {
  await ensureConnection();

  const key = bucketKey(workspaceId);
  const now = Date.now();
  const refillMs = 1000 / config.rps;
  const burst = config.burst || 60;

  // Lua script for atomic token bucket operation
  const lua = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local refillMs = tonumber(ARGV[2])
    local burst = tonumber(ARGV[3])
    
    -- Get last refill time
    local last = redis.call("HGET", key, "t")
    if not last then
      last = now
    else
      last = tonumber(last)
    end
    
    -- Get current tokens
    local tokens = redis.call("HGET", key, "tok")
    if not tokens then
      tokens = burst
    else
      tokens = tonumber(tokens)
    end
    
    -- Refill tokens based on time elapsed
    local elapsed = now - last
    tokens = math.min(burst, tokens + (elapsed / refillMs))
    
    -- Check if we have tokens available
    if tokens < 1 then
      redis.call("HSET", key, "t", now)
      redis.call("HSET", key, "tok", tokens)
      return 0
    end
    
    -- Consume one token
    tokens = tokens - 1
    redis.call("HSET", key, "t", now)
    redis.call("HSET", key, "tok", tokens)
    redis.call("PEXPIRE", key, math.ceil(refillMs * burst))
    
    return 1
  `;

  const result = await redis.eval(lua, {
    keys: [key],
    arguments: [String(now), String(refillMs), String(burst)]
  });

  return result === 1;
}

/**
 * Get remaining tokens for a workspace
 */
export async function getRemainingTokens(workspaceId: string): Promise<number> {
  await ensureConnection();

  const key = bucketKey(workspaceId);
  const tokens = await redis.hGet(key, 'tok');
  
  return tokens ? parseFloat(tokens) : 0;
}

/**
 * Reset rate limit bucket for a workspace
 */
export async function resetBucket(workspaceId: string): Promise<void> {
  await ensureConnection();

  const key = bucketKey(workspaceId);
  await redis.del(key);
}

/**
 * Get rate limit info for headers
 */
export async function getRateLimitInfo(
  workspaceId: string,
  config: { rps: number; burst?: number }
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
}> {
  await ensureConnection();

  const key = bucketKey(workspaceId);
  const burst = config.burst || 60;
  
  const [tokens, lastRefill] = await Promise.all([
    redis.hGet(key, 'tok'),
    redis.hGet(key, 't')
  ]);

  const remaining = tokens ? Math.floor(parseFloat(tokens)) : burst;
  const refillMs = 1000 / config.rps;
  const resetTime = lastRefill 
    ? parseInt(lastRefill) + Math.ceil(refillMs * burst)
    : Date.now() + Math.ceil(refillMs * burst);

  return {
    limit: burst,
    remaining,
    reset: Math.ceil(resetTime / 1000) // Unix timestamp in seconds
  };
}
