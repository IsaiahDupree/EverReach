# Warmth Score & New Features Test Suite

Comprehensive tests for the updated warmth score system (max 100) and new features.

## Test Files Created

### 1. `api/warmth-score.test.ts`
Tests the updated warmth calculation formula.

**What's Tested:**
- ✅ Base score is 30 (not 40)
- ✅ Single interaction increases warmth above base
- ✅ Maximum score of 100 is achievable with optimal engagement
- ✅ Warmth decays after 30 days of no interaction
- ✅ Warmth never goes below 0
- ✅ Channel diversity bonus (+10) applies with 2+ interaction types

**Formula Validation:**
```
Base:      30 points
Recency:  +0 to +35 (based on last 90 days)
Frequency: +0 to +25 (6+ interactions in 90 days)
Channel:  +10 (if 2+ distinct channels in 30 days)
Decay:    -0 to -30 (after 7 days of no interaction)
─────────────────────────────────
Range:    0 to 100 points
```

### 2. `api/message-send.test.ts`
Tests automatic warmth recomputation when messages are sent.

**What's Tested:**
- ✅ Sending a message creates an interaction record
- ✅ Warmth score increases after sending a message
- ✅ Warmth score goes above 40 (old maximum)
- ✅ Multiple messages increase frequency boost
- ✅ Message metadata includes sent_at timestamp
- ✅ Failed warmth recompute doesn't prevent message send

**Critical Validation:**
- Warmth increases above 40 (proving new formula works)
- Interaction record created automatically
- `last_interaction_at` updated on contact
- Asynchronous warmth recompute doesn't block message send

### 3. `api/posthog-webhook.test.ts`
Tests the PostHog webhook for privacy-safe analytics mirroring.

**What's Tested:**
- ✅ Webhook secret authentication
- ✅ PII property filtering (removes email, name, phone, etc.)
- ✅ Allowed properties are preserved
- ✅ Domain events routed to typed tables
- ✅ Batch event processing
- ✅ Error handling for malformed requests

**Privacy Validation:**
- Email, name, phone_number filtered out
- Message content not stored
- Only whitelisted properties saved
- User IDs are anonymized

## Running the Tests

### Prerequisites
```bash
# Install dependencies (if not already done)
npm install

# Set required environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://utasetfxiqcrnwyfforx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_BACKEND_BASE="https://ever-reach-be.vercel.app"
export POSTHOG_WEBHOOK_SECRET="your-webhook-secret"
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Warmth score tests only
npm test warmth-score

# Message send tests only
npm test message-send

# PostHog webhook tests only
npm test posthog-webhook
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Test Database Setup

These tests require:
1. **Supabase service role key** - for admin operations
2. **Backend API running** - tests make HTTP requests
3. **Database tables** - organizations, contacts, interactions, messages, threads

The tests will:
- Create temporary test users
- Create test organizations and contacts
- Clean up all test data after completion

## Expected Test Results

### Warmth Score Tests
```
✓ Base score should be 30 for contact with no interactions
✓ Warmth score increases after single interaction (69-75 range)
✓ Warmth score reaches maximum of 100 with optimal engagement (95-100 range)
✓ Warmth score decays after 30 days of no interaction
✓ Warmth score never goes below 0
✓ Channel diversity bonus applies with 2+ interaction types (75-85 range)
```

### Message Send Tests
```
✓ Sending a message creates an interaction record
✓ Warmth score increases after sending a message
✓ Warmth score goes above 40 (CRITICAL - proves new formula)
✓ Multiple messages increase frequency boost (70-80 range)
✓ Message metadata includes sent_at timestamp
✓ Failed warmth recompute does not prevent message from being sent
```

### PostHog Webhook Tests
```
✓ Rejects requests without webhook secret (401)
✓ Rejects requests with invalid webhook secret (401)
✓ Accepts valid webhook requests (200)
✓ Filters out PII properties
✓ Stores message generation events in typed table
✓ Stores warmth score changes in typed table
✓ Handles batch events correctly
✓ Returns correct response format
✓ Handles empty batch gracefully
✓ Handles malformed JSON gracefully
```

## CI/CD Integration

Tests are configured to run automatically on:
- **Pull requests** to `feat/backend-vercel-only-clean`
- **Pushes** to `feat/backend-vercel-only-clean`
- **Before deployment** to Vercel

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Tests failing with "supabaseUrl is required"
- Ensure environment variables are set
- Check that `NEXT_PUBLIC_SUPABASE_URL` is correct

### Tests timing out
- Increase timeout in jest.config.js:
  ```js
  testTimeout: 30000 // 30 seconds
  ```

### Warmth score not updating
- Check backend deployment is latest
- Verify warmth recompute endpoint is accessible
- Check for errors in Vercel logs

### PostHog tests failing
- Verify `POSTHOG_WEBHOOK_SECRET` is set
- Check PostHog webhook endpoint is deployed
- Ensure analytics tables exist in Supabase

## Manual Testing

If automated tests fail, manually test:

1. **Send a message** in the app
2. **Check warmth score** before and after
3. **Verify** warmth goes above 40
4. **Send multiple messages** to see frequency boost
5. **Use different channels** (email, call) for channel bonus

Expected results:
- 1 message: ~69 warmth
- 2 messages: ~73 warmth
- 3 messages (multi-channel): ~87 warmth
- 6+ messages (multi-channel): ~100 warmth

---

**Test Suite Status:** ✅ Ready to Run  
**Coverage Goal:** >80% for warmth calculation and message send  
**Last Updated:** 2025-10-09
