# Quick Start Guide

Get up and running with the Social Links Search API Client in 5 minutes!

## 🚀 Setup (3 steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Your API Key

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to [Social Links Search API](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
3. Copy your API key
4. Create a `.env` file:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

5. Edit `.env` and add your key:

```env
RAPIDAPI_KEY=your_actual_api_key_here
RAPIDAPI_TIER=BASIC
```

### Step 3: Run Your First Search

```bash
npm start
```

## 📝 Basic Usage

### Simple Search

```javascript
import SocialLinksSearchClient from './social-links-search.js';

const client = new SocialLinksSearchClient({
  apiKey: process.env.RAPIDAPI_KEY
});

const results = await client.search({
  query: 'Elon Musk'
});

console.log(results.data);
```

### Search Specific Networks

```javascript
const results = await client.search({
  query: 'Bill Gates',
  socialNetworks: ['linkedin', 'twitter']
});
```

### Using the Convenience Method

```javascript
const results = await client.searchNetworks(
  'Satya Nadella',
  'linkedin',
  'twitter'
);
```

## 🧪 Run Tests

```bash
npm test
```

## 📚 More Examples

Check out `example-usage.mjs` for 10 comprehensive examples including:
- Batch processing
- Error handling
- Performance monitoring
- Email lookup
- Express.js integration

## 🎯 Supported Networks

- Facebook
- TikTok
- Instagram
- Snapchat
- Twitter
- YouTube
- LinkedIn
- GitHub
- Pinterest

## 💰 Pricing Tiers

| Tier | Price | Requests/Month | Rate Limit |
|------|-------|----------------|------------|
| BASIC | Free | 50 | 1 req/sec |
| PRO | $25 | 10,000 | 5 req/sec |
| ULTRA | $75 | 50,000 | 10 req/sec |
| MEGA | $150 | 200,000 | 20 req/sec |

## 🔧 Configuration Options

```javascript
const client = new SocialLinksSearchClient({
  apiKey: 'your-key',           // Required
  requestsPerSecond: 5,          // Default: 1
  maxRetries: 3,                 // Default: 3
  retryDelay: 1000,             // Default: 1000ms
  enableRateLimiting: true      // Default: true
});
```

## 🆘 Common Issues

### "API key is required" error
- Make sure you've set `RAPIDAPI_KEY` in your `.env` file
- Or set it directly: `$env:RAPIDAPI_KEY="your_key"`

### Rate limit exceeded
- Upgrade your plan or reduce `requestsPerSecond`
- Use `client.setTier('PRO')` after upgrading

### "Invalid social networks" error
- Check spelling of network names
- Use lowercase: `'linkedin'` not `'LinkedIn'`

## 📖 Full Documentation

See [README.md](./README.md) for complete API reference and advanced usage.

## 🤝 Need Help?

- 📚 [Full Documentation](./README.md)
- 🧪 [Test Suite](./test-social-links-search.mjs)
- 💡 [Examples](./example-usage.mjs)
- 🌐 [RapidAPI Docs](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)

---

**Happy coding! 🎉**
