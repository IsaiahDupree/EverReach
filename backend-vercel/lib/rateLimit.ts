type Bucket = { count: number; resetAt: number };

const globalAny = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = globalAny.__rateBuckets ?? new Map();
if (!globalAny.__rateBuckets) globalAny.__rateBuckets = buckets;

function now() { return Date.now(); }

export type RateCheck = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter?: number; // seconds until reset
};

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000): RateCheck {
  const ts = now();
  const slot = Math.floor(ts / windowMs); // coarse window
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
