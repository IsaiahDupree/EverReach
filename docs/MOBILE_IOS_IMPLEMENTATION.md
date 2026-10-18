# Mobile iOS/Expo Implementation Guide

## Overview

This guide provides step-by-step instructions for the mobile iOS team to integrate the backend subscription source handling and auto-refresh changes into the Expo React Native app.

> **Important:** Mobile apps use **RevenueCat + App Store/Play Store** for purchases.  
> **Stripe is for web app only.** Mobile app should NEVER call Stripe endpoints.

---

## Billing Platform by App Type

| Platform | Billing Provider | Endpoints Used |
|----------|-----------------|----------------|
| **iOS App** | App Store via RevenueCat | RevenueCat SDK |
| **Android App** | Play Store via RevenueCat | RevenueCat SDK |
| **Web App** | Stripe | `/api/v1/billing/checkout`, `/api/v1/billing/portal` |

---

## Prerequisites

- Expo SDK 50+ (or React Native 0.72+)
- `@react-native-async-storage/async-storage` installed
- `react-native-purchases` (RevenueCat SDK) installed

## Backend URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://ever-reach-be.vercel.app` |
| **Local Dev** | `http://localhost:3333` |

---

## 1. Backend API Changes Summary

### What Changed

| Endpoint | Change | Impact |
|----------|--------|--------|
| `GET /api/v1/me/entitlements` | `source` field now returns `app_store`/`play` instead of `revenuecat` | UI must handle new source values |
| `POST /api/v1/billing/portal` | Returns `400` for non-Stripe subscriptions | Must handle error gracefully |

### New API Contract

**Entitlements Response:**
```json
{
  "plan": "pro",
  "tier": "core",
  "source": "app_store",
  "subscription_status": "active",
  "valid_until": "2026-01-17T03:32:58+00:00",
  "product_id": "com.everreach.core.monthly",
  "billing_period": "monthly",
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 2000
  }
}
```

**Billing Portal Error (Non-Stripe):**
```json
{
  "error": "Cannot create portal for non-Stripe subscription",
  "code": "INVALID_SUBSCRIPTION_SOURCE",
  "subscription_source": "app_store"
}
```
Status: `400`

---

## 2. Environment Configuration

### Update `.env` or `app.config.js`

```bash
# Local development
EXPO_PUBLIC_API_URL=http://localhost:3333

# Production
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app

# Test credentials (dev only)
TEST_EMAIL=isaiahdupree33@gmail.com
TEST_PASSWORD=Frogger12
```

### Verify API URL in Code

Check `@/lib/api.ts` or wherever API base URL is configured:

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
```

---

## 3. Update Subscription Repository

### File: `repos/SubscriptionRepo.ts`

**Current behavior:** Already fetches from `/api/v1/me/entitlements` ✅

**Action required:** None - repository is already correct.

**Verify response handling:**
```typescript
export const SubscriptionRepo = {
  async getEntitlements(): Promise<Entitlements> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalSubscriptionRepo.getEntitlements();
    }
    return BackendSubscriptionRepo.getEntitlements();
  },
};
```

---

## 4. Update Subscription Provider

### File: `providers/SubscriptionProvider.tsx`

#### 4.1 Add AppState Listener for Auto-Refresh

**Purpose:** Refresh entitlements when app returns to foreground after purchase.

```typescript
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useRef, useEffect } from 'react';

// Inside SubscriptionProvider component
const lastRefreshRef = useRef<number>(0);
const isRefreshingRef = useRef<boolean>(false);

useEffect(() => {
  if (Platform.OS === 'web') return;

  let appState = AppState.currentState;
  
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Detect app returning to foreground
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Throttle: minimum 5 seconds between auto-refreshes
      if (timeSinceLastRefresh > 5000 && !isRefreshingRef.current) {
        console.log('[SubscriptionProvider] 🔄 App returned to foreground - refreshing');
        isRefreshingRef.current = true;
        lastRefreshRef.current = now;
        
        try {
          await loadSubscriptionState();
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }
    appState = nextAppState;
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [loadSubscriptionState]);
```

#### 4.2 Add Manual Refresh Method

**Purpose:** Allow screens to manually trigger refresh on focus.

```typescript
const refreshEntitlements = useCallback(async () => {
  const now = Date.now();
  
  // Throttle: minimum 3 seconds between manual refreshes
  if (now - lastRefreshRef.current < 3000 || isRefreshingRef.current) {
    console.log('[SubscriptionProvider] ⏭️ Skipping refresh (throttled)');
    return;
  }
  
  console.log('[SubscriptionProvider] 🔄 Manual refresh triggered');
  isRefreshingRef.current = true;
  lastRefreshRef.current = now;
  
  try {
    await loadSubscriptionState();
  } finally {
    isRefreshingRef.current = false;
  }
}, [loadSubscriptionState]);

// Add to context value
return useMemo(() => ({
  tier,
  trialStartDate,
  subscriptionStartDate,
  trialDaysRemaining,
  isPaid,
  paymentPlatform,
  cloudSyncEnabled,
  autoSyncContacts,
  syncStatus,
  lastSyncDate,
  enableCloudSync,
  disableCloudSync,
  startFreeTrial,
  upgradeToPaid,
  syncNow,
  refreshEntitlements, // ← Add this
}), [
  tier,
  trialStartDate,
  subscriptionStartDate,
  trialDaysRemaining,
  isPaid,
  paymentPlatform,
  cloudSyncEnabled,
  autoSyncContacts,
  syncStatus,
  lastSyncDate,
  enableCloudSync,
  disableCloudSync,
  startFreeTrial,
  upgradeToPaid,
  syncNow,
  refreshEntitlements, // ← Add this
]);
```

#### 4.3 Update Interface

```typescript
interface SubscriptionState {
  // ... existing fields
  refreshEntitlements: () => Promise<void>; // ← Add this
}
```

---

## 5. Update Settings Screen

### File: `app/(tabs)/settings.tsx`

**Purpose:** Refresh entitlements when user navigates to Settings.

```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useSubscription } from '@/providers/SubscriptionProvider';

export default function SettingsScreen() {
  const { refreshEntitlements } = useSubscription();
  const lastFocusRefreshRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      // Throttle: minimum 10 seconds between screen focus refreshes
      if (now - lastFocusRefreshRef.current > 10000) {
        console.log('[Settings] 🔄 Screen focused - refreshing entitlements');
        lastFocusRefreshRef.current = now;
        refreshEntitlements();
      }
    }, [refreshEntitlements])
  );

  // ... rest of component
}
```

---

## 6. Update Subscription Plans Screen

### File: `app/subscription-plans.tsx`

#### 6.1 Add Focus Refresh

```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

const lastFocusRefreshRef = useRef<number>(0);

useFocusEffect(
  useCallback(() => {
    const now = Date.now();
    if (now - lastFocusRefreshRef.current > 10000) {
      console.log('[SubscriptionPlans] 🔄 Screen focused - refreshing');
      lastFocusRefreshRef.current = now;
      refreshEntitlements();
    }
  }, [refreshEntitlements])
);
```

#### 6.2 Handle Subscription Source in UI

**Already implemented** ✅ - Verify conditional rendering:

```typescript
const subscriptionSource = useMemo(() => {
  const src = entitlements?.source;
  
  // Map legacy 'revenuecat' to specific store
  if (src === 'revenuecat') {
    const productId = entitlements?.product_id || '';
    if (productId.includes('ios') || productId.startsWith('com.')) return 'app_store';
    if (productId.includes('android')) return 'play';
  }
  
  return src || null;
}, [entitlements]);

// Conditional UI
{subscriptionSource === 'app_store' && (
  <View>
    <Badge>Subscribed via App Store</Badge>
    <Button onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
      Manage in App Store
    </Button>
  </View>
)}
```

#### 6.3 Handle "Manage Subscription" for App Store Users

> **Note:** Mobile app does NOT call Stripe endpoints. Users manage subscriptions via their native app store.

```typescript
const handleManageSubscription = async () => {
  const source = entitlements?.source;
  
  if (source === 'app_store' || source === 'revenuecat') {
    // iOS App Store subscription
    if (Platform.OS === 'ios') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Alert.alert(
        'Manage Subscription',
        'Your subscription is managed via the App Store. Open Settings → Apple ID → Subscriptions on your iOS device.'
      );
    }
  } else if (source === 'play') {
    // Google Play subscription
    if (Platform.OS === 'android') {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Alert.alert(
        'Manage Subscription',
        'Your subscription is managed via Google Play. Open the Play Store app → Menu → Subscriptions.'
      );
    }
  } else if (source === 'stripe') {
    // Web subscription - should not happen in mobile app
    Alert.alert(
      'Web Subscription',
      'Your subscription was created on the web. Please visit everreach.app to manage billing.'
    );
  }
};
```

---

## 7. Testing on iOS

### 7.1 Local Backend Testing

```bash
# Terminal 1: Start backend
cd backend-vercel
PORT=3333 npm run dev

# Terminal 2: Start Expo
cd ..
EXPO_PUBLIC_API_URL=http://localhost:3333 npx expo start
```

### 7.2 Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Purchase Flow** | 1. Start as free user<br>2. Navigate to Subscription Plans<br>3. Complete App Store purchase<br>4. Return to app | App auto-refreshes, shows "Pro" tier |
| **Background/Foreground** | 1. Complete purchase<br>2. Background app (home screen)<br>3. Wait 10 seconds<br>4. Return to app | Entitlements refresh automatically |
| **Settings Navigation** | 1. Complete purchase<br>2. Navigate to Settings | Shows updated tier immediately |
| **Billing Portal (App Store)** | 1. Tap "Manage Billing"<br>2. As App Store subscriber | Shows App Store instructions |

### 7.3 Console Logs to Monitor

```
[SubscriptionProvider] Loading subscription state
[SubscriptionProvider] Entitlements: {...}
[SubscriptionProvider] 🔄 App returned to foreground - refreshing
[SubscriptionProvider] ✅ Auto-refresh completed
[Settings] 🔄 Screen focused - refreshing entitlements
[SubscriptionPlans] 🔄 Screen focused - refreshing
```

### 7.4 Verify API Calls

Use React Native Debugger or Flipper to verify:

```
GET /api/v1/me/entitlements
Response: { "source": "app_store", "plan": "pro", ... }
```

---

## 8. Production Deployment Checklist

- [ ] Update `EXPO_PUBLIC_API_URL` to production in `app.config.js`
- [ ] Test against production backend: `https://ever-reach-be.vercel.app`
- [ ] Verify AppState listener works on physical device
- [ ] Test complete purchase flow with real App Store sandbox
- [ ] Verify Settings screen refresh on focus
- [ ] Verify Subscription Plans screen refresh on focus
- [ ] Test billing portal error handling for App Store users
- [ ] Remove test credentials from production build

---

## 9. Known Issues & Limitations

| Issue | Workaround |
|-------|------------|
| Production backend returns `source: "revenuecat"` | Frontend maps to `app_store`/`play` based on `product_id` |
| Refresh may not trigger immediately | Throttled to 5s (background) / 10s (screen focus) |
| Web platform not supported | AppState listener skips web via `Platform.OS === 'web'` check |

---

## 10. Rollback Plan

If issues occur, revert these changes:

```bash
git checkout HEAD~1 -- providers/SubscriptionProvider.tsx
git checkout HEAD~1 -- app/(tabs)/settings.tsx
git checkout HEAD~1 -- app/subscription-plans.tsx
```

---

## 11. Support & Debugging

### Debug Mode

Add to `SubscriptionProvider.tsx`:

```typescript
const DEBUG = __DEV__;

if (DEBUG) {
  console.log('[SubscriptionProvider] State:', {
    tier,
    isPaid,
    source: entitlements?.source,
    product_id: entitlements?.product_id,
  });
}
```

### Test API Manually

```typescript
// In any component
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';

const testAPI = async () => {
  const entitlements = await SubscriptionRepo.getEntitlements();
  console.log('Entitlements:', entitlements);
};
```

### Contact

For backend API issues, contact backend team with:
- API endpoint called
- Request headers (redact auth token)
- Response status code
- Response body

---

## Summary

**Files to modify:**
1. `providers/SubscriptionProvider.tsx` - Add AppState listener + `refreshEntitlements`
2. `app/(tabs)/settings.tsx` - Add `useFocusEffect` refresh
3. `app/subscription-plans.tsx` - Add `useFocusEffect` refresh (if not present)

**Testing:**
- Local backend: `http://localhost:3333`
- Production backend: `https://ever-reach-be.vercel.app`

**Key behavior:**
- App auto-refreshes on foreground (5s throttle)
- Screens refresh on focus (10s throttle)
- Billing portal shows App Store instructions for iOS users
