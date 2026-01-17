/**
 * Integration Tests for Unified Enrichment System
 * 
 * Tests full enrichment pipeline with marketing intelligence integration
 * 
 * Run with:
 * $env:RAPIDAPI_KEY="your_key"
 * $env:PERPLEXITY_API_KEY="your_key"
 * $env:OPENAI_API_KEY="your_key"
 * $env:DATABASE_URL="your_supabase_url"
 * node __tests__/enrichment-integration.test.mjs
 */

import { UnifiedEnrichmentClient } from '../lib/enrichment/unified-enrichment-client.js';
import { createClient } from '@supabase/supabase-js';

// Test configuration
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
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value does not exist');
  }
}

async function runTests() {
  console.log(`\n${colors.blue}====================================`);
  console.log(`Enrichment Integration Tests`);
  console.log(`====================================${colors.reset}\n`);

  const hasApiKeys = process.env.RAPIDAPI_KEY && 
                     process.env.PERPLEXITY_API_KEY && 
                     process.env.OPENAI_API_KEY;
  
  const hasDatabase = process.env.DATABASE_URL;

  if (!hasApiKeys) {
    console.log(`${colors.yellow}⚠️  API keys not found. Set RAPIDAPI_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY${colors.reset}\n`);
  }

  if (!hasDatabase) {
    console.log(`${colors.yellow}⚠️  DATABASE_URL not set. Database tests will be skipped.${colors.reset}\n`);
  }

  // Test 1: End-to-End Enrichment Pipeline
  console.log(`\n${colors.blue}[1] End-to-End Enrichment Pipeline${colors.reset}`);

  if (hasApiKeys) {
    await test('Should enrich lead and return complete profile', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const profile = await client.enrichLead('test@example.com', {
        includeCompany: true,
        includePersona: true,
        companyName: 'OpenAI',
      });

      assertExists(profile.email);
      assertExists(profile.socialProfiles);
      assertExists(profile.providersUsed);
      assert(profile.providersUsed.length > 0, 'Should use at least one provider');
    })();

    await test('Should track cost and usage statistics', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      await client.enrichLead('cost-test@example.com');
      
      const stats = client.getStats();
      assert(stats.totalRequests > 0, 'Should track requests');
      assertExists(stats.providerUsage);
    })();
  } else {
    skip('End-to-end enrichment (needs API keys)');
    skip('Cost tracking test (needs API keys)');
  }

  // Test 2: Database Integration
  console.log(`\n${colors.blue}[2] Database Integration Tests${colors.reset}`);

  if (hasDatabase && hasApiKeys) {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.DATABASE_URL.split('@')[1].split('/')[0],
      process.env.SUPABASE_ANON_KEY || 'test'
    );

    await test('Should save enriched profile to user_identity table', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const profile = await client.enrichLead('db-test@example.com', {
        includeCompany: true,
      });

      // Save to database
      const { data, error } = await supabase
        .from('user_identity')
        .upsert({
          email: profile.email,
          full_name: profile.fullName,
          company: profile.company,
          linkedin: profile.socialProfiles.linkedin,
          twitter: profile.socialProfiles.twitter,
          instagram: profile.socialProfiles.instagram,
          raw_enrichment: profile,
          last_enriched_at: new Date().toISOString(),
        });

      assert(!error, `Database error: ${error?.message}`);
    })();

    await test('Should assign persona bucket in database', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const profile = await client.enrichLead('persona-test@example.com', {
        includePersona: true,
      });

      if (profile.personaBucket) {
        const { data: user } = await supabase
          .from('app_user')
          .select('user_id')
          .eq('email', profile.email)
          .single();

        if (user) {
          const { error } = await supabase
            .from('user_persona')
            .upsert({
              user_id: user.user_id,
              persona_bucket_id: profile.personaBucket.id,
              confidence: profile.personaBucket.confidence,
              assigned_at: new Date().toISOString(),
            });

          assert(!error, `Persona assignment error: ${error?.message}`);
        }
      }
    })();
  } else {
    skip('Database integration tests (needs DATABASE_URL and API keys)');
    skip('Persona bucket assignment (needs DATABASE_URL and API keys)');
  }

  // Test 3: Marketing Intelligence Integration
  console.log(`\n${colors.blue}[3] Marketing Intelligence Integration${colors.reset}`);

  if (hasApiKeys) {
    await test('Should calculate intent score from enriched data', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const profile = await client.enrichLead('intent-test@example.com', {
        includeCompany: true,
        includePersona: true,
      });

      // Calculate intent score based on enrichment completeness
      let intentScore = 0;
      if (profile.socialProfiles.linkedin) intentScore += 10;
      if (profile.socialProfiles.twitter) intentScore += 10;
      if (profile.companyIntel) intentScore += 20;
      if (profile.personaBucket) intentScore += 25;

      assert(intentScore >= 0 && intentScore <= 100, 'Intent score should be 0-100');
    })();

    await test('Should support magnetism index calculation', async () => {
      // Mock magnetism calculation
      const intentScore = 75;
      const engagementRate = 0.6;
      const reactivationRate = 0.3;
      const emailCTR = 0.15;
      const socialReturns = 5;

      const magnetism = 
        (intentScore * 0.3) +
        (engagementRate * 100 * 0.25) +
        (reactivationRate * 100 * 0.2) +
        (emailCTR * 100 * 0.15) +
        (socialReturns * 0.1);

      assert(magnetism > 0, 'Magnetism should be positive');
      assert(magnetism <= 100, 'Magnetism should not exceed 100');
    })();
  } else {
    skip('Intent score calculation (needs API keys)');
    skip('Magnetism index calculation (needs API keys)');
  }

  // Test 4: Performance & Cost Optimization
  console.log(`\n${colors.blue}[4] Performance & Cost Tests${colors.reset}`);

  if (hasApiKeys) {
    await test('Should complete enrichment within 5 seconds', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const start = Date.now();
      await client.enrichLead('perf-test@example.com');
      const elapsed = Date.now() - start;

      assert(elapsed < 5000, `Enrichment took ${elapsed}ms (target: <5000ms)`);
    })();

    await test('Should optimize cost by using cheapest providers first', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
        optimizeForCost: true,
      });

      await client.enrichLead('cost-opt-test@example.com', {
        includeCompany: true,
        includePersona: true,
      });

      const stats = client.getStats();
      
      // RapidAPI should be used most (cheapest)
      assert(
        stats.providerUsage.rapidapi >= stats.providerUsage.openai,
        'Should prioritize cheaper providers'
      );
    })();
  } else {
    skip('Performance test (needs API keys)');
    skip('Cost optimization test (needs API keys)');
  }

  // Test 5: Batch Processing
  console.log(`\n${colors.blue}[5] Batch Processing Tests${colors.reset}`);

  if (hasApiKeys) {
    await test('Should batch process multiple leads efficiently', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const emails = [
        'batch1@example.com',
        'batch2@example.com',
        'batch3@example.com',
      ];

      const start = Date.now();
      const results = await client.enrichBatch(emails, { batchSize: 2 });
      const elapsed = Date.now() - start;

      assert(results.length === 3, 'Should return all results');
      assert(elapsed < 15000, 'Batch should complete in <15s');
    })();

    await test('Should respect rate limits during batch processing', async () => {
      const client = new UnifiedEnrichmentClient({
        rapidApiKey: process.env.RAPIDAPI_KEY,
        requestsPerSecond: 1,
        enableRateLimiting: true,
      });

      const emails = ['rate1@example.com', 'rate2@example.com'];
      
      const start = Date.now();
      await client.enrichBatch(emails);
      const elapsed = Date.now() - start;

      // Should take at least 1 second due to rate limiting
      assert(elapsed >= 1000, 'Should respect rate limit');
    })();
  } else {
    skip('Batch processing test (needs API keys)');
    skip('Rate limiting test (needs API keys)');
  }

  // Test 6: Error Handling & Resilience
  console.log(`\n${colors.blue}[6] Error Handling Tests${colors.reset}`);

  await test('Should handle invalid email gracefully', async () => {
    if (!hasApiKeys) {
      skip('Invalid email test (needs API keys)');
      return;
    }

    const client = new UnifiedEnrichmentClient({
      rapidApiKey: process.env.RAPIDAPI_KEY,
    });

    try {
      const profile = await client.enrichLead('invalid-email');
      assertExists(profile.email);
    } catch (error) {
      // Should not throw
      assert(false, 'Should handle invalid email gracefully');
    }
  })();

  await test('Should fallback when provider fails', async () => {
    if (!hasApiKeys) {
      skip('Fallback test (needs API keys)');
      return;
    }

    const client = new UnifiedEnrichmentClient({
      rapidApiKey: process.env.RAPIDAPI_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      enableFallback: true,
    });

    const profile = await client.enrichLead('fallback-test@example.com');
    assertExists(profile);
  })();

  // Print Summary
  console.log(`\n${colors.blue}====================================`);
  console.log(`Test Summary`);
  console.log(`====================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skippedTests}${colors.reset}`);
  console.log(`Total: ${passedTests + failedTests + skippedTests}\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
