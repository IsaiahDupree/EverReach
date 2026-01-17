# E2E Tests for Public API

This directory contains **end-to-end (E2E) tests** that make real HTTP requests to your deployed backend on Vercel.

## 🎯 Purpose

These tests verify that your **deployed API endpoints** work correctly in production, unlike unit tests which test functions in isolation.

**Key differences from unit tests:**
- ✅ Tests hit real deployed URLs (e.g., `https://ever-reach-be.vercel.app`)
- ✅ Tests the complete request/response cycle (HTTP, middleware, database, etc.)
- ✅ Verifies authentication, rate limiting, and error handling work in production
- ❌ Slower than unit tests (makes network requests)
- ❌ Requires deployed backend and test credentials

## 📁 Test Files

| File | Description | Test Count |
|------|-------------|------------|
| `public-api-auth.e2e.test.ts` | API key authentication & authorization | 15+ tests |
| `public-api-context-bundle.e2e.test.ts` | Context bundle endpoint (AI agents) | 15+ tests |

## 🔧 Setup

### 1. Environment Variables

Copy the example file and fill in your credentials:

```bash
# The .env.e2e.example file is a template - your real values should go in .env
cp .env.e2e.example .env
```

**Required variables:**

```bash
# Deployed backend URL (Vercel production or preview)
TEST_BASE_URL=https://ever-reach-be.vercel.app

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# Test user credentials (create a dedicated test user)
TEST_EMAIL=test@yourdomain.com
TEST_PASSWORD=your_test_password

# Skip E2E tests (set to true to only run unit tests)
TEST_SKIP_E2E=false
```

### 2. Create Test User

Create a dedicated test user in your Supabase project:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Use the email/password from your `.env` file
4. Confirm the email

### 3. Deploy Your Backend

E2E tests require a deployed backend:

```bash
# Deploy to Vercel
cd backend-vercel
vercel deploy

# Or deploy to production
vercel deploy --prod
```

## 🚀 Running Tests

### Run all E2E tests

```bash
npm run test:e2e:public-api
```

### Run specific test suites

```bash
# Authentication tests only
npm run test:e2e:public-api:auth

# Context bundle tests only
npm run test:e2e:public-api:context
```

### Run against a specific deployment

```bash
# Test a specific preview deployment
TEST_BASE_URL=https://your-preview-abc123.vercel.app npm run test:e2e:public-api

# Test production
npm run test:e2e:deployed
```

### Skip E2E tests (run unit tests only)

```bash
# Set environment variable
TEST_SKIP_E2E=true npm test

# Or in your .env file
TEST_SKIP_E2E=true
```

## 📊 Test Coverage

### Authentication & Authorization (15+ tests)

- ✅ Valid API key authentication
- ✅ Reject missing/invalid/expired/revoked keys
- ✅ Scope-based permissions (exact match, wildcards)
- ✅ Tenant isolation (prevent cross-org access)
- ✅ Rate limit headers
- ✅ Request ID headers

### Context Bundle Endpoint (15+ tests)

- ✅ Complete bundle structure (contact, interactions, context, meta)
- ✅ Prompt skeleton generation
- ✅ Query parameters (interaction limits)
- ✅ Authorization (require contacts:read scope)
- ✅ Tenant isolation
- ✅ Edge cases (no interactions, non-existent contacts)
- ✅ Token estimates for LLM budgeting

## 🔍 How It Works

### E2E Client

The `E2EClient` class (in `__tests__/helpers/e2e-client.ts`) provides:

```typescript
import { E2EClient } from '../helpers/e2e-client';

const client = new E2EClient();

// Authenticated request (uses Supabase user token)
const response = await client.get('/api/v1/contacts');

// API key request
const response = await client.requestWithApiKey(
  'GET',
  '/api/v1/contacts',
  'evr_test_abc123...'
);

// Unauthenticated request
const response = await client.requestUnauth('GET', '/api/health');
```

### Test Structure

Each test:
1. **Setup**: Creates test data (orgs, users, contacts, API keys) via Supabase admin
2. **Execute**: Makes HTTP request to deployed API
3. **Assert**: Verifies response status, data, and headers
4. **Teardown**: Cleans up test data

Example:

```typescript
test('should authenticate with valid API key', async () => {
  // Make real HTTP request to deployed backend
  const response = await client.requestWithApiKey(
    'GET',
    '/api/v1/contacts',
    testApiKey
  );

  // Verify deployed endpoint works correctly
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});
```

## ⚠️ Important Notes

### Test Data Isolation

- Each test suite creates its own org, users, and contacts
- Automatic cleanup in `afterAll()` hooks
- Uses unique identifiers (`e2e-test-${Date.now()}`)
- No data pollution between test runs

### Rate Limiting

E2E tests make real requests and are subject to rate limits:
- Per API key: 600 requests/min
- Per organization: 10,000 requests/hr

If you hit rate limits, tests will fail. Space out test runs or increase limits.

### Performance

E2E tests are **slower than unit tests** because they:
- Make real network requests
- Hit a deployed database
- Go through the full request/response cycle

Typical run time: **2-3 minutes** for all E2E tests.

### Environment-Specific Issues

Common problems:

1. **"TEST_EMAIL and TEST_PASSWORD must be set"**
   - Solution: Add credentials to your `.env` file

2. **401 Unauthorized**
   - Check API key is created correctly in database
   - Verify Supabase credentials are correct

3. **404 Not Found**
   - Check backend is deployed to `TEST_BASE_URL`
   - Verify database has required tables (run migrations)

4. **Network timeout**
   - Deployed backend may be cold-starting
   - Increase test timeout in `jest.config.js`

## 🎯 Best Practices

### 1. Run before deploying to production

```bash
# Deploy to preview
vercel deploy

# Run E2E tests against preview
TEST_BASE_URL=https://preview-abc123.vercel.app npm run test:e2e:public-api

# If tests pass, promote to production
vercel promote
```

### 2. Use dedicated test environment

- Create separate Supabase project for testing
- Use test-specific API keys
- Don't test against production data

### 3. Keep credentials secure

- Never commit `.env` files
- Use `.env.e2e.example` as template (committed)
- Store real credentials in `.env` (gitignored)

### 4. Monitor test performance

```bash
# Run with verbose output
npm run test:e2e:public-api -- --verbose

# Check for slow tests
npm run test:e2e:public-api -- --detectOpenHandles
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: backend-vercel
      
      - name: Run E2E tests
        env:
          TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: npm run test:e2e:public-api
        working-directory: backend-vercel
```

## 📝 Adding New E2E Tests

### 1. Create test file

```typescript
// __tests__/e2e/my-feature.e2e.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { E2EClient, shouldSkipE2E, getTestConfig } from '../helpers/e2e-client';

const describeE2E = shouldSkipE2E() ? describe.skip : describe;

describeE2E('My Feature E2E', () => {
  let client: E2EClient;

  beforeAll(async () => {
    client = new E2EClient();
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  test('should do something', async () => {
    const response = await client.get('/api/v1/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

### 2. Add npm script

```json
{
  "scripts": {
    "test:e2e:my-feature": "jest __tests__/e2e/my-feature.e2e.test.ts"
  }
}
```

### 3. Update documentation

Add your test to this README and the test count table.

## 🆘 Troubleshooting

### Tests fail locally but pass in CI

- Check you're testing the same deployment
- Verify environment variables match
- Check for local network issues (VPN, firewall)

### Tests are flaky

- Add retries for network requests
- Increase test timeouts
- Check for race conditions in cleanup

### Database state issues

- Ensure `beforeAll` creates fresh data
- Verify `afterAll` cleans up completely
- Use unique identifiers to avoid conflicts

## 📚 Related Documentation

- [Public API Guide](../docs/PUBLIC_API_GUIDE.md) - API reference
- [Public API Tests](./PUBLIC_API_TESTS.md) - Unit test documentation
- [API Authentication](../lib/api/auth.ts) - Auth implementation
- [Rate Limiting](../lib/api/rate-limit.ts) - Rate limit implementation

## 🎉 Summary

E2E tests give you **confidence that your deployed API works correctly** in production. They complement unit tests by verifying the full request/response cycle.

**Run E2E tests before every production deployment!**

```bash
# Quick check
npm run test:e2e:public-api

# Full check (unit + E2E)
npm run test:all && npm run test:e2e:public-api
```
