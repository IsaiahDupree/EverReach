# 🧪 Subscription Bug Fix - Testing Guide

**Date:** November 12, 2025  
**Purpose:** Verify trial date persistence and paywall functionality

---

## 🎯 Test Scenarios

### Test 1: New User Trial Initialization
**Expected:** Trial dates saved to database on first API call

```bash
# Create new test user or use existing user without trial dates
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq

# ✅ Expected Response:
{
  "tier": "free",                           # Must be 'free', not 'pro'
  "subscription_status": "trial",
  "trial_started_at": "2025-11-12T05:00:00.000Z",  # Today's date
  "trial_ends_at": "2025-11-19T05:00:00.000Z",     # 7 days from start
  "plan": "free",
  "features": {
    "compose_runs": 50,
    "voice_minutes": 30,
    "messages": 200,
    "contacts": 100
  }
}

# ✅ Check Vercel logs for:
# [Entitlements] Initialized trial for user xxx-xxx-xxx: start=..., end=...
```

### Test 2: Trial Date Persistence
**Expected:** Same dates returned on multiple requests

```bash
# Call endpoint 5 times
for i in {1..5}; do
  echo "=== Request $i ==="
  curl -s "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
    --oauth2-bearer "$SERVICE_API_TOKEN" | \
    jq '{trial_started_at, trial_ends_at, tier}'
  sleep 1
done

# ✅ Expected: All 5 requests show IDENTICAL dates
# ❌ Bug if: trial_ends_at changes on each request
```

**Sample Output (CORRECT):**
```json
=== Request 1 ===
{
  "trial_started_at": "2025-11-04T12:00:00.000Z",
  "trial_ends_at": "2025-11-11T12:00:00.000Z",
  "tier": "free"
}
=== Request 2 ===
{
  "trial_started_at": "2025-11-04T12:00:00.000Z",
  "trial_ends_at": "2025-11-11T12:00:00.000Z",
  "tier": "free"
}
...
```

### Test 3: Tier Forced to 'free' During Trial
**Expected:** `tier: 'free'` for all non-paid users

```bash
# Test with trial user
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq '.tier'

# ✅ Expected: "free"
# ❌ Bug if: "pro" or "enterprise"

# Test with expired trial user
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq '.tier'

# ✅ Expected: "free"
# ❌ Bug if: "pro"
```

### Test 4: Paid User Still Gets Pro Tier
**Expected:** Paid users unaffected by fix

```bash
# Test with active paid subscriber
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq

# ✅ Expected:
{
  "tier": "pro",
  "subscription_status": "active",
  "trial_started_at": null,
  "trial_ends_at": null,
  "plan": "pro",
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 2000,
    "contacts": -1
  }
}
```

### Test 5: Database Verification
**Expected:** Trial dates stored in database

```sql
-- Check trial dates in database
SELECT 
  user_id,
  trial_started_at,
  trial_ends_at,
  EXTRACT(DAY FROM (trial_ends_at - trial_started_at)) AS trial_duration_days,
  subscription_status,
  created_at
FROM profiles
WHERE trial_started_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ✅ Expected:
-- - trial_started_at = user's created_at (or close to it)
-- - trial_ends_at = trial_started_at + 7 days
-- - trial_duration_days = 7
```

### Test 6: Existing Users Backfilled
**Expected:** Migration backfilled trial dates for existing users

```sql
-- Check backfill worked
SELECT 
  COUNT(*) AS total_users,
  COUNT(trial_started_at) AS users_with_trial_dates,
  COUNT(trial_started_at) * 100.0 / COUNT(*) AS coverage_percentage
FROM profiles;

-- ✅ Expected: coverage_percentage ≈ 100%
-- ❌ Bug if: coverage_percentage < 90%
```

### Test 7: Frontend Integration
**Expected:** Frontend shows correct trial info

**Manual Test Steps:**
1. Log into mobile app as trial user
2. Navigate to settings/profile
3. Check trial countdown display
4. **✅ Expected:** Shows accurate days remaining (e.g., "5 days left")
5. **❌ Bug if:** Always shows "7 days remaining"
6. Close app, reopen app
7. Check trial countdown again
8. **✅ Expected:** Same days remaining as before
9. **❌ Bug if:** Reset back to "7 days remaining"

### Test 8: Paywall Display
**Expected:** Paywall shows for expired trials

**Test Setup:**
```sql
-- Manually expire a test user's trial
UPDATE profiles
SET trial_ends_at = NOW() - INTERVAL '1 day'
WHERE user_id = 'test-user-id';
```

**Manual Test:**
1. Log into app as expired trial user
2. Try to access premium feature
3. **✅ Expected:** Paywall screen appears
4. **❌ Bug if:** Feature works without paywall

**API Test:**
```bash
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq '.tier'

# ✅ Expected: "free"
```

### Test 9: Error Handling
**Expected:** Graceful fallback if database write fails

**Test:**
```bash
# Call endpoint without Supabase permissions (simulates write failure)
# Should still return calculated trial date as fallback

# Check Vercel logs for:
# [Entitlements] Failed to save trial dates: ...
# But API should still return 200 OK with calculated dates
```

### Test 10: Performance Check
**Expected:** No performance regression

```bash
# Time the endpoint response
for i in {1..10}; do
  time curl -s "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
    --oauth2-bearer "$SERVICE_API_TOKEN" > /dev/null
done

# ✅ Expected: < 500ms average response time
# ⚠️ Warning if: > 1000ms
# ❌ Bug if: > 2000ms
```

---

## 📊 Test Results Checklist

### Pre-Deployment Tests
- [ ] Database migration runs without errors
- [ ] Migration adds required columns
- [ ] Migration backfills existing users
- [ ] Index created successfully

### Post-Deployment API Tests
- [ ] Test 1: New user gets trial dates (one-time initialization)
- [ ] Test 2: Trial dates stay consistent across requests
- [ ] Test 3: Tier forced to 'free' for trial users
- [ ] Test 4: Paid users still get 'pro' tier
- [ ] Test 5: Database shows stored trial dates
- [ ] Test 6: Existing users have trial dates backfilled
- [ ] Test 9: Error handling works (fallback to calculated date)
- [ ] Test 10: Performance acceptable (< 500ms)

### Frontend Integration Tests
- [ ] Test 7: Trial countdown shows correct days
- [ ] Test 7: Trial countdown persists across app restarts
- [ ] Test 8: Paywall shows for expired trials
- [ ] Test 8: Paywall doesn't show for paid users

### Monitoring Tests
- [ ] Vercel logs show "Initialized trial" for new users
- [ ] No 500 errors in Vercel logs
- [ ] Database queries performing well
- [ ] No spike in API latency

---

## 🚨 Known Issues & Workarounds

### Issue 1: Old Users Still See "7 Days"
**Cause:** Frontend cached old API response  
**Fix:** Clear app cache/localStorage  
**Command:**
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

### Issue 2: Trial Dates Different Than Expected
**Cause:** User created before migration, backfill used created_at  
**Expected:** Trial starts from created_at, not today  
**This is correct behavior** - preserves user's actual trial period

### Issue 3: Vercel Logs Don't Show "Initialized trial"
**Cause:** User already has trial dates from previous request  
**Expected:** Log only appears ONCE per user (first time)  
**This is correct behavior**

---

## 🔍 Debugging Commands

### Check User's Trial Dates in Database
```sql
SELECT 
  user_id,
  email,
  trial_started_at,
  trial_ends_at,
  subscription_status,
  created_at,
  EXTRACT(DAY FROM (trial_ends_at - trial_started_at)) AS trial_days,
  CASE 
    WHEN trial_ends_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END AS trial_status
FROM profiles
WHERE email = 'user@example.com';
```

### Check API Response for Specific User
```bash
# Get user's access token first
ACCESS_TOKEN="..." # From auth system

# Check their entitlements
curl "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" \
  -v | jq
```

### Check Vercel Logs for User
```bash
# Filter logs by user ID
vercel logs --since=1h | grep "user-id-here"

# Filter logs for trial initialization
vercel logs --since=1h | grep "Initialized trial"

# Filter logs for errors
vercel logs --since=1h | grep -i "error\|failed"
```

### Manually Fix User's Trial Dates
```sql
-- If user's trial dates are wrong, reset them
UPDATE profiles
SET 
  trial_started_at = created_at,
  trial_ends_at = created_at + INTERVAL '7 days'
WHERE user_id = 'user-id-here';
```

---

## ✅ Success Criteria

### API Level
- ✅ Returns `trial_started_at` field
- ✅ Returns `tier: 'free'` for trial users
- ✅ Trial dates consistent across multiple requests
- ✅ Database stores trial dates
- ✅ Response time < 500ms

### Frontend Level
- ✅ Trial countdown accurate
- ✅ Trial countdown persists
- ✅ Paywall shows for expired trials
- ✅ Paywall doesn't show for paid users

### Business Level
- ✅ Free users no longer bypass paywall
- ✅ Trial conversions trackable
- ✅ Revenue funnel enabled

---

## 📞 Report Issues

If tests fail, report with:
1. Test scenario number (e.g., "Test 2 failed")
2. Expected vs actual result
3. API response (curl output)
4. Vercel logs (relevant lines)
5. Database query result (if applicable)

**Contact:** Backend team / DevOps

---

## 🎯 Quick Test Script

Run all critical tests at once:

```bash
#!/bin/bash

echo "🧪 Running Subscription Fix Tests..."

# Test 1: Check API returns new fields
echo "Test 1: New fields in API response"
RESPONSE=$(curl -s "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN")

if echo "$RESPONSE" | jq -e '.trial_started_at' > /dev/null; then
  echo "✅ trial_started_at field present"
else
  echo "❌ trial_started_at field MISSING"
fi

# Test 2: Check tier is 'free' for trial
TIER=$(echo "$RESPONSE" | jq -r '.tier')
if [ "$TIER" = "free" ]; then
  echo "✅ Tier is 'free' for trial user"
else
  echo "❌ Tier is '$TIER' (should be 'free')"
fi

# Test 3: Check trial dates persistence
echo "Test 3: Trial dates persistence"
DATE1=$(curl -s "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq -r '.trial_ends_at')
sleep 2
DATE2=$(curl -s "https://ever-reach-be.vercel.app/api/v1/me/entitlements" \
  --oauth2-bearer "$SERVICE_API_TOKEN" | jq -r '.trial_ends_at')

if [ "$DATE1" = "$DATE2" ]; then
  echo "✅ Trial dates consistent"
else
  echo "❌ Trial dates CHANGED: $DATE1 → $DATE2"
fi

echo ""
echo "🎉 Tests complete! Check results above."
```

**Usage:**
```bash
chmod +x test-subscription-fix.sh
TEST_TOKEN="your-test-token" ./test-subscription-fix.sh
```

---

**Status:** Ready for testing after deployment 🚀
