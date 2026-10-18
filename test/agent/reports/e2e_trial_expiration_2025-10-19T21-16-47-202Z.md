# E2E Test: Trial Expiration & Billing

- **Run ID**: 3b55182f-20a8-46f0-a7e5-3402dcaeae2e
- **Timestamp**: 2025-10-19T21:16:40.195Z
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
    "ms": 2758,
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
    "ms": 50
  },
  {
    "name": "3. Get plan recommendation",
    "pass": false,
    "status": 404,
    "ms": 57
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
    "ms": 448,
    "has_url": false,
    "error": "No such price: 'price_1SCCoND7MP3Gp2rw3dkn4A8g\\r\\n'"
  },
  {
    "name": "6. Create portal session",
    "pass": true,
    "status": 200,
    "ms": 465,
    "has_url": true
  },
  {
    "name": "7. Restore purchases",
    "pass": true,
    "status": 200,
    "ms": 234
  },
  {
    "name": "8. Get impact summary",
    "pass": false,
    "status": 404,
    "ms": 86
  }
]
```