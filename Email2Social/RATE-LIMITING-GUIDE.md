# Rate Limiting Best Practices Guide

## 🎯 Honoring API Rate Limits

Both clients are designed to automatically honor rate limits. Here's how to configure them properly for your service tier.

---

## 📊 API Rate Limits Summary

### Social Links Search API

| Tier | Requests/Month | Requests/Second | Requests/Hour |
|------|----------------|-----------------|---------------|
| BASIC | 50 | 1 | ~2 |
| PRO | 10,000 | 5 | ~300 |
| ULTRA | 50,000 | 10 | ~600 |
| MEGA | 200,000 | 20 | ~1,200 |

### Perplexity AI API

| Tier | Requests/Month | Tokens/Month | Requests/Second | Requests/Hour |
|------|----------------|--------------|-----------------|---------------|
| BASIC | 50 | 100,000 | 1 | ~2 |
| PRO | 3,000 | 5,000,000 | 1 | ~4 |
| ULTRA | 50,000 | 100,000,000 | 2 | ~120 |
| MEGA | 250,000 | 250,000,000 | 5 | ~300 |

---

## ⚙️ Configuration for Each Tier

### BASIC Tier ($0/month)

```javascript
// For testing only - very limited
const perplexity = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  requestsPerSecond: 0.5, // Stay under limit (1/2 requests per sec)
  maxTokens: 2000 // Conserve tokens
});

const social = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 0.5 // Stay under limit
});
```

**Monthly Capacity**: ~50 total enrichments
**Best For**: Development and testing

---

### PRO Tier ($30/month)

```javascript
// Good for small business
const perplexity = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  requestsPerSecond: 0.8, // Stay at 80% of limit for safety
  maxTokens: 3000,
  enableRateLimiting: true
});

const social = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 4, // Stay at 80% of limit (5/sec max)
  enableRateLimiting: true
});
```

**Monthly Capacity**: ~3,000 enrichments
**Best For**: Small sales teams (5-10 people)

---

### ULTRA Tier ($125/month) - RECOMMENDED

```javascript
// Best value for growing companies
const perplexity = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  requestsPerSecond: 1.6, // Stay at 80% of limit (2/sec max)
  maxTokens: 4096,
  enableRateLimiting: true
});

const social = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 8, // Stay at 80% of limit (10/sec max)
  enableRateLimiting: true
});
```

**Monthly Capacity**: ~50,000 enrichments
**Best For**: Mid-market companies, active sales teams

---

### MEGA Tier ($350/month)

```javascript
// For high-volume operations
const perplexity = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  requestsPerSecond: 4, // Stay at 80% of limit (5/sec max)
  maxTokens: 4096,
  enableRateLimiting: true
});

const social = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 16, // Stay at 80% of limit (20/sec max)
  enableRateLimiting: true
});
```

**Monthly Capacity**: 200,000+ enrichments
**Best For**: Enterprise teams, high-volume operations

---

## 🛡️ Rate Limit Safety Strategies

### 1. Always Enable Rate Limiting

```javascript
// ✅ GOOD - Rate limiting enabled
const client = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  enableRateLimiting: true, // Always set to true in production
  requestsPerSecond: 1
});

// ❌ BAD - No rate limiting
const client = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  enableRateLimiting: false // Don't do this in production!
});
```

### 2. Use 80% Rule

Stay at 80% of your rate limit to avoid hitting the ceiling:

```javascript
// If your limit is 10 req/sec, configure for 8
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 8 // 80% of 10 req/sec limit
});
```

### 3. Monitor Usage

```javascript
// Check stats periodically
setInterval(() => {
  const stats = client.getStats();
  
  if (stats.rateLimitHits > 0) {
    console.warn(`⚠️ Hit rate limit ${stats.rateLimitHits} times`);
    console.warn('Consider reducing requestsPerSecond');
  }
  
  console.log(`Requests: ${stats.totalRequests}`);
  console.log(`Queue: ${stats.queueLength}`);
}, 60000); // Every minute
```

### 4. Implement Request Queuing

```javascript
// Both clients automatically queue requests
async function batchEnrich(leads) {
  const results = [];
  
  for (const lead of leads) {
    // Requests are automatically queued and throttled
    const enriched = await enrichLead(lead);
    results.push(enriched);
  }
  
  // Wait for all queued requests to complete
  await client.flush();
  
  return results;
}
```

---

## 📈 Scaling Strategy

### Start Small → Scale Up

1. **Month 1-2**: Start with PRO tier ($30/mo)
   - Test with real customers
   - Monitor usage patterns
   - Gather feedback

2. **Month 3-6**: Upgrade to ULTRA tier ($125/mo)
   - Scale to 50K enrichments/month
   - Add more customers
   - Monitor costs vs revenue

3. **Month 6+**: Consider MEGA tier ($350/mo)
   - 200K+ enrichments/month
   - Enterprise customers
   - Custom solutions

---

## 💡 Cost Optimization Tips

### 1. Cache Results

```javascript
class CachedEnrichmentService {
  constructor(perplexityKey, socialKey) {
    this.perplexity = new PerplexityClient({ apiKey: perplexityKey });
    this.social = new SocialLinksSearchClient({ apiKey: socialKey });
    this.cache = new Map();
  }

  async enrichCompany(name) {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Only call API if not cached
    const result = await this.perplexity.enrichCompany(name);
    this.cache.set(name, result);
    return result;
  }
}
```

**Savings**: Reduce API calls by 30-50% for repeated queries

### 2. Use Smaller Models for Simple Queries

```javascript
// For quick lookups, use SONAR_SMALL
const quickClient = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  model: PerplexityClient.MODELS.SONAR_SMALL, // Faster, cheaper
  maxTokens: 2000
});

// For detailed analysis, use SONAR_LARGE
const detailedClient = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  model: PerplexityClient.MODELS.SONAR_LARGE,
  maxTokens: 4096
});
```

**Savings**: SONAR_SMALL uses ~50% fewer tokens

### 3. Batch Similar Requests

```javascript
// Group requests to maximize efficiency
async function enrichLeadsBatch(companies) {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    
    // Process batch with rate limiting
    const batchResults = await Promise.all(
      batch.map(company => enrichCompany(company))
    );
    
    results.push(...batchResults);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
```

---

## 🚨 Error Handling for Rate Limits

```javascript
async function enrichWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.enrichCompany(data);
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        // Wait longer before retrying
        const waitTime = Math.pow(2, i) * 60000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Re-throw non-rate-limit errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 📊 Monthly Budget Planning

### PRO Tier Example ($30/month)

- **Max Requests**: 3,000/month
- **Daily Budget**: ~100 enrichments/day
- **Hourly Budget**: ~4 enrichments/hour
- **Per Second**: 1 request max

**Recommendation**: Process requests during off-peak hours, queue large batches

### ULTRA Tier Example ($125/month)

- **Max Requests**: 50,000/month
- **Daily Budget**: ~1,667 enrichments/day
- **Hourly Budget**: ~70 enrichments/hour
- **Per Second**: 2 requests max

**Recommendation**: Can handle real-time enrichment for active sales teams

---

## ✅ Checklist: Production Deployment

- [ ] Rate limiting enabled on both clients
- [ ] RequestsPerSecond set to 80% of tier limit
- [ ] Monitoring set up for rate limit hits
- [ ] Caching implemented for repeated queries
- [ ] Error handling for rate limit errors
- [ ] Batch processing for large jobs
- [ ] Token usage monitoring (Perplexity)
- [ ] Monthly budget alerts configured
- [ ] Retry logic with exponential backoff
- [ ] Queue flushing implemented

---

## 🎯 Recommended Configuration for Production

```javascript
// production-config.js
export const getProductionConfig = (tier = 'PRO') => {
  const configs = {
    PRO: {
      perplexity: {
        requestsPerSecond: 0.8,
        maxTokens: 3000,
        model: 'llama-3.1-sonar-small-128k-online'
      },
      social: {
        requestsPerSecond: 4
      }
    },
    ULTRA: {
      perplexity: {
        requestsPerSecond: 1.6,
        maxTokens: 4096,
        model: 'llama-3.1-sonar-large-128k-online'
      },
      social: {
        requestsPerSecond: 8
      }
    },
    MEGA: {
      perplexity: {
        requestsPerSecond: 4,
        maxTokens: 4096,
        model: 'llama-3.1-sonar-large-128k-online'
      },
      social: {
        requestsPerSecond: 16
      }
    }
  };

  return configs[tier];
};

// Usage
import { getProductionConfig } from './production-config.js';

const config = getProductionConfig('ULTRA');

const perplexity = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  ...config.perplexity,
  enableRateLimiting: true
});

const social = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  ...config.social,
  enableRateLimiting: true
});
```

---

**Remember**: Always monitor usage and adjust rate limits based on actual API behavior!
