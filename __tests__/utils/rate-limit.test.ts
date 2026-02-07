/**
 * Backend Rate Limiter Tests
 * BACK-UTIL-003: Rate Limiter
 *
 * Tests for rate limiting middleware that implements
 * per-user and per-IP request limits with 429 responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createRateLimiter,
  RateLimitConfig,
  RateLimitStore,
  MemoryRateLimitStore,
  checkRateLimit,
  withRateLimit,
} from '@/lib/utils/rate-limit';

describe('BACK-UTIL-003: Rate Limiter', () => {
  let store: RateLimitStore;

  beforeEach(() => {
    // Create a fresh store for each test
    store = new MemoryRateLimitStore();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('MemoryRateLimitStore', () => {
    it('should initialize with empty state', async () => {
      const key = 'test-key';
      const record = await store.get(key);

      expect(record).toBeNull();
    });

    it('should increment request count for a key', async () => {
      const key = 'test-key';
      const windowMs = 60000; // 1 minute

      await store.increment(key, windowMs);
      const record = await store.get(key);

      expect(record).not.toBeNull();
      expect(record!.count).toBe(1);
      expect(record!.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple increments for same key', async () => {
      const key = 'test-key';
      const windowMs = 60000;

      await store.increment(key, windowMs);
      await store.increment(key, windowMs);
      await store.increment(key, windowMs);

      const record = await store.get(key);
      expect(record!.count).toBe(3);
    });

    it('should reset count after window expires', async () => {
      const key = 'test-key';
      const windowMs = 100; // 100ms for fast test

      await store.increment(key, windowMs);
      const firstRecord = await store.get(key);
      expect(firstRecord!.count).toBe(1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      await store.increment(key, windowMs);
      const secondRecord = await store.get(key);
      expect(secondRecord!.count).toBe(1); // Reset to 1
    });

    it('should handle multiple different keys independently', async () => {
      const windowMs = 60000;

      await store.increment('key1', windowMs);
      await store.increment('key1', windowMs);
      await store.increment('key2', windowMs);

      const record1 = await store.get('key1');
      const record2 = await store.get('key2');

      expect(record1!.count).toBe(2);
      expect(record2!.count).toBe(1);
    });

    it('should clean up expired entries', async () => {
      const key = 'test-key';
      const windowMs = 100;

      await store.increment(key, windowMs);
      const beforeCleanup = await store.get(key);
      expect(beforeCleanup).not.toBeNull();

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Cleanup should remove expired entries
      await store.cleanup();
      const afterCleanup = await store.get(key);
      expect(afterCleanup).toBeNull();
    });
  });

  describe('checkRateLimit', () => {
    const config: RateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    };

    it('should allow requests under the limit', async () => {
      const key = 'test-user';

      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(key, config, store);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
        expect(result.remaining).toBe(4 - i);
        expect(result.resetTime).toBeGreaterThan(Date.now());
      }
    });

    it('should block requests over the limit', async () => {
      const key = 'test-user';

      // Make max allowed requests
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(key, config, store);
      }

      // Next request should be blocked
      const result = await checkRateLimit(key, config, store);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return correct retry-after time when blocked', async () => {
      const key = 'test-user';

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(key, config, store);
      }

      const result = await checkRateLimit(key, config, store);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after the window expires', async () => {
      const shortConfig: RateLimitConfig = {
        windowMs: 100,
        maxRequests: 2,
      };
      const key = 'test-user';

      // Exhaust limit
      await checkRateLimit(key, shortConfig, store);
      await checkRateLimit(key, shortConfig, store);

      const blockedResult = await checkRateLimit(key, shortConfig, store);
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const allowedResult = await checkRateLimit(key, shortConfig, store);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBe(1);
    });
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with per-user limits', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (req) => `user:${req.userId}`,
      });

      const mockRequest = { userId: 'user123' } as any;

      for (let i = 0; i < 5; i++) {
        const result = await limiter(mockRequest);
        expect(result.allowed).toBe(true);
      }

      const blockedResult = await limiter(mockRequest);
      expect(blockedResult.allowed).toBe(false);
    });

    it('should create a rate limiter with per-IP limits', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyGenerator: (req) => `ip:${req.ip}`,
      });

      const mockRequest = { ip: '192.168.1.1' } as any;

      for (let i = 0; i < 3; i++) {
        const result = await limiter(mockRequest);
        expect(result.allowed).toBe(true);
      }

      const blockedResult = await limiter(mockRequest);
      expect(blockedResult.allowed).toBe(false);
    });

    it('should use custom key generator', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req) => `custom:${req.apiKey}`,
      });

      const mockRequest = { apiKey: 'abc123' } as any;

      const result1 = await limiter(mockRequest);
      const result2 = await limiter(mockRequest);
      const result3 = await limiter(mockRequest);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(false);
    });

    it('should support custom store', async () => {
      const customStore = new MemoryRateLimitStore();
      const limiter = createRateLimiter(
        {
          windowMs: 60000,
          maxRequests: 5,
          keyGenerator: (req) => req.id,
        },
        customStore
      );

      const mockRequest = { id: 'test' } as any;
      await limiter(mockRequest);

      const record = await customStore.get('test');
      expect(record).not.toBeNull();
      expect(record!.count).toBe(1);
    });
  });

  describe('withRateLimit middleware', () => {
    it('should allow requests under rate limit', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 5,
          keyGenerator: (req) => req.ip || 'unknown',
        },
        testStore
      );

      const mockRequest = {
        ip: '192.168.1.1',
        headers: new Headers(),
      } as any;

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should return 429 when rate limit exceeded', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 2,
          keyGenerator: (req) => req.ip || 'unknown',
        },
        testStore
      );

      const mockRequest = {
        ip: '192.168.1.1',
        headers: new Headers(),
      } as any;

      // Exhaust limit
      await handler(mockRequest);
      await handler(mockRequest);

      // Should be rate limited
      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('Too many requests');
      expect(data.error.statusCode).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('2');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('should set correct rate limit headers', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 10,
          keyGenerator: (req) => req.ip || 'unknown',
        },
        testStore
      );

      const mockRequest = {
        ip: '192.168.1.1',
        headers: new Headers(),
      } as any;

      const response = await handler(mockRequest);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');

      const resetTime = response.headers.get('X-RateLimit-Reset');
      expect(resetTime).toBeDefined();
      expect(Number(resetTime)).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should handle requests from different IPs independently', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 2,
          keyGenerator: (req) => req.ip || 'unknown',
        },
        testStore
      );

      const request1 = { ip: '192.168.1.1', headers: new Headers() } as any;
      const request2 = { ip: '192.168.1.2', headers: new Headers() } as any;

      // Both should be able to make 2 requests
      await handler(request1);
      await handler(request1);
      await handler(request2);
      await handler(request2);

      // Third request for each should be blocked
      const response1 = await handler(request1);
      const response2 = await handler(request2);

      expect(response1.status).toBe(429);
      expect(response2.status).toBe(429);
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 2,
          keyGenerator: (req) => {
            const forwarded = req.headers.get('x-forwarded-for');
            return forwarded || req.ip || 'unknown';
          },
        },
        testStore
      );

      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.1, 198.51.100.1');

      const mockRequest = {
        headers,
      } as any;

      await handler(mockRequest);
      await handler(mockRequest);

      const response = await handler(mockRequest);
      expect(response.status).toBe(429);
    });

    it('should handle user-based rate limiting', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async (req: any) => {
          return NextResponse.json({ user: req.userId });
        },
        {
          windowMs: 60000,
          maxRequests: 3,
          keyGenerator: (req: any) => `user:${req.userId || 'anonymous'}`,
        },
        testStore
      );

      const mockRequest = {
        userId: 'user123',
        headers: new Headers(),
      } as any;

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const response = await handler(mockRequest);
        expect(response.status).toBe(200);
      }

      // 4th request should be blocked
      const response = await handler(mockRequest);
      expect(response.status).toBe(429);
    });

    it('should allow different users to have independent limits', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 2,
          keyGenerator: (req: any) => `user:${req.userId}`,
        },
        testStore
      );

      const user1Request = { userId: 'user1', headers: new Headers() } as any;
      const user2Request = { userId: 'user2', headers: new Headers() } as any;

      // Each user should have independent limits
      await handler(user1Request);
      await handler(user1Request);
      await handler(user2Request);
      await handler(user2Request);

      const user1Response = await handler(user1Request);
      const user2Response = await handler(user2Request);

      expect(user1Response.status).toBe(429);
      expect(user2Response.status).toBe(429);
    });
  });

  describe('Acceptance Criteria', () => {
    it('Per-user limits - tracks requests per authenticated user', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async (req: any) => {
          return NextResponse.json({ user: req.userId });
        },
        {
          windowMs: 60000,
          maxRequests: 5,
          keyGenerator: (req: any) => `user:${req.userId}`,
        },
        testStore
      );

      const user1 = { userId: 'alice', headers: new Headers() } as any;
      const user2 = { userId: 'bob', headers: new Headers() } as any;

      // Alice makes 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        const res = await handler(user1);
        expect(res.status).toBe(200);
      }

      // Alice's next request blocked
      const aliceBlocked = await handler(user1);
      expect(aliceBlocked.status).toBe(429);

      // Bob can still make requests
      const bobAllowed = await handler(user2);
      expect(bobAllowed.status).toBe(200);
    });

    it('Per-IP limits - tracks requests per IP address', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 3,
          keyGenerator: (req) => `ip:${req.ip}`,
        },
        testStore
      );

      const ip1 = { ip: '192.168.1.1', headers: new Headers() } as any;
      const ip2 = { ip: '192.168.1.2', headers: new Headers() } as any;

      // IP1 makes 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        const res = await handler(ip1);
        expect(res.status).toBe(200);
      }

      // IP1's next request blocked
      const ip1Blocked = await handler(ip1);
      expect(ip1Blocked.status).toBe(429);

      // IP2 can still make requests
      const ip2Allowed = await handler(ip2);
      expect(ip2Allowed.status).toBe(200);
    });

    it('429 response - returns Too Many Requests status when limit exceeded', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 1,
          keyGenerator: (req) => req.ip || 'test',
        },
        testStore
      );

      const mockRequest = { ip: '192.168.1.1', headers: new Headers() } as any;

      // First request succeeds
      const firstResponse = await handler(mockRequest);
      expect(firstResponse.status).toBe(200);

      // Second request gets 429
      const secondResponse = await handler(mockRequest);
      const errorData = await secondResponse.json();

      expect(secondResponse.status).toBe(429);
      expect(errorData.error).toBeDefined();
      expect(errorData.error.statusCode).toBe(429);
      expect(errorData.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(errorData.error.message).toBeDefined();

      // Should include Retry-After header
      const retryAfter = secondResponse.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });
  });

  describe('Production Scenarios', () => {
    it('should handle high-traffic authenticated API with per-user limits', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async (req: any) => {
          return NextResponse.json({ data: 'protected resource' });
        },
        {
          windowMs: 60000, // 1 minute window
          maxRequests: 100, // 100 requests per minute per user
          keyGenerator: (req: any) => `user:${req.userId}`,
        },
        testStore
      );

      const user = { userId: 'user123', headers: new Headers() } as any;

      // Simulate 100 requests (should all succeed)
      for (let i = 0; i < 100; i++) {
        const res = await handler(user);
        expect(res.status).toBe(200);
      }

      // 101st request should be blocked
      const blockedRes = await handler(user);
      expect(blockedRes.status).toBe(429);
    });

    it('should handle public API with per-IP limits', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ data: 'public data' });
        },
        {
          windowMs: 60000, // 1 minute
          maxRequests: 20, // 20 requests per minute per IP
          keyGenerator: (req) => {
            // Extract IP from x-forwarded-for (common in production)
            const forwarded = req.headers.get('x-forwarded-for');
            if (forwarded) {
              return `ip:${forwarded.split(',')[0].trim()}`;
            }
            return `ip:${req.ip || 'unknown'}`;
          },
        },
        testStore
      );

      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.1');
      const request = { headers } as any;

      // Make 20 requests (should succeed)
      for (let i = 0; i < 20; i++) {
        const res = await handler(request);
        expect(res.status).toBe(200);
      }

      // 21st request blocked
      const blockedRes = await handler(request);
      expect(blockedRes.status).toBe(429);
    });

    it('should provide clear error message with retry information', async () => {
      const testStore = new MemoryRateLimitStore();
      const handler = withRateLimit(
        async () => {
          return NextResponse.json({ success: true });
        },
        {
          windowMs: 60000,
          maxRequests: 1,
          keyGenerator: () => 'test',
        },
        testStore
      );

      const request = { headers: new Headers() } as any;

      await handler(request);
      const response = await handler(request);
      const data = await response.json();

      expect(data.error.message).toContain('Too many requests');
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});
