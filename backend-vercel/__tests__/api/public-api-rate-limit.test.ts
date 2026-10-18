/**
 * Public API Rate Limiting Tests
 * 
 * Tests token bucket rate limiting, headers, and enforcement
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  checkMultipleRateLimits,
  addRateLimitHeaders,
  cleanupOldRateLimits,
  RATE_LIMIT_CONFIGS,
  RateLimitError,
} from '@/lib/api/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testApiKeyId: string;

beforeAll(async () => {
  // Create test org
  const { data: org } = await supabase.from('orgs').insert({
    name: 'Test Org - Rate Limit',
  }).select().single();
  testOrgId = org!.id;

  // Generate test API key ID
  testApiKeyId = crypto.randomUUID();
});

afterAll(async () => {
  // Cleanup rate limit entries
  await supabase.from('api_rate_limits').delete().eq('key_value', testApiKeyId);
  await supabase.from('api_rate_limits').delete().eq('key_value', testOrgId);
  await supabase.from('orgs').delete().eq('id', testOrgId);
});

// ============================================================================
// BASIC RATE LIMITING TESTS
// ============================================================================

describe('Basic Rate Limiting', () => {
  test('should allow first request within limit', async () => {
    const keyValue = `test-key-${Date.now()}`;
    const config = { maxRequests: 10, windowSeconds: 60 };

    const result = await checkRateLimit('api_key', keyValue, config);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should track multiple requests in same window', async () => {
    const keyValue = `test-key-${Date.now()}`;
    const config = { maxRequests: 5, windowSeconds: 60 };

    // Make 3 requests
    const result1 = await checkRateLimit('api_key', keyValue, config);
    const result2 = await checkRateLimit('api_key', keyValue, config);
    const result3 = await checkRateLimit('api_key', keyValue, config);

    expect(result1.remaining).toBe(4);
    expect(result2.remaining).toBe(3);
    expect(result3.remaining).toBe(2);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should reject request when limit exceeded', async () => {
    const keyValue = `test-key-${Date.now()}`;
    const config = { maxRequests: 3, windowSeconds: 60 };

    // Fill up the limit
    await checkRateLimit('api_key', keyValue, config);
    await checkRateLimit('api_key', keyValue, config);
    await checkRateLimit('api_key', keyValue, config);

    // This should fail
    const result = await checkRateLimit('api_key', keyValue, config);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should reset in new window', async () => {
    const keyValue = `test-key-${Date.now()}`;
    const config = { maxRequests: 2, windowSeconds: 2 }; // 2 second window

    // Use up limit in first window
    await checkRateLimit('api_key', keyValue, config);
    await checkRateLimit('api_key', keyValue, config);
    
    const result1 = await checkRateLimit('api_key', keyValue, config);
    expect(result1.success).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 2100));

    // Should work in new window
    const result2 = await checkRateLimit('api_key', keyValue, config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });
});

// ============================================================================
// MULTIPLE RATE LIMIT TESTS
// ============================================================================

describe('Multiple Rate Limits', () => {
  test('should enforce all rate limits', async () => {
    const apiKeyId = `test-key-${Date.now()}`;
    const orgId = testOrgId;
    const ipAddress = '192.168.1.100';

    const result = await checkMultipleRateLimits(apiKeyId, orgId, ipAddress);

    expect(result.success).toBe(true);
    expect(result.limit).toBeGreaterThan(0);
    expect(result.remaining).toBeGreaterThan(0);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', apiKeyId);
  });

  test('should return most restrictive remaining count', async () => {
    const apiKeyId = `test-key-${Date.now()}`;
    const orgId = testOrgId;
    const ipAddress = '192.168.1.101';

    // Make multiple requests to consume from different buckets
    await checkMultipleRateLimits(apiKeyId, orgId, ipAddress);
    await checkMultipleRateLimits(apiKeyId, orgId, ipAddress);
    const result = await checkMultipleRateLimits(apiKeyId, orgId, ipAddress);

    // Remaining should be minimum across all limits
    expect(result.remaining).toBeGreaterThan(0);
    expect(result.remaining).toBeLessThan(RATE_LIMIT_CONFIGS.api_key.maxRequests);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', apiKeyId);
  });

  test('should fail if any limit exceeded', async () => {
    const apiKeyId = `test-key-${Date.now()}`;
    const orgId = testOrgId;
    const ipAddress = '192.168.1.102';

    // Exhaust API key limit (smallest)
    const keyConfig = RATE_LIMIT_CONFIGS.api_key;
    for (let i = 0; i < keyConfig.maxRequests; i++) {
      await checkRateLimit('api_key', apiKeyId, keyConfig);
    }

    // checkMultipleRateLimits should now fail
    const result = await checkMultipleRateLimits(apiKeyId, orgId, ipAddress);
    expect(result.success).toBe(false);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', apiKeyId);
  });
});
// ============================================================================
// ENDPOINT-SPECIFIC LIMITS TESTS
// ============================================================================

describe('Endpoint-Specific Limits', () => {
  test('should enforce stricter limit for AI generation endpoint', async () => {
    const apiKeyId = `test-key-${Date.now()}`;
    const orgId = testOrgId;
    const ipAddress = '192.168.1.103';
    const endpoint = 'POST:/v1/messages/generate';

    const config = RATE_LIMIT_CONFIGS[endpoint];
    expect(config.maxRequests).toBe(100);
    expect(config.windowSeconds).toBe(3600); // 1 hour

    const result = await checkMultipleRateLimits(apiKeyId, orgId, ipAddress, endpoint);
    expect(result.success).toBe(true);

    // Cleanup
    await supabase.from('api_rate_limits').delete().like('key_value', `${apiKeyId}%`);
  });

  test('should have stricter limits for expensive operations', () => {
    const generateLimit = RATE_LIMIT_CONFIGS['POST:/v1/messages/generate'];
    const recomputeLimit = RATE_LIMIT_CONFIGS['POST:/v1/warmth/recompute'];

    // AI generation should be more restricted
    expect(generateLimit.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.api_key.maxRequests);
    expect(generateLimit.windowSeconds).toBeGreaterThan(RATE_LIMIT_CONFIGS.api_key.windowSeconds);

    // Warmth recompute should be even more restricted
    expect(recomputeLimit.maxRequests).toBeLessThan(generateLimit.maxRequests);
});

// ============================================================================
// CONCURRENT REQUEST TESTS
// ============================================================================

describe('Concurrent Requests', () => {
  test('should handle concurrent requests correctly', async () => {
    const keyValue = `concurrent-test-${Date.now()}`;
    const config = { maxRequests: 10, windowSeconds: 60 };

    // Make 5 concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      checkRateLimit('api_key', keyValue, config)
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Remaining should account for all requests
    const finalResult = await checkRateLimit('api_key', keyValue, config);
    expect(finalResult.remaining).toBeLessThanOrEqual(4); // 10 - 5 - 1 = 4

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });
});

// ============================================================================
// DIFFERENT KEY TYPES TESTS
// ============================================================================

describe('Different Key Types', () => {
  test('should handle api_key type', async () => {
    const keyValue = `api-key-${Date.now()}`;
    const config = { maxRequests: 10, windowSeconds: 60 };

    const result = await checkRateLimit('api_key', keyValue, config);
    expect(result.success).toBe(true);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should handle ip type', async () => {
    const keyValue = '192.168.1.200';
    const config = { maxRequests: 10, windowSeconds: 60 };

    const result = await checkRateLimit('ip', keyValue, config);
    expect(result.success).toBe(true);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should handle org type', async () => {
    const keyValue = testOrgId;
    const config = { maxRequests: 10, windowSeconds: 60 };

    const result = await checkRateLimit('org', keyValue, config);
    expect(result.success).toBe(true);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });

  test('should isolate limits by key type', async () => {
    const keyValue = `isolation-test-${Date.now()}`;
    const config = { maxRequests: 3, windowSeconds: 60 };

    // Exhaust api_key limit
    await checkRateLimit('api_key', keyValue, config);
    await checkRateLimit('api_key', keyValue, config);
    await checkRateLimit('api_key', keyValue, config);

    const apiKeyResult = await checkRateLimit('api_key', keyValue, config);
    expect(apiKeyResult.success).toBe(false);

    // ip limit should still work
    const ipResult = await checkRateLimit('ip', keyValue, config);
    expect(ipResult.success).toBe(true);

    // Cleanup
    await supabase.from('api_rate_limits').delete().eq('key_value', keyValue);
  });
});

});

console.log('✅ Public API Rate Limiting Tests Complete');
