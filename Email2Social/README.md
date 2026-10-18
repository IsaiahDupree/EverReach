# Social Links Search API Client

A comprehensive, production-ready Node.js client for the [RapidAPI Social Links Search API](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search). Search for social media profile links across multiple platforms including Facebook, TikTok, Instagram, Snapchat, Twitter, LinkedIn, YouTube, Pinterest, and GitHub.

## ✨ Features

- 🚀 **Simple & Intuitive API** - Clean, promise-based interface
- ⚡ **Built-in Rate Limiting** - Automatic request throttling based on your API tier
- 🔄 **Automatic Retries** - Exponential backoff for failed requests
- 📊 **Request Statistics** - Track API usage and performance
- 🎯 **Type Safety** - Comprehensive JSDoc annotations for IDE autocompletion
- 🔍 **Network Filtering** - Search specific social networks or all at once
- 🛡️ **Error Handling** - Detailed error messages and recovery strategies
- 📦 **Zero Dependencies** - Only requires `node-fetch` for HTTP requests

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Rate Limiting](#rate-limiting)
- [Pricing Tiers](#pricing-tiers)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Installation

```bash
npm install node-fetch
```

Then copy `social-links-search.js` to your project directory.

## 🔑 Getting Your API Key

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to the [Social Links Search API](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
3. Copy your API key from the API dashboard
4. Store it securely in environment variables (never commit API keys!)

## ⚡ Quick Start

```javascript
import SocialLinksSearchClient from './social-links-search.js';

// Initialize the client
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 1 // BASIC tier rate limit
});

// Search for social links
const results = await client.search({
  query: "John Smith"
});

console.log(results);
```

## 📚 API Reference

### Constructor

#### `new SocialLinksSearchClient(config)`

Creates a new instance of the API client.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `config.apiKey` | `string` | ✅ Yes | - | Your RapidAPI key |
| `config.apiHost` | `string` | ❌ No | `'social-links-search.p.rapidapi.com'` | API host |
| `config.requestsPerSecond` | `number` | ❌ No | `1` | Max requests per second (rate limit) |
| `config.maxRetries` | `number` | ❌ No | `3` | Maximum retry attempts |
| `config.retryDelay` | `number` | ❌ No | `1000` | Initial retry delay (ms) |
| `config.enableRateLimiting` | `boolean` | ❌ No | `true` | Enable/disable rate limiting |

**Example:**

```javascript
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 5, // PRO tier
  maxRetries: 3,
  retryDelay: 1000
});
```

---

### Methods

#### `search(params)`

Search for social media profile links.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.query` | `string` | ✅ Yes | Search query (name, email, username, etc.) |
| `params.socialNetworks` | `string\|string[]` | ❌ No | Specific networks to search (comma-separated string or array) |

**Returns:** `Promise<Object>` - Search results with social links

**Example:**

```javascript
// Search all networks
const results = await client.search({
  query: "example@email.com"
});

// Search specific networks (array)
const results = await client.search({
  query: "John Smith",
  socialNetworks: ["facebook", "linkedin", "twitter"]
});

// Search specific networks (string)
const results = await client.search({
  query: "John Smith",
  socialNetworks: "facebook,linkedin,twitter"
});
```

**Response Structure:**

```javascript
{
  "status": "ok",
  "request_id": "a8b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "data": {
    "facebook": [
      {
        "id": "https://www.facebook.com/john.smith",
        "title": "John Smith"
      }
    ],
    "linkedin": [
      {
        "id": "https://www.linkedin.com/in/johnsmith",
        "title": "John Smith"
      }
    ],
    // ... other networks
  }
}
```

---

#### `searchNetworks(query, ...networks)`

Convenience method for searching specific networks using rest parameters.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | ✅ Yes | Search query |
| `...networks` | `string` | ❌ No | Network names as separate arguments |

**Returns:** `Promise<Object>` - Search results

**Example:**

```javascript
const results = await client.searchNetworks(
  "John Smith", 
  "facebook", 
  "linkedin", 
  "twitter"
);
```

---

#### `getStats()`

Get client statistics and performance metrics.

**Returns:** `Object` - Statistics object

**Example:**

```javascript
const stats = client.getStats();
console.log(stats);
/*
{
  totalRequests: 150,
  successfulRequests: 145,
  failedRequests: 5,
  rateLimitHits: 2,
  averageResponseTime: 234,
  queueLength: 0,
  rateLimitingEnabled: true,
  requestsPerSecond: 5
}
*/
```

---

#### `resetStats()`

Reset all statistics counters to zero.

**Example:**

```javascript
client.resetStats();
```

---

#### `flush()`

Wait for all pending requests in the queue to complete.

**Returns:** `Promise<void>`

**Example:**

```javascript
await client.flush();
console.log('All requests completed');
```

---

#### `clearQueue()`

Clear all pending requests from the queue.

**Example:**

```javascript
client.clearQueue();
```

---

#### `setRateLimit(requestsPerSecond)`

Update the rate limiting configuration.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requestsPerSecond` | `number` | ✅ Yes | New rate limit (must be > 0) |

**Example:**

```javascript
// Upgrade to PRO tier
client.setRateLimit(5);
```

---

#### `setTier(tier)`

Configure client based on pricing tier.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tier` | `string` | ✅ Yes | Pricing tier: `'BASIC'`, `'PRO'`, `'ULTRA'`, or `'MEGA'` |

**Example:**

```javascript
client.setTier('PRO');
```

---

### Static Properties

#### `SocialLinksSearchClient.SUPPORTED_NETWORKS`

Array of supported social networks.

```javascript
[
  'facebook',
  'tiktok',
  'instagram',
  'snapchat',
  'twitter',
  'youtube',
  'linkedin',
  'github',
  'pinterest'
]
```

#### `SocialLinksSearchClient.RATE_LIMITS`

Rate limits for each pricing tier.

```javascript
{
  BASIC: { requestsPerSecond: 1, requestsPerMonth: 50 },
  PRO: { requestsPerSecond: 5, requestsPerMonth: 10000 },
  ULTRA: { requestsPerSecond: 10, requestsPerMonth: 50000 },
  MEGA: { requestsPerSecond: 20, requestsPerMonth: 200000 }
}
```

## ⚖️ Rate Limiting

This client includes intelligent rate limiting to prevent hitting API limits:

- **Queue-based System**: Requests are queued and processed according to your rate limit
- **Automatic Throttling**: Respects requests-per-second limits based on your tier
- **Marginal Limiting**: Configurable to stay just under rate limits
- **Burst Handling**: Queues excess requests instead of rejecting them

### Configuring Rate Limits

```javascript
// Manual configuration
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  requestsPerSecond: 5 // PRO tier
});

// Or use tier presets
client.setTier('PRO');

// Disable rate limiting (not recommended)
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  enableRateLimiting: false
});
```

### How It Works

1. Each request is added to a queue
2. The queue processor ensures only N requests per second (based on your limit)
3. Excess requests wait in the queue
4. Failed requests automatically retry with exponential backoff

## 💰 Pricing Tiers

| Tier | Price/Month | Requests/Month | Requests/Second | Rate Limit |
|------|-------------|----------------|-----------------|------------|
| **BASIC** | $0.00 | 50 | 1 | 1 req/second |
| **PRO** | $25.00 | 10,000 | 5 | 5 req/second |
| **ULTRA** ⭐ | $75.00 | 50,000 | 10 | 10 req/second |
| **MEGA** | $150.00 | 200,000 | 20 | 20 req/second |

See the [official pricing page](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search/pricing) for current rates.

## 🚨 Error Handling

The client provides detailed error messages for common issues:

```javascript
try {
  const results = await client.search({ query: "John Smith" });
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    console.error('Hit rate limit. Consider upgrading your plan.');
  } else if (error.message.includes('HTTP 401')) {
    console.error('Invalid API key. Check your credentials.');
  } else if (error.message.includes('HTTP 403')) {
    console.error('API access forbidden. Check your subscription.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `401` | Unauthorized | Check your API key |
| `403` | Forbidden | Verify your subscription is active |
| `429` | Rate Limit Exceeded | Wait or upgrade your plan |
| `500` | Server Error | Retry or contact support |

## 🔥 Advanced Usage

### Batch Searching with Rate Limiting

```javascript
const queries = ["John Smith", "Jane Doe", "Bob Johnson"];

// Process all queries (respects rate limit automatically)
const results = await Promise.all(
  queries.map(query => client.search({ query }))
);
```

### Monitoring Performance

```javascript
// Start monitoring
setInterval(() => {
  const stats = client.getStats();
  console.log(`
    Requests: ${stats.successfulRequests}/${stats.totalRequests}
    Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms
    Queue Length: ${stats.queueLength}
    Rate Limit Hits: ${stats.rateLimitHits}
  `);
}, 5000);
```

### Custom Retry Logic

```javascript
const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY,
  maxRetries: 5,
  retryDelay: 2000 // Start with 2 second delay
});
```

### Searching Specific Networks Only

```javascript
// Focus on professional networks
const results = await client.search({
  query: "John Smith",
  socialNetworks: ["linkedin", "github"]
});

// Or use the convenience method
const results = await client.searchNetworks(
  "John Smith",
  "linkedin",
  "github"
);
```

## 📖 Examples

### Example 1: Basic Search

```javascript
import SocialLinksSearchClient from './social-links-search.js';

const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY
});

const results = await client.search({
  query: "example@email.com"
});

console.log('Found profiles:', results.data);
```

### Example 2: Enterprise Integration

```javascript
class SocialMediaAggregator {
  constructor(apiKey) {
    this.client = new SocialLinksSearchClient({
      apiKey,
      requestsPerSecond: 10 // ULTRA tier
    });
  }

  async aggregateUserProfiles(users) {
    const profiles = [];

    for (const user of users) {
      try {
        const result = await this.client.search({
          query: user.email,
          socialNetworks: ['linkedin', 'twitter']
        });
        
        profiles.push({
          user: user.email,
          socialLinks: result.data
        });
      } catch (error) {
        console.error(`Failed for ${user.email}:`, error.message);
      }
    }

    // Wait for any remaining queued requests
    await this.client.flush();

    return profiles;
  }
}
```

### Example 3: With Environment Variables

Create a `.env` file:

```env
RAPIDAPI_KEY=your_api_key_here
RAPIDAPI_TIER=PRO
```

Use it in your code:

```javascript
import 'dotenv/config';
import SocialLinksSearchClient from './social-links-search.js';

const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY
});

// Set tier from environment
client.setTier(process.env.RAPIDAPI_TIER || 'BASIC');
```

## 🧪 Testing

Run the test suite:

```bash
node test-social-links-search.mjs
```

The test suite includes:

- ✅ Unit tests for all methods
- ✅ Rate limiting validation
- ✅ Error handling tests
- ✅ Integration tests with the live API
- ✅ Performance benchmarks

See `test-social-links-search.mjs` for detailed test cases.

## 🔐 Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Update keys periodically
3. **Use HTTPS only** - The client enforces HTTPS
4. **Limit key scope** - Use separate keys for dev/prod
5. **Monitor usage** - Track API calls with `getStats()`

## 📝 Best Practices

1. **Start with the BASIC tier** - Test before upgrading
2. **Use rate limiting** - Keep it enabled in production
3. **Handle errors gracefully** - Implement proper try/catch blocks
4. **Monitor statistics** - Use `getStats()` to track usage
5. **Filter networks** - Only search networks you need
6. **Cache results** - Avoid redundant API calls
7. **Use environment variables** - Keep configuration separate

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - feel free to use this in your projects.

## 🆘 Support

- **API Documentation**: [RapidAPI Docs](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
- **Issues**: Open an issue on GitHub
- **Email**: Contact RapidAPI support for API-specific issues

## 🗺️ Roadmap

- [ ] TypeScript definitions
- [ ] Browser compatibility
- [ ] Response caching layer
- [ ] Webhook support
- [ ] Batch API endpoints
- [ ] GraphQL interface

## 🙏 Acknowledgments

- Built for the [RapidAPI Social Links Search API](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
- Created by OpenWeb Ninja

---

**Made with ❤️ for developers who need social media profile discovery**
