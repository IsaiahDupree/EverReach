# Perplexity AI Client - Quick Start Guide

Get started with the Perplexity AI client for lead enrichment in 5 minutes!

## 🚀 Setup (3 steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Your API Key

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to [Perplexity API](https://rapidapi.com/winbay-tech-winbay-tech-default/api/perplexity2)
3. Copy your API key
4. Update your `.env` file:

```bash
# Windows PowerShell
# (Already created from Social Links setup)
```

5. Add Perplexity key to `.env`:

```env
PERPLEXITY_API_KEY=your_actual_api_key_here
PERPLEXITY_TIER=BASIC
```

### Step 3: Run Your First Enrichment

```bash
npm run example:perplexity
```

## 📝 Basic Usage

### Simple Company Enrichment

```javascript
import PerplexityClient from './perplexity-client.js';

const client = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY
});

const result = await client.enrichCompany("Tesla Inc");
console.log(client.extractContent(result));
```

### Enrich a Person/Executive

```javascript
const result = await client.enrichPerson("Elon Musk", "Tesla");
console.log(client.extractContent(result));
```

### Get Company News

```javascript
const news = await client.getCompanyNews("Apple", "last week");
console.log(client.extractContent(news));
```

### Competitive Analysis

```javascript
const competitors = await client.analyzeCompetitors("Salesforce");
console.log(client.extractContent(competitors));
```

## 🧪 Run Tests

```bash
npm run test:perplexity
```

## 📚 Available Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `enrichCompany(name)` | Get company details | `enrichCompany("Stripe")` |
| `enrichPerson(name, company)` | Get person info | `enrichPerson("John Doe", "Acme")` |
| `enrichContact(email)` | Enrich from email | `enrichContact("john@company.com")` |
| `getCompanyNews(name, timeframe)` | Recent news | `getCompanyNews("Tesla", "last month")` |
| `analyzeCompetitors(name)` | Competitor analysis | `analyzeCompetitors("HubSpot")` |
| `qualifyLead(name, criteria)` | Lead scoring | `qualifyLead("Acme", "revenue >$10M")` |
| `researchIndustry(industry, topic)` | Industry research | `researchIndustry("SaaS", "AI trends")` |

## 💰 Pricing Tiers

| Tier | Price | Requests/Month | Tokens/Month | Rate Limit |
|------|-------|----------------|--------------|------------|
| **BASIC** | Free | 50 | 100,000 | 1 req/sec |
| **PRO** | $5 | 3,000 | 5,000,000 | 1 req/sec |
| **ULTRA** | $50 | 50,000 | 100,000,000 | 2 req/sec |
| **MEGA** | $199.98 | 250,000 | 250,000,000 | 5 req/sec |

## 🎯 Lead Enrichment Pipeline

```javascript
async function enrichLead(companyName) {
  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  // 1. Get company info
  const company = await client.enrichCompany(companyName);
  
  // 2. Get recent news
  const news = await client.getCompanyNews(companyName, "last month");
  
  // 3. Analyze competitors
  const competitors = await client.analyzeCompetitors(companyName);
  
  // 4. Qualify the lead
  const qualification = await client.qualifyLead(
    companyName,
    "revenue >$5M, growth stage, B2B SaaS"
  );

  return {
    company: client.extractContent(company),
    news: client.extractContent(news),
    competitors: client.extractContent(competitors),
    qualification: client.extractContent(qualification)
  };
}
```

## 📊 Monitor Token Usage

```javascript
const stats = client.getStats();
console.log(`
  Total Tokens Used: ${stats.totalTokensUsed}
  Prompt Tokens: ${stats.totalPromptTokens}
  Completion Tokens: ${stats.totalCompletionTokens}
  Average per Request: ${stats.averageTokensPerRequest}
`);
```

## 🔧 Configuration Options

```javascript
const client = new PerplexityClient({
  apiKey: 'your-key',              // Required
  model: 'sonar-small-online',     // Default: SONAR_SMALL
  requestsPerSecond: 1,            // Default: 1
  maxTokens: 4096,                 // Default: 4096
  temperature: 0.2,                // Default: 0.2 (0-2)
  enableRateLimiting: true         // Default: true
});
```

## 🔥 Common Use Cases

### 1. Lead Research Before Sales Call
```javascript
const leadInfo = await client.enrichCompany("Target Company");
const news = await client.getCompanyNews("Target Company", "last week");
```

### 2. Contact Enrichment from Email
```javascript
const contact = await client.enrichContact("prospect@company.com");
```

### 3. Market Intelligence
```javascript
const research = await client.researchIndustry("FinTech", "AI adoption");
```

### 4. Competitor Monitoring
```javascript
const competitors = await client.analyzeCompetitors("Your Company");
```

## 🆘 Common Issues

### "API key is required" error
- Set `PERPLEXITY_API_KEY` in your `.env` file
- Or: `$env:PERPLEXITY_API_KEY="your_key"` (Windows)

### Rate limit exceeded
- Upgrade your plan
- Use `client.setTier('PRO')` after upgrading

### High token usage
- Reduce `maxTokens` in config
- Use SONAR_SMALL model: `client.setModel(PerplexityClient.MODELS.SONAR_SMALL)`

## 📖 Full Documentation

- **Complete API Reference**: [PERPLEXITY-README.md](./PERPLEXITY-README.md)
- **All Examples**: [perplexity-examples.mjs](./perplexity-examples.mjs)
- **Test Suite**: [test-perplexity.mjs](./test-perplexity.mjs)

## 🌐 Combine with Social Links Search

```javascript
import PerplexityClient from './perplexity-client.js';
import SocialLinksSearchClient from './social-links-search.js';

// Get company intelligence
const perplexity = new PerplexityClient({ 
  apiKey: process.env.PERPLEXITY_API_KEY 
});
const companyInfo = await perplexity.enrichCompany("Tesla");

// Find social profiles
const social = new SocialLinksSearchClient({ 
  apiKey: process.env.RAPIDAPI_KEY 
});
const profiles = await social.search({ query: "Tesla" });

// Complete lead profile!
```

## 🎉 Next Steps

1. ✅ Read the [full documentation](./PERPLEXITY-README.md)
2. ✅ Explore [all 11 examples](./perplexity-examples.mjs)
3. ✅ Run tests: `npm run test:perplexity`
4. ✅ Build your lead enrichment pipeline!

---

**Happy enriching! 🚀**
