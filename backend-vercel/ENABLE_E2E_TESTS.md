# Enable E2E Tests - Step by Step Guide

## 🎯 Goal
Enable E2E tests to run against your deployed Vercel backend by allowing test data creation in Supabase.

## 📋 Prerequisites
- ✅ Deployed backend at `https://ever-reach-be.vercel.app`
- ✅ Supabase project at `https://utasetfxiqcrnwyfforx.supabase.co`
- ✅ `.env` file with credentials (already done)

## 🚀 Steps to Enable E2E Tests

### Step 1: Run the SQL Migration (5 minutes)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
   ```

2. **Copy the migration file:**
   - Open: `backend-vercel/migrations/enable-e2e-test-data.sql`
   - Copy the entire contents

3. **Paste into SQL Editor:**
   - Click "New query" in Supabase dashboard
   - Paste the SQL
   - Click "Run" (or press Ctrl+Enter)

4. **Verify success:**
   - You should see: `E2E test data policies created successfully!`

**What this does:**
- Adds RLS policies allowing the service role to create/read/update/delete test data
- Only affects the service role (not regular users)
- Enables E2E tests to set up test organizations, contacts, and API keys

### Step 2: Update .env File

In your `backend-vercel/.env` file, change:

```bash
# FROM:
TEST_SKIP_E2E=true

# TO:
TEST_SKIP_E2E=false
```

### Step 3: Run E2E Tests! 🎉

```bash
cd backend-vercel

# Run all E2E tests
npm run test:e2e:public-api

# Or run specific suites
npm run test:e2e:public-api:auth      # Just authentication tests
npm run test:e2e:public-api:context   # Just context bundle tests
```

**Expected output:**
```
[E2E Setup] Environment variables loaded
[E2E Setup] TEST_EMAIL: ✓ Set
[E2E Setup] TEST_PASSWORD: ✓ Set
[E2E Setup] SUPABASE_ANON_KEY: ✓ Set

✅ Public API Authentication E2E › should authenticate with valid API key
✅ Public API Authentication E2E › should reject invalid API key
✅ Public API Authentication E2E › should reject expired API key
...

Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
Time:        45s
```

## 🔍 What Gets Tested

### Authentication Tests (15 tests)
- ✅ API key validation (format, expiration, revocation)
- ✅ Scope-based permissions (exact match, wildcards)
- ✅ Tenant isolation (no cross-org access)
- ✅ Rate limiting headers

### Context Bundle Tests (15 tests)
- ✅ Complete bundle structure
- ✅ Prompt skeleton generation for AI
- ✅ Query parameters (interaction limits)
- ✅ Authorization enforcement
- ✅ Edge cases (no data, non-existent contacts)

## 🧹 Test Data Cleanup

E2E tests automatically clean up after themselves:

```typescript
afterAll(async () => {
  // Delete test API keys
  await supabase.from('api_keys').delete().eq('org_id', testOrgId);
  
  // Delete test contacts
  await supabase.from('contacts').delete().eq('org_id', testOrgId);
  
  // Delete test organization
  await supabase.from('organizations').delete().eq('id', testOrgId);
});
```

**Test data naming convention:**
- Organizations: `E2E Test Org - [Test Suite Name]`
- Users: `e2e-test-user-[timestamp]@example.com`
- Contacts: `E2E Test Contact - [Test Name]`

You can manually verify cleanup by searching for "E2E Test" in your Supabase tables.

## 🔒 Security Notes

**Q: Is it safe to give service role full access?**  
A: Yes, because:
1. Service role key is stored server-side only (never exposed to clients)
2. Only used during automated tests
3. Test data is isolated by org_id
4. Tests clean up after themselves
5. Regular users (authenticated role) still have normal RLS restrictions

**Q: Can test data interfere with production data?**  
A: No:
- Test orgs have distinct names (`E2E Test Org - ...`)
- Test data is isolated by org_id
- Tests run in their own organization context
- Cleanup happens in afterAll() hooks

**Q: What if tests fail and don't clean up?**  
A: You can manually delete orphaned test data:
```sql
-- Find test organizations
SELECT * FROM organizations WHERE name LIKE 'E2E Test Org%';

-- Delete if needed
DELETE FROM organizations WHERE name LIKE 'E2E Test Org%';
```

## ⚠️ Troubleshooting

### Tests still failing with "Cannot read properties of null"

**Problem:** RLS policies weren't applied correctly

**Solution:**
1. Check if migration ran successfully
2. Verify policies exist:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('organizations', 'contacts', 'api_keys', 'interactions')
   AND policyname LIKE 'Service role%';
   ```
3. Should see 16 policies (4 per table)

### "Failed to authenticate: 401"

**Problem:** Test user doesn't exist or wrong credentials

**Solution:**
1. Verify TEST_EMAIL and TEST_PASSWORD in `.env`
2. Create test user in Supabase Auth if needed:
   - Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/auth/users
   - Click "Add user"
   - Email: `isaiahdupree33@gmail.com`
   - Password: `frogger12`

### Tests timeout

**Problem:** Deployment is slow or cold-starting

**Solution:**
1. Increase timeout in `jest.config.js`: `testTimeout: 60000`
2. Wake up deployment first: `curl https://ever-reach-be.vercel.app/api/health`
3. Wait a few seconds, then run tests

### "Network request failed"

**Problem:** Deployment URL is incorrect

**Solution:**
1. Verify deployment is live: `vercel ls`
2. Update `TEST_BASE_URL` in `.env` to match actual deployment
3. Check you're not behind VPN/firewall blocking requests

## 🎓 Next Steps

Once E2E tests are passing:

1. **Add to CI/CD:**
   ```yaml
   # .github/workflows/test.yml
   - name: Run E2E Tests
     run: npm run test:e2e:public-api
     env:
       TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
       TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
       TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
   ```

2. **Test before deploying:**
   ```bash
   # Deploy to preview
   vercel deploy
   
   # Test preview
   TEST_BASE_URL=https://backend-abc123.vercel.app npm run test:e2e:public-api
   
   # If tests pass, promote
   vercel promote
   ```

3. **Monitor test performance:**
   - Target: < 60 seconds for full suite
   - If slower, consider parallelization or mocking

## 📚 Documentation

- **Test files:** `__tests__/e2e/`
- **E2E client:** `__tests__/helpers/e2e-client.ts`
- **Full guide:** `__tests__/E2E_TESTS_README.md`
- **Quick start:** `QUICK_START_E2E.md`

## ✅ Success Checklist

- [ ] Migration run successfully in Supabase
- [ ] 16 RLS policies created (4 per table)
- [ ] `TEST_SKIP_E2E=false` in `.env`
- [ ] Test user exists in Supabase Auth
- [ ] All environment variables set correctly
- [ ] Tests pass: `npm run test:e2e:public-api`
- [ ] Test data cleaned up after run

**Ready to test your deployed API against real data! 🚀**
