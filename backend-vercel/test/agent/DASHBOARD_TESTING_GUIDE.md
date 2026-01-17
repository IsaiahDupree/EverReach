# Dashboard ↔ Backend Integration Testing Guide

## Overview

These tests simulate the **exact flow** from the dashboard UI to the backend API for the Feature Requests system. They validate that:

1. ✅ Dashboard forms send correct payloads
2. ✅ Backend responses match dashboard expectations
3. ✅ Voting system works as displayed in UI
4. ✅ Statistics are calculated correctly
5. ✅ Admin actions update data properly

## Test Files

### `dashboard-feature-requests.mjs` ⭐ **RECOMMENDED**
**Dashboard-focused tests** that simulate user interactions:
- Form submissions from the dashboard
- Vote button clicks
- Status filter tabs
- Statistics calculations
- Admin updates

**Run:**
```bash
node test/agent/dashboard-feature-requests.mjs
```

### `feature-requests-integration.mjs`
**Comprehensive backend tests** covering all API endpoints:
- CRUD operations
- Data validation
- Edge cases
- Full API coverage

**Run:**
```bash
node test/agent/feature-requests-integration.mjs
```

## Setup

### 1. Configure Environment

Add to `.env`:
```bash
TEST_EMAIL="isaiahdupree33@gmail.com"
TEST_PASSWORD="Frogger12"
API_BASE_URL="http://localhost:3000"  # Or your deployed URL
```

### 2. Start Backend

**Local Development:**
```bash
npm run dev
# Backend runs on http://localhost:3000
```

**Or use deployed backend:**
```bash
# In .env:
API_BASE_URL="https://your-backend.vercel.app"
```

### 3. Run Tests

```bash
# Dashboard-focused tests (recommended for UI validation)
node test/agent/dashboard-feature-requests.mjs

# Full API tests
node test/agent/feature-requests-integration.mjs

# Both
node test/agent/dashboard-feature-requests.mjs && node test/agent/feature-requests-integration.mjs
```

## Dashboard Test Coverage

### 📝 Form Submission Tests
- ✅ Create feature request from dashboard form
- ✅ Validate required fields
- ✅ Validate field lengths (title ≤100, description ≤2000)
- ✅ Response matches UI expectations

### 👍 Voting Tests  
- ✅ Vote button click
- ✅ "You voted" state in UI
- ✅ Vote count updates
- ✅ Unvote (remove vote)
- ✅ Prevent duplicate votes

### 📊 List Display Tests
- ✅ Fetch features for dashboard list
- ✅ Filter by status (tabs)
- ✅ Sort by votes (ranking)
- ✅ Data structure matches UI components

### 📈 Statistics Tests
- ✅ Calculate total features
- ✅ Count by status (shipped, in_progress, planned, backlog)
- ✅ Sum total votes
- ✅ Match dashboard summary widget

### ⚙️ Admin Tests
- ✅ Update feature status
- ✅ Change priority
- ✅ Add admin notes

## Test Output

```bash
🎯 Dashboard → Backend Integration Tests
============================================================

🚀 Setting up dashboard test environment...
   API: http://localhost:3000
   ✓ Authenticated as: e5eaa347-9c72-4190-bace-ec7a2063f69a

📝 Dashboard: Submit Feature Request Form
   📋 Simulating dashboard form submission...
   ✓ Feature created: 123e4567-e89b-12d3-a456-426614174000
   ❌ Testing form validation...
   ✓ Validation working: API request failed: 400

👍 Dashboard: Voting System
   👆 Simulating vote button click...
   ✓ Vote registered
   🔍 Checking vote state for UI...
   ✓ Vote count: 1
   ✓ User voted: true
   👎 Simulating unvote button click...
   ✓ Vote removed

📊 Dashboard: Feature List Display
   📦 Creating sample features for dashboard...
   ✓ Created: Stripe Integration (shipped)
   ✓ Created: Mobile App (in_progress)
   ✓ Created: API Webhooks (planned)
   📋 Fetching feature list for dashboard...
   ✓ Loaded 6 features
   🔍 Testing status filter (dashboard tabs)...
   ✓ Shipped features: 1
   🏆 Testing vote sorting (dashboard ranking)...
   ✓ Sorted 6 features by votes

📈 Dashboard: Statistics Display
   📊 Calculating dashboard statistics...
   ✓ Total: 6
   ✓ Shipped: 1
   ✓ In Progress: 1
   ✓ Planned: 1
   ✓ Total Votes: 23

⚙️ Dashboard: Admin Actions
   🔧 Simulating admin status update...
   ✓ Status updated: pending → in_progress

🧹 Cleaning up test data...
   ✓ Deleted feature: 123e4567-e89b-12d3-a456-426614174000
   ✓ Cleanup complete

✓ All tests passed (12 tests, 0 failures)
```

## Comparing with UI Mockup

The tests validate data against this dashboard structure:

```
Feature Requests Dashboard
┌─────────────────────────────────────────┐
│ Total: 6  | Backlog: 2  | In Progress: 1│
│ Shipped: 1 | Total Votes: 68            │
└─────────────────────────────────────────┘

Status Filter: [All] [Backlog] [In Progress] [Shipped]

┌─────────────────────────────────────────┐
│ 🔥 Stripe Integration         23 votes  │
│    Status: Shipped            [You voted]│
│    Add payment processing                │
├─────────────────────────────────────────┤
│ 📱 Mobile App                 15 votes  │
│    Status: In Progress        [Vote]    │
│    iOS and Android apps                  │
├─────────────────────────────────────────┤
│ 🔗 API Webhooks               12 votes  │
│    Status: Planned            [Vote]    │
│    Real-time notifications               │
└─────────────────────────────────────────┘
```

## Testing Against Production

```bash
# In .env, change:
API_BASE_URL="https://backend-vercel-[hash].vercel.app"

# Then run tests
node test/agent/dashboard-feature-requests.mjs
```

## Troubleshooting

### Tests fail with "DEPLOYMENT_NOT_FOUND"
**Problem:** Backend URL is incorrect

**Solution:**
```bash
# Check your .env file
cat .env | grep API_BASE_URL

# Update to correct URL
API_BASE_URL="http://localhost:3000"  # or your deployed URL
```

### Tests fail with "Invalid credentials"
**Problem:** TEST_EMAIL or TEST_PASSWORD incorrect

**Solution:**
```bash
# Verify credentials in .env
TEST_EMAIL="isaiahdupree33@gmail.com"
TEST_PASSWORD="Frogger12"
```

### Backend not running
**Problem:** No server on localhost:3000

**Solution:**
```bash
# Start the backend
cd backend-vercel
npm run dev
```

### Tests timeout
**Problem:** Backend is slow or not responding

**Solution:**
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check network connectivity
3. Increase timeout in test files if needed

## CI/CD Integration

Add to GitHub Actions:

```yaml
name: Dashboard Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm install
      - name: Start backend
        run: npm run dev &
      - name: Wait for backend
        run: npx wait-on http://localhost:3000
      - name: Run dashboard tests
        run: node test/agent/dashboard-feature-requests.mjs
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          API_BASE_URL: http://localhost:3000
```

## Best Practices

1. **Always clean up test data** - The tests automatically delete created features
2. **Run against local backend first** - Faster feedback loop
3. **Test production monthly** - Catch deployment issues
4. **Monitor test duration** - Should complete in < 10 seconds
5. **Check real dashboard** - Visual verification of features

## Next Steps

1. ✅ Run dashboard tests locally
2. ✅ Verify UI matches test data
3. ✅ Add to CI/CD pipeline
4. ✅ Test against staging before production deploy
5. ✅ Monitor test results in CI

## Support

If tests fail:
1. Check `.env` configuration
2. Verify backend is running
3. Review test output for specific errors
4. Check backend logs for API errors
