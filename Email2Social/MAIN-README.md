# Email2Social - Complete API Toolkit

**Production-ready API clients for lead enrichment, social profile discovery, and B2B intelligence gathering.**

This repository contains two powerful, fully-featured API clients designed to work together for comprehensive lead enrichment:

1. **Social Links Search API** - Find social media profiles across 9 platforms
2. **Perplexity AI API** - AI-powered company research and lead enrichment

---

## 📦 What's Included

### Social Links Search Client
- 🔍 Search across Facebook, LinkedIn, Twitter, Instagram, TikTok, YouTube, GitHub, Pinterest, Snapchat
- ⚡ Built-in rate limiting and request queuing
- 📊 Comprehensive statistics tracking
- 🔄 Automatic retry with exponential backoff
- 📖 600+ lines of production code
- ✅ 35+ test cases

### Perplexity AI Client
- 🤖 AI-powered company and person enrichment
- 📰 Real-time news and market intelligence
- 🎯 Lead qualification and scoring
- 🔍 Competitive analysis
- 📊 Token usage tracking
- 🌐 Real-time web search capabilities
- 📖 650+ lines of production code
- ✅ 40+ test cases

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

```bash
# Copy the example file
Copy-Item .env.example .env

# Edit .env and add your keys:
# RAPIDAPI_KEY=your_social_links_key
# PERPLEXITY_API_KEY=your_perplexity_key
```

### 3. Run Examples

```bash
# Social Links Search examples
npm run example:social

# Perplexity AI examples
npm run example:perplexity

# Run tests
npm test
```

---

## 💡 Complete Lead Enrichment Example

Here's how to combine both APIs for maximum intelligence:

```javascript
import PerplexityClient from './perplexity-client.js';
import SocialLinksSearchClient from './social-links-search.js';

async function enrichLead(companyName, contactEmail) {
  // Initialize clients
  const perplexity = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });
  
  const socialSearch = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY
  });

  // 1. Get company intelligence (Perplexity)
  const companyInfo = await perplexity.enrichCompany(companyName);
  
  // 2. Get recent news (Perplexity)
  const news = await perplexity.getCompanyNews(companyName, "last month");
  
  // 3. Analyze competitors (Perplexity)
  const competitors = await perplexity.analyzeCompetitors(companyName);
  
  // 4. Qualify the lead (Perplexity)
  const qualification = await perplexity.qualifyLead(
    companyName,
    "revenue >$10M, growth stage, B2B SaaS"
  );
  
  // 5. Find social profiles (Social Links)
  const socialProfiles = await socialSearch.search({
    query: contactEmail
  });

  // Return complete enriched profile
  return {
    company: {
      profile: perplexity.extractContent(companyInfo),
      news: perplexity.extractContent(news),
      competitors: perplexity.extractContent(competitors),
      qualification: perplexity.extractContent(qualification),
      sources: perplexity.extractCitations(companyInfo)
    },
    contact: {
      socialProfiles: socialProfiles.data
    },
    metadata: {
      tokensUsed: perplexity.getStats().totalTokensUsed,
      socialSearches: socialSearch.getStats().totalRequests
    }
  };
}

// Use it
const enrichedLead = await enrichLead("Salesforce", "contact@salesforce.com");
console.log(enrichedLead);
```

---

## 📁 Project Structure

```
Email2Social/
├── Social Links Search API
│   ├── social-links-search.js       # Main client (600+ lines)
│   ├── test-social-links-search.mjs # 35+ tests
│   ├── example-usage.mjs            # 10 examples
│   ├── README.md                    # Full documentation
│   └── QUICKSTART.md                # 5-minute guide
│
├── Perplexity AI API
│   ├── perplexity-client.js         # Main client (650+ lines)
│   ├── test-perplexity.mjs          # 40+ tests
│   ├── perplexity-examples.mjs      # 11 examples
│   ├── PERPLEXITY-README.md         # Full documentation
│   └── PERPLEXITY-QUICKSTART.md     # 5-minute guide
│
├── Configuration
│   ├── package.json                 # Dependencies & scripts
│   ├── .env.example                 # Environment template
│   ├── .gitignore                   # Security
│   └── MAIN-README.md               # This file
│
└── Documentation
    ├── PROJECT_STRUCTURE.md         # Architecture overview
    └── Screenshots/                 # API documentation
```

---

## 🎯 Use Cases

### 1. Sales & Lead Generation
- Enrich leads before outreach calls
- Find decision maker contact information
- Qualify prospects automatically
- Build comprehensive company profiles

### 2. Marketing & Research
- Identify target companies in specific industries
- Track competitor activities and news
- Discover social media presence
- Generate market intelligence reports

### 3. Recruitment
- Find candidates across social platforms
- Research company culture and news
- Identify key executives and team members
- Verify professional backgrounds

### 4. Customer Success
- Research new customers before onboarding
- Understand customer business context
- Monitor customer news and changes
- Track expansion opportunities

---

## 📊 API Comparison

| Feature | Social Links Search | Perplexity AI |
|---------|-------------------|---------------|
| **Primary Use** | Find social profiles | AI-powered research |
| **Data Source** | Web scraping | Real-time web + AI |
| **Best For** | Contact discovery | Deep intelligence |
| **Response Time** | Fast (200-500ms) | Moderate (1-3s) |
| **Cost Model** | Per request | Per token |
| **Rate Limits** | 1-20 req/sec | 1-5 req/sec |
| **Coverage** | 9 social networks | Entire web |

---

## 💰 Pricing Overview

### Social Links Search API

| Tier | Price/Month | Requests | Rate Limit |
|------|-------------|----------|------------|
| BASIC | $0 | 50 | 1/sec |
| PRO | $25 | 10,000 | 5/sec |
| ULTRA | $75 | 50,000 | 10/sec |
| MEGA | $150 | 200,000 | 20/sec |

### Perplexity AI API

| Tier | Price/Month | Requests | Tokens | Rate Limit |
|------|-------------|----------|--------|------------|
| BASIC | $0 | 50 | 100K | 1/sec |
| PRO | $5 | 3,000 | 5M | 1/sec |
| ULTRA | $50 | 50,000 | 100M | 2/sec |
| MEGA | $199.98 | 250,000 | 250M | 5/sec |

---

## 🔧 Available NPM Scripts

```bash
# Run all tests
npm test

# Run specific API tests
npm run test:social
npm run test:perplexity

# Run examples
npm run example:social
npm run example:perplexity

# Start (runs social examples)
npm start
```

---

## 📚 Documentation

### Social Links Search API
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Full Docs**: [README.md](./README.md)
- **Examples**: [example-usage.mjs](./example-usage.mjs)
- **Tests**: [test-social-links-search.mjs](./test-social-links-search.mjs)

### Perplexity AI API
- **Quick Start**: [PERPLEXITY-QUICKSTART.md](./PERPLEXITY-QUICKSTART.md)
- **Full Docs**: [PERPLEXITY-README.md](./PERPLEXITY-README.md)
- **Examples**: [perplexity-examples.mjs](./perplexity-examples.mjs)
- **Tests**: [test-perplexity.mjs](./test-perplexity.mjs)

### General
- **Project Structure**: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Main README**: [MAIN-README.md](./MAIN-README.md) (this file)

---

## ✨ Key Features

### Rate Limiting & Queuing
Both clients include intelligent rate limiting:
- Automatic request queuing
- Respects API tier limits
- Burst handling
- Real-time monitoring

### Error Handling
- Automatic retries with exponential backoff
- Detailed error messages
- Graceful degradation
- Network error recovery

### Statistics Tracking
- Request counts (total, successful, failed)
- Response time monitoring
- Token usage tracking (Perplexity)
- Rate limit hit tracking

### Production Ready
- Comprehensive test coverage
- JSDoc annotations
- ES6+ modules
- Zero production dependencies (except node-fetch)

---

## 🔐 Security Best Practices

1. **Never commit API keys** - Use `.env` file (already in `.gitignore`)
2. **Rotate keys regularly** - Best security practice
3. **Use separate keys** - Different keys for dev/prod
4. **Monitor usage** - Track with `getStats()`
5. **Enable rate limiting** - Keep it on in production
6. **Cache responses** - Avoid redundant API calls

---

## 🧪 Testing

Both clients include comprehensive test suites:

```bash
# Run all tests (75+ test cases)
npm test

# Run with API keys for integration tests
$env:RAPIDAPI_KEY="your_key"
$env:PERPLEXITY_API_KEY="your_key"
npm test
```

Test coverage includes:
- Unit tests for all methods
- Rate limiting validation
- Token tracking (Perplexity)
- Integration tests with live APIs
- Performance benchmarks
- Error handling scenarios

---

## 🎓 Advanced Examples

### Example 1: Automated Lead Scoring

```javascript
class LeadScorer {
  constructor(perplexityKey, socialKey) {
    this.perplexity = new PerplexityClient({ apiKey: perplexityKey });
    this.social = new SocialLinksSearchClient({ apiKey: socialKey });
  }

  async scoreCompany(companyName, contactEmail) {
    // Get company data
    const company = await this.perplexity.enrichCompany(companyName);
    const news = await this.perplexity.getCompanyNews(companyName, "last 3 months");
    const qualification = await this.perplexity.qualifyLead(
      companyName,
      "B2B SaaS, growth stage, revenue >$5M"
    );
    
    // Get social presence
    const social = await this.social.search({ query: contactEmail });
    
    // Calculate score (simplified)
    let score = 0;
    if (social.data.linkedin?.length > 0) score += 20;
    if (social.data.twitter?.length > 0) score += 10;
    if (news.includes('funding')) score += 30;
    if (news.includes('expansion')) score += 20;
    
    return { companyName, score, details: { company, news, qualification, social } };
  }
}
```

### Example 2: Batch Enrichment Pipeline

```javascript
async function batchEnrichLeads(leads) {
  const perplexity = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    requestsPerSecond: 2 // ULTRA tier
  });
  
  const social = new SocialLinksSearchClient({
    apiKey: process.env.RAPIDAPI_KEY,
    requestsPerSecond: 10 // ULTRA tier
  });

  const enriched = [];
  
  for (const lead of leads) {
    try {
      const [company, profiles] = await Promise.all([
        perplexity.enrichCompany(lead.companyName),
        social.search({ query: lead.email })
      ]);
      
      enriched.push({
        ...lead,
        companyIntel: perplexity.extractContent(company),
        socialProfiles: profiles.data,
        enrichedAt: new Date()
      });
      
      console.log(`✓ Enriched: ${lead.companyName}`);
    } catch (error) {
      console.error(`✗ Failed: ${lead.companyName}`, error.message);
    }
  }
  
  // Wait for any queued requests
  await Promise.all([
    perplexity.flush(),
    social.flush()
  ]);
  
  return enriched;
}
```

---

## 🤝 Support & Resources

- **RapidAPI Platform**: [https://rapidapi.com/](https://rapidapi.com/)
- **Social Links API**: [API Page](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
- **Perplexity API**: [API Page](https://rapidapi.com/winbay-tech-winbay-tech-default/api/perplexity2)
- **Issues**: Open an issue on GitHub
- **Documentation**: See individual README files

---

## 📄 License

MIT License - Free to use in your projects.

---

## 🗺️ Roadmap

### Social Links Search
- [ ] TypeScript definitions
- [ ] Browser compatibility
- [ ] Response caching
- [ ] Webhook support

### Perplexity AI
- [ ] Streaming responses
- [ ] Custom prompt templates
- [ ] Response caching
- [ ] Multi-turn conversations

### Combined
- [ ] Unified enrichment API
- [ ] GraphQL interface
- [ ] Web dashboard
- [ ] Batch processing API

---

## 📈 Statistics

### Code Stats
- **Total Lines of Code**: 2,500+
- **Test Cases**: 75+
- **Documentation Pages**: 2,000+ lines
- **Examples**: 21 comprehensive examples
- **Production Ready**: ✅ Yes

### Features
- ✅ Rate limiting
- ✅ Request queuing
- ✅ Automatic retries
- ✅ Token tracking
- ✅ Statistics monitoring
- ✅ Error handling
- ✅ Extensive documentation
- ✅ Comprehensive tests

---

## 🎉 Getting Started

1. **Choose your use case**: Lead enrichment? Social discovery? Both?
2. **Get API keys**: Sign up at RapidAPI and subscribe
3. **Configure environment**: Copy `.env.example` to `.env`
4. **Run examples**: Start with the quickstart guides
5. **Build your pipeline**: Combine both APIs for maximum value
6. **Deploy**: Both clients are production-ready!

---

**Built with ❤️ for Email2Social - Making lead enrichment simple and powerful**

**Questions?** Check the documentation or open an issue!
