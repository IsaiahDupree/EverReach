/**
 * Example Usage of Social Links Search API Client
 * 
 * This file demonstrates various ways to use the client in real-world scenarios.
 * Make sure to set your RAPIDAPI_KEY environment variable before running.
 * 
 * Run: node example-usage.mjs
 */

import SocialLinksSearchClient from './social-links-search.js';

// =============================================================================
// EXAMPLE 1: Basic Search
// =============================================================================
async function basicSearchExample() {
  console.log('\n📝 Example 1: Basic Search');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY
  });

  try {
    const results = await client.search({
      query: 'Elon Musk'
    });

    console.log('Search Results:', JSON.stringify(results, null, 2));
    console.log('\nStatistics:', client.getStats());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 2: Filtered Network Search
// =============================================================================
async function filteredSearchExample() {
  console.log('\n🔍 Example 2: Search Specific Networks');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY,
    requestsPerSecond: 1
  });

  try {
    // Search only professional networks
    const results = await client.search({
      query: 'Bill Gates',
      socialNetworks: ['linkedin', 'twitter']
    });

    console.log('Professional Networks:');
    if (results.data.linkedin) {
      console.log('  LinkedIn:', results.data.linkedin);
    }
    if (results.data.twitter) {
      console.log('  Twitter:', results.data.twitter);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 3: Batch Processing with Rate Limiting
// =============================================================================
async function batchProcessingExample() {
  console.log('\n📦 Example 3: Batch Processing Multiple Queries');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY,
    requestsPerSecond: 1 // BASIC tier limit
  });

  const queries = [
    'Mark Zuckerberg',
    'Jeff Bezos',
    'Tim Cook'
  ];

  console.log(`Processing ${queries.length} queries with rate limiting...`);
  const startTime = Date.now();

  try {
    const results = await Promise.all(
      queries.map(query => client.search({ query }))
    );

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ Completed ${results.length} searches in ${(elapsed / 1000).toFixed(2)}s`);
    console.log('Statistics:', client.getStats());

    results.forEach((result, index) => {
      console.log(`\n${queries[index]}:`);
      if (result.data) {
        const networks = Object.keys(result.data).filter(
          key => result.data[key] && result.data[key].length > 0
        );
        console.log(`  Found on: ${networks.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 4: Using searchNetworks Convenience Method
// =============================================================================
async function convenienceMethodExample() {
  console.log('\n🎯 Example 4: Using Convenience Method');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY
  });

  try {
    // More readable syntax for specific networks
    const results = await client.searchNetworks(
      'Satya Nadella',
      'linkedin',
      'twitter'
    );

    console.log('Results:', JSON.stringify(results.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 5: Error Handling and Retry Logic
// =============================================================================
async function errorHandlingExample() {
  console.log('\n⚠️  Example 5: Error Handling');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY,
    maxRetries: 3,
    retryDelay: 1000
  });

  try {
    // This will succeed
    await client.search({ query: 'valid query' });
    console.log('✅ Valid search succeeded');
  } catch (error) {
    console.error('❌ Search failed:', error.message);
  }

  try {
    // This will fail validation
    await client.search({});
  } catch (error) {
    console.log('✅ Caught validation error:', error.message);
  }

  try {
    // This will fail with invalid networks
    await client.search({
      query: 'test',
      socialNetworks: ['invalid-network']
    });
  } catch (error) {
    console.log('✅ Caught invalid network error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 6: Performance Monitoring
// =============================================================================
async function performanceMonitoringExample() {
  console.log('\n📊 Example 6: Performance Monitoring');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY,
    requestsPerSecond: 2
  });

  // Set up periodic monitoring
  const monitorInterval = setInterval(() => {
    const stats = client.getStats();
    console.log(`
    📈 Real-time Stats:
       Total Requests: ${stats.totalRequests}
       Successful: ${stats.successfulRequests}
       Failed: ${stats.failedRequests}
       Queue Length: ${stats.queueLength}
       Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms
       Rate Limit Hits: ${stats.rateLimitHits}
    `);
  }, 2000);

  try {
    // Perform several searches
    const queries = ['test1', 'test2', 'test3', 'test4'];
    
    for (const query of queries) {
      client.search({ query }).catch(() => {}); // Fire and forget
    }

    // Wait for all to complete
    await client.flush();
    
    clearInterval(monitorInterval);
    console.log('\n✅ All requests completed');
    console.log('Final Statistics:', client.getStats());
  } catch (error) {
    clearInterval(monitorInterval);
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 7: Tier Configuration
// =============================================================================
async function tierConfigurationExample() {
  console.log('\n⚙️  Example 7: Configuring API Tiers');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY
  });

  console.log('Available tiers:', SocialLinksSearchClient.RATE_LIMITS);

  // Configure for BASIC tier
  client.setTier('BASIC');
  console.log('\nConfigured for BASIC tier:', client.getStats());

  // Upgrade to PRO tier
  client.setTier('PRO');
  console.log('Upgraded to PRO tier:', client.getStats());

  // Or set custom rate limit
  client.setRateLimit(7);
  console.log('Custom rate limit set:', client.getStats());
}

// =============================================================================
// EXAMPLE 8: Email to Social Profile Lookup
// =============================================================================
async function emailLookupExample() {
  console.log('\n📧 Example 8: Email to Social Profile Lookup');
  console.log('─'.repeat(60));

  const client = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY
  });

  const emails = [
    'example@company.com',
    'john.smith@email.com'
  ];

  console.log('Looking up social profiles for emails...\n');

  for (const email of emails) {
    try {
      const results = await client.search({ query: email });
      
      console.log(`${email}:`);
      if (results.data) {
        const foundNetworks = Object.keys(results.data).filter(
          key => results.data[key] && results.data[key].length > 0
        );
        
        if (foundNetworks.length > 0) {
          foundNetworks.forEach(network => {
            console.log(`  ${network}: ${results.data[network][0]?.id || 'N/A'}`);
          });
        } else {
          console.log('  No profiles found');
        }
      }
      console.log('');
    } catch (error) {
      console.error(`  Error: ${error.message}\n`);
    }
  }
}

// =============================================================================
// EXAMPLE 9: Building a Social Media Aggregator Class
// =============================================================================
class SocialMediaAggregator {
  constructor(apiKey, tier = 'BASIC') {
    this.client = new SocialLinksSearchClient({ apiKey });
    this.client.setTier(tier);
    this.cache = new Map();
  }

  async findProfiles(identifier, options = {}) {
    // Check cache first
    const cacheKey = `${identifier}-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      console.log('  📦 Returning cached result');
      return this.cache.get(cacheKey);
    }

    // Search API
    const results = await this.client.search({
      query: identifier,
      ...options
    });

    // Cache results
    this.cache.set(cacheKey, results);
    return results;
  }

  async bulkLookup(identifiers, networks = null) {
    const results = [];
    
    for (const identifier of identifiers) {
      try {
        const result = await this.findProfiles(identifier, {
          socialNetworks: networks
        });
        results.push({ identifier, success: true, data: result.data });
      } catch (error) {
        results.push({ identifier, success: false, error: error.message });
      }
    }

    return results;
  }

  getStatistics() {
    return {
      ...this.client.getStats(),
      cacheSize: this.cache.size
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

async function aggregatorExample() {
  console.log('\n🔧 Example 9: Social Media Aggregator Class');
  console.log('─'.repeat(60));

  const aggregator = new SocialMediaAggregator(
    process.env.RAPIDAPI_KEY,
    'PRO'
  );

  try {
    // First lookup - hits API
    console.log('First lookup...');
    await aggregator.findProfiles('example query');
    
    // Second lookup - uses cache
    console.log('Second lookup (cached)...');
    await aggregator.findProfiles('example query');

    console.log('\nStatistics:', aggregator.getStatistics());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 10: Integration with Express.js API
// =============================================================================
function expressIntegrationExample() {
  console.log('\n🌐 Example 10: Express.js Integration Code');
  console.log('─'.repeat(60));

  console.log(`
// Example Express.js route handler
import express from 'express';
import SocialLinksSearchClient from './social-links-search.js';

const app = express();
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 5 // PRO tier
});

app.get('/api/social-search', async (req, res) => {
  try {
    const { query, networks } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Query parameter is required' 
      });
    }

    const results = await client.search({
      query,
      socialNetworks: networks ? networks.split(',') : undefined
    });

    res.json({
      success: true,
      data: results.data,
      stats: client.getStats()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
  `);
}

// =============================================================================
// RUN ALL EXAMPLES
// =============================================================================
async function runAllExamples() {
  console.log('\n🚀 Social Links Search API Client - Example Usage');
  console.log('='.repeat(60));

  // Check for API key
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === 'your_api_key_here') {
    console.error('\n❌ Error: RAPIDAPI_KEY environment variable not set');
    console.error('Please set your RapidAPI key:');
    console.error('  Windows: $env:RAPIDAPI_KEY="your_key_here"');
    console.error('  Linux/Mac: export RAPIDAPI_KEY="your_key_here"\n');
    process.exit(1);
  }

  try {
    // Run examples (comment out any you don't want to run)
    await basicSearchExample();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await filteredSearchExample();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // await batchProcessingExample(); // Takes longer, uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    await convenienceMethodExample();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await errorHandlingExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // await performanceMonitoringExample(); // Takes longer, uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    await tierConfigurationExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // await emailLookupExample(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await aggregatorExample(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 1500));
    
    expressIntegrationExample();

    console.log('\n✅ All examples completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
runAllExamples();
