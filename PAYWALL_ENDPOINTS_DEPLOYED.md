# Paywall Endpoints - Deployment Status

## ✅ What Just Happened

**Problem:** Both paywall endpoints were returning 404 because the files were never committed to git.

**Solution:** Just committed and pushed the endpoints to `feat/event-tracking-hotfix`.

**Commit:** `aa44486f` - "feat(paywall): add paywall-strategy and paywall-live endpoints for mobile app"

---

## 📦 Files Deployed

1. `backend-vercel/app/api/v1/config/paywall-strategy/route.ts` (295 lines)
2. `backend-vercel/app/api/v1/config/paywall-live/route.ts` (186 lines)
3. `backend-vercel/types/paywall-strategy.ts` (335 lines)
4. `backend-vercel/migrations/live_paywall_config.sql` (migration)

**Total:** 880+ lines of code

---

## 🎯 The Two Endpoints Explained

### 1. `/api/v1/config/paywall-strategy` (Complex)
**Use for:** Admin dashboard, complex paywall configuration

**Returns:**
```json
{
  "strategy": { /* mode, trigger_type, free_access_level, etc. */ },
  "presentation": { /* variant, template_data */ },
  "trial": { /* type, duration_days, usage_hours */ },
  "permissions": [ /* feature area access levels */ ],
  "trial_ended": false,
  "can_show_review_prompt": true,
  "usage_stats": { /* hours/sessions remaining */ }
}
```

**Query Params:**
- `platform`: `mobile` | `web` | `all` (default: `all`)
- `user_id`: optional, for checking trial status

---

### 2. `/api/v1/config/paywall-live` (Simple)
**Use for:** Mobile app RevenueCat paywall

**Returns:**
```json
{
  "platform": "ios",
  "provider": "revenuecat",
  "paywall_id": "pw10ff5cbdce5444ef",
  "configuration": {},
  "updated_at": "2025-11-15T23:54:40.123Z"
}
```

**Query Params:**
- `platform`: `ios` | `android` | `web` (optional)
  - If provided: returns single config
  - If omitted: returns all platforms as map

---

## ⏱️ Vercel Deployment

**Status:** 🟡 Deploying now...

**Expected:** 2-3 minutes

**Check Status:**
```bash
# Test once deployed
curl "https://ever-reach-be.vercel.app/api/v1/config/paywall-live?platform=ios" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Next Steps

### Step 1: Wait for Deployment (2-3 min)
Check Vercel dashboard or wait for deployment notification.

### Step 2: Run Database Migration
```sql
-- Run this in Supabase SQL Editor
-- File: backend-vercel/migrations/live_paywall_config.sql
CREATE TABLE IF NOT EXISTS live_paywall_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  paywall_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('custom', 'superwall', 'revenuecat')),
  configuration JSONB DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, platform)
);

-- Add RLS policies
ALTER TABLE live_paywall_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own paywall configs"
  ON live_paywall_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paywall configs"
  ON live_paywall_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paywall configs"
  ON live_paywall_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Step 3: Configure Your Paywall
```bash
# Option A: Use script
node configure-revenuecat-paywall.mjs

# Option B: Manual API call
curl -X POST "https://ever-reach-be.vercel.app/api/v1/config/paywall-live" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "ios",
    "provider": "revenuecat",
    "paywall_id": "pw10ff5cbdce5444ef",
    "configuration": {}
  }'
```

### Step 4: Update Mobile App
```typescript
// In your subscription/paywall screen
import { RevenueCatUI } from 'react-native-purchases-ui';

async function showPaywall() {
  // 1. Fetch config from backend
  const response = await fetch(
    `${API_URL}/api/v1/config/paywall-live?platform=ios`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  
  const config = await response.json();
  console.log('Paywall config:', config);
  // { platform: 'ios', provider: 'revenuecat', paywall_id: 'pw10ff5cbdce5444ef' }
  
  // 2. Show RevenueCat paywall with the paywall_id
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: 'pro',
    paywallOptions: {
      requiredPaywallId: config.paywall_id, // 'pw10ff5cbdce5444ef'
    },
  });
  
  if (result === PAYWALL_RESULT.PURCHASED) {
    console.log('🎉 User purchased!');
  }
}
```

---

## 🚨 CORS Issues

Your CORS errors were happening because:
1. ❌ Endpoints didn't exist (404)
2. ❌ Browser interpreted as CORS failure

**Now:** Endpoints exist with proper CORS headers (`Access-Control-Allow-Origin` set).

**The CORS fix we deployed earlier includes:**
- `Idempotency-Key` in allowed headers
- `https://www.everreach.app` in allowed origins

---

## 🔍 Verify Deployment

### Once Vercel finishes (2-3 min):

```bash
# Check paywall-live endpoint
curl -I "https://ever-reach-be.vercel.app/api/v1/config/paywall-live"

# Should return: 401 Unauthorized (good! means auth required)
# NOT 404 Not Found

# Check with auth
curl "https://ever-reach-be.vercel.app/api/v1/config/paywall-live?platform=ios" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return: 404 (no config set) or JSON config
```

---

## 📊 Database Status

**Table:** `live_paywall_config` (needs migration)

**Current Status:** ⏳ Migration pending

**Run Migration:** See Step 2 above

---

## ✅ Success Criteria

- [ ] Vercel deployment complete (~2-3 min)
- [ ] Endpoints return 401 (not 404)
- [ ] Migration run in Supabase
- [ ] Paywall config set via script
- [ ] Mobile app fetches config successfully
- [ ] RevenueCat paywall displays with correct design

---

**Current Branch:** `feat/event-tracking-hotfix`
**Latest Commit:** `aa44486f`
**Deployment:** In progress...
**ETA:** 2-3 minutes from now
