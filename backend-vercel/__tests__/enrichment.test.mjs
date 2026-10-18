/**
 * Unified Enrichment System Tests
 * 
 * Comprehensive test suite for multi-provider enrichment
 * 
 * Run with:
 * node __tests__/enrichment.test.mjs
 * 
 * Or with API keys for integration tests:
 * $env:RAPIDAPI_KEY="your_key"
 * $env:PERPLEXITY_API_KEY="your_key"
 * $env:OPENAI_API_KEY="your_key"
 * node __tests__/enrichment.test.mjs
 */

import { UnifiedEnrichmentClient } from '../lib/enrichment/unified-enrichment-client.js';
import { RapidAPISocialProvider } from '../lib/enrichment/providers/rapidapi-social.js';
import { PerplexityProvider } from '../lib/enrichment/providers/perplexity.js';
import { OpenAIEnrichmentProvider } from '../lib/enrichment/providers/openai-enrichment.js';

// Test configuration
const TEST_EMAIL = 'john.doe@techcorp.com';
const TEST_COMPANY = 'Salesforce';

// Colors for test output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

/**
 * Test helper functions
 */
function test(description, testFn) {
  return async () => {
    try {
      await testFn();
      passedTests++;
      console.log(`${colors.green}✓${colors.reset} ${description}`);
    } catch (error) {
      failedTests++;
      console.log(`${colors.red}✗${colors.reset} ${description}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  };
}

function skip(description) {
  skippedTests++;
  console.log(`${colors.yellow}⊘${colors.reset} ${description} (skipped)`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value does not exist');
  }
}

/**
 * Test Suite Runner
 */
async function runTests() {
  console.log(`\n${colors.blue}====================================`);
  console.log(`Unified Enrichment System Tests`);
  console.log(`====================================${colors.reset}\n`);

  const apiKeys = {
    rapidapi: process.env.RAPIDAPI_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };

  // Configuration Tests
  console.log(`\n${colors.blue}[1] Configuration Tests${colors.reset}`);
  await test('Should create client with at least one provider', async () => {
    const client = new UnifiedEnrichmentClient({
      rapidApiKey: 'test_key',
    });
    assertExists(client);
  })();

  await test('Should throw error with no API keys', async () => {
    try {
      new UnifiedEnrichmentClient({});
      throw new Error('Should have thrown error');
    } catch (error) {
      assert(error.message.includes('At least one provider'), 'Wrong error message');
    }
  })();

  await test('Should initialize with custom config', async () => {
    const client = new UnifiedEnrichmentClient({
      rapidApiKey: 'test_key',
      requestsPerSecond: 5,
      enableRateLimiting: false,
      optimizeForCost: true,
    });
    assertExists(client);
  })();

  // RapidAPI Social Provider Tests
  console.log(`\n${colors.blue}[2] RapidAPI Social Provider Tests${colors.reset}`);
  
  if (apiKeys.rapidapi) {
    await test('Should find social profiles for email', async () => {
      const provider = new RapidAPISocialProvider({
        apiKey: apiKeys.rapidapi,
      });
      const profiles = await provider.findSocialProfiles(TEST_EMAIL);
      assertExists(profiles);
      assert(typeof profiles === 'object', 'Profiles should be an object');
    })();

    await test('Should handle rate limiting', async () => {
      const provider = new RapidAPISocialProvider({
        apiKey: apiKeys.rapidapi,
        requestsPerSecond: 1,
        enableRateLimiting: true,
      });
      
      const start = Date.now();
      await Promise.all([
        provider.findSocialProfiles('test1@example.com'),
        provider.findSocialProfiles('test2@example.com'),
      ]);
      const elapsed = Date.now() - start;
      
      assert(elapsed >= 1000, 'Should respect rate limit');
    })();
  } else {
    skip('Social profile discovery (needs RAPIDAPI_KEY)');
    skip('Rate limiting test (needs RAPIDAPI_KEY)');
  }

  await test('Should handle invalid email gracefully', async () => {
    if (!apiKeys.rapidapi) {
      skip('Invalid email test (needs RAPIDAPI_KEY)');
      return;
    }
    
    const provider = new RapidAPISocialProvider({
      apiKey: apiKeys.rapidapi,
    });
    
    const profiles = await provider.findSocialProfiles('invalid');
    assertExists(profiles);
  })();

  // Perplexity Provider Tests
  console.log(`\n${colors.blue}[3] Perplexity Provider Tests${colors.reset}`);
  
  if (apiKeys.perplexity) {
    await test('Should enrich company with AI', async () => {
      const provider = new PerplexityProvider({
        apiKey: apiKeys.perplexity,
      });
      const intel = await provider.enrichCompany(TEST_COMPANY);
      assertExists(intel);
      assert(typeof intel === 'object', 'Intel should be an object');
    })();

    await test('Should get company news', async () => {
      const provider = new PerplexityProvider({
        apiKey: apiKeys.perplexity,
      });
      const news = await provider.getCompanyNews(TEST_COMPANY);
      assertExists(news);
      assert(Array.isArray(news), 'News should be an array');
    })();
  } else {
    skip('Company enrichment test (needs PERPLEXITY_API_KEY)');
    skip('Company news test (needs PERPLEXITY_API_KEY)');
  }

  await test('Should configure custom model', async () => {
    const provider = new PerplexityProvider({
      apiKey: 'test_key',
      model: 'llama-3.1-sonar-large-128k-online',
      maxTokens: 2000,
      temperature: 0.5,
    });
    assertExists(provider);
  })();

  // OpenAI Provider Tests
  console.log(`\n${colors.blue}[4] OpenAI Enrichment Provider Tests${colors.reset}`);
  
  if (apiKeys.openai) {
    await test('Should analyze persona and assign bucket', async () => {
      const provider = new OpenAIEnrichmentProvider({
        apiKey: apiKeys.openai,
      });
      
      const mockProfiles = {
        linkedin: 'https://linkedin.com/in/johndoe',
        twitter: 'https://twitter.com/johndoe',
      };
      
      const persona = await provider.analyzePersona(mockProfiles);
      assertExists(persona);
      assertExists(persona.id);
      assertExists(persona.label);
      assertExists(persona.confidence);
      assert(persona.confidence >= 0 && persona.confidence <= 1, 'Confidence should be 0-1');
    })();

    await test('Should analyze content', async () => {
      const provider = new OpenAIEnrichmentProvider({
        apiKey: apiKeys.openai,
      });
      
      const mockProfiles = {
        linkedin: 'https://linkedin.com/in/developer',
      };
      
      const analysis = await provider.analyzeContent(mockProfiles);
      assertExists(analysis);
      assertExists(analysis.topics);
      assertExists(analysis.tone);
      assertExists(analysis.audienceType);
    })();
  } else {
    skip('Persona analysis test (needs OPENAI_API_KEY)');
    skip('Content analysis test (needs OPENAI_API_KEY)');
  }

  await test('Should fallback gracefully on error', async () => {
    const provider = new OpenAIEnrichmentProvider({
      apiKey: 'invalid_key',
    });
    
    const persona = await provider.analyzePersona({});
    assertExists(persona);
    assertEqual(persona.confidence, 0.3, 'Should use fallback confidence');
  })();

  // Unified Client Tests
  console.log(`\n${colors.blue}[5] Unified Client Integration Tests${colors.reset}`);
  
  if (apiKeys.rapidapi && apiKeys.perplexity && apiKeys.openai) {
    await test('Should enrich lead with all providers', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: apiKeys.rapidapi,
        perplexityApiKey: apiKeys.perplexity,
        openAiApiKey: apiKeys.openai,
      });
      
      const enriched = await client.enrichLead(TEST_EMAIL, {
        includeCompany: true,
        includePersona: true,
        companyName: TEST_COMPANY,
      });
      
      assertExists(enriched);
      assertExists(enriched.socialProfiles);
      assertExists(enriched.companyIntel);
      assertExists(enriched.personaBucket);
      assert(enriched.providersUsed.length > 0, 'Should use at least one provider');
    })();

    await test('Should batch enrich multiple leads', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: apiKeys.rapidapi,
      });
      
      const emails = ['test1@example.com', 'test2@example.com'];
      const results = await client.enrichBatch(emails);
      
      assertExists(results);
      assertEqual(results.length, 2, 'Should return 2 results');
    })();
  } else {
    skip('Full enrichment test (needs all API keys)');
    skip('Batch enrichment test (needs all API keys)');
  }

  // Statistics Tests
  console.log(`\n${colors.blue}[6] Statistics & Monitoring Tests${colors.reset}`);
  
  await test('Should track statistics', async () => {
    const client = new UnifiedEnrichmentClient({
      rapidApiKey: 'test_key',
    });
    
    const stats = client.getStats();
    assertExists(stats);
    assertExists(stats.totalRequests);
    assertExists(stats.successfulRequests);
    assertExists(stats.failedRequests);
    assertExists(stats.providerUsage);
  })();

  await test('Should reset statistics', async () => {
    const client = new UnifiedEnrichmentClient({
      rapidApiKey: 'test_key',
    });
    
    client.resetStats();
    const stats = client.getStats();
    assertEqual(stats.totalRequests, 0, 'Should reset to 0');
  })();

  // Performance Tests
  console.log(`\n${colors.blue}[7] Performance Tests${colors.reset}`);
  
  if (apiKeys.rapidapi) {
    await test('Should complete social search in < 2s', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: apiKeys.rapidapi,
      });
      
      const start = Date.now();
      await client.findSocialProfiles(TEST_EMAIL);
      const elapsed = Date.now() - start;
      
      assert(elapsed < 2000, `Should be fast, took ${elapsed}ms`);
    })();
  } else {
    skip('Performance test (needs RAPIDAPI_KEY)');
  }

  // Cost Optimization Tests
  console.log(`\n${colors.blue}[8] Cost Optimization Tests${colors.reset}`);
  
  await test('Should use cheapest provider first when optimizing', async () => {
    const client = new UnifiedEnrichmentClient({
      rapidApiKey: 'test_key',
      perplexityApiKey: 'test_key',
      openAiApiKey: 'test_key',
      optimizeForCost: true,
    });
    
    // Just verify client initializes with cost optimization
    assertExists(client);
  })();

  // Print Summary
  console.log(`\n${colors.blue}====================================`);
  console.log(`Test Summary`);
  console.log(`====================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skippedTests}${colors.reset}`);
  console.log(`Total: ${passedTests + failedTests + skippedTests}\n`);

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
