# Admin Dashboard API Tests

Comprehensive test suite for the developer dashboard API endpoints.

## Overview

Tests cover:
- ✅ Admin authentication (sign in, password reset)
- ✅ Dashboard stats (overview endpoint)
- ✅ Feature flags (CRUD operations)
- ✅ A/B testing experiments (CRUD operations)
- ✅ Data ingestion (email campaigns)

**Total Tests**: 13  
**Estimated Runtime**: ~5 seconds

---

## Prerequisites

### 1. Database Migrations

Run the dashboard migrations first:

```powershell
.\scripts\run-dashboard-migrations.ps1
```

Or manually:

```bash
psql postgresql://postgres:everreach123!@#@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres \
  -f backend-vercel/migrations/developer-dashboard-system.sql

psql postgresql://postgres:everreach123!@#@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres \
  -f backend-vercel/migrations/feature-flags-ab-testing.sql
```

### 2. Create Admin User

Generate password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('everreach123!@#', 10));"
```

Insert admin user (replace `<hash>` with output above):

```bash
psql postgresql://postgres:everreach123!@#@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres \
  -c "INSERT INTO admin_users (email, password_hash, name, role) VALUES ('admin@everreach.app', '<hash>', 'Admin User', 'super_admin');"
```

### 3. Deploy Backend

Ensure the backend is deployed to Vercel with the new endpoints:

```bash
git push origin feat/backend-vercel-only-clean
```

---

## Running Tests

### All Tests

```bash
node test/admin/run-all.mjs
```

### With Custom Base URL

```bash
API_BASE_URL=http://localhost:3000 node test/admin/run-all.mjs
```

### With Custom Admin Credentials

```bash
ADMIN_EMAIL=your-admin@example.com ADMIN_PASSWORD=yourpassword node test/admin/run-all.mjs
```

---

## Test Coverage

### Authentication (2 tests)

1. **Admin: Sign In**
   - POST `/api/admin/auth/signin`
   - Validates credentials
   - Returns user object and session token
   - Stores token for subsequent tests

2. **Admin: Request Password Reset**
   - POST `/api/admin/auth/request-reset`
   - Sends reset email via Resend
   - Always returns success (prevents email enumeration)

### Dashboard Stats (1 test)

3. **Dashboard: Get Overview**
   - GET `/api/admin/dashboard/overview?days=30`
   - Requires authentication
   - Returns app health, user growth, experiments, marketing metrics

### Feature Flags (4 tests)

4. **Feature Flags: List**
   - GET `/api/admin/feature-flags?environment=production`
   - Returns array of flags with usage stats

5. **Feature Flags: Create**
   - POST `/api/admin/feature-flags`
   - Creates test flag with 25% rollout
   - Validates rollout percentage

6. **Feature Flags: Get Details**
   - GET `/api/admin/feature-flags/{key}`
   - Returns flag details + usage statistics
   - Includes evaluation logs

7. **Feature Flags: Update**
   - PATCH `/api/admin/feature-flags/{key}`
   - Updates rollout to 50%
   - Validates changes persisted

### A/B Testing (4 tests)

8. **Experiments: List**
   - GET `/api/admin/experiments`
   - Returns array of experiments with results

9. **Experiments: Create**
   - POST `/api/admin/experiments`
   - Creates test experiment with control + variant
   - Validates variant weights sum to 100

10. **Experiments: Get Details**
    - GET `/api/admin/experiments/{key}`
    - Returns experiment details + assignments + metric events

11. **Experiments: Update Status**
    - PATCH `/api/admin/experiments/{key}`
    - Changes status from `draft` to `running`
    - Validates `started_at` timestamp set

### Data Ingestion (1 test)

12. **Ingest: Email Campaign**
    - POST `/api/admin/ingest/email-campaign`
    - Creates campaign with metrics
    - Validates calculated rates (open rate, click rate)

### Cleanup (2 tests)

13. **Cleanup: Delete Test Flag**
    - DELETE `/api/admin/feature-flags/{key}`
    - Removes test flag created during test run

14. **Cleanup: Archive Test Experiment**
    - DELETE `/api/admin/experiments/{key}`
    - Archives test experiment

---

## Expected Output

```
🧪 Admin Dashboard API Tests

📍 Base URL: https://ever-reach-be.vercel.app

⏳ Admin: Sign In... ✅ (245ms)
   {"user_id":"uuid...","role":"super_admin","token_length":64}
⏳ Admin: Request Password Reset... ✅ (156ms)
   {"success":true}
⏳ Dashboard: Get Overview... ✅ (423ms)
   {"total_requests":125000,"success_rate":99.74,"active_experiments":3,"enabled_flags":12}
⏳ Feature Flags: List... ✅ (189ms)
   {"count":12,"first_flag":"new_ai_composer"}
⏳ Feature Flags: Create... ✅ (234ms)
   {"flag_key":"test_flag_1729543200000","rollout_percentage":25,"is_enabled":true}
⏳ Feature Flags: Get Details... ✅ (198ms)
   {"flag_key":"test_flag_1729543200000","total_evaluations":0}
⏳ Feature Flags: Update... ✅ (211ms)
   {"new_rollout":50}
⏳ Experiments: List... ✅ (176ms)
   {"count":3}
⏳ Experiments: Create... ✅ (267ms)
   {"experiment_key":"test_experiment_1729543200000","status":"draft"}
⏳ Experiments: Get Details... ✅ (203ms)
   {"experiment_key":"test_experiment_1729543200000","results_count":0}
⏳ Experiments: Update Status... ✅ (229ms)
   {"status":"running","started_at":"2025-10-21T18:00:00Z"}
⏳ Ingest: Email Campaign... ✅ (312ms)
   {"campaign_id":"test_campaign_1729543200000","success":true}
⏳ Cleanup: Delete Test Flag... ✅ (145ms)
   {"deleted":true}
⏳ Cleanup: Archive Test Experiment... ✅ (158ms)
   {"archived":true}

============================================================
✅ Passed: 14/14
❌ Failed: 0/14
============================================================

🎉 All tests passed!
```

---

## Troubleshooting

### "No admin token (sign in first)"

**Cause**: Sign in test failed  
**Fix**: Verify admin user exists and credentials are correct

```bash
# Check if admin user exists
psql $DATABASE_URL -c "SELECT email, role, is_active FROM admin_users WHERE email = 'admin@everreach.app';"

# If not exists, create it (see Prerequisites above)
```

### "Sign in failed: 401"

**Cause**: Invalid password  
**Fix**: Recreate admin user with correct password hash

### "Dashboard overview failed: 401"

**Cause**: Invalid or expired session token  
**Fix**: Check that sign in test passed and token was stored

### "Create flag failed: 409"

**Cause**: Test flag already exists (from previous incomplete run)  
**Fix**: Delete orphaned test flags manually

```bash
psql $DATABASE_URL -c "DELETE FROM feature_flags WHERE key LIKE 'test_flag_%';"
```

### Tests fail with network errors

**Cause**: Backend not deployed or URL incorrect  
**Fix**: Verify backend is running and `API_BASE_URL` is correct

```bash
# Test backend health
curl https://ever-reach-be.vercel.app/api/health
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `https://ever-reach-be.vercel.app` | Backend API URL |
| `ADMIN_EMAIL` | `admin@everreach.app` | Admin email |
| `ADMIN_PASSWORD` | `everreach123!@#` | Admin password |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Admin API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node test/admin/run-all.mjs
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

---

## Writing New Tests

Add tests to `test/admin/run-all.mjs`:

```javascript
{
  name: 'Your Test Name',
  async run() {
    // Use adminToken for authenticated requests
    if (!adminToken) throw new Error('No admin token');

    const res = await fetch(`${BASE_URL}/api/admin/your-endpoint`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();

    // Validate response
    if (!data.expected_field) {
      throw new Error('Missing expected field');
    }

    // Return summary data
    return {
      some_metric: data.value,
    };
  },
},
```

---

## Related Documentation

- [Admin Dashboard API Reference](../../docs/api/ADMIN_DASHBOARD_API.md)
- [Dashboard Implementation Plan](../../DEVELOPER_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [Deployment Steps](../../DASHBOARD_DEPLOYMENT_STEPS.md)
- [API Summary](../../DASHBOARD_API_SUMMARY.md)

---

## Test Philosophy

Following EverReach test guidelines:

✅ **Real data** - No mocks, tests hit live database  
✅ **Cleanup** - Tests delete what they create  
✅ **Fast** - All tests run in < 5 seconds  
✅ **Deterministic** - Same input = same output  
✅ **Isolated** - Tests don't depend on each other (except auth token)  
✅ **Self-documenting** - Test names describe what they validate

---

**Last Updated**: October 21, 2025  
**Status**: ✅ All tests passing
