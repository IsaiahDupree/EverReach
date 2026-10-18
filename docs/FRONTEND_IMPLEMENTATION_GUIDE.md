# Frontend Implementation & Testing Guide

## Overview

This document provides the frontend team with implementation details and testing instructions for the subscription source handling and auto-refresh features.

---

## Backend API Endpoints

### Base URLs

| Environment | URL | Port |
|-------------|-----|------|
| **Frontend Dev** | `http://localhost:3334` | 3334 |
| **Backend Dev** | `http://localhost:3333` | 3333 |
| **Production** | `https://ever-reach-be.vercel.app` | 443 |

### Configuration

Set in your `.env` or environment:
```bash
# Frontend testing against local backend
EXPO_PUBLIC_API_URL=http://localhost:3333

# Frontend testing against production
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
```

---

## 1. Subscription Source Handling

### API Contract: `/api/v1/me/entitlements`

**Request:**
```bash
GET /api/v1/me/entitlements
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "plan": "pro",
  "valid_until": "2026-01-17T03:32:58+00:00",
  "source": "app_store",
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 2000
  },
  "tier": "core",
  "subscription_status": "active",
  "trial_ends_at": null,
  "product_id": "com.everreach.core.monthly",
  "billing_period": "monthly"
}
```

### Source Field Values

| Value | Description | Billing Action |
|-------|-------------|----------------|
| `stripe` | Web/Stripe subscription | Open Stripe Portal |
| `app_store` | iOS App Store | Show App Store instructions |
| `play` | Google Play Store | Show Play Store instructions |
| `manual` | Admin-granted | Show "Contact support" |
| `revenuecat` | Legacy (map to app_store/play) | Check product_id |

### Frontend Implementation

```typescript
// In subscription-plans.tsx or similar

// Determine subscription source from entitlements
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

// Conditional UI rendering
{subscriptionSource === 'stripe' && (
  <Button onPress={openStripePortal}>Manage Billing</Button>
)}

{subscriptionSource === 'app_store' && (
  <View>
    <Badge>Subscribed via App Store</Badge>
    {Platform.OS === 'ios' ? (
      <Button onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
        Manage in App Store
      </Button>
    ) : (
      <Text>Open Settings → Apple ID → Subscriptions</Text>
    )}
  </View>
)}

{subscriptionSource === 'play' && (
  <View>
    <Badge>Subscribed via Google Play</Badge>
    {Platform.OS === 'android' ? (
      <Button onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}>
        Manage in Play Store
      </Button>
    ) : (
      <Text>Open Play Store → Menu → Subscriptions</Text>
    )}
  </View>
)}

{subscriptionSource === 'manual' && (
  <View>
    <Badge variant="enterprise">Enterprise Subscription</Badge>
    <Text>Contact support for billing changes</Text>
  </View>
)}
```

### TestIDs for QA

```
subscription-source-label
manage-billing-stripe-button
manage-billing-native-button
app-store-instructions
play-store-instructions
enterprise-instructions
```

---

## 2. Billing Portal API

### API Contract: `/api/v1/billing/portal`

**Request:**
```bash
POST /api/v1/billing/portal
Authorization: Bearer <access_token>
```

**Success Response (Stripe users):**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

**Error Response (Non-Stripe users):**
```json
{
  "error": "Cannot create portal for non-Stripe subscription",
  "code": "INVALID_SUBSCRIPTION_SOURCE",
  "subscription_source": "app_store"
}
```
Status: `400`

### Frontend Error Handling

```typescript
const handleManageBilling = async () => {
  try {
    const response = await apiFetch('/api/v1/billing/portal', {
      method: 'POST',
      requireAuth: true,
    });
    
    if (response.ok) {
      const { url } = await response.json();
      await Linking.openURL(url);
    } else {
      const error = await response.json();
      
      if (error.code === 'INVALID_SUBSCRIPTION_SOURCE') {
        // Show appropriate message based on subscription_source
        Alert.alert(
          'Manage Subscription',
          `Your subscription is managed via ${error.subscription_source}. Please use that platform to manage billing.`
        );
      } else {
        Alert.alert('Error', error.error || 'Failed to open billing portal');
      }
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to open billing portal');
  }
};
```

---

## 3. Subscription Auto-Refresh

### Implementation Requirements

#### 3.1 AppState Listener (SubscriptionProvider.tsx)

```typescript
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useRef, useEffect } from 'react';

// Inside provider
const lastRefreshRef = useRef<number>(0);
const isRefreshingRef = useRef<boolean>(false);

useEffect(() => {
  if (Platform.OS === 'web') return;

  let appState = AppState.currentState;
  
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Throttle: minimum 5 seconds between auto-refreshes
      if (timeSinceLastRefresh > 5000 && !isRefreshingRef.current) {
        console.log('[SubscriptionProvider] 🔄 App returned to foreground');
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

#### 3.2 Screen Focus Refresh (Settings/Subscription Pages)

```typescript
import { useFocusEffect } from 'expo-router';

// Inside component
const { refreshEntitlements } = useSubscription();
const lastFocusRefreshRef = useRef<number>(0);

useFocusEffect(
  useCallback(() => {
    const now = Date.now();
    if (now - lastFocusRefreshRef.current > 10000) {
      console.log('[Screen] 🔄 Screen focused - refreshing');
      lastFocusRefreshRef.current = now;
      refreshEntitlements();
    }
  }, [refreshEntitlements])
);
```

#### 3.3 RevenueCat Listener (lib/revenuecat.ts)

```typescript
import Purchases from 'react-native-purchases';

export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    // Cleanup if needed
  };
}

export async function hasActiveEntitlement(id = 'pro'): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[id]?.isActive === true;
}
```

---

## 4. Frontend Testing

### Running Frontend Dev Server

```bash
# Start frontend on port 3334
PORT=3334 npm run start

# Or with expo
EXPO_PUBLIC_API_URL=http://localhost:3333 npx expo start --port 3334
```

### Test Scenarios

#### Test Matrix

| ID | Source | Platform | Expected UI |
|----|--------|----------|-------------|
| SUB-001 | stripe | web | "Manage Billing" button → Stripe portal |
| SUB-002 | app_store | web | "App Store" badge, instructions only |
| SUB-003 | app_store | ios | "Manage" button → App Store |
| SUB-004 | play | web | "Google Play" badge, instructions only |
| SUB-005 | play | android | "Manage" button → Play Store |
| SUB-006 | manual | any | "Enterprise" badge, contact support |

#### Manual Test Checklist

**Purchase Flow:**
- [ ] Start as free trial user
- [ ] Navigate to Subscription Plans
- [ ] Complete purchase
- [ ] Return to app → Should auto-refresh and show "Pro"
- [ ] Navigate to Settings → Should show updated tier

**Background/Foreground:**
- [ ] Complete purchase
- [ ] Background app (home screen)
- [ ] Wait 10 seconds
- [ ] Return to app → Should trigger refresh

**Screen Navigation:**
- [ ] Navigate to Settings → Should refresh
- [ ] Navigate to Subscription Plans → Should refresh

### API Testing from Frontend

```typescript
// Test helper for development
async function testEntitlements() {
  const response = await apiFetch('/api/v1/me/entitlements', {
    requireAuth: true,
  });
  const data = await response.json();
  console.log('Entitlements:', data);
  console.log('Source:', data.source);
  console.log('Product ID:', data.product_id);
}

async function testBillingPortal() {
  const response = await apiFetch('/api/v1/billing/portal', {
    method: 'POST',
    requireAuth: true,
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
}
```

---

## 5. Environment Configuration

### Backend URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://ever-reach-be.vercel.app` |
| **Local Dev** | `http://localhost:3333` |

### Frontend `.env`

```bash
# Development (local backend)
EXPO_PUBLIC_API_URL=http://localhost:3333

# Staging
EXPO_PUBLIC_API_URL=https://staging-ever-reach-be.vercel.app

# Production
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app

# Frontend port
PORT=3334
```

### Test Credentials (Development Only)

```bash
TEST_EMAIL=isaiahdupree33@gmail.com
TEST_PASSWORD=Frogger12
```

---

## 6. Analytics Events

Track subscription management interactions:

```typescript
analytics.track('billing_management_clicked', {
  subscription_source: subscriptionSource,
  platform: Platform.OS,
  action: 'portal_opened' | 'instructions_shown' | 'app_store_opened',
});
```

---

## 7. Debugging

### Console Logs to Monitor

```
[SubscriptionProvider] 🔄 App returned to foreground - auto-refreshing
[SubscriptionProvider] ✅ Auto-refresh completed
[SubscriptionProvider] 🔔 CustomerInfo changed
[SubscriptionProvider] 🎉 New entitlement detected!
[Settings] 🔄 Screen focused - refreshing
[SubscriptionPlans] 🔄 Screen focused - refreshing
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Subscription not updating | AppState listener missing | Add AppState effect |
| Shows "revenuecat" source | Backend fix not deployed | Map in frontend |
| 500 on billing portal | Non-Stripe user hitting Stripe API | Check source first |
| Refresh not triggering | Throttle too aggressive | Reduce throttle time |

---

## Contact

For backend API issues or questions, contact the backend team.
