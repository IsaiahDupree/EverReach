/**
 * Comprehensive Test Suite for Perplexity AI Client
 * 
 * This test suite covers:
 * - Unit tests for all methods
 * - Rate limiting functionality
 * - Token tracking
 * - Lead enrichment methods
 * - Integration tests with live API
 * 
 * Usage:
 *   Set PERPLEXITY_API_KEY environment variable
 *   Run: node test-perplexity.mjs
 */

import PerplexityClient from './perplexity-client.js';

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
    console.log('\n🧪 Running Perplexity AI Client Tests\n');
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

// Test suite
const runner = new TestRunner();

// =============================================================================
// UNIT TESTS - Constructor & Configuration
// =============================================================================

runner.test('Constructor: should throw error without API key', () => {
  assertThrows(
    () => new PerplexityClient({}),
    'Should throw error when API key is missing'
  );
});

runner.test('Constructor: should accept API key', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  assert(client.apiKey === 'test-key', 'API key should be set');
});

runner.test('Constructor: should set default values', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  assertEqual(client.requestsPerSecond, 1);
  assertEqual(client.maxRetries, 3);
  assertEqual(client.retryDelay, 1000);
  assertEqual(client.maxTokens, 4096);
  assertEqual(client.temperature, 0.2);
  assert(client.enableRateLimiting === true);
});

runner.test('Constructor: should accept custom configuration', () => {
  const client = new PerplexityClient({
    apiKey: 'test-key',
    model: PerplexityClient.MODELS.SONAR_LARGE,
    requestsPerSecond: 5,
    maxRetries: 5,
    retryDelay: 2000,
    maxTokens: 2048,
    temperature: 0.5,
    enableRateLimiting: false
  });
  assertEqual(client.model, PerplexityClient.MODELS.SONAR_LARGE);
  assertEqual(client.requestsPerSecond, 5);
  assertEqual(client.maxRetries, 5);
  assertEqual(client.retryDelay, 2000);
  assertEqual(client.maxTokens, 2048);
  assertEqual(client.temperature, 0.5);
  assert(client.enableRateLimiting === false);
});

// =============================================================================
// UNIT TESTS - Static Properties
// =============================================================================

runner.test('Static: MODELS should contain all model types', () => {
  const models = PerplexityClient.MODELS;
  assert(models.SONAR_SMALL, 'Should have SONAR_SMALL');
  assert(models.SONAR_LARGE, 'Should have SONAR_LARGE');
  assert(models.SONAR_HUGE, 'Should have SONAR_HUGE');
  assert(models.SONAR_SMALL.includes('sonar-small'));
  assert(models.SONAR_LARGE.includes('sonar-large'));
  assert(models.SONAR_HUGE.includes('sonar-huge'));
});

runner.test('Static: RATE_LIMITS should contain all tiers', () => {
  const limits = PerplexityClient.RATE_LIMITS;
  assert(limits.BASIC, 'Should have BASIC tier');
  assert(limits.PRO, 'Should have PRO tier');
  assert(limits.ULTRA, 'Should have ULTRA tier');
  assert(limits.MEGA, 'Should have MEGA tier');
  assertEqual(limits.BASIC.requestsPerSecond, 1);
  assertEqual(limits.PRO.requestsPerSecond, 1);
  assertEqual(limits.ULTRA.requestsPerSecond, 2);
  assertEqual(limits.MEGA.requestsPerSecond, 5);
});

runner.test('Static: ENRICHMENT_TEMPLATES should exist', () => {
  const templates = PerplexityClient.ENRICHMENT_TEMPLATES;
  assert(templates.COMPANY_INFO, 'Should have COMPANY_INFO');
  assert(templates.PERSON_INFO, 'Should have PERSON_INFO');
  assert(templates.CONTACT_ENRICHMENT, 'Should have CONTACT_ENRICHMENT');
  assert(templates.INDUSTRY_RESEARCH, 'Should have INDUSTRY_RESEARCH');
  assert(templates.COMPETITOR_ANALYSIS, 'Should have COMPETITOR_ANALYSIS');
  assert(templates.LEAD_QUALIFICATION, 'Should have LEAD_QUALIFICATION');
  assert(templates.NEWS_SUMMARY, 'Should have NEWS_SUMMARY');
});

runner.test('Static: Enrichment templates should be functions', () => {
  const templates = PerplexityClient.ENRICHMENT_TEMPLATES;
  assert(typeof templates.COMPANY_INFO === 'function');
  const prompt = templates.COMPANY_INFO('Tesla');
  assert(typeof prompt === 'string');
  assert(prompt.includes('Tesla'));
});

// =============================================================================
// UNIT TESTS - Statistics Methods
// =============================================================================

runner.test('getStats: should return initial statistics', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  const stats = client.getStats();
  
  assertEqual(stats.totalRequests, 0);
  assertEqual(stats.successfulRequests, 0);
  assertEqual(stats.failedRequests, 0);
  assertEqual(stats.rateLimitHits, 0);
  assertEqual(stats.totalTokensUsed, 0);
  assertEqual(stats.totalPromptTokens, 0);
  assertEqual(stats.totalCompletionTokens, 0);
  assertEqual(stats.queueLength, 0);
  assert(stats.rateLimitingEnabled === true);
});

runner.test('resetStats: should reset all counters', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  client.stats.totalRequests = 100;
  client.stats.totalTokensUsed = 5000;
  client.resetStats();
  
  assertEqual(client.stats.totalRequests, 0);
  assertEqual(client.stats.totalTokensUsed, 0);
});

// =============================================================================
// UNIT TESTS - Rate Limiting Configuration
// =============================================================================

runner.test('setRateLimit: should update rate limit', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  client.setRateLimit(5);
  assertEqual(client.requestsPerSecond, 5);
});

runner.test('setRateLimit: should throw error for invalid rate', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
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
  const client = new PerplexityClient({ apiKey: 'test-key' });
  
  client.setTier('PRO');
  assertEqual(client.requestsPerSecond, 1);
  
  client.setTier('ULTRA');
  assertEqual(client.requestsPerSecond, 2);
  
  client.setTier('MEGA');
  assertEqual(client.requestsPerSecond, 5);
});

runner.test('setTier: should throw error for invalid tier', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  assertThrows(
    () => client.setTier('INVALID'),
    'Should throw error for invalid tier'
  );
});

// =============================================================================
// UNIT TESTS - Model Configuration
// =============================================================================

runner.test('setModel: should update default model', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  client.setModel(PerplexityClient.MODELS.SONAR_LARGE);
  assertEqual(client.model, PerplexityClient.MODELS.SONAR_LARGE);
});

runner.test('setModel: should throw error for invalid model', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  assertThrows(
    () => client.setModel('invalid-model'),
    'Should throw error for invalid model'
  );
});

// =============================================================================
// UNIT TESTS - Queue Management
// =============================================================================

runner.test('clearQueue: should remove all pending requests', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  client.requestQueue = [1, 2, 3];
  client.clearQueue();
  assertEqual(client.requestQueue.length, 0);
});

// =============================================================================
// UNIT TESTS - Chat Method Parameters
// =============================================================================

runner.test('chat: should throw error without messages', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  await assertThrowsAsync(
    () => client.chat({}),
    'Should throw error when messages is missing'
  );
});

runner.test('chat: should accept string message', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  
  try {
    await client.chat({ messages: 'test message' });
  } catch (error) {
    // Expected to fail at network level, but should pass parameter validation
    assert(
      !error.message.includes('Messages parameter is required'),
      'Should not throw validation error for string message'
    );
  }
});

runner.test('chat: should accept message array', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false 
  });
  
  try {
    await client.chat({ 
      messages: [
        { role: 'user', content: 'test' }
      ]
    });
  } catch (error) {
    assert(
      !error.message.includes('Messages parameter is required'),
      'Should not throw validation error for message array'
    );
  }
});

// =============================================================================
// UNIT TESTS - Utility Methods
// =============================================================================

runner.test('extractContent: should extract message content', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  const response = {
    choices: [{
      message: {
        content: 'Test content'
      }
    }]
  };
  const content = client.extractContent(response);
  assertEqual(content, 'Test content');
});

runner.test('extractContent: should return empty string for invalid response', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  const content = client.extractContent({});
  assertEqual(content, '');
});

runner.test('extractCitations: should extract citations array', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  const response = {
    citations: ['url1', 'url2']
  };
  const citations = client.extractCitations(response);
  assertEqual(citations.length, 2);
  assertEqual(citations[0], 'url1');
});

runner.test('extractCitations: should return empty array if no citations', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  const citations = client.extractCitations({});
  assertEqual(citations.length, 0);
});

// =============================================================================
// INTEGRATION TESTS - Rate Limiting Behavior
// =============================================================================

runner.test('Rate Limiting: should queue requests exceeding limit', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    requestsPerSecond: 2,
    enableRateLimiting: true
  });
  
  // Create multiple pending requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      client.chat({ messages: `test${i}` }).catch(() => {})
    );
  }
  
  // Check queue immediately
  await sleep(10);
  const stats = client.getStats();
  assert(stats.queueLength > 0, 'Should have requests in queue');
  
  client.clearQueue();
});

runner.test('Rate Limiting: disabled mode should not queue', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    enableRateLimiting: false
  });
  
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      client.chat({ messages: `test${i}` }).catch(() => {})
    );
  }
  
  const stats = client.getStats();
  assertEqual(stats.queueLength, 0, 'Queue should be empty when rate limiting is disabled');
});

// =============================================================================
// INTEGRATION TESTS - Live API (requires valid API key)
// =============================================================================

const apiKey = process.env.PERPLEXITY_API_KEY;
const hasApiKey = apiKey && apiKey !== 'your_api_key_here';

if (hasApiKey) {
  runner.test('Live API: should successfully send chat request', async () => {
    const client = new PerplexityClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    const result = await client.chat({ 
      messages: 'What is 2+2? Answer with just the number.',
      maxTokens: 10
    });
    
    assert(result, 'Should return a result');
    assert(result.choices, 'Result should have choices');
    assert(result.usage, 'Result should have usage stats');
    
    const content = client.extractContent(result);
    assert(content.length > 0, 'Should have content');
    
    const stats = client.getStats();
    assert(stats.totalRequests > 0, 'Should increment total requests');
    assert(stats.totalTokensUsed > 0, 'Should track token usage');
  });

  runner.test('Live API: should return citations when requested', async () => {
    const client = new PerplexityClient({ apiKey });
    
    const result = await client.chat({ 
      messages: 'Tell me about Tesla Inc.',
      returnCitations: true,
      maxTokens: 200
    });
    
    const citations = client.extractCitations(result);
    // Citations may or may not be present depending on the response
    assert(Array.isArray(citations), 'Should return citations array');
  });

  runner.test('Live API: enrichCompany should work', async () => {
    const client = new PerplexityClient({ apiKey });
    
    const result = await client.enrichCompany('Tesla');
    
    assert(result, 'Should return a result');
    const content = client.extractContent(result);
    assert(content.length > 0, 'Should have content');
    assert(content.toLowerCase().includes('tesla'), 'Content should mention Tesla');
  });

  runner.test('Live API: enrichPerson should work', async () => {
    const client = new PerplexityClient({ apiKey });
    
    const result = await client.enrichPerson('Elon Musk', 'Tesla');
    
    assert(result, 'Should return a result');
    const content = client.extractContent(result);
    assert(content.length > 0, 'Should have content');
  });

  runner.test('Live API: should track token usage correctly', async () => {
    const client = new PerplexityClient({ apiKey });
    client.resetStats();
    
    await client.chat({ 
      messages: 'Say hello',
      maxTokens: 20
    });
    
    const stats = client.getStats();
    assert(stats.totalTokensUsed > 0, 'Should track total tokens');
    assert(stats.totalPromptTokens > 0, 'Should track prompt tokens');
    assert(stats.totalCompletionTokens > 0, 'Should track completion tokens');
    assert(stats.averageTokensPerRequest > 0, 'Should calculate average');
  });

  runner.test('Live API: should handle multiple requests with rate limiting', async () => {
    const client = new PerplexityClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    const queries = ['test1', 'test2', 'test3'];
    const results = await Promise.all(
      queries.map(query => client.chat({ 
        messages: query,
        maxTokens: 20
      }))
    );
    
    assertEqual(results.length, 3, 'Should complete all requests');
    
    const stats = client.getStats();
    assert(stats.successfulRequests >= 3, 'Should complete all requests successfully');
  });

  runner.test('Live API: flush should wait for pending requests', async () => {
    const client = new PerplexityClient({ 
      apiKey,
      requestsPerSecond: 1
    });
    
    // Queue multiple requests
    client.chat({ messages: 'test1', maxTokens: 10 }).catch(() => {});
    client.chat({ messages: 'test2', maxTokens: 10 }).catch(() => {});
    
    // Flush should wait
    await client.flush();
    
    const stats = client.getStats();
    assertEqual(stats.queueLength, 0, 'Queue should be empty after flush');
  });

  runner.test('Live API: different models should work', async () => {
    const client = new PerplexityClient({ 
      apiKey,
      model: PerplexityClient.MODELS.SONAR_SMALL
    });
    
    const result = await client.chat({ 
      messages: 'What is AI?',
      maxTokens: 50
    });
    
    assert(result, 'SONAR_SMALL should work');
    assert(result.model, 'Should return model info');
  });

  runner.test('Live API: getCompanyNews should work', async () => {
    const client = new PerplexityClient({ apiKey });
    
    const result = await client.getCompanyNews('Apple', 'last month');
    
    assert(result, 'Should return news');
    const content = client.extractContent(result);
    assert(content.length > 0, 'Should have news content');
  });

} else {
  console.log('\n⚠️  Skipping live API tests (PERPLEXITY_API_KEY not set)');
  console.log('   Set PERPLEXITY_API_KEY environment variable to run integration tests\n');
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

runner.test('Performance: should handle burst requests efficiently', async () => {
  const client = new PerplexityClient({ 
    apiKey: 'test-key',
    requestsPerSecond: 5,
    enableRateLimiting: true
  });
  
  const startTime = Date.now();
  
  // Create burst of requests
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      client.chat({ messages: `test${i}` }).catch(() => {})
    );
  }
  
  // Should queue all requests without hanging
  await sleep(100);
  const queueTime = Date.now() - startTime;
  
  assert(queueTime < 1000, 'Should queue requests quickly');
  
  client.clearQueue();
});

runner.test('Performance: statistics should not degrade performance', () => {
  const client = new PerplexityClient({ apiKey: 'test-key' });
  
  const startTime = Date.now();
  
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
  const client = new PerplexityClient({ 
    apiKey: 'invalid-key-12345',
    enableRateLimiting: false
  });
  
  try {
    await client.chat({ messages: 'test' });
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
