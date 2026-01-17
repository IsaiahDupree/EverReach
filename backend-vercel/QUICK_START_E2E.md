# E2E Tests - Quick Start Guide

## 🚀 Get Running in 3 Steps

### Step 1: Environment Setup (2 minutes)

Your `.env` file should already have these values. Verify they're correct:

```bash
# Deployed backend
TEST_BASE_URL=https://ever-reach-be.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test user (create this user in Supabase if you haven't)
TEST_EMAIL=isaiahdupree33@gmail.com
TEST_PASSWORD=frogger12

# Enable E2E tests
TEST_SKIP_E2E=false
```

### Step 2: Verify Test User Exists (1 minute)

1. Go to https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/auth/users
2. Check if `isaiahdupree33@gmail.com` exists
3. If not, click "Add user" and create it with password `frogger12`

### Step 3: Run Tests! (30 seconds)

```bash
cd backend-vercel
npm run test:e2e:public-api
```

**Expected output:**
```
[E2E Setup] Base URL: https://ever-reach-be.vercel.app
[E2E Setup] Test API Key: evr_test_abc...

✅ should authenticate with valid API key
✅ should reject request without authorization header
✅ should reject invalid API key format
✅ should return complete context bundle structure
✅ should include complete contact information
...

Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
Time:        45.123s
```

## 📊 Test Suites Available

```bash
# Run all E2E tests (30+ tests, ~45 seconds)
npm run test:e2e:public-api

# Run only authentication tests (15 tests, ~20 seconds)
npm run test:e2e:public-api:auth

# Run only context bundle tests (15 tests, ~25 seconds)
npm run test:e2e:public-api:context

# Test against production deployment
npm run test:e2e:deployed
```

## 🔍 What Gets Tested

### Authentication & Authorization (15 tests)
- ✅ API key validation (format, expiration, revocation)
- ✅ Scope-based permissions (exact, wildcards)
- ✅ Tenant isolation (no cross-org access)
- ✅ Rate limit headers
- ✅ Request ID tracking

### Context Bundle Endpoint (15 tests)
- ✅ Complete bundle structure
- ✅ Contact data, interactions, context helpers
- ✅ Prompt skeleton generation for AI
- ✅ Query parameters (interaction limits)
- ✅ Authorization enforcement
- ✅ Edge cases

## ⚠️ Troubleshooting

### "TEST_EMAIL and TEST_PASSWORD must be set"
**Fix**: Add credentials to your `.env` file

### "401 Unauthorized"
**Fix**: 
1. Verify test user exists in Supabase
2. Check password is correct
3. Verify `SUPABASE_ANON_KEY` is correct

### "Network request failed"
**Fix**:
1. Check backend is deployed: `vercel ls`
2. Verify `TEST_BASE_URL` points to correct deployment
3. Check you're not behind a firewall/VPN blocking requests

### "404 Not Found"
**Fix**:
1. Verify backend has latest code deployed
2. Check database migrations are run
3. Confirm API endpoints exist in deployment

### Tests timeout
**Fix**:
1. Increase timeout in `jest.config.js` (currently 30s)
2. Check backend isn't cold-starting (first request is slow)
3. Verify Supabase isn't having issues

## 🎯 Best Practices

### Before Deploying to Production

```bash
# 1. Deploy to preview
vercel deploy

# 2. Get preview URL (example: https://backend-abc123.vercel.app)
# 3. Test preview deployment
TEST_BASE_URL=https://backend-abc123.vercel.app npm run test:e2e:public-api

# 4. If tests pass, promote to production
vercel promote

# 5. Test production
npm run test:e2e:deployed
```

### Regular Testing

Add to your workflow:
```bash
# Before pushing code
npm test                          # Unit tests (fast)
npm run test:e2e:public-api      # E2E tests (slower but thorough)
```

## 📖 More Information

- **Full documentation**: `__tests__/E2E_TESTS_README.md`
- **Implementation details**: `E2E_TESTS_COMPLETE.md`
- **Test files**: `__tests__/e2e/*.e2e.test.ts`
- **E2E client**: `__tests__/helpers/e2e-client.ts`

## 🎉 Success!

If tests pass, your **deployed backend is working correctly** in production! 

The E2E tests verify:
- ✅ API endpoints are accessible
- ✅ Authentication works
- ✅ Database queries work
- ✅ Rate limiting is enforced
- ✅ Response format is correct

**You can now confidently deploy to production knowing your API works!**
