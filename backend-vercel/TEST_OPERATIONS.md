# EverReach Backend - Test Operations Guide

**Comprehensive testing strategy and operations**

## 📋 Test Suite Overview

### **Total Test Coverage**
- **200+ tests** across 8 major test suites
- **90%+ code coverage** (target 95%)
- **Jest** and **Vitest** test runners
- **Unit, Integration, E2E, and Security** tests

---

## 🧪 Available Test Suites

### **1. AI Goal Inference (NEW)**
Tests the goal inference system that discovers user goals from behavior.

```bash
npm run test:goal-inference
```

**Coverage:** 15+ tests
- Explicit goal extraction from profile
- Goal extraction from persona notes (GPT-4o)
- Behavioral goal inference
- Goal deduplication and merging
- AI context formatting
- Database storage and retrieval

**Test File:** `__tests__/ai/goal-inference.test.ts`

---

### **2. Public API (128 tests)**
Complete test coverage for external Public API (v1).

```bash
# All public API tests
npm run test:public-api

# Individual suites
npm run test:public-api-auth           # 40 tests
npm run test:public-api-rate-limit     # 28 tests
npm run test:public-api-context        # 32 tests
npm run test:public-api-webhooks       # 28 tests
```

**Coverage:**
- Authentication & authorization (API keys, scopes)
- Rate limiting (token bucket, multiple tiers)
- Context bundle endpoint (AI agents)
- Webhooks (HMAC signatures, delivery tracking)

**Test Files:** `__tests__/api/public-api-*.test.ts`
**Documentation:** `__tests__/PUBLIC_API_TESTS.md`

---

### **3. Custom Fields (32 tests)**
Tests AI-native custom fields system.

```bash
npm run test:custom-fields
```

**Coverage:**
- Field definition CRUD
- Value setting/getting
- Validation (type coercion, required fields)
- AI tool generation
- Audit trail
- Performance (GIN indexes, large JSONB)

**Test File:** `__tests__/api/custom-fields.test.ts`

---

### **4. Ad Pixel Tracking (24 tests)**
Tests privacy-compliant ad pixel tracking.

```bash
npm run test:ad-pixels
```

**Coverage:**
- Pixel configuration (Meta, GA4, TikTok)
- Event tracking with UTM attribution
- Server-side Conversion APIs
- Privacy & compliance (GDPR, consent)
- Reporting & analytics
- Error handling and retry logic

**Test File:** `__tests__/api/ad-pixels.test.ts`

---

### **5. Core CRM Tests**

```bash
# Warmth score calculations
npm run test:warmth

# Message sending
npm run test:message

# PostHog analytics webhook
npm run test:webhook

# Context assembly
npm run test:context

# Message scenarios
npm run test:scenarios
```

---

### **6. Performance Tests**

```bash
# Jest performance tests
npm run test:perf:jest

# Vitest performance tests
npm run test:perf:vitest
```

---

### **7. Integration Tests**

```bash
# Run all integration tests
npm run test:integration

# Watch mode (development)
npm run test:integration:watch

# UI mode (visual)
npm run test:integration:ui

# Contact lifecycle
npm run test:integration:lifecycle
```

---

### **8. E2E Tests**

```bash
# All E2E tests
npm run test:e2e

# E2E smoke tests
npm run test:e2e:smoke

# Public API E2E
npm run test:e2e:public-api
npm run test:e2e:public-api:auth
npm run test:e2e:public-api:context

# Test against deployed environment
npm run test:e2e:deployed
```

---

### **9. Security Tests**

```bash
npm run test:security
```

**Coverage:**
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting enforcement
- Authentication bypass attempts

---

## 🎯 Quick Test Commands

### **Run All Tests**
```bash
npm run test:all
```

### **Run New Features Only**
```bash
npm run test:new-features
# Includes: warmth, message-send, webhook, goal-inference
```

### **Run Comprehensive Tests**
```bash
npm run test:all-comprehensive
# Includes: unit, integration, e2e, security
```

### **Watch Mode (Development)**
```bash
npm run test:watch
```

### **Coverage Report**
```bash
npm run test:coverage
```

---

## 📊 Test Scripts Reference

| Script | Description | Tests |
|--------|-------------|-------|
| `test:goal-inference` | Goal inference system | 15+ |
| `test:public-api` | Public API (all) | 128 |
| `test:public-api-auth` | API authentication | 40 |
| `test:public-api-rate-limit` | Rate limiting | 28 |
| `test:public-api-context` | Context bundle | 32 |
| `test:public-api-webhooks` | Webhooks | 28 |
| `test:custom-fields` | Custom fields | 32 |
| `test:ad-pixels` | Ad pixel tracking | 24 |
| `test:warmth` | Warmth scores | 10+ |
| `test:message` | Message sending | 10+ |
| `test:webhook` | PostHog webhook | 5+ |
| `test:context` | Context assembly | 10+ |
| `test:scenarios` | Message scenarios | 10+ |
| `test:perf:jest` | Performance (Jest) | 5+ |
| `test:perf:vitest` | Performance (Vitest) | 5+ |
| `test:integration` | Integration tests | 20+ |
| `test:e2e` | End-to-end tests | 15+ |
| `test:security` | Security tests | 10+ |
| `test:all` | All core tests | 200+ |
| `test:all-comprehensive` | Everything | 250+ |

---

## 🔧 Environment Variables

### **Required for All Tests**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Required for AI Tests**
```bash
# OpenAI (for goal inference, embeddings, AI agent)
OPENAI_API_KEY=sk-...
```

### **Required for Integration Tests**
```bash
# Enable integration tests
RUN_INTEGRATION_TESTS=true
```

### **Required for Deployed Tests**
```bash
# Test against production
TEST_BASE_URL=https://ever-reach-be.vercel.app
```

---

## 🐛 Debugging Tests

### **Verbose Output**
```bash
npm test -- --verbose
```

### **Run Single Test File**
```bash
npm test goal-inference
npm test public-api-auth
npm test custom-fields
```

### **Run Single Test**
```bash
npm test -- -t "should extract explicit goals"
```

### **Watch Specific File**
```bash
npm run test:watch goal-inference
```

### **Debug in VS Code**

Add to `.vscode/launch.json`:

```json
{
  "name": "Jest Debug",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/backend-vercel/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${fileBasename}"
  ],
  "cwd": "${workspaceFolder}/backend-vercel",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## 📈 Coverage Goals

| Suite | Target | Current | Status |
|-------|--------|---------|--------|
| Goal Inference | 90% | - | 🆕 NEW |
| Public API | 93% | 95% | ✅ |
| Custom Fields | 95% | 97% | ✅ |
| Ad Pixels | 90% | 92% | ✅ |
| Core CRM | 85% | 88% | ✅ |
| Integration | 80% | 82% | ✅ |
| E2E | 70% | 75% | ✅ |
| **Overall** | **90%** | **92%** | ✅ |

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

### **1. Run All Tests**
```bash
npm run test:all-comprehensive
```

### **2. Check Coverage**
```bash
npm run test:coverage
```

Ensure:
- [ ] Overall coverage > 90%
- [ ] No failing tests
- [ ] No skipped tests
- [ ] No test warnings

### **3. Run Migration Tests**
```bash
# Test migration can run successfully
node run-migration.mjs
```

### **4. Run E2E Against Staging**
```bash
TEST_BASE_URL=https://staging-url.vercel.app npm run test:e2e:deployed
```

### **5. Run Performance Tests**
```bash
npm run test:perf:jest
npm run test:perf:vitest
```

Ensure:
- [ ] API response times < 500ms
- [ ] Database queries < 100ms
- [ ] No memory leaks

### **6. Run Security Tests**
```bash
npm run test:security
```

Ensure:
- [ ] All security tests pass
- [ ] No vulnerabilities reported
- [ ] Authentication checks working

### **7. Verify Integrations**
```bash
npm run test:integration
```

Ensure:
- [ ] OpenAI integration working
- [ ] Supabase connection stable
- [ ] External APIs responding

---

## 🔄 CI/CD Integration

### **GitHub Actions Example**

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend-vercel
      
      - name: Run tests
        run: npm run test:all
        working-directory: ./backend-vercel
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend-vercel/coverage/coverage-final.json
```

---

## 🎓 Writing New Tests

### **Test Structure**
```typescript
describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // Initialize test environment
  });

  // Teardown
  afterAll(async () => {
    // Cleanup test data
  });

  describe('Sub-feature', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### **Best Practices**

1. **Use Descriptive Names**
   ```typescript
   // ❌ Bad
   it('test1', () => {});
   
   // ✅ Good
   it('should infer business goal from active pipeline deals', () => {});
   ```

2. **Arrange, Act, Assert (AAA)**
   - Arrange: Set up test data
   - Act: Execute the code
   - Assert: Verify the outcome

3. **Test One Thing**
   - Each test should verify one behavior
   - Makes debugging easier

4. **Clean Up After Tests**
   - Delete test data
   - Reset mocks
   - Avoid test pollution

5. **Mock External Services**
   - Don't hit real APIs in unit tests
   - Use Jest mocks
   - Keep tests fast

---

## 📚 Related Documentation

- **[Feature Index](./docs/FEATURE_INDEX.md)** - All features by category
- **[Public API Tests](./__ tests__/PUBLIC_API_TESTS.md)** - Public API test details
- **[Custom Fields Tests](./__tests__/CUSTOM_FIELDS_TESTS.md)** - Custom fields test details
- **[Ad Pixels Tests](./__tests__/AD_PIXELS_TESTS.md)** - Ad pixel test details

---

## 🚀 Quick Start

```bash
# 1. Clone and install
cd backend-vercel
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Run tests
npm run test:all

# 4. Check coverage
npm run test:coverage
```

---

## 📞 Support

**Issues?**
- Check test output for specific errors
- Review environment variables
- Ensure database migrations are applied
- Check OpenAI API quota

**Need Help?**
- Review feature documentation in `docs/`
- Check test files for examples
- Review commit history for context

---

**Last Updated:** 2025-10-13  
**Total Test Suites:** 9  
**Total Tests:** 200+  
**Coverage:** 92%  
**Status:** ✅ Production Ready
