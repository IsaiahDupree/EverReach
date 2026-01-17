# Warmth Scoring Tests Documentation

**Test Suite**: `test-latest-endpoints.mjs`  
**Warmth Coverage**: Tests 1-2 (Warmth Recompute Increase & Decrease)  
**EWMA Model**: Continuous-time decay with 30-day half-life

---

## 📊 Overview

The warmth scoring system uses an **Exponentially Weighted Moving Average (EWMA)** model that:
- Increases with new interactions (impulse weights: email=5, call=7, meeting=9, note=3)
- Decreases naturally over time without batch jobs (30-day half-life)
- Supports test-only time-travel for simulating future dates
- Updates on every interaction (O(1) per interaction)

---

## 🧪 Test 1: Warmth Score Increase

### Purpose
Verify that warmth scores increase when interactions are added.

### Test Flow
1. Create test contact
2. Add 3 email interactions (spread over 3 days)
3. Get warmth score BEFORE recompute
4. Trigger `POST /api/v1/contacts/:id/warmth/recompute`
5. Get warmth score AFTER recompute
6. Verify score increased

### Expected Behavior
```
Before: 0 (or null)
After:  40-45 (base 30 + amplitude from 3 emails)
Change: +40-45
Band:   none → neutral
```

### EWMA Calculation
```javascript
// Each email adds impulse of 5
// With 30-day half-life (λ = ln(2)/30 ≈ 0.0231)

// Day 0: amplitude = 0 + 5 = 5
// Day 1: amplitude = 5 * e^(-0.0231*1) + 5 ≈ 9.89
// Day 2: amplitude = 9.89 * e^(-0.0231*1) + 5 ≈ 14.66

// Final score = 30 (base) + 14.66 ≈ 44-45
```

### Success Criteria
- ✅ Recompute returns 200 status
- ✅ Score increases from initial value
- ✅ Score is between 40-50 (reasonable range)
- ✅ Band changes from 'none' to 'neutral'

---

## 🧪 Test 2: Warmth Score Decrease (Time Decay)

### Purpose
Verify that warmth scores decrease over time without requiring interaction deletion.

### Test Flow
1. Use contact from Test 1 (with score of ~44)
2. Simulate 60 days passing using test-only time-travel
3. Trigger recompute with `X-Warmth-Now: <future_date>`
4. Verify score decreased due to exponential decay

### Time-Travel Mechanism
```javascript
// Headers for time simulation (test-only)
{
  'x-allow-test': 'true',
  'x-warmth-now': '2025-12-31T02:00:00Z'  // 60 days in future
}
```

### Expected Behavior
```
After first recompute:  44
After 60 days (no contact): 34
Change: -10
Band:   neutral → cool
```

### EWMA Decay Calculation
```javascript
// amplitude after first recompute: ~14.66
// After 60 days:
// amplitude_now = 14.66 * e^(-0.0231 * 60)
// amplitude_now ≈ 3.7

// Final score = 30 (base) + 3.7 ≈ 34
```

### Success Criteria
- ✅ Recompute with time-travel returns 200 status
- ✅ Score decreases from previous value
- ✅ Decrease is approximately 10 points (for 60 days)
- ✅ Band changes from 'neutral' to 'cool'
- ✅ No interactions were deleted

---

## 🔧 EWMA Model Parameters

### Decay Rate
```
Half-life: 30 days
Lambda (λ): ln(2) / 30 ≈ 0.0231 per day
```

### Impulse Weights (per interaction)
```
email:   5
sms:     4
dm:      4
call:    7
meeting: 9
note:    3
other:   5
```

### Base Score
```
Base: 30 (starting point for all contacts)
```

### Band Thresholds
```
hot:     >= 80
warm:    >= 60
neutral: >= 40
cool:    >= 20
cold:    < 20
```

---

## 📝 Test Implementation Details

### Test File Location
```
test/backend/test-latest-endpoints.mjs
```

### Warmth Tests (Lines 27-211)
```javascript
// TEST 1: Warmth Score Recompute (Lines 27-150)
// - Creates contact
// - Adds 3 interactions with occurred_at timestamps
// - Recomputes and verifies increase

// TEST 2: Warmth Decrease via Time-Travel (Lines 152-211)
// - Simulates 60 days passing
// - Recomputes with x-warmth-now header
// - Verifies decrease without deleting interactions
```

### Key Endpoints Tested
```
POST /api/v1/contacts
POST /api/v1/interactions (with occurred_at support)
POST /api/v1/contacts/:id/warmth/recompute
GET  /api/v1/contacts/:id
```

---

## 🚀 Running Warmth Tests

### Run Full Test Suite (includes warmth)
```bash
node test/backend/test-latest-endpoints.mjs
```

### Expected Output
```
📊 TEST 1: Warmth Score Recompute
------------------------------------------
1️⃣ Creating test contact...
✅ Contact created: <uuid>
   Initial warmth: null

2️⃣ Adding interactions...
✅ Added 3 interactions

3️⃣ Getting warmth score BEFORE recompute...
   Warmth BEFORE: null
   
4️⃣ Recomputing warmth score...
   Recompute status: 200
   New warmth: 44

5️⃣ Getting warmth score AFTER recompute...
   Warmth AFTER: 44
   Warmth band AFTER: neutral

📈 WARMTH SCORE CHANGE (INCREASE):
   Before: 0
   After:  44
   Change: +44
   Band:   none → neutral
   ✅ Warmth increased: PASS

6️⃣ Testing warmth DECREASE by simulating time passing...
   Simulated current time → 2025-12-31T02:00:00Z

7️⃣ Recomputing warmth with simulated future now...
   Recompute status: 200
   New warmth: 34

8️⃣ Getting final warmth score...
   Final warmth: 34
   Final band: cool

📉 WARMTH SCORE CHANGE (DECREASE):
   After first recompute: 44
   After simulating 60 days without contact: 34
   Change: -10
   Band: neutral → cool
   ✅ Warmth decreased: PASS

✅ Warmth Recompute (Increase & Decrease): PASS
```

---

## 🔍 Debugging Failed Tests

### TEST 1 FAIL: Warmth Didn't Increase
**Symptoms**: Score remains 0 or null after recompute

**Possible Causes:**
1. Interactions not created successfully
2. `amplitude` column not updating
3. EWMA library not imported in endpoint

**Check:**
```sql
-- Verify interactions exist
SELECT * FROM interactions 
WHERE contact_id = '<test_contact_id>' 
ORDER BY occurred_at DESC;

-- Verify amplitude updated
SELECT id, amplitude, warmth_last_updated_at, warmth, warmth_band
FROM contacts 
WHERE id = '<test_contact_id>';
```

**Fix:**
- Ensure `lib/warmth-ewma.ts` is imported in interaction endpoints
- Verify `updateAmplitudeForContact` is called after interaction insert
- Check database migration ran successfully

---

### TEST 2 FAIL: Warmth Didn't Decrease
**Symptoms**: Score stays same after time-travel recompute

**Possible Causes:**
1. Time-travel headers not being read
2. `x-warmth-now` not passed to EWMA compute function
3. Decay calculation not applied

**Check:**
```javascript
// In app/api/v1/contacts/[id]/warmth/recompute/route.ts
const allowTest = req.headers.get('x-allow-test') === 'true';
const overrideNow = allowTest ? req.headers.get('x-warmth-now') : undefined;

// Should pass overrideNow to computeWarmthFromAmplitude
const { score, band } = computeWarmthFromAmplitude(
  contact.amplitude ?? 0,
  contact.warmth_last_updated_at ?? null,
  overrideNow  // ← Must be here
);
```

**Fix:**
- Ensure `overrideNow` parameter is passed through
- Verify `computeWarmthFromAmplitude` uses `nowIso` parameter
- Check decay calculation: `Math.exp(-LAMBDA_PER_DAY * dtDays)`

---

## 📈 Performance Benchmarks

### Expected Response Times
- Interaction create + EWMA update: < 200ms
- Warmth recompute: < 100ms (no scans, just amplitude decay)
- Contact read with warmth: < 150ms

### Database Operations
- EWMA update: 1 SELECT + 1 UPDATE per interaction
- Recompute: 1 SELECT + 1 UPDATE per contact
- No full table scans required

---

## 🔄 Related Documentation

### EWMA Implementation
- **Library**: `lib/warmth-ewma.ts`
- **Endpoints**: Modified interaction endpoints + recompute
- **Migration**: `migrations/warmth-ewma-system.sql`
- **Full Docs**: `WARMTH_SYSTEM_SUMMARY.md`

### Other Test Suites
- **Superwall**: `test/backend/superwall-webhook.mjs`
- **RevenueCat**: `test/backend/revenuecat-webhook.mjs`
- **Full Backend**: `test/backend/test-latest-endpoints.mjs` (includes notes, files, interactions)

---

## 🎯 Success Criteria Checklist

Before production:
- [ ] TEST 1 (Increase): Score increases by 40-50 points
- [ ] TEST 2 (Decrease): Score decreases by ~10 points after 60 days
- [ ] No interactions deleted in decrease test
- [ ] Time-travel only works with `x-allow-test: true` header
- [ ] Warmth bands update correctly
- [ ] All 4 tests in suite pass (Warmth, Delete, Notes, Files)

---

## 📞 Support

**Issues with warmth tests?**
1. Check `WARMTH_SYSTEM_SUMMARY.md` for system overview
2. Review `lib/warmth-ewma.ts` for calculation logic
3. Verify database migration applied successfully
4. Check Vercel logs for recompute errors

**Formula Quick Reference:**
```
amplitude(t) = amplitude(t-1) * e^(-λΔt) + impulse
score = base + amplitude(now)
```

Where:
- λ = ln(2)/30 ≈ 0.0231 (30-day half-life)
- impulse = weight based on interaction kind
- base = 30
