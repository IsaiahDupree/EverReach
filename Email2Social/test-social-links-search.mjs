/**
 * Comprehensive Test Suite for Social Links Search API Client
 * 
 * This test suite covers:
 * - Unit tests for all methods
 * - Rate limiting functionality
 * - Error handling
 * - Integration tests with live API
 * - Performance benchmarks
 * 
 * Usage:
 *   Set RAPIDAPI_KEY environment variable
 *   Run: node test-social-links-search.mjs
 */

import SocialLinksSearchClient from './social-links-search.js';

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Social Links Search API Tests\n');
    console.log('='.repeat(60));

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ PASS: ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Error: ${error.message}`);
        if (error.stack) {
          console.log(`   ${error.stack.split('\n')[1]?.trim()}`);
        }
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   ⏭️  Skipped: ${this.skipped}`);
    console.log(`   📈 Total: ${this.tests.length}`);
    console.log(`   🎯 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%\n`);

    return this.failed === 0;
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw an error');
  }
}

async function assertThrowsAsync(fn, message) {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected async function to throw an error');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock fetch for unit tests
class MockFetch {
  constructor(response) {
    this.response = response;
    this.calls = [];
  }

  async fetch(url, options) {
    this.calls.push({ url, options });
    return this.response;
  }

  getCalls() {
    return this.calls;
  }

  reset() {
    this.calls = [];
  }
}

// Test suite
const runner = new TestRunner();

// =============================================================================
// UNIT TESTS - Constructor & Configuration
// =============================================================================

runner.test('Constructor: should throw error without API key', () => {
  assertThrows(
    () => new SocialLinksSearchClient({}),
    'Should throw error when API key is missing'
  );
});

runner.test('Constructor: should accept API key', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  assert(client.apiKey === 'test-key', 'API key should be set');
});

runner.test('Constructor: should set default values', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  assertEqual(client.requestsPerSecond, 1, 'Default rate limit should be 1');
  assertEqual(client.maxRetries, 3, 'Default max retries should be 3');
  assertEqual(client.retryDelay, 1000, 'Default retry delay should be 1000ms');
  assert(client.enableRateLimiting === true, 'Rate limiting should be enabled by default');
});

runner.test('Constructor: should accept custom configuration', () => {
  const client = new SocialLinksSearchClient({
    apiKey: 'test-key',
    requestsPerSecond: 5,
    maxRetries: 5,
    retryDelay: 2000,
    enableRateLimiting: false
  });
  assertEqual(client.requestsPerSecond, 5);
  assertEqual(client.maxRetries, 5);
  assertEqual(client.retryDelay, 2000);
  assert(client.enableRateLimiting === false);
});

// =============================================================================
// UNIT TESTS - Static Properties
// =============================================================================

runner.test('Static: SUPPORTED_NETWORKS should contain all networks', () => {
  const networks = SocialLinksSearchClient.SUPPORTED_NETWORKS;
  assert(Array.isArray(networks), 'SUPPORTED_NETWORKS should be an array');
  assert(networks.includes('facebook'), 'Should include facebook');
  assert(networks.includes('linkedin'), 'Should include linkedin');
  assert(networks.includes('twitter'), 'Should include twitter');
  assert(networks.length === 9, 'Should have 9 supported networks');
});

runner.test('Static: RATE_LIMITS should contain all tiers', () => {
  const limits = SocialLinksSearchClient.RATE_LIMITS;
  assert(limits.BASIC, 'Should have BASIC tier');
  assert(limits.PRO, 'Should have PRO tier');
  assert(limits.ULTRA, 'Should have ULTRA tier');
  assert(limits.MEGA, 'Should have MEGA tier');
  assertEqual(limits.BASIC.requestsPerSecond, 1);
  assertEqual(limits.PRO.requestsPerSecond, 5);
  assertEqual(limits.ULTRA.requestsPerSecond, 10);
  assertEqual(limits.MEGA.requestsPerSecond, 20);
});

// =============================================================================
// UNIT TESTS - Statistics Methods
// =============================================================================

runner.test('getStats: should return initial statistics', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  const stats = client.getStats();
  
  assertEqual(stats.totalRequests, 0);
  assertEqual(stats.successfulRequests, 0);
  assertEqual(stats.failedRequests, 0);
  assertEqual(stats.rateLimitHits, 0);
  assertEqual(stats.averageResponseTime, 0);
  assertEqual(stats.queueLength, 0);
  assert(stats.rateLimitingEnabled === true);
});

runner.test('resetStats: should reset all counters', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  client.stats.totalRequests = 100;
  client.stats.successfulRequests = 95;
  client.resetStats();
  
  assertEqual(client.stats.totalRequests, 0);
  assertEqual(client.stats.successfulRequests, 0);
});

// =============================================================================
// UNIT TESTS - Rate Limiting Configuration
// =============================================================================

runner.test('setRateLimit: should update rate limit', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  client.setRateLimit(10);
  assertEqual(client.requestsPerSecond, 10);
});

runner.test('setRateLimit: should throw error for invalid rate', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  assertThrows(
    () => client.setRateLimit(0),
    'Should throw error for rate limit of 0'
  );
  assertThrows(
    () => client.setRateLimit(-1),
    'Should throw error for negative rate limit'
  );
});

runner.test('setTier: should configure client based on tier', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  
  client.setTier('PRO');
  assertEqual(client.requestsPerSecond, 5);
  
  client.setTier('ULTRA');
  assertEqual(client.requestsPerSecond, 10);
  
  client.setTier('MEGA');
  assertEqual(client.requestsPerSecond, 20);
});

runner.test('setTier: should throw error for invalid tier', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  assertThrows(
    () => client.setTier('INVALID'),
    'Should throw error for invalid tier'
  );
});

// =============================================================================
// UNIT TESTS - Queue Management
// =============================================================================

runner.test('clearQueue: should remove all pending requests', () => {
  const client = new SocialLinksSearchClient({ apiKey: 'test-key' });
  // Manually add items to queue for testing
  client.requestQueue = [1, 2, 3];
  client.clearQueue();
  assertEqual(client.requestQueue.length, 0);
});

// =============================================================================
// UNIT TESTS - Search Parameters Validation
// =============================================================================

runner.test('search: should throw error without query', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  await assertThrowsAsync(
    () => client.search({}),
    'Should throw error when query is missing'
  );
});

runner.test('search: should throw error for invalid social networks', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  await assertThrowsAsync(
    () => client.search({ 
      query: 'test', 
      socialNetworks: ['invalid-network'] 
    }),
    'Should throw error for invalid social network'
  );
});

runner.test('search: should accept valid social networks as array', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  
  // This will fail at the network level, but should pass validation
  try {
    await client.search({ 
      query: 'test', 
      socialNetworks: ['facebook', 'linkedin'] 
    });
  } catch (error) {
    // Expected to fail at network level, but should not be validation error
    assert(
      !error.message.includes('Invalid social networks'),
      'Should not throw validation error for valid networks'
    );
  }
});

runner.test('search: should accept valid social networks as string', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  
  try {
    await client.search({ 
      query: 'test', 
      socialNetworks: 'facebook,linkedin' 
    });
  } catch (error) {
    assert(
      !error.message.includes('Invalid social networks'),
      'Should not throw validation error for valid networks string'
    );
  }
});

// =============================================================================
// UNIT TESTS - searchNetworks Convenience Method
// =============================================================================

runner.test('searchNetworks: should accept rest parameters', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  
  try {
    await client.searchNetworks('test', 'facebook', 'linkedin');
  } catch (error) {
    assert(
      !error.message.includes('Invalid social networks'),
      'Should handle rest parameters correctly'
    );
  }
});

// =============================================================================
// INTEGRATION TESTS - Rate Limiting Behavior
// =============================================================================

runner.test('Rate Limiting: should queue requests exceeding limit', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    requestsPerSecond: 2,
    enableRateLimiting: true
  });
  
  // Create multiple pending requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      client.search({ query: `test${i}` }).catch(() => {}) // Catch to prevent unhandled rejections
    );
  }
  
  // Check queue immediately (before processing)
  await sleep(10);
  const stats = client.getStats();
  assert(stats.queueLength > 0, 'Should have requests in queue');
  
  // Clear queue to prevent actual API calls
  client.clearQueue();
});

runner.test('Rate Limiting: should respect requestsPerSecond limit', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    requestsPerSecond: 2,
    enableRateLimiting: true
  });
  
  const startTime = Date.now();
  let processedCount = 0;
  
  // Track when requests actually execute
  const originalMakeRequest = client._makeRequest.bind(client);
  client._makeRequest = async function(...args) {
    processedCount++;
    throw new Error('Mock error'); // Prevent actual API call
  };
  
  // Queue 4 requests
  const promises = [];
  for (let i = 0; i < 4; i++) {
    promises.push(
      client.search({ query: `test${i}` }).catch(() => {})
    );
  }
  
  // Wait a bit for queue processing
  await sleep(1100); // Just over 1 second
  
  // With limit of 2 req/sec, after 1 second we should have processed ~2 requests
  assert(
    processedCount <= 3,
    `Should not exceed rate limit significantly (processed: ${processedCount})`
  );
  
  client.clearQueue();
});

runner.test('Rate Limiting: disabled mode should not queue', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false
  });
  
  // Even with multiple requests, queue should remain empty
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      client.search({ query: `test${i}` }).catch(() => {})
    );
  }
  
  const stats = client.getStats();
  assertEqual(stats.queueLength, 0, 'Queue should be empty when rate limiting is disabled');
});

// =============================================================================
// INTEGRATION TESTS - Live API (requires valid API key)
// =============================================================================

const apiKey = process.env.RAPIDAPI_KEY;
const hasApiKey = apiKey && apiKey !== 'your_api_key_here';

if (hasApiKey) {
  runner.test('Live API: should successfully search for social links', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    const result = await client.search({ query: 'elon musk' });
    
    assert(result, 'Should return a result');
    assert(result.data, 'Result should have data property');
    
    const stats = client.getStats();
    assert(stats.totalRequests > 0, 'Should increment total requests');
    assert(stats.successfulRequests > 0, 'Should increment successful requests');
  });

  runner.test('Live API: should filter by social networks', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    const result = await client.search({ 
      query: 'elon musk',
      socialNetworks: ['twitter', 'linkedin']
    });
    
    assert(result, 'Should return a result');
    assert(result.data, 'Result should have data property');
  });

  runner.test('Live API: searchNetworks convenience method', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    const result = await client.searchNetworks('elon musk', 'twitter');
    
    assert(result, 'Should return a result');
    assert(result.data, 'Result should have data property');
  });

  runner.test('Live API: should handle rate limiting gracefully', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    // Make multiple requests
    const queries = ['test1', 'test2', 'test3'];
    const results = await Promise.all(
      queries.map(query => client.search({ query }))
    );
    
    assertEqual(results.length, 3, 'Should complete all requests');
    
    const stats = client.getStats();
    assert(stats.successfulRequests >= 3, 'Should complete all requests successfully');
  });

  runner.test('Live API: flush should wait for pending requests', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    // Queue multiple requests
    client.search({ query: 'test1' }).catch(() => {});
    client.search({ query: 'test2' }).catch(() => {});
    
    // Flush should wait for completion
    await client.flush();
    
    const stats = client.getStats();
    assertEqual(stats.queueLength, 0, 'Queue should be empty after flush');
  });

  runner.test('Live API: should track statistics correctly', async () => {
    const client = new SocialLinksSearchClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    client.resetStats();
    
    await client.search({ query: 'test query' });
    
    const stats = client.getStats();
    assertEqual(stats.totalRequests, 1, 'Should track total requests');
    assertEqual(stats.successfulRequests, 1, 'Should track successful requests');
    assert(stats.averageResponseTime > 0, 'Should track response time');
  });
} else {
  console.log('\n⚠️  Skipping live API tests (RAPIDAPI_KEY not set)');
  console.log('   Set RAPIDAPI_KEY environment variable to run integration tests\n');
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

runner.test('Performance: should handle burst requests efficiently', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key',
    requestsPerSecond: 10,
    enableRateLimiting: true
  });
  
  const startTime = Date.now();
  
  // Create burst of requests
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      client.search({ query: `test${i}` }).catch(() => {})
    );
  }
  
  // Should queue all requests without hanging
  await sleep(100);
  const queueTime = Date.now() - startTime;
  
  assert(queueTime < 1000, 'Should queue requests quickly');
  
  client.clearQueue();
});

runner.test('Performance: statistics should not degrade performance', () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'test-key'
  });
  
  const startTime = Date.now();
  
  // Get stats many times
  for (let i = 0; i < 1000; i++) {
    client.getStats();
  }
  
  const elapsed = Date.now() - startTime;
  assert(elapsed < 100, 'Getting stats should be fast');
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

runner.test('Error Handling: should handle invalid API key gracefully', async () => {
  const client = new SocialLinksSearchClient({ 
    apiKey: 'invalid-key-12345',
    enableRateLimiting: false
  });
  
  try {
    await client.search({ query: 'test' });
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(
      error.message.includes('HTTP') || error.message.includes('401') || error.message.includes('403'),
      'Should throw HTTP error for invalid key'
    );
  }
});

// =============================================================================
// RUN ALL TESTS
// =============================================================================

const success = await runner.run();
process.exit(success ? 0 : 1);
