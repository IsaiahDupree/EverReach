# Comprehensive Testing Guide for EverReach Backend

This guide covers all testing capabilities for the EverReach backend system.

## 🎯 Test Categories

### 1. **Functional Tests**
- Unit tests for business logic
- API endpoint tests
- Data validation tests
- **Coverage**: Existing 184+ tests

### 2. **Integration Tests**  
- Cross-system communication
- Contact lifecycle flows
- Warmth cascade effects
- **Coverage**: 100+ tests

### 3. **E2E Tests**
- Complete user journeys
- OAuth flows
- Webhook delivery
- **Coverage**: 50+ tests

### 4. **Security Tests**
- Authentication/Authorization
- SQL injection protection
- XSS prevention
- Rate limit enforcement
- **Coverage**: 25+ tests

### 5. **Performance Tests**
- Load testing
- Stress testing
- Response time validation
- Concurrent request handling
- **Coverage**: 30+ tests

### 6. **System-Level Tests**
- Third-party service integration (Stripe, Supabase, OpenAI, etc.)
- Service health checks
- **Coverage**: 9 service integration tests

### 7. **Usability Tests** *(Manual/Automated hybrid)*
- API documentation accuracy
- Error message clarity
- Response format consistency
- Developer experience validation

---

## 🚀 Quick Start

### Prerequisites
```bash
cd /Users/isaiahdupree/Documents/Software/everreach_dev/backend/backend-vercel
npm install
```

### Environment Setup
1. Copy `.env.test` to `.env.local` (if testing locally)
2. Ensure Supabase is accessible
3. Verify API keys are set

---

## 📋 Running Tests

### **Option 1: Run All Tests (Comprehensive)**
```bash
cd backend-vercel
node run-comprehensive-tests.mjs
```

**What it does:**
- Starts backend server on port 3001
- Runs all test categories in sequence
- Generates detailed JSON report
- Stops server after completion

**Estimated time:** 15-25 minutes

---

### **Option 2: Quick Test (Fast Feedback)**
```bash
node run-comprehensive-tests.mjs --quick
```

**What it includes:**
- Functional tests only
- Skips integration, E2E, performance
- Fastest feedback loop

**Estimated time:** 2-5 minutes

---

### **Option 3: Selective Testing**

#### Functional Tests Only
```bash
npm run test:all
```

#### Integration Tests
```bash
npm run test:integration
```

#### E2E Tests
```bash
npm run test:e2e
```

#### Security Tests
```bash
npm run test:security
```

#### Performance Tests
```bash
npm run test:perf:vitest
```

#### System/Service Integration Tests
```bash
npm run test:services
```

#### Marketing & Analytics Tests
```bash
npm run test:marketing
```

#### Contract Tests (API Schema Validation)
```bash
npm run test:contract
```

---

### **Option 4: Specific Test Suites**

#### Warmth Score Tests
```bash
npm run test:warmth
```

#### Message Generation Tests
```bash
npm run test:message
```

#### Public API Tests
```bash
npm run test:public-api
npm run test:public-api-auth
npm run test:public-api-rate-limit
npm run test:public-api-webhooks
```

#### Custom Fields Tests
```bash
npm run test:custom-fields
```

#### Ad Pixels Tests
```bash
npm run test:ad-pixels
```

---

## 🎛️ Test Flags & Options

### Comprehensive Test Script Flags

```bash
# Skip server startup (assumes server already running)
node run-comprehensive-tests.mjs --skip-server

# Skip E2E tests (faster execution)
node run-comprehensive-tests.mjs --skip-e2e

# Skip performance tests (saves time)
node run-comprehensive-tests.mjs --skip-performance

# Quick mode (functional only)
node run-comprehensive-tests.mjs --quick

# Combine flags
node run-comprehensive-tests.mjs --skip-e2e --skip-performance
```

---

## 📊 Understanding Test Results

### Console Output
- ✅ **Green checkmarks**: Tests passed
- ❌ **Red X marks**: Tests failed
- ⚠️ **Yellow warnings**: Tests skipped or warnings
- 🔵 **Blue info**: Test execution details

### JSON Report
After running comprehensive tests, a detailed report is saved to:
```
backend-vercel/test-results/comprehensive-test-report-{timestamp}.json
```

**Report Contents:**
```json
{
  "startTime": "2025-11-24T21:00:00.000Z",
  "endTime": "2025-11-24T21:15:00.000Z",
  "tests": [
    {
      "name": "Functional Tests",
      "description": "Unit tests, API endpoints, business logic",
      "success": true,
      "duration": 45000,
      "timestamp": "..."
    }
  ],
  "summary": {
    "total": 9,
    "passed": 8,
    "failed": 1,
    "skipped": 0,
    "passRate": 88.89,
    "totalDuration": 900
  }
}
```

---

## 🧪 Test Coverage Goals

| Test Type | Current | Target | Status |
|-----------|---------|--------|--------|
| Functional | 93% | 95% | ✅ Near target |
| Integration | 85% | 90% | 🚧 In progress |
| E2E | 70% | 80% | 🚧 In progress |
| Security | 85% | 95% | 🚧 In progress |
| Performance | 100% | 100% | ✅ Complete |
| System | 100% | 100% | ✅ Complete |

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port 3001 is already in use
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm start
```

### Tests Fail Due to Database
```bash
# Verify Supabase connection
node backend-vercel/test-supabase-connection.js

# Check .env.test or .env.local has correct credentials
cat .env.test | grep SUPABASE
```

### Rate Limit Tests Fail
```bash
# May need to clear rate limit cache
# Or wait 60 seconds between test runs
```

### Performance Tests Timeout
```bash
# Increase timeout in vitest.config.ts
# Or run with fewer concurrent connections
```

---

## 🔄 CI/CD Integration

### GitHub Actions (Recommended)
Create `.github/workflows/test.yml`:

```yaml
name: Comprehensive Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: backend-vercel
        run: npm ci
        
      - name: Run comprehensive tests
        working-directory: backend-vercel
        run: node run-comprehensive-tests.mjs --skip-e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: backend-vercel/test-results/
```

---

## 📝 Writing New Tests

### Test File Locations
- **Unit/Functional**: `backend-vercel/__tests__/api/`
- **Integration**: `backend-vercel/__tests__/integration/`
- **E2E**: `backend-vercel/__tests__/e2e/`
- **Security**: `backend-vercel/__tests__/security/`
- **Performance**: `backend-vercel/__tests__/performance/`

### Example Test Template
```typescript
// backend-vercel/__tests__/api/my-new-test.test.ts

import { describe, test, expect } from '@jest/globals';

describe('My Feature Tests', () => {
  test('should do something', async () => {
    // Arrange
    const input = { foo: 'bar' };
    
    // Act
    const result = await myFunction(input);
    
    // Assert
    expect(result.success).toBe(true);
  });
  
  test('should handle errors gracefully', async () => {
    const invalidInput = { };
    
    await expect(myFunction(invalidInput))
      .rejects
      .toThrow('Validation error');
  });
});
```

---

## 🎯 Usability Testing Checklist

### API Usability
- [ ] All endpoints documented in OpenAPI spec
- [ ] Error messages are clear and actionable
- [ ] Response formats are consistent
- [ ] Rate limit headers are present
- [ ] Authentication errors include helpful hints

### Developer Experience
- [ ] Setup instructions work first try
- [ ] Environment variables are documented
- [ ] Examples provided for common use cases
- [ ] SDKs/clients generate correctly

### Manual Usability Tests
1. **Try the Happy Path**: Create contact → Update → Delete
2. **Test Error Scenarios**: Invalid auth, missing fields, etc.
3. **Check Documentation**: Verify OpenAPI matches reality
4. **Verify Error Messages**: Are they helpful?

---

## 🔐 Security Testing Checklist

- [x] SQL injection blocked
- [x] XSS payloads sanitized
- [x] Authorization bypass prevented
- [x] Rate limiting enforced
- [x] CORS configured correctly
- [x] Secrets not in responses
- [x] Input validation on all endpoints

---

## 📈 Performance Benchmarks

| Endpoint | Target (P95) | Current |
|----------|--------------|---------|
| GET /api/health | < 50ms | ✅ 20ms |
| GET /v1/contacts | < 200ms | ✅ 150ms |
| POST /v1/contacts | < 300ms | ✅ 250ms |
| POST /v1/messages/suggest | < 2000ms | ✅ 1500ms |

---

## 🤝 Contributing Tests

1. Write test for new feature/bug fix
2. Ensure test passes locally
3. Run full test suite: `node run-comprehensive-tests.mjs`
4. Commit with descriptive message
5. Open PR with test results

---

## 📞 Support

For issues or questions about tests:
- Check existing documentation in `backend-vercel/__tests__/README.md`
- Review `COMPREHENSIVE_TEST_STRATEGY.md`
- Ask in team chat or create GitHub issue

---

## 🎉 Quick Command Reference

```bash
# Most common commands
npm run test:all                    # All functional tests
npm run test:integration            # Integration tests
npm run test:e2e                    # E2E tests
npm run test:security              # Security tests
npm run test:services              # System integration tests
node run-comprehensive-tests.mjs   # Everything
node run-comprehensive-tests.mjs --quick  # Fast feedback
```

---

**Last Updated**: November 24, 2025  
**Backend Version**: 0.1.0  
**Node Version**: 18-20 (recommended: 20)
