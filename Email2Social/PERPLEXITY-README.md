# Perplexity AI Client for Lead Enrichment

A comprehensive, production-ready Node.js client for the [Perplexity AI API](https://www.perplexity.ai/) via RapidAPI. Designed specifically for lead enrichment, company research, and intelligent B2B data gathering with real-time web search capabilities.

## ✨ Features

- 🎯 **Lead Enrichment Templates** - Pre-built prompts for common enrichment tasks
- 🚀 **Real-time Web Search** - Access current information via Perplexity's online models
- ⚡ **Built-in Rate Limiting** - Automatic request throttling and token tracking
- 🔄 **Automatic Retries** - Exponential backoff for failed requests
- 📊 **Token Usage Monitoring** - Track costs and consumption
- 🎯 **Type Safety** - Comprehensive JSDoc annotations
- 🔍 **Citation Support** - Get sources for all information
- 🛡️ **Error Handling** - Detailed error messages and recovery
- 📦 **Zero Config** - Works out of the box with smart defaults

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Lead Enrichment Use Cases](#lead-enrichment-use-cases)
- [API Reference](#api-reference)
- [Rate Limiting & Token Management](#rate-limiting--token-management)
- [Pricing Tiers](#pricing-tiers)
- [Enrichment Templates](#enrichment-templates)
- [Examples](#examples)
- [Best Practices](#best-practices)

## 🚀 Installation

```bash
npm install node-fetch
```

Then copy `perplexity-client.js` to your project directory.

## 🔑 Getting Your API Key

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to the [Perplexity API](https://rapidapi.com/winbay-tech-winbay-tech-default/api/perplexity2)
3. Copy your API key from the dashboard
4. Store it in your `.env` file

## ⚡ Quick Start

```javascript
import PerplexityClient from './perplexity-client.js';

// Initialize the client
const client = new PerplexityClient({
  apiKey: process.env.PERPLEXITY_API_KEY,
  requestsPerSecond: 1 // BASIC tier
});

// Enrich a company
const companyData = await client.enrichCompany("Tesla Inc");
console.log(client.extractContent(companyData));

// Enrich a person
const personData = await client.enrichPerson("Elon Musk", "Tesla");
console.log(client.extractContent(personData));
```

## 🎯 Lead Enrichment Use Cases

### 1. Company Research & Enrichment
```javascript
const data = await client.enrichCompany("Salesforce");
// Returns: company overview, industry, size, headquarters, 
// executives, recent news, products/services
```

### 2. Contact Information Enrichment
```javascript
const contact = await client.enrichContact("john@company.com");
// Returns: name, company, title, background, social profiles
```

### 3. Lead Qualification
```javascript
const qualification = await client.qualifyLead(
  "Acme Corp",
  "revenue >$10M, 50-500 employees, tech sector"
);
// Returns: qualification score and detailed reasoning
```

### 4. Competitive Intelligence
```javascript
const competitors = await client.analyzeCompetitors("HubSpot");
// Returns: competitor list, positioning, strengths/weaknesses
```

### 5. Industry Research
```javascript
const research = await client.researchIndustry("SaaS", "AI trends");
// Returns: trends, players, market size, opportunities
```

### 6. Recent Company News
```javascript
const news = await client.getCompanyNews("Apple", "last week");
// Returns: funding, partnerships, launches, leadership changes
```

## 📚 API Reference

### Constructor

#### `new PerplexityClient(config)`

Creates a new instance of the Perplexity API client.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `config.apiKey` | `string` | ✅ Yes | - | Your RapidAPI key |
| `config.apiHost` | `string` | ❌ No | `'perplexity2.p.rapidapi.com'` | API host |
| `config.model` | `string` | ❌ No | `'llama-3.1-sonar-small-128k-online'` | Default model |
| `config.requestsPerSecond` | `number` | ❌ No | `1` | Max requests per second |
| `config.maxRetries` | `number` | ❌ No | `3` | Maximum retry attempts |
| `config.retryDelay` | `number` | ❌ No | `1000` | Initial retry delay (ms) |
| `config.enableRateLimiting` | `boolean` | ❌ No | `true` | Enable/disable rate limiting |
| `config.maxTokens` | `number` | ❌ No | `4096` | Max tokens per request |
| `config.temperature` | `number` | ❌ No | `0.2` | Sampling temperature (0-2) |

---

### Core Methods

#### `chat(params)`

Send a chat completion request to Perplexity AI.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.messages` | `string\|Array` | ✅ Yes | Message(s) to send |
| `params.model` | `string` | ❌ No | Model to use |
| `params.maxTokens` | `number` | ❌ No | Maximum tokens to generate |
| `params.temperature` | `number` | ❌ No | Sampling temperature (0-2) |
| `params.returnCitations` | `boolean` | ❌ No | Whether to return citations |
| `params.returnImages` | `boolean` | ❌ No | Whether to return related images |
| `params.searchRecencyFilter` | `string` | ❌ No | Filter by recency ("day", "week", "month") |

**Example:**

```javascript
const result = await client.chat({
  messages: "Tell me about Tesla's latest developments",
  returnCitations: true,
  searchRecencyFilter: "week"
});

const content = client.extractContent(result);
const citations = client.extractCitations(result);
```

---

### Lead Enrichment Methods

#### `enrichCompany(companyName, options)`

Get comprehensive company information.

**Returns:** Company overview, industry, size, headquarters, executives, news, products/services

```javascript
const data = await client.enrichCompany("Stripe");
console.log(client.extractContent(data));
```

---

#### `enrichPerson(personName, company, options)`

Get professional information about a person.

**Returns:** Current role, background, education, achievements, social presence

```javascript
const data = await client.enrichPerson("Satya Nadella", "Microsoft");
console.log(client.extractContent(data));
```

---

#### `enrichContact(email, options)`

Enrich contact information from an email address.

**Returns:** Name, company, title, professional background, contact info

```javascript
const data = await client.enrichContact("ceo@company.com");
console.log(client.extractContent(data));
```

---

#### `getCompanyNews(companyName, timeframe, options)`

Get recent news and developments.

**Parameters:**
- `companyName` - Company to research
- `timeframe` - Time period (e.g., "last week", "last 3 months")

**Returns:** Recent funding, partnerships, product launches, leadership changes

```javascript
const news = await client.getCompanyNews("OpenAI", "last month");
console.log(client.extractContent(news));
```

---

#### `analyzeCompetitors(companyName, options)`

Perform competitive intelligence analysis.

**Returns:** Competitor names, market positioning, strengths/weaknesses, differentiation

```javascript
const competitors = await client.analyzeCompetitors("Zoom");
console.log(client.extractContent(competitors));
```

---

#### `qualifyLead(companyName, criteria, options)`

Qualify a lead based on specific criteria.

**Parameters:**
- `companyName` - Company to qualify
- `criteria` - Qualification criteria (e.g., "revenue >$10M, 100+ employees")

**Returns:** Qualification score and detailed reasoning

```javascript
const qualification = await client.qualifyLead(
  "Acme Corp",
  "annual revenue >$10M, 50-500 employees, technology sector"
);
```

---

#### `researchIndustry(industry, topic, options)`

Research industry trends and insights.

**Returns:** Key trends, major players, market size, challenges, opportunities

```javascript
const research = await client.researchIndustry("FinTech", "blockchain adoption");
console.log(client.extractContent(research));
```

---

### Utility Methods

#### `extractContent(response)`

Extract the main text content from a response.

```javascript
const response = await client.enrichCompany("Tesla");
const text = client.extractContent(response);
```

---

#### `extractCitations(response)`

Extract citations/sources from a response.

```javascript
const response = await client.enrichCompany("Tesla");
const sources = client.extractCitations(response);
```

---

#### `getStats()`

Get client statistics including token usage.

```javascript
const stats = client.getStats();
console.log(`Tokens used: ${stats.totalTokensUsed}`);
console.log(`Avg tokens/request: ${stats.averageTokensPerRequest}`);
```

---

### Configuration Methods

#### `setTier(tier)`

Configure based on pricing tier.

```javascript
client.setTier('PRO');
```

#### `setModel(model)`

Change the default model.

```javascript
client.setModel(PerplexityClient.MODELS.SONAR_LARGE);
```

#### `setRateLimit(requestsPerSecond)`

Update rate limiting.

```javascript
client.setRateLimit(2); // ULTRA tier
```

---

## ⚖️ Rate Limiting & Token Management

### Rate Limits by Tier

The client automatically enforces rate limits and tracks token usage:

| Tier | Req/Second | Req/Hour | Req/Month | Tokens/Month |
|------|------------|----------|-----------|--------------|
| **BASIC** | 1 | 1,000 | 50 | 100,000 |
| **PRO** | 1 | - | 3,000 | 5,000,000 |
| **ULTRA** | 2 | - | 50,000 | 100,000,000 |
| **MEGA** | 5 | - | 250,000 | 250,000,000 |

### Token Tracking

```javascript
const stats = client.getStats();
console.log(`
  Total Tokens Used: ${stats.totalTokensUsed}
  Prompt Tokens: ${stats.totalPromptTokens}
  Completion Tokens: ${stats.totalCompletionTokens}
  Average per Request: ${stats.averageTokensPerRequest.toFixed(0)}
`);
```

## 💰 Pricing Tiers

| Tier | Price/Month | Best For |
|------|-------------|----------|
| **BASIC** | $0.00 | Testing, small projects |
| **PRO** | $5.00 | Small businesses, startups |
| **ULTRA** ⭐ | $50.00 | Growing companies, regular use |
| **MEGA** | $199.98 | Enterprise, high-volume |

## 📋 Enrichment Templates

The client includes pre-built templates for common use cases:

```javascript
// Available via PerplexityClient.ENRICHMENT_TEMPLATES

COMPANY_INFO(companyName)
PERSON_INFO(personName, company)
CONTACT_ENRICHMENT(email)
INDUSTRY_RESEARCH(industry, topic)
COMPETITOR_ANALYSIS(companyName)
LEAD_QUALIFICATION(companyName, criteria)
NEWS_SUMMARY(companyName, timeframe)
```

Use them directly:

```javascript
const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.COMPANY_INFO("Tesla");
const result = await client.chat({ messages: prompt });
```

## 📖 Examples

### Example 1: Complete Lead Enrichment Pipeline

```javascript
async function enrichLead(companyName) {
  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  // Gather company information
  const company = await client.enrichCompany(companyName);
  
  // Get recent news
  const news = await client.getCompanyNews(companyName, "last month");
  
  // Analyze competitors
  const competitors = await client.analyzeCompetitors(companyName);
  
  // Qualify the lead
  const qualification = await client.qualifyLead(
    companyName,
    "revenue >$5M, growth stage, B2B SaaS"
  );

  return {
    company: client.extractContent(company),
    news: client.extractContent(news),
    competitors: client.extractContent(competitors),
    qualification: client.extractContent(qualification),
    sources: client.extractCitations(company)
  };
}
```

### Example 2: Batch Company Enrichment

```javascript
async function enrichMultipleCompanies(companies) {
  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    requestsPerSecond: 2 // ULTRA tier
  });

  const results = await Promise.all(
    companies.map(company => 
      client.enrichCompany(company).catch(err => ({
        error: err.message,
        company
      }))
    )
  );

  await client.flush();
  
  console.log('Statistics:', client.getStats());
  return results;
}
```

### Example 3: Email to Full Profile

```javascript
async function emailToProfile(email) {
  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  // First, enrich the contact
  const contact = await client.enrichContact(email);
  const contactInfo = client.extractContent(contact);
  
  // Extract company from contact info (parse the response)
  // Then enrich the company
  const company = await client.enrichCompany(extractedCompanyName);
  
  return {
    contact: contactInfo,
    company: client.extractContent(company),
    citations: client.extractCitations(contact)
  };
}
```

### Example 4: Real-time Market Intelligence

```javascript
async function getMarketIntelligence(sector) {
  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  const intelligence = await client.chat({
    messages: `Provide current market intelligence for the ${sector} sector: 
                top 5 companies, recent funding rounds, major trends, 
                and key challenges in the last 30 days.`,
    returnCitations: true,
    searchRecencyFilter: "month"
  });

  return {
    data: client.extractContent(intelligence),
    sources: client.extractCitations(intelligence),
    usage: intelligence.usage
  };
}
```

### Example 5: Lead Scoring System

```javascript
class LeadScoringSystem {
  constructor(apiKey) {
    this.client = new PerplexityClient({
      apiKey,
      requestsPerSecond: 2
    });
  }

  async scoreCompany(companyName, criteria) {
    // Get company info
    const info = await this.client.enrichCompany(companyName);
    
    // Get recent news for growth signals
    const news = await this.client.getCompanyNews(companyName, "last 3 months");
    
    // Qualify against criteria
    const qualification = await this.client.qualifyLead(companyName, criteria);
    
    // Parse and score
    const score = this.calculateScore(info, news, qualification);
    
    return {
      company: companyName,
      score,
      details: {
        info: this.client.extractContent(info),
        news: this.client.extractContent(news),
        qualification: this.client.extractContent(qualification)
      }
    };
  }

  calculateScore(info, news, qualification) {
    // Implement your scoring logic
    return Math.floor(Math.random() * 100); // Placeholder
  }
}
```

## 🎯 Best Practices

### 1. Use Specific Models for Different Tasks

```javascript
// For quick, cost-effective queries
client.setModel(PerplexityClient.MODELS.SONAR_SMALL);

// For detailed analysis
client.setModel(PerplexityClient.MODELS.SONAR_LARGE);

// For most comprehensive research
client.setModel(PerplexityClient.MODELS.SONAR_HUGE);
```

### 2. Always Request Citations for B2B Data

```javascript
const result = await client.enrichCompany("Acme Corp", {
  returnCitations: true  // Essential for verifying information
});
```

### 3. Monitor Token Usage

```javascript
// Check before large batch operations
const statsBefore = client.getStats();

// ... perform operations ...

const statsAfter = client.getStats();
const tokensUsed = statsAfter.totalTokensUsed - statsBefore.totalTokensUsed;
console.log(`Operation used ${tokensUsed} tokens`);
```

### 4. Use Recency Filters for Time-Sensitive Data

```javascript
const news = await client.getCompanyNews("Company", "last week", {
  searchRecencyFilter: "week"  // Ensures fresh data
});
```

### 5. Implement Caching for Repeated Queries

```javascript
class CachedPerplexityClient {
  constructor(apiKey) {
    this.client = new PerplexityClient({ apiKey });
    this.cache = new Map();
  }

  async enrichCompany(name) {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    const result = await this.client.enrichCompany(name);
    this.cache.set(name, result);
    return result;
  }
}
```

### 6. Handle Rate Limits Gracefully

```javascript
try {
  const result = await client.enrichCompany("Company");
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Wait and retry, or queue for later
    await sleep(60000); // Wait 1 minute
  }
}
```

## 🚨 Error Handling

```javascript
try {
  const result = await client.enrichCompany("Tesla");
} catch (error) {
  if (error.message.includes('Rate limit')) {
    console.error('Rate limit hit. Upgrade plan or wait.');
  } else if (error.message.includes('HTTP 401')) {
    console.error('Invalid API key');
  } else if (error.message.includes('HTTP 429')) {
    console.error('Too many requests');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🔐 Security Best Practices

1. **Never commit API keys** - Use `.env` files
2. **Rotate keys regularly** - Security best practice
3. **Monitor usage** - Track with `getStats()`
4. **Implement rate limiting** - Keep it enabled in production
5. **Cache responses** - Reduce redundant API calls

## 🧪 Testing

Run the test suite:

```bash
node test-perplexity.mjs
```

## 📝 Available Models

```javascript
PerplexityClient.MODELS = {
  SONAR_SMALL: 'llama-3.1-sonar-small-128k-online',   // Fast, cost-effective
  SONAR_LARGE: 'llama-3.1-sonar-large-128k-online',   // Balanced
  SONAR_HUGE: 'llama-3.1-sonar-huge-128k-online'      // Most capable
}
```

## 🆘 Common Issues

### Token Limit Exceeded
- Reduce `maxTokens` in config
- Use SONAR_SMALL model
- Break large queries into smaller chunks

### Rate Limit Hit
- Upgrade your tier
- Reduce `requestsPerSecond`
- Implement request queuing

### Slow Response Times
- Use SONAR_SMALL for faster responses
- Reduce `maxTokens`
- Check network connection

## 📞 Support

- **Full Documentation**: [PERPLEXITY-README.md](./PERPLEXITY-README.md)
- **Examples**: [perplexity-examples.mjs](./perplexity-examples.mjs)
- **Tests**: [test-perplexity.mjs](./test-perplexity.mjs)
- **RapidAPI**: [Perplexity API Docs](https://rapidapi.com/)

## 📄 License

MIT License - Free to use in your projects.

---

**Built with ❤️ for B2B lead enrichment and intelligence gathering**
