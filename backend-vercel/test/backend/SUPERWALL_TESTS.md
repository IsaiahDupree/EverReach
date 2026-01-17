# Superwall Integration Tests Documentation

**Test Suite**: `superwall-webhook.mjs`  
**Test Count**: 10 comprehensive tests  
**Coverage**: All Superwall event types, platforms, and edge cases

---

## 📊 Test Overview

### Purpose
Verify that the Superwall webhook integration correctly:
- Processes all event types (18+ supported)
- Updates subscription state in database
- Handles idempotency (duplicate events)
- Supports iOS and Android platforms
- Validates webhook payloads
- Integrates with entitlements endpoint

---

## 🧪 Test Suite Breakdown

### TEST 1: Transaction Complete (New Subscription)
**Event**: `transaction.complete`  
**Purpose**: Verify new subscription creation from purchase

**What it tests:**
- ✅ Webhook accepts transaction events
- ✅ Creates new `user_subscriptions` record
- ✅ Maps iOS platform to `app_store`
- ✅ Sets status to `active`
- ✅ Stores product_id, dates, and metadata

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "active",
    "product_id": "com.everreach.pro.monthly",
    "platform": "app_store"
  }
}
```

---

### TEST 2: Trial Start
**Event**: `trial.start`  
**Purpose**: Verify trial subscription handling

**What it tests:**
- ✅ Recognizes trial period type
- ✅ Sets status to `trial`
- ✅ Stores `trial_ends_at` timestamp
- ✅ Handles sandbox environment

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "trial",
    "product_id": "com.everreach.pro.monthly"
  }
}
```

**Key Validation:**
- `period_type: 'trial'` → status becomes `trial`
- `trial_ends_at` is stored correctly
- `environment: 'sandbox'` is preserved

---

### TEST 3: Subscription Renewal
**Event**: `subscription.renew`  
**Purpose**: Verify subscription updates on renewal

**What it tests:**
- ✅ Updates existing subscription (same `original_transaction_id`)
- ✅ Extends `current_period_end`
- ✅ Maintains `active` status
- ✅ Updates `last_event_at` timestamp

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "active",
    "product_id": "com.everreach.pro.monthly"
  }
}
```

**Database Behavior:**
- Uses `UPSERT` with `original_transaction_id` conflict resolution
- Updates fields without creating duplicate records

---

### TEST 4: Subscription Cancellation
**Event**: `subscription.cancel`  
**Purpose**: Verify cancellation handling

**What it tests:**
- ✅ Sets status to `canceled`
- ✅ Stores `canceled_at` timestamp
- ✅ Preserves `current_period_end` (access until end of period)
- ✅ Updates subscription record in-place

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "canceled"
  }
}
```

**Business Logic:**
- Canceled subscriptions maintain access until `current_period_end`
- Entitlements endpoint respects this grace period

---

### TEST 5: Paywall Events (Non-Subscription)
**Event**: `paywall.open`  
**Purpose**: Verify analytics events don't affect subscriptions

**What it tests:**
- ✅ Webhook accepts paywall events
- ✅ Events are logged for analytics
- ✅ Subscription state is NOT modified
- ✅ Returns success without subscription update

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": undefined  // No subscription update
}
```

**Event Types Tested:**
- `paywall.open` - Paywall displayed
- `paywall.close` - Paywall dismissed
- `paywall.decline` - User declined purchase

---

### TEST 6: Idempotency (Duplicate Event)
**Event**: Resend of `transaction.complete` from TEST 1  
**Purpose**: Verify duplicate event prevention

**What it tests:**
- ✅ Detects duplicate `event_id`
- ✅ Returns `duplicate: true`
- ✅ Does NOT reprocess event
- ✅ Database is not modified twice

**Expected Result:**
```json
{
  "ok": true,
  "duplicate": true,
  "processed": false
}
```

**Implementation:**
- Events stored in `revenuecat_webhook_events` table
- `event_id` is primary key (prefixed with `sw_`)
- Duplicate check happens before processing

---

### TEST 7: Android Platform
**Event**: `transaction.complete` with `platform: 'android'`  
**Purpose**: Verify Android platform support

**What it tests:**
- ✅ Accepts Android transactions
- ✅ Maps `android` → `play` in database
- ✅ Stores product_id correctly
- ✅ Handles Google Play Store data

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "active",
    "platform": "play"  // Mapped from 'android'
  }
}
```

**Platform Mapping:**
```
ios → app_store
android → play
```

---

### TEST 8: Subscription Expire
**Event**: `subscription.expire`  
**Purpose**: Verify expired subscription handling

**What it tests:**
- ✅ Sets status to `expired`
- ✅ Stores `expires_at` timestamp
- ✅ Updates existing subscription record
- ✅ Removes active entitlements

**Expected Result:**
```json
{
  "ok": true,
  "processed": true,
  "subscription": {
    "status": "expired"
  }
}
```

**Entitlements Impact:**
- Expired subscriptions return free tier features
- Access is immediately revoked

---

### TEST 9: Invalid Event (Missing Required Fields)
**Event**: Malformed payload without `user_id` or `timestamp`  
**Purpose**: Verify payload validation

**What it tests:**
- ✅ Rejects invalid payloads
- ✅ Returns 400 Bad Request
- ✅ Provides clear error message
- ✅ Does not create database records

**Expected Result:**
```json
{
  "ok": false,
  "error": "Missing required fields (event_name, user_id, timestamp)"
}
```

**HTTP Status**: `400 Bad Request`

**Validation Rules:**
- `event_name` is required
- `user_id` is required
- `timestamp` is required (ISO 8601 format)

---

### TEST 10: Entitlements Integration
**Endpoint**: `GET /api/v1/me/entitlements`  
**Purpose**: Verify subscription data flows to entitlements

**What it tests:**
- ✅ Entitlements endpoint returns subscription status
- ✅ Merges Superwall + RevenueCat + Stripe data
- ✅ Returns correct tier and features
- ✅ Fallback to free tier on error

**Expected Result:**
```json
{
  "tier": "pro",
  "subscription_status": "active",
  "trial_ends_at": null,
  "current_period_end": "2025-11-30T22:00:00Z",
  "payment_platform": "app_store",
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 5000,
    "contacts": 10000
  }
}
```

**Data Sources (Priority Order):**
1. Superwall events (latest)
2. RevenueCat webhooks
3. Stripe subscriptions
4. Fallback: Free tier

---

## 🚀 Running Tests

### Run All Superwall Tests
```bash
node test/backend/superwall-webhook.mjs
```

### Run with Custom API Base
```bash
API_BASE=https://ever-reach-be.vercel.app node test/backend/superwall-webhook.mjs
```

### Expected Output
```
🧪 Superwall Webhook Integration Tests
API Base: https://ever-reach-be.vercel.app
==========================================

📊 TEST 1: Transaction Complete
------------------------------------------
✅ Transaction complete processed successfully
   Subscription status: active

📊 TEST 2: Trial Start
------------------------------------------
✅ Trial start processed successfully
   Subscription status: trial

📊 TEST 3: Subscription Renewal
------------------------------------------
✅ Subscription renewal processed successfully
   Subscription status: active

📊 TEST 4: Subscription Cancellation
------------------------------------------
✅ Subscription cancellation processed successfully
   Subscription status: canceled

📊 TEST 5: Paywall Open Event
------------------------------------------
✅ Paywall open event processed successfully
   Updated subscription: no (expected)

📊 TEST 6: Idempotency (Duplicate Event)
------------------------------------------
✅ Duplicate event detected correctly
   Event was not reprocessed

📊 TEST 7: Android Transaction
------------------------------------------
✅ Android transaction processed successfully
   Platform mapped correctly: play

📊 TEST 8: Subscription Expire
------------------------------------------
✅ Subscription expire processed successfully
   Status updated to: expired

📊 TEST 9: Invalid Event (Missing Required Fields)
------------------------------------------
✅ Invalid event rejected correctly
   Error: Missing required fields

📊 TEST 10: Verify Entitlements Integration
------------------------------------------
✅ Entitlements endpoint working
   Tier: pro
   Status: active
   Features: 4 features


📊 TEST SUMMARY
==========================================
Total Tests: 10
✅ Passed: 10
❌ Failed: 0
Success Rate: 100%

🎉 ALL TESTS PASSED!
```

---

## 🔍 Debugging Failed Tests

### Common Issues

#### TEST 1-4, 7-8 FAIL: Webhook Returns 401 Unauthorized
**Cause**: Authentication not configured

**Fix:**
1. Ensure `SUPERWALL_WEBHOOK_SECRET` is set in Vercel
2. Or set `SUPERWALL_WEBHOOK_AUTH_TOKEN` for Bearer auth
3. Development mode bypasses auth automatically

#### TEST 6 FAIL: Duplicate Not Detected
**Cause**: Database cleanup between tests

**Check:**
- `revenuecat_webhook_events` table exists
- Event IDs are persisted correctly
- Test is using same `event_id` as TEST 1

#### TEST 10 FAIL: Entitlements Returns Free Tier
**Cause**: Subscription not found or expired

**Check:**
- Database has subscription record from previous tests
- `user_subscriptions` table has matching `user_id`
- Subscription status is `active` or `trial`

### Manual Verification

```bash
# Check webhook logs in Vercel
vercel logs --follow | grep Superwall

# Query database directly
psql $DATABASE_URL -c "SELECT * FROM revenuecat_webhook_events WHERE event_id LIKE 'sw_%' ORDER BY created_at DESC LIMIT 10;"

psql $DATABASE_URL -c "SELECT * FROM user_subscriptions ORDER BY updated_at DESC LIMIT 10;"
```

---

## 📊 Test Coverage

### Superwall Events Covered
- ✅ Transaction events (5 types)
- ✅ Subscription events (5 types)
- ✅ Trial events (3 types)
- ✅ Paywall events (3 types)

### Edge Cases Covered
- ✅ Idempotency (duplicate prevention)
- ✅ Invalid payloads (missing fields)
- ✅ Multiple platforms (iOS + Android)
- ✅ Different environments (sandbox + production)
- ✅ Event types that don't affect subscriptions

### Integration Points Covered
- ✅ Webhook endpoint
- ✅ Database upserts
- ✅ Event logging
- ✅ Entitlements endpoint
- ✅ Error handling

---

## 🎯 Success Criteria

**All tests must pass before production deployment:**
- [ ] All 10 tests return `✅ PASS`
- [ ] Success rate is 100%
- [ ] No database errors in logs
- [ ] Entitlements endpoint returns correct data
- [ ] Idempotency works correctly

---

## 📈 Performance Benchmarks

**Expected Response Times:**
- Webhook processing: < 500ms
- Database upsert: < 100ms
- Idempotency check: < 50ms
- Entitlements read: < 200ms

**Concurrent Events:**
- Webhook can handle 100+ events/second
- Database prevents race conditions via unique constraints

---

## 🔄 Related Test Suites

### RevenueCat Tests
```bash
node test/backend/revenuecat-webhook.mjs
```
**Coverage**: RevenueCat webhooks (similar structure)

### Full Backend Tests
```bash
node test/backend/test-latest-endpoints.mjs
```
**Coverage**: Warmth, notes, files, interactions

---

## 📞 Support

**Issues with tests?**
1. Check `SUPERWALL_INTEGRATION.md` for setup instructions
2. Verify environment variables are set
3. Check Vercel logs for webhook errors
4. Review database for subscription records

**Still stuck?**
- Check webhook signature verification
- Ensure database migrations ran successfully
- Verify API base URL is correct
- Test with curl manually (see SUPERWALL_INTEGRATION.md)
