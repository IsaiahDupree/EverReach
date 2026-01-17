# Project Structure

Complete overview of the Social Links Search API Client project.

## 📁 File Structure

```
Email2Social/
├── social-links-search.js          # Main API client module
├── test-social-links-search.mjs    # Comprehensive test suite
├── example-usage.mjs               # 10 usage examples
├── package.json                    # Node.js dependencies & scripts
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── README.md                       # Full documentation
├── QUICKSTART.md                   # Quick start guide
└── PROJECT_STRUCTURE.md            # This file
```

## 📄 File Descriptions

### Core Files

#### `social-links-search.js`
**Main API Client** - 600+ lines
- Class-based ES6+ module
- Built-in rate limiting with queue management
- Automatic retry with exponential backoff
- Comprehensive error handling
- Statistics tracking
- Support for all 9 social networks

**Key Features:**
- ✅ Queue-based rate limiting
- ✅ Configurable retry logic
- ✅ Request statistics
- ✅ Tier-based configuration
- ✅ Network validation
- ✅ JSDoc annotations

**Main Methods:**
- `search(params)` - Primary search method
- `searchNetworks(query, ...networks)` - Convenience method
- `getStats()` - Performance metrics
- `setTier(tier)` - Configure by pricing tier
- `flush()` - Wait for queue completion

---

### Testing & Examples

#### `test-social-links-search.mjs`
**Test Suite** - 500+ lines
- 35+ test cases covering all functionality
- Unit tests for all methods
- Rate limiting validation
- Integration tests with live API
- Performance benchmarks
- Custom test runner with assertion helpers

**Test Categories:**
- Constructor & configuration
- Static properties
- Statistics methods
- Rate limiting configuration
- Queue management
- Parameter validation
- Live API integration
- Performance tests
- Error handling

**Usage:**
```bash
node test-social-links-search.mjs
```

---

#### `example-usage.mjs`
**10 Comprehensive Examples** - 400+ lines

1. **Basic Search** - Simple query example
2. **Filtered Network Search** - Specific networks
3. **Batch Processing** - Multiple queries with rate limiting
4. **Convenience Method** - Using searchNetworks()
5. **Error Handling** - Comprehensive error examples
6. **Performance Monitoring** - Real-time stats tracking
7. **Tier Configuration** - Switching pricing tiers
8. **Email Lookup** - Email to profile search
9. **Aggregator Class** - Advanced implementation with caching
10. **Express.js Integration** - REST API example

**Usage:**
```bash
node example-usage.mjs
```

---

### Configuration Files

#### `package.json`
**Node.js Project Configuration**
- Project metadata
- Dependencies (node-fetch, dotenv)
- NPM scripts
- Engine requirements (Node 14+)

**Scripts:**
```bash
npm test      # Run test suite
npm start     # Run examples
npm example   # Run examples (alias)
```

---

#### `.env.example`
**Environment Variables Template**

Required variables:
- `RAPIDAPI_KEY` - Your RapidAPI key (required)
- `RAPIDAPI_TIER` - Your pricing tier (optional)

Optional variables:
- `REQUESTS_PER_SECOND` - Custom rate limit
- `RAPIDAPI_HOST` - Custom API host
- `MAX_RETRIES` - Retry attempts
- `RETRY_DELAY` - Retry delay in ms
- `ENABLE_RATE_LIMITING` - Toggle rate limiting

**Setup:**
```bash
# Copy template
cp .env.example .env

# Edit with your key
# RAPIDAPI_KEY=your_actual_key_here
```

---

#### `.gitignore`
**Version Control Ignore Rules**

Excludes:
- Environment variables (.env)
- API keys and secrets
- Dependencies (node_modules)
- Logs
- IDE files
- Test coverage
- Build outputs
- Temporary files
- Screenshots

---

### Documentation

#### `README.md`
**Complete Documentation** - 800+ lines
- Feature overview
- Installation instructions
- API reference for all methods
- Rate limiting guide
- Pricing tier information
- Error handling examples
- Advanced usage patterns
- Integration examples
- Best practices
- Security guidelines

**Sections:**
- Quick Start
- API Reference (10+ methods documented)
- Rate Limiting Deep Dive
- Pricing Tiers Comparison
- Error Handling Guide
- 10+ Code Examples
- Testing Guide
- Security Best Practices

---

#### `QUICKSTART.md`
**5-Minute Getting Started Guide**
- 3-step setup process
- Basic usage examples
- Common issues & solutions
- Quick reference for networks and tiers
- Configuration options

---

#### `PROJECT_STRUCTURE.md`
**This File** - Project organization reference
- Complete file structure
- Detailed descriptions
- Usage instructions
- Implementation details

---

## 🔧 Key Features by Component

### Rate Limiting System
**Location:** `social-links-search.js`

- Queue-based request management
- Configurable requests per second
- Automatic throttling
- Burst handling
- Real-time queue monitoring

**Implementation:**
```javascript
// In _processQueue() method
- Track request timestamps
- Enforce rate limits
- Process queue asynchronously
- Handle concurrent requests
```

### Retry Logic
**Location:** `social-links-search.js` - `_makeRequest()` method

- Exponential backoff
- Configurable max retries
- Separate handling for rate limits vs errors
- Network error recovery

**Retry Strategy:**
```
Attempt 1: Immediate
Attempt 2: +1000ms
Attempt 3: +2000ms
Attempt 4: +4000ms
```

### Statistics Tracking
**Location:** `social-links-search.js` - `stats` object

Tracked metrics:
- Total requests
- Successful requests
- Failed requests
- Rate limit hits
- Average response time
- Queue length

### Error Handling
**Location:** Throughout all modules

Error types handled:
- Invalid API key (401)
- Forbidden access (403)
- Rate limit exceeded (429)
- Server errors (500)
- Network errors
- Validation errors
- Configuration errors

---

## 🧪 Testing Strategy

### Unit Tests (15+ tests)
- Constructor validation
- Configuration options
- Static properties
- Statistics methods
- Rate limit configuration
- Queue management

### Integration Tests (6+ tests)
- Live API searches
- Network filtering
- Rate limiting behavior
- Statistics accuracy
- Queue flushing
- Multi-query processing

### Performance Tests (2+ tests)
- Burst request handling
- Statistics overhead
- Queue processing speed

---

## 📊 Supported Social Networks

All 9 networks from the API:
1. Facebook
2. TikTok
3. Instagram
4. Snapchat
5. Twitter
6. YouTube
7. LinkedIn
8. GitHub
9. Pinterest

---

## 💰 Pricing Tier Support

| Tier | Requests/Month | Rate Limit | Monthly Cost |
|------|----------------|------------|--------------|
| BASIC | 50 | 1 req/sec | $0 |
| PRO | 10,000 | 5 req/sec | $25 |
| ULTRA | 50,000 | 10 req/sec | $75 |
| MEGA | 200,000 | 20 req/sec | $150 |

Configuration:
```javascript
client.setTier('PRO');  // Automatic configuration
// or
client.setRateLimit(5); // Manual configuration
```

---

## 🚀 Getting Started

### Quick Start (3 commands)
```bash
# 1. Install dependencies
npm install

# 2. Configure API key
cp .env.example .env
# Edit .env with your RAPIDAPI_KEY

# 3. Run examples
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run with API key for integration tests
RAPIDAPI_KEY=your_key npm test
```

### Development
```bash
# Run examples
node example-usage.mjs

# Run specific example (edit the file to enable/disable examples)
node example-usage.mjs

# Run tests
node test-social-links-search.mjs
```

---

## 🎯 Use Cases

### 1. Lead Generation
Search for social profiles from email addresses

### 2. Social Media Monitoring
Track social presence across platforms

### 3. Contact Enrichment
Enhance contact databases with social links

### 4. Recruitment Tools
Find candidate profiles across networks

### 5. Marketing Automation
Build comprehensive social profiles for targeting

### 6. Customer Research
Understand customer social media presence

---

## 🔐 Security Features

1. **Environment Variables** - API keys never hardcoded
2. **HTTPS Only** - Enforced secure connections
3. **Input Validation** - Query and network validation
4. **Error Sanitization** - No sensitive data in errors
5. **Rate Limiting** - Prevents account suspension
6. **Gitignore** - Excludes sensitive files

---

## 📈 Performance Characteristics

### Rate Limiting
- Queue processing: ~10-50ms overhead
- Memory efficient queue management
- Minimal CPU usage for throttling

### Statistics
- O(1) stat updates
- Negligible overhead (<1ms)

### Network
- Average response time: 200-500ms (API dependent)
- Retry overhead: 1-4 seconds (on failures)

---

## 🛠️ Technology Stack

- **Runtime:** Node.js 14+
- **Module System:** ES Modules (ESM)
- **HTTP Client:** node-fetch
- **Config:** dotenv (dev dependency)
- **Testing:** Custom test runner
- **Documentation:** Markdown with JSDoc

---

## 📝 Code Quality

### Documentation Coverage
- 100% JSDoc coverage on public methods
- Comprehensive README
- Inline comments for complex logic
- Example code for all features

### Code Standards
- ES6+ features
- Class-based architecture
- Async/await pattern
- Error-first handling
- Consistent naming conventions

### Maintainability
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Clear separation of concerns
- Extensive test coverage
- Version control ready

---

## 🔄 Future Enhancements

Potential additions (see README Roadmap):
- TypeScript definitions
- Browser compatibility
- Response caching layer
- Webhook support
- Batch API endpoints
- GraphQL interface

---

## 📞 Support & Resources

- **API Docs:** [RapidAPI Social Links Search](https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/social-links-search)
- **Full Docs:** [README.md](./README.md)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Examples:** [example-usage.mjs](./example-usage.mjs)
- **Tests:** [test-social-links-search.mjs](./test-social-links-search.mjs)

---

**Built with ❤️ for Email2Social project**
