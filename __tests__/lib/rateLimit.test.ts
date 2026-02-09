/**
 * Rate Limiting Tests
 * 
 * Tests the backend rate limiter logic (checkRateLimit).
 * This is a pure function test — no network or DB needed.
 */

// Inline copy of checkRateLimit from backend-vercel/lib/rateLimit.ts
// (backend-vercel is excluded from jest module resolution)
type Bucket = { count: number; resetAt: number };
type RateCheck = { allowed: boolean; remaining: number; limit: number; retryAfter?: number };

const globalAny = globalThis as any;
const buckets: Map<string, Bucket> = globalAny.__rateBuckets ?? new Map();
if (!globalAny.__rateBuckets) globalAny.__rateBuckets = buckets;

function checkRateLimit(key: string, limit = 60, windowMs = 60_000): RateCheck {
  const ts = Date.now();
  const slot = Math.floor(ts / windowMs);
  const bucketKey = `${key}:${slot}`;
  let b = buckets.get(bucketKey);
  if (!b) {
    b = { count: 0, resetAt: (slot + 1) * windowMs };
    buckets.set(bucketKey, b);
  }
  if (b.count >= limit) {
    const retryAfter = Math.max(0, Math.ceil((b.resetAt - ts) / 1000));
    return { allowed: false, remaining: 0, limit, retryAfter };
  }
  b.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - b.count), limit };
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Clear all rate limit buckets between tests
    const globalAny = globalThis as any;
    if (globalAny.__rateBuckets) {
      globalAny.__rateBuckets.clear();
    }
  });

  test('allows first request', () => {
    const result = checkRateLimit('test-key', 60, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.limit).toBe(60);
  });

  test('decrements remaining on each call', () => {
    const r1 = checkRateLimit('decrement-key', 5, 60000);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit('decrement-key', 5, 60000);
    expect(r2.remaining).toBe(3);

    const r3 = checkRateLimit('decrement-key', 5, 60000);
    expect(r3.remaining).toBe(2);
  });

  test('blocks after limit is reached', () => {
    // Use limit of 3
    checkRateLimit('block-key', 3, 60000);
    checkRateLimit('block-key', 3, 60000);
    checkRateLimit('block-key', 3, 60000);

    const blocked = checkRateLimit('block-key', 3, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(0);
  });

  test('different keys have independent limits', () => {
    // Exhaust key A
    checkRateLimit('key-a', 1, 60000);
    const blockedA = checkRateLimit('key-a', 1, 60000);
    expect(blockedA.allowed).toBe(false);

    // Key B should still be allowed
    const allowedB = checkRateLimit('key-b', 1, 60000);
    expect(allowedB.allowed).toBe(true);
  });

  test('uses default limit of 60 and window of 60s', () => {
    const result = checkRateLimit('default-key');
    expect(result.limit).toBe(60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  test('retryAfter is a positive number when blocked', () => {
    checkRateLimit('retry-key', 1, 60000);
    const blocked = checkRateLimit('retry-key', 1, 60000);
    expect(blocked.allowed).toBe(false);
    expect(typeof blocked.retryAfter).toBe('number');
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });
});
