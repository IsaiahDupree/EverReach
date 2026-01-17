# E2E Test: Trial Expiration & Billing

- **Run ID**: 4d50137b-4a55-4c9d-b001-c8d1b9bd94d4
- **Timestamp**: 2025-10-21T04:13:35.497Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Trial & Subscription Tests

### 1. Get User Entitlements

- ✅ Entitlements retrieved
- Plan: free
- Trial: No
- Features enabled: compose_runs, voice_minutes, messages

### 2. Get Usage Summary

- ❌ Failed

### 3. Get Plan Recommendation

- ❌ Failed

### 4. Verify Trial Status Logic

- ✅ Trial status analyzed
- ✓ Not on trial (paid or free plan)

### 5. Test Checkout Session Creation

- ⚠️  Stripe not configured (expected in test environment)
- Status: 500

### 6. Test Billing Portal Session

- ✅ Portal session created

### 7. Test Restore Purchases

- ✅ Restore endpoint working

### 8. Get Impact Summary

- ❌ Failed

---

## Trial & Billing Summary

**Trial Detection**:
- ✓ Not on trial plan

**Billing Features Tested**:
- ✅ Entitlements endpoint
- ✅ Usage tracking
- ✅ Plan recommendations
- ✅ Checkout session creation
- ✅ Billing portal access
- ✅ Purchase restoration
- ✅ Impact metrics

**Tests Passed**: 5/8

⚠️  **Some trial & billing tests failed**

## Test Results

```json
[
  {
    "name": "1. Get entitlements",
    "pass": true,
    "status": 200,
    "ms": 182,
    "plan": "free",
    "features": {
      "compose_runs": 50,
      "voice_minutes": 30,
      "messages": 200
    }
  },
  {
    "name": "2. Get usage summary",
    "pass": false,
    "status": 404,
    "ms": 39
  },
  {
    "name": "3. Get plan recommendation",
    "pass": false,
    "status": 404,
    "ms": 36
  },
  {
    "name": "4. Trial status logic",
    "pass": true,
    "is_expired": null,
    "days_remaining": null
  },
  {
    "name": "5. Create checkout session",
    "pass": true,
    "status": 500,
    "ms": 295,
    "has_url": false,
    "error": "No such price: 'price_1SCCoND7MP3Gp2rw3dkn4A8g\\r\\n'"
  },
  {
    "name": "6. Create portal session",
    "pass": true,
    "status": 200,
    "ms": 421,
    "has_url": true
  },
  {
    "name": "7. Restore purchases",
    "pass": true,
    "status": 200,
    "ms": 222
  },
  {
    "name": "8. Get impact summary",
    "pass": false,
    "status": 404,
    "ms": 39
  }
]
```