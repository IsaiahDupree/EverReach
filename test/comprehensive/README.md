# Comprehensive Backend Test Suite

This directory contains a full suite of tests covering all aspects of the backend API.

## Test Structure

- `functional/` - Tests for core business logic (CRUD, Campaigns, Billing, Auth, Subscriptions)
- `integration/` - Tests for external service integrations (APIs, Database)
- `system/` - End-to-end user journey tests
- `security/` - Security controls (Auth enforcement, Headers, Input validation)
- `performance/` - Load and latency tests
- `usability/` - API consistency and error handling
- `efficiency/` - Query performance and data sourcing verification

## Quick Start

### Option 1: Start Backend and Run All Tests
```bash
cd backend/test/comprehensive
./start-and-test.sh
```

This automatically:
1. Starts the Next.js backend server
2. Waits for it to be ready
3. Runs all test suites
4. Stops the server when done

### Option 2: Run Tests Against Running Backend
If the backend is already running (e.g., via `npm run dev`):
```bash
node backend/test/comprehensive/run-with-env.mjs
```

### Option 3: Run Tests Against Deployed Backend
```bash
export NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
node backend/test/comprehensive/run-with-env.mjs
```

## Configuration

Tests load environment variables from `backend-vercel/.env`. Required variables:
- `EXPO_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY` or `SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL` (optional, defaults to test@example.com)
- `TEST_USER_PASSWORD` (optional, defaults to testpassword123)

## Running Individual Test Suites

```bash
# Functional
node backend/test/comprehensive/functional/contacts-crm.mjs
node backend/test/comprehensive/functional/auth/user-creation.mjs
node backend/test/comprehensive/functional/subscription/enforcement.mjs

# Efficiency
node backend/test/comprehensive/efficiency/query-performance.mjs

# Security
node backend/test/comprehensive/security/api-security.mjs

# And so on...
```

## Test Coverage

- ✅ Functional: 5 suites (Contacts, Campaigns, Billing, Auth, Subscriptions)
- ✅ Integration: 2 suites (External APIs, Database)
- ✅ System: 1 suite (User Journeys)
- ✅ Security: 1 suite (API Security)
- ✅ Performance: 1 suite (Load & Latency)
- ✅ Usability: 1 suite (API Consistency)
- ✅ Efficiency: 1 suite (Query Performance)

**Total: 12 test suites**

## Next Steps

- Set up CI/CD to run tests automatically on PRs
- Add more edge cases as needed
- Tune performance thresholds based on production data
