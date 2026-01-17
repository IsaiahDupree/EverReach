/**
 * Examples: Versatile Enrichment Service with Multiple Providers
 * 
 * Demonstrates how to:
 * - Use different AI providers
 * - Switch between providers dynamically
 * - Set up fallback providers
 * - Combine AI + Social enrichment
 * 
 * Run: node enrichment-examples.mjs
 */

import EnrichmentService from './enrichment-service.js';
import { readFileSync } from 'fs';

// Load API keys from .env
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('🚀 Versatile Enrichment Service Examples\n');
console.log('═'.repeat(60));

// =============================================================================
// EXAMPLE 1: Basic Usage with Perplexity (Default)
// =============================================================================
async function example1_basicUsage() {
  console.log('\n📊 Example 1: Basic Enrichment with Perplexity');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: EnrichmentService.PROVIDERS.PERPLEXITY,
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 200
  });

  try {
    const result = await service.enrich({
      companyName: 'Stripe',
      includeSocial: true,
      includeNews: false
    });

    console.log('\n✅ Enrichment Result:');
    console.log(`Company Profile: ${result.intelligence.company?.profile?.substring(0, 200)}...`);
    console.log(`Social Profiles Found: ${Object.keys(result.social).length} networks`);
    console.log(`Processing Time: ${result.metadata.processingTime}ms`);
    console.log(`Tokens Used: ${result.metadata.tokensUsed}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 2: Provider Information
// =============================================================================
async function example2_providerInfo() {
  console.log('\n🔍 Example 2: Provider Information');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY
  });

  const info = service.getProviderInfo();
  
  console.log('\nCurrent Setup:');
  console.log(`  Provider: ${info.providerConfig.name}`);
  console.log(`  Host: ${info.providerConfig.host}`);
  console.log(`  Supports Search: ${info.providerConfig.supportsSearch ? '✓' : '✗'}`);
  console.log(`  AI Client: ${info.hasAIClient ? '✓ Ready' : '✗ Not configured'}`);
  console.log(`  Social Client: ${info.hasSocialClient ? '✓ Ready' : '✗ Not configured'}`);
  console.log(`  Fallback: ${info.fallbackEnabled ? '✓ Enabled' : '✗ Disabled'}`);
  
  console.log('\nAvailable Models:');
  Object.entries(info.providerConfig.models).forEach(([size, model]) => {
    console.log(`  ${size}: ${model}`);
  });
}

// =============================================================================
// EXAMPLE 3: Switching Providers Dynamically
// =============================================================================
async function example3_switchProviders() {
  console.log('\n🔄 Example 3: Switching Providers');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 150
  });

  console.log('\nInitial Provider:', service.aiProvider);

  // You can switch providers on the fly
  // service.switchProvider('openai', 'your-openai-key');  // Future
  // service.switchProvider('anthropic', 'your-anthropic-key');  // Future

  console.log('\n✅ Provider switching ready (currently only Perplexity supported)');
  console.log('   Coming soon: OpenAI, Anthropic Claude, and custom providers!');
}

// =============================================================================
// EXAMPLE 4: Complete Lead Enrichment (AI + Social)
// =============================================================================
async function example4_completeEnrichment() {
  console.log('\n🎯 Example 4: Complete Lead Enrichment');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 250
  });

  try {
    console.log('\nEnriching: Shopify...');
    
    const result = await service.enrich({
      companyName: 'Shopify',
      includeSocial: true,
      includeNews: true,
      includeCompetitors: false,
      newsTimeframe: 'last month'
    });

    console.log('\n✅ Complete Enrichment:');
    console.log('\n📊 Company Intelligence:');
    console.log(result.intelligence.company?.profile?.substring(0, 300) + '...');
    
    if (result.intelligence.company?.news) {
      console.log('\n📰 Recent News:');
      console.log(result.intelligence.company.news.substring(0, 250) + '...');
    }

    console.log('\n🌐 Social Profiles:');
    Object.entries(result.social).forEach(([network, profiles]) => {
      if (profiles && profiles.length > 0) {
        console.log(`  ${network}: ${profiles.length} profile(s)`);
      }
    });

    console.log('\n📈 Metadata:');
    console.log(`  Processing Time: ${result.metadata.processingTime}ms`);
    console.log(`  Tokens Used: ${result.metadata.tokensUsed}`);
    console.log(`  Provider: ${result.provider}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 5: Person Enrichment
// =============================================================================
async function example5_personEnrichment() {
  console.log('\n👤 Example 5: Person Enrichment');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 200
  });

  try {
    console.log('\nEnriching: Elon Musk (Tesla)...');
    
    const result = await service.enrich({
      personName: 'Elon Musk',
      companyName: 'Tesla',
      includeSocial: true
    });

    console.log('\n✅ Person Profile:');
    console.log(result.intelligence.person?.profile?.substring(0, 300) + '...');
    
    console.log('\n🌐 Social Presence:');
    Object.entries(result.social).forEach(([network, profiles]) => {
      if (profiles && profiles.length > 0) {
        console.log(`  ${network}: ${profiles.length} profile(s)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 6: Email to Complete Profile
// =============================================================================
async function example6_emailEnrichment() {
  console.log('\n📧 Example 6: Email to Complete Profile');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 200
  });

  try {
    console.log('\nEnriching: contact@stripe.com...');
    
    const result = await service.enrich({
      email: 'contact@stripe.com',
      includeSocial: true
    });

    console.log('\n✅ Contact Information:');
    if (result.intelligence.contact) {
      console.log(result.intelligence.contact.profile?.substring(0, 300) + '...');
    }
    
    console.log('\n🌐 Social Profiles:');
    Object.entries(result.social).forEach(([network, profiles]) => {
      if (profiles && profiles.length > 0) {
        console.log(`  ${network}: ${profiles.length} profile(s)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 7: Batch Enrichment
// =============================================================================
async function example7_batchEnrichment() {
  console.log('\n📦 Example 7: Batch Enrichment');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 150
  });

  const companies = ['Stripe', 'Square', 'PayPal'];
  
  console.log(`\nEnriching ${companies.length} companies...`);

  const results = [];
  for (const company of companies) {
    try {
      console.log(`  Processing: ${company}...`);
      const result = await service.enrich({
        companyName: company,
        includeSocial: false,
        includeNews: false
      });
      results.push({ company, success: true, result });
      console.log(`    ✓ Success`);
    } catch (error) {
      results.push({ company, success: false, error: error.message });
      console.log(`    ✗ Failed: ${error.message}`);
    }
    
    // Small delay between enrichments (already handled by rate limiter)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Batch Results:');
  console.log(`  Successful: ${results.filter(r => r.success).length}`);
  console.log(`  Failed: ${results.filter(r => !r.success).length}`);
  
  const stats = service.getStats();
  console.log(`  Total Tokens: ${stats.aiStats?.totalTokensUsed || 0}`);
}

// =============================================================================
// EXAMPLE 8: Statistics and Monitoring
// =============================================================================
async function example8_statistics() {
  console.log('\n📈 Example 8: Statistics and Monitoring');
  console.log('─'.repeat(60));

  const service = new EnrichmentService({
    aiProvider: 'perplexity',
    aiApiKey: env.PERPLEXITY_API_KEY,
    socialApiKey: env.RAPIDAPI_KEY,
    requestsPerSecond: 0.5,
    maxTokens: 150
  });

  // Perform some enrichments
  try {
    await service.enrich({ companyName: 'Tesla', includeSocial: false, includeNews: false });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await service.enrich({ companyName: 'Apple', includeSocial: false, includeNews: false });
  } catch (error) {
    // Ignore errors for this example
  }

  const stats = service.getStats();
  
  console.log('\n📊 Service Statistics:');
  console.log(`  Total Enrichments: ${stats.totalEnrichments}`);
  console.log(`  Successful: ${stats.successfulEnrichments}`);
  console.log(`  Failed: ${stats.failedEnrichments}`);
  console.log(`  Avg Time: ${stats.averageEnrichmentTime.toFixed(0)}ms`);
  console.log(`  Current Provider: ${stats.aiProvider}`);
  
  if (stats.aiStats) {
    console.log('\n🤖 AI Provider Stats:');
    console.log(`  Total Requests: ${stats.aiStats.totalRequests}`);
    console.log(`  Success Rate: ${((stats.aiStats.successfulRequests / stats.aiStats.totalRequests) * 100).toFixed(1)}%`);
    console.log(`  Tokens Used: ${stats.aiStats.totalTokensUsed}`);
    console.log(`  Avg Response Time: ${stats.aiStats.averageResponseTime.toFixed(0)}ms`);
  }
  
  if (stats.socialStats) {
    console.log('\n🌐 Social Search Stats:');
    console.log(`  Total Searches: ${stats.socialStats.totalRequests}`);
    console.log(`  Success Rate: ${((stats.socialStats.successfulRequests / stats.socialStats.totalRequests) * 100).toFixed(1)}%`);
  }
}

// =============================================================================
// RUN ALL EXAMPLES
// =============================================================================
async function runAllExamples() {
  try {
    // Check API keys
    if (!env.PERPLEXITY_API_KEY || !env.RAPIDAPI_KEY) {
      console.error('\n❌ Error: API keys not found in .env file');
      console.error('Please set PERPLEXITY_API_KEY and RAPIDAPI_KEY\n');
      return;
    }

    // Run examples (comment out any you don't want to run)
    
    example2_providerInfo();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    example3_switchProviders();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example1_basicUsage();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await example4_completeEnrichment();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // await example5_personEnrichment();  // Uncomment to run
    // await new Promise(resolve => setTimeout(resolve, 3000));
    
    // await example6_emailEnrichment();  // Uncomment to run
    // await new Promise(resolve => setTimeout(resolve, 3000));
    
    // await example7_batchEnrichment();  // Uncomment to run (takes longer)
    
    await example8_statistics();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All examples completed!\n');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    console.error(error.stack);
  }
}

runAllExamples();
