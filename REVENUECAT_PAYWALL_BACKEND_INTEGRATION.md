# RevenueCat Paywall Backend Integration Guide

## 🎯 Overview

Your backend now has the **correct endpoint** for serving RevenueCat paywall configurations to your mobile app!

**Endpoint:** `GET /api/v1/config/paywall-live?platform=ios`

## 📍 The Two Paywall Endpoints Explained

### ❌ NOT This One: `/api/v1/config/paywall-strategy`
- **Purpose:** Complex admin configuration system
- **Returns:** Full strategy object (modes, triggers, trials, permissions)
- **Use case:** Admin dashboard for configuring paywall behavior
- **Response:** Large object with strategy, presentation, trial, permissions

### ✅ Use This One: `/api/v1/config/paywall-live`
- **Purpose:** Simple paywall provider configuration
- **Returns:** Just what the mobile app needs: `paywall_id`, `provider`, `platform`
- **Use case:** Mobile app fetching which paywall to show
- **Response:**
```json
{
  "platform": "ios",
  "provider": "revenuecat",
  "paywall_id": "pw10ff5cbdce5444ef",
  "configuration": {},
  "updated_at": "2025-11-15T19:00:00Z"
}
```

---

## 🚀 Step 1: Deploy the Backend

The endpoint is in your `feat/event-tracking-hotfix` branch (just pushed).

**Verify Vercel Deployment:**
```bash
# Check if deployed
curl "https://ever-reach-be.vercel.app/api/v1/config/paywall-live"

# Should return: 401 Unauthorized (good! means endpoint exists)
# or 405 Method Not Allowed for GET without auth
```

**If you get 404:** Vercel is still building. Wait 2-3 minutes and check again.

---

## 🔧 Step 2: Configure the Paywall

Once deployed, set your RevenueCat paywall ID:

### Option A: Manual Configuration (Via Script)

```bash
# Run this script to configure iOS paywall
node configure-revenuecat-paywall.mjs
```

### Option B: Direct API Call

```bash
# Get auth token
node backend-vercel/get-fresh-token.mjs

# Set the paywall configuration
curl -X POST "https://ever-reach-be.vercel.app/api/v1/config/paywall-live" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "platform": "ios",
    "provider": "revenuecat",
    "paywall_id": "pw10ff5cbdce5444ef",
    "configuration": {}
  }'
```

### Option C: Supabase Direct Insert

```sql
-- Insert directly into Supabase
INSERT INTO live_paywall_config (user_id, platform, paywall_id, provider, configuration)
VALUES (
  'e5eaa347-9c72-4190-bace-ec7a2063f69a', -- Your user ID
  'ios',
  'pw10ff5cbdce5444ef',
  'revenuecat',
  '{}'::jsonb
)
ON CONFLICT (user_id, platform) 
DO UPDATE SET 
  paywall_id = EXCLUDED.paywall_id,
  provider = EXCLUDED.provider,
  updated_at = NOW();
```

---

## 📱 Step 3: Mobile App Integration

### Current Mobile App Code

Your app currently does this:
```typescript
// ❌ OLD: Fetches offerings (products), not the paywall design
const offerings = await Purchases.getOfferings();
if (offerings.current) {
  // This shows products, not the beautiful paywall UI
}
```

### Updated Mobile App Code

Change to this:
```typescript
// ✅ NEW: Fetch paywall config from backend
const response = await fetch(
  `${API_URL}/api/v1/config/paywall-live?platform=ios`,
  {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  }
);

const config = await response.json();
// config = {
//   platform: 'ios',
//   provider: 'revenuecat',
//   paywall_id: 'pw10ff5cbdce5444ef',
//   configuration: {},
//   updated_at: '2025-11-15T19:00:00Z'
// }

// Use the paywall_id with RevenueCat Paywall component
import { RevenueCatUI } from 'react-native-purchases-ui';

async function showPaywall() {
  try {
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: 'pro',
      // Use the paywall_id from backend
      paywallOptions: {
        requiredPaywallId: config.paywall_id, // 'pw10ff5cbdce5444ef'
      },
    });
    
    if (paywallResult === PAYWALL_RESULT.PURCHASED) {
      console.log('User purchased!');
    }
  } catch (error) {
    console.error('Paywall error:', error);
  }
}
```

---

## 🎨 Key Difference: Offering ID vs Paywall ID

### Offering ID (Products)
- **What:** Your subscription products (`default`, `premium_annual`, etc.)
- **Where:** Configured in RevenueCat dashboard → Products
- **Purpose:** Defines what the user can buy
- **Example:** `default`, `premium_monthly`

### Paywall ID (UI Design)
- **What:** The beautiful UI template (`pw10ff5cbdce5444ef`)
- **Where:** Configured in RevenueCat dashboard → Paywalls
- **Purpose:** Defines HOW the products are displayed
- **Example:** `pw10ff5cbdce5444ef`

**You need both!**
1. Paywall ID tells RevenueCat which UI design to show
2. That UI design automatically fetches the products (offerings) to display

---

## 🔍 Step 4: Verify Everything Works

### 1. Check Backend Deployment
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://ever-reach-be.vercel.app/api/v1/config/paywall-live?platform=ios"

# Expected response:
# {
#   "platform": "ios",
#   "provider": "revenuecat",
#   "paywall_id": "pw10ff5cbdce5444ef",
#   "configuration": {},
#   "updated_at": "2025-11-15T23:54:40.123Z"
# }
```

### 2. Test in Mobile App
```typescript
// Add this to your subscription screen
useEffect(() => {
  async function fetchPaywallConfig() {
    try {
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
      
      // Now use config.paywall_id with RevenueCat
    } catch (error) {
      console.error('Failed to fetch paywall config:', error);
    }
  }
  
  fetchPaywallConfig();
}, []);
```

---

## 📊 Database Schema

The `live_paywall_config` table structure:

```sql
CREATE TABLE live_paywall_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  paywall_id TEXT NOT NULL, -- 'pw10ff5cbdce5444ef'
  provider TEXT NOT NULL CHECK (provider IN ('custom', 'superwall', 'revenuecat')),
  configuration JSONB DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, platform)
);
```

---

## 🎯 Quick Reference

### Backend Endpoint
```
GET /api/v1/config/paywall-live?platform=ios
POST /api/v1/config/paywall-live
```

### Configuration Script
```bash
node configure-revenuecat-paywall.mjs
```

### Mobile App Integration
```typescript
// 1. Fetch config
const config = await api.get('/config/paywall-live?platform=ios');

// 2. Show paywall with the paywall_id
await RevenueCatUI.presentPaywallIfNeeded({
  requiredEntitlementIdentifier: 'pro',
  paywallOptions: {
    requiredPaywallId: config.paywall_id,
  },
});
```

---

## 🚨 Troubleshooting

### Endpoint returns 404
- **Cause:** Vercel hasn't deployed yet
- **Fix:** Wait 2-3 minutes, check Vercel dashboard

### Endpoint returns 401 Unauthorized
- **Cause:** Missing or expired auth token
- **Fix:** Run `node backend-vercel/get-fresh-token.mjs`

### Paywall shows products but wrong design
- **Cause:** Using offering ID instead of paywall ID
- **Fix:** Make sure you're passing `paywall_id` to `requiredPaywallId`, not an offering

### Configuration not found
- **Cause:** Haven't configured the paywall yet
- **Fix:** Run `node configure-revenuecat-paywall.mjs`

---

## ✅ Success Checklist

- [ ] Backend deployed with paywall-live endpoint
- [ ] Configuration set via script or API
- [ ] Mobile app updated to fetch from backend
- [ ] Mobile app uses RevenueCatUI with paywall_id
- [ ] Beautiful paywall UI shows in app
- [ ] Purchases work correctly

---

## 📚 Related Files

- **Endpoint Implementation:** `backend-vercel/app/api/v1/config/paywall-live/route.ts`
- **Configuration Script:** `configure-revenuecat-paywall.mjs`
- **Database Migration:** `backend-vercel/migrations/live_paywall_config.sql`
- **Mobile Integration:** Update your subscription/paywall screen

---

**Status:** ✅ Backend code deployed to `feat/event-tracking-hotfix`
**Next Step:** Wait for Vercel deployment, then run configuration script
