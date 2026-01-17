# Test Suite Quick Start Guide

## 🚀 Running the Tests

### Setup (One-time)

1. **Install dependencies** (if not already done):
```bash
cd backend-vercel
npm install
```

2. **Set environment variables**:
```bash
# Create .env.test file or export these:
export NEXT_PUBLIC_SUPABASE_URL="https://utasetfxiqcrnwyfforx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_BACKEND_BASE="https://ever-reach-be.vercel.app"
export POSTHOG_WEBHOOK_SECRET="your-webhook-secret"
```

### Run Tests

```bash
# Run all tests
npm test

# Run only new feature tests (warmth + message + webhook)
npm run test:new-features

# Run specific test suites
npm run test:warmth      # Warmth score tests only
npm run test:message     # Message send tests only
npm run test:webhook     # PostHog webhook tests only
npm run test:perf        # Performance tests only

# Run ALL tests (functional + performance)
npm run test:all

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📊 What's Being Tested

### 1. Warmth Score Calculation (`warmth-score.test.ts`)
- ✅ Base score is 30 (not 40)
- ✅ Score increases after single interaction (→ 69 points)
- ✅ Maximum of 100 achievable with optimal engagement
- ✅ Decay after 30 days of no interaction
- ✅ Channel diversity bonus (+10 for 2+ channels)
- ✅ Score clamped between 0-100

### 2. Message Send Auto-Recompute (`message-send.test.ts`)
- ✅ Sending message creates interaction record
- ✅ Warmth score increases after message sent
- ✅ **CRITICAL**: Score goes above 40 (proves new formula works)
- ✅ Multiple messages increase frequency boost
- ✅ Message metadata includes sent_at timestamp
- ✅ Failed recompute doesn't block message send

### 3. PostHog Webhook (`posthog-webhook.test.ts`)
- ✅ Webhook secret authentication
- ✅ **PII filtering** (removes email, name, phone)
- ✅ Allowed properties preserved
- ✅ Domain events routed to typed tables
- ✅ Batch event processing
- ✅ Error handling

### 4. Message Generation Performance (`message-generation-performance.test.ts`) ⚡
- ✅ Simple message generation (< 3s)
- ✅ Complex message with context (< 5s)
- ✅ Full context retrieval (< 6s)
- ✅ Concurrent request handling
- ✅ Token usage efficiency (< 500 tokens)
- ✅ Streaming response speed (< 2s TTFB)
- ✅ Large context scaling (< 10s)
- ✅ Fast error responses (< 2s)

## ✨ Expected Results

When all tests pass, you'll see:

```
PASS  __tests__/api/warmth-score.test.ts
  ✓ Base score should be 30 for contact with no interactions
  ✓ Warmth score increases after single interaction
  ✓ Warmth score reaches maximum of 100 with optimal engagement
  ✓ Warmth score decays after 30 days of no interaction
  ✓ Warmth score never goes below 0
  ✓ Channel diversity bonus applies with 2+ interaction types

PASS  __tests__/api/message-send.test.ts
  ✓ Sending a message creates an interaction record
  ✓ Warmth score increases after sending a message
  ✓ Multiple messages increase frequency boost
  ✓ Message metadata includes sent_at timestamp
  ✓ Failed warmth recompute does not prevent message from being sent

PASS  __tests__/api/posthog-webhook.test.ts
  ✓ Rejects requests without webhook secret
  ✓ Rejects requests with invalid webhook secret
  ✓ Accepts valid webhook requests
  ✓ Filters out PII properties
  ✓ Stores message generation events in typed table
  ✓ Stores warmth score changes in typed table
  ✓ Handles batch events correctly
  ✓ Returns correct response format
  ✓ Handles empty batch gracefully
  ✓ Handles malformed JSON gracefully

Test Suites: 3 passed, 3 total
Tests:       22 passed, 22 total
```

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "supabaseUrl is required"
Check your environment variables are set correctly.

### Tests timing out
Increase timeout in `jest.config.js`:
```js
testTimeout: 60000 // 60 seconds
```

### Backend not responding
1. Verify backend is deployed: https://ever-reach-be.vercel.app/api/health
2. Check Vercel deployment logs
3. Ensure latest code is deployed

### Database errors
1. Verify tables exist in Supabase
2. Check service role key has permissions
3. Ensure migrations are run

## 📝 Manual Testing Alternative

If automated tests fail, manually verify:

1. **Open the app**
2. **Go to a contact**
3. **Note current warmth score** (should be ~40 or lower)
4. **Send a message**
5. **Check warmth score again** (should be 60-70+)
6. **Send more messages** (should climb toward 100)

## 🔗 Related Documentation

- Full test details: `__tests__/WARMTH_SCORE_TESTS.md`
- Warmth formula: `docs/WARMTH_SCORE_FIX.md`
- Backend deployment: `README.md`

---

**Questions?** Check the main test documentation or review test files for implementation details.
