# Warmth Modes Test Suite

Comprehensive tests for the multi-mode warmth score system.

## Overview

This test suite validates the new multi-mode warmth score feature with 4 different cadence modes:
- **Slow** (~30 day horizon)
- **Medium** (~14 day horizon, default)
- **Fast** (~7 day horizon)
- **Test** (~12 hour horizon, for development)

## Test Files

### 1. `warmth-modes.mjs` (460 lines)
**Core functionality tests**

Tests 10 scenarios:
1. ✅ Get Available Modes - Validates all 4 modes are returned
2. ✅ Create Contact with Default Mode - Ensures contacts default to medium
3. ✅ Get Contact's Current Mode - API endpoint validation
4. ✅ Mode Switching - Instant Recalculation - Validates score changes instantly
5. ✅ Score Differences Across Modes - Ensures slow > medium > fast > test
6. ✅ Slow Mode Decay Timeline - Tests 30-day decay curve
7. ✅ Fast Mode Decay Timeline - Tests 7-day decay curve
8. ✅ Test Mode Hourly Decay - Tests 12-hour rapid decay
9. ✅ Invalid Mode Handling - Error validation
10. ✅ Mode Persistence - Ensures mode saves correctly

### 2. `warmth-modes-api.mjs` (420 lines)
**API endpoint tests**

Tests 10 scenarios:
1. ✅ GET /v1/warmth/modes - List all modes with metadata
2. ✅ GET /v1/contacts/:id/warmth/mode - Get contact's current mode
3. ✅ PATCH /v1/contacts/:id/warmth/mode - Switch mode
4. ✅ Verify Mode Persistence - Mode saved to database
5. ✅ Invalid Mode Validation - Rejects bad mode names
6. ✅ Missing Mode Parameter - Rejects missing body
7. ✅ Non-existent Contact - Handles 404 properly
8. ✅ Unauthorized Access - Auth validation
9. ✅ Switch Through All Modes - All 4 modes work
10. ✅ Content-Type Validation - Header validation

### 3. `run-warmth-modes-tests.mjs` (80 lines)
**Test runner**

Runs both test files sequentially and provides:
- Individual test results
- Summary statistics
- Exit codes for CI/CD
- Execution time

## Running Tests

### Run All Warmth Mode Tests
```bash
npm run test:warmth:modes:all
```

### Run Individual Test Files
```bash
# Core functionality tests
npm run test:warmth:modes

# API endpoint tests
npm run test:warmth:modes:api
```

### Direct Execution
```bash
# All tests
node test/backend/run-warmth-modes-tests.mjs

# Individual
node test/backend/warmth-modes.mjs
node test/backend/warmth-modes-api.mjs
```

## Environment Setup

Tests use the shared authentication helper from `_shared.mjs`:

1. **Option 1**: Use `test-token.txt` (recommended)
   ```bash
   # Create token file in project root
   echo "your-jwt-token-here" > test-token.txt
   ```

2. **Option 2**: Use environment variable
   ```bash
   export TEST_JWT="your-jwt-token-here"
   ```

3. **Option 3**: Use .env.local credentials
   ```bash
   TEST_EMAIL=your-email@example.com
   TEST_PASSWORD=your-password
   ```

## Test Output

### Success Example
```
🎯 Warmth Modes Test Suite
==========================================

==========================================
TEST 1: Get Available Warmth Modes
==========================================
  ✅ All 4 modes available
  ✅ Default mode: medium

...

📊 TEST SUMMARY
==========================================

✅ Passed: 10
❌ Failed: 0
📋 Total:  10

✅ ALL TESTS PASSED

🎉 Multi-mode warmth system working correctly!
```

### Failure Example
```
❌ Test failed: Should return 200, got 500

📊 TEST SUMMARY
==========================================

✅ Passed: 7
❌ Failed: 3
📋 Total:  10

❌ SOME TESTS FAILED
```

## What's Being Tested

### Mode Metadata
- All 4 modes exist (slow, medium, fast, test)
- Each mode has: lambda, halfLifeDays, daysToReachout, description
- Default mode is 'medium'

### Score Calculations
- Scores decrease over time with mode-specific decay rates
- Slow mode: ~75 after 10 days
- Medium mode: ~55 after 10 days
- Fast mode: ~25 after 10 days
- Test mode: ~30 after 12 hours

### Mode Switching
- Mode switches cause instant score recalculation
- New scores based on same last_interaction_at timestamp
- Scores follow new mode's decay rate going forward
- Mode persists in database

### API Endpoints
- GET /v1/warmth/modes returns all modes
- GET /v1/contacts/:id/warmth/mode returns contact's mode
- PATCH /v1/contacts/:id/warmth/mode switches mode
- All endpoints require authentication
- Invalid inputs return proper error codes

### Error Handling
- Invalid mode names rejected (400)
- Missing mode parameter rejected (400)
- Non-existent contacts handled (404)
- Unauthorized requests rejected (401)

## CI/CD Integration

### Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed

### Example GitHub Actions
```yaml
- name: Run Warmth Modes Tests
  run: npm run test:warmth:modes:all
  env:
    TEST_JWT: ${{ secrets.TEST_JWT }}
    API_BASE: https://your-api.vercel.app
```

## Test Data

Tests create and delete temporary contacts:
- Display name: "Mode Test Contact" / "API Test Contact"
- Email: `warmth-mode-{timestamp}@example.com`
- All test data is cleaned up automatically

## Performance

- **Duration**: ~15-30 seconds for all tests
- **API Calls**: ~50 requests total
- **Rate Limiting**: Tests include delays to avoid limits

## Debugging

### Enable Verbose Output
Tests already include detailed logging:
- Section headers for each test
- Pass/fail indicators with explanations
- Score values and mode changes
- Error messages

### Common Issues

**Authentication Failures**
```
❌ Supabase sign-in failed: 401
```
Solution: Check TEST_JWT or .env.local credentials

**Connection Errors**
```
❌ fetch failed
```
Solution: Check API_BASE environment variable

**Mode Not Found**
```
❌ Should have 4 modes, got 0
```
Solution: Ensure migration `20251102_warmth_modes.sql` has run

## Coverage

Tests cover:
- ✅ 100% of new API endpoints (3/3)
- ✅ All 4 warmth modes
- ✅ Mode switching logic
- ✅ Score recalculation
- ✅ Decay timelines
- ✅ Error handling
- ✅ Validation
- ✅ Authentication
- ✅ Persistence

## Related Files

**Implementation:**
- `lib/warmth-ewma.ts` - Core warmth calculation library
- `app/api/v1/warmth/modes/route.ts` - GET modes endpoint
- `app/api/v1/contacts/[id]/warmth/mode/route.ts` - GET/PATCH mode endpoint
- `supabase/migrations/20251102_warmth_modes.sql` - Database migration

**Documentation:**
- `docs/WARMTH_MODES_FRONTEND_GUIDE.md` - Frontend integration guide
- `docs/WARMTH_SCORE_ARCHITECTURE.md` - Updated architecture doc

## Next Steps

To add more tests:
1. Create new .mjs file in `test/backend/`
2. Import from `_shared.mjs` for helpers
3. Follow existing test structure
4. Add to `run-warmth-modes-tests.mjs`
5. Add npm script to `package.json`

---

**Last Updated:** November 2, 2025  
**Status:** All tests passing ✅
