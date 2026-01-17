# Frontend Subscription Flow Fixes - Technical Documentation

**Date:** December 31, 2024  
**Version:** 1.0.0  
**Author:** Development Team  

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Architecture Changes](#architecture-changes)
4. [File-by-File Changes](#file-by-file-changes)
5. [Code Snippets & Explanations](#code-snippets--explanations)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Testing Checklist](#testing-checklist)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

This document provides extensive technical documentation for the frontend changes made to fix the iOS subscription flow in the EverReach Expo React Native app. The primary goal was to ensure the UI updates immediately after a subscription plan change (e.g., monthly to annual) without requiring manual intervention.

### Key Fixes Implemented

| Fix | Description | Impact |
|-----|-------------|--------|
| Closure Bug Fix | `loadAccountData` was not accessible in `onDismiss` callback | UI now refreshes after paywall closes |
| Polling Mechanism | Backend webhooks have 1-5s latency | Ensures sync before UI update |
| State Watcher | Detects `isPaid`, `tier`, `billing_period` changes | Auto-triggers page refresh |
| AppState Listener | Refreshes when app returns to foreground | Catches external subscription changes |
| Screen Focus Refresh | Refreshes on tab/screen navigation | Keeps data fresh across screens |

---

## Problem Statement

### Original Issue

When users changed their subscription plan (e.g., from monthly to annual):
1. The Superwall paywall would close
2. The subscription page would NOT update to reflect the new plan
3. Users had to manually navigate away and back, or restart the app

### Root Causes Identified

1. **Closure Issue in React Hooks**
   - The `onDismiss` callback in `usePlacement` was defined before `loadAccountData` function
   - JavaScript closures captured stale references, making `loadAccountData` undefined

2. **Unreliable Result Type Detection**
   - Superwall's `result.type` was not consistently returning `'purchased'`
   - Conditional refresh logic based on `result.type` was skipping valid purchases

3. **Backend Webhook Latency**
   - RevenueCat webhooks take 1-5 seconds to reach backend
   - Immediate API calls returned stale subscription data

4. **No Reactive State Updates**
   - Component didn't re-render when `isPaid`/`tier` changed in provider
   - Missing dependency on subscription state changes

---

## Architecture Changes

### Before (Broken Flow)

```
User Purchase → Paywall Closes → onDismiss checks result.type
                                         ↓
                              if (result.type === 'purchased')
                                         ↓
                              loadAccountData() ← UNDEFINED (closure bug)
                                         ↓
                              UI does NOT update ❌
```

### After (Fixed Flow)

```
User Purchase → Paywall Closes → onDismiss ALWAYS triggers refresh
                                         ↓
                              Poll backend (5 retries × 1.5s)
                                         ↓
                              SubscriptionRepo.restorePurchases()
                              refreshEntitlements()
                              apiFetch('/api/v1/me/entitlements')
                                         ↓
                              loadAccountDataRef.current() ← REF PATTERN
                                         ↓
                              UI updates ✅
                              
                              ALSO: useEffect watches isPaid/tier/billing_period
                                         ↓
                              Auto-triggers loadAccountData() on state change ✅
```

---

## File-by-File Changes

### 1. `app/subscription-plans.tsx`

**Purpose:** Main subscription management screen  
**Lines Modified:** 155-156, 161-221, 432-433, 532-556

#### Change 1: Added `loadAccountDataRef` (Line 155-156)

```typescript
// Ref to hold loadAccountData function (fixes closure issue in onDismiss)
const loadAccountDataRef = React.useRef<(() => Promise<void>) | null>(null);
```

**Why:** React hooks like `usePlacement` capture variable references at definition time. Since `loadAccountData` is defined later in the component, the `onDismiss` callback had `undefined` for `loadAccountData`. Using a `useRef` allows us to store and access the function after it's defined.

---

#### Change 2: Rewrote `onDismiss` Callback (Lines 161-221)

**Before (Broken):**
```typescript
onDismiss: async (info, result) => {
  if (result?.type === 'purchased' || result?.type === 'restored') {
    await refreshEntitlements();
    await loadAccountData(); // ← UNDEFINED due to closure
  }
}
```

**After (Fixed):**
```typescript
onDismiss: async (info, result) => {
  console.log('[SubscriptionPlans] Paywall dismissed:', result);
  console.log('[SubscriptionPlans] Close reason:', info?.closeReason);
  console.log('[SubscriptionPlans] Result type:', result?.type);
  
  // ALWAYS refresh after paywall closes - don't rely on result type detection
  // Backend webhooks may take 1-5 seconds to process, so we poll
  console.log('[SubscriptionPlans] 🔄 Refreshing subscription data after paywall close...');
  
  try {
    // First, sync with RevenueCat/backend via restore
    const { SubscriptionRepo } = await import('@/repos/SubscriptionRepo');
    
    // Poll for updated subscription (webhook latency can be 1-5 seconds)
    const MAX_RETRIES = 5;
    const DELAY_MS = 1500;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`[SubscriptionPlans] Polling for updated subscription (${i + 1}/${MAX_RETRIES})...`);
      
      // Force backend to check RevenueCat for latest subscription
      await SubscriptionRepo.restorePurchases();
      
      // Refresh provider state
      await refreshEntitlements();
      
      // Fetch fresh entitlements for this page
      const entRes = await apiFetch('/api/v1/me/entitlements', { requireAuth: true });
      if (entRes.ok) {
        const freshData = await entRes.json();
        console.log('[SubscriptionPlans] Fresh entitlements:', freshData);
        setEntitlements(freshData);
        
        // If subscription is active, we're done
        if (freshData.subscription_status === 'active') {
          console.log('[SubscriptionPlans] ✅ Subscription confirmed active');
          break;
        }
      }
      
      // Wait before next poll
      if (i < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }
    
    // Final refresh of all page data using ref (fixes closure issue)
    if (loadAccountDataRef.current) {
      await loadAccountDataRef.current();
    }
    console.log('[SubscriptionPlans] ✅ Page data refreshed');
  } catch (err) {
    console.error('[SubscriptionPlans] ❌ Error refreshing after paywall:', err);
    // Still try to load account data even on error
    if (loadAccountDataRef.current) {
      await loadAccountDataRef.current();
    }
  }
}
```

**Key Improvements:**
1. **Always triggers refresh** - Doesn't rely on `result.type`
2. **Polling mechanism** - 5 retries with 1.5s delay (total ~7.5s window)
3. **Multiple sync strategies** - `restorePurchases()` + `refreshEntitlements()` + direct API call
4. **Uses ref pattern** - `loadAccountDataRef.current` instead of `loadAccountData`
5. **Comprehensive logging** - Easy to debug in development

---

#### Change 3: Set Ref After Function Definition (Lines 432-433)

```typescript
// After loadAccountData function is defined:
loadAccountDataRef.current = loadAccountData;
```

**Why:** The ref must be set AFTER `loadAccountData` is defined so that `onDismiss` can access the actual function.

---

#### Change 4: Added Subscription State Watcher (Lines 532-556)

```typescript
// Auto-refresh page data when subscription state changes
const prevIsPaidRef = React.useRef(isPaid);
const prevTierRef = React.useRef(tier);
const prevBillingPeriodRef = React.useRef(entitlements?.billing_period);

useEffect(() => {
  const currentBillingPeriod = entitlements?.billing_period;
  const billingPeriodChanged = prevBillingPeriodRef.current !== currentBillingPeriod 
    && currentBillingPeriod !== undefined;
  
  // Detect subscription state changes OR billing period changes (monthly <-> annual)
  if (prevIsPaidRef.current !== isPaid || prevTierRef.current !== tier || billingPeriodChanged) {
    console.log('[SubscriptionPlans] 🔄 Subscription state changed - refreshing page data');
    console.log('[SubscriptionPlans] isPaid:', prevIsPaidRef.current, '->', isPaid);
    console.log('[SubscriptionPlans] tier:', prevTierRef.current, '->', tier);
    console.log('[SubscriptionPlans] billing_period:', prevBillingPeriodRef.current, '->', currentBillingPeriod);
    
    // Update refs
    prevIsPaidRef.current = isPaid;
    prevTierRef.current = tier;
    prevBillingPeriodRef.current = currentBillingPeriod;
    
    // Refresh page data to reflect new subscription
    loadAccountData();
  }
}, [isPaid, tier, entitlements?.billing_period]);
```

**Why:** This `useEffect` creates a reactive link between the `SubscriptionProvider` state and this page. When the provider detects a subscription change (via AppState refresh, restore, etc.), this component automatically re-fetches its data.

---

### 2. `providers/SubscriptionProvider.tsx`

**Purpose:** Global subscription state management  
**Lines Modified:** 323-358

#### Added AppState Listener for Foreground Refresh

```typescript
// Auto-refresh entitlements when app returns to foreground (e.g., after purchase in App Store)
const lastRefreshRef = useRef<number>(0);
const isRefreshingRef = useRef<boolean>(false);

useEffect(() => {
  if (Platform.OS === 'web') return;

  let appStateValue = AppState.currentState;
  
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Detect app returning to foreground
    if (appStateValue.match(/inactive|background/) && nextAppState === 'active') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Throttle: minimum 5 seconds between auto-refreshes
      if (timeSinceLastRefresh > 5000 && !isRefreshingRef.current) {
        console.log('[SubscriptionProvider] 🔄 App returned to foreground - refreshing entitlements');
        isRefreshingRef.current = true;
        lastRefreshRef.current = now;
        
        try {
          await loadSubscriptionState();
          console.log('[SubscriptionProvider] ✅ Auto-refresh completed');
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }
    appStateValue = nextAppState;
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [loadSubscriptionState]);
```

**Why:** When a user:
1. Opens App Store to manage subscription
2. Gets redirected to Settings app
3. Completes purchase flow outside the app

The app needs to refresh when returning to foreground to catch these external changes.

**Throttle:** 5-second minimum between refreshes prevents excessive API calls during rapid app switching.

---

### 3. `app/(tabs)/settings.tsx`

**Purpose:** Settings tab with subscription status  
**Lines Modified:** Added useFocusEffect block

#### Added Screen Focus Refresh

```typescript
import { router, useFocusEffect } from 'expo-router';

// Inside component:
const lastFocusRefreshRef = React.useRef<number>(0);

useFocusEffect(
  React.useCallback(() => {
    const now = Date.now();
    // Throttle: minimum 10 seconds between screen focus refreshes
    if (now - lastFocusRefreshRef.current > 10000) {
      console.log('[Settings] 🔄 Screen focused - refreshing entitlements');
      lastFocusRefreshRef.current = now;
      refreshEntitlements();
    }
  }, [refreshEntitlements])
);
```

**Why:** When navigating between tabs, subscription data should be fresh. The 10-second throttle prevents excessive refreshes while ensuring data stays current.

---

### 4. `.env`

**Purpose:** Environment configuration  
**Lines Modified:** 66-69

#### Backend URLs Switched to Production

```env
# Production URLs
EXPO_PUBLIC_API_BASE_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_BACKEND_URL=https://ever-reach-be.vercel.app
NEXT_PUBLIC_API_URL=https://ever-reach-be.vercel.app
```

**Previously (for local testing):**
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3333
EXPO_PUBLIC_API_URL=http://localhost:3333
EXPO_PUBLIC_BACKEND_URL=http://localhost:3333
NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## Code Snippets & Explanations

### The Closure Problem Explained

```typescript
// BROKEN: Closure captures undefined
const { registerPlacement } = usePlacement({
  onDismiss: async () => {
    await loadAccountData(); // ← Captured at hook definition time = undefined
  }
});

// loadAccountData is defined AFTER usePlacement
const loadAccountData = async () => { ... };
```

```typescript
// FIXED: Ref pattern
const loadAccountDataRef = React.useRef<(() => Promise<void>) | null>(null);

const { registerPlacement } = usePlacement({
  onDismiss: async () => {
    await loadAccountDataRef.current?.(); // ← Accesses current value at runtime
  }
});

const loadAccountData = async () => { ... };
loadAccountDataRef.current = loadAccountData; // ← Set after definition
```

### Polling Pattern for Eventual Consistency

```typescript
const MAX_RETRIES = 5;
const DELAY_MS = 1500;

for (let i = 0; i < MAX_RETRIES; i++) {
  // Try to sync
  await SubscriptionRepo.restorePurchases();
  
  // Check result
  const result = await apiFetch('/api/v1/me/entitlements');
  if (result.subscription_status === 'active') {
    break; // Success - exit loop
  }
  
  // Wait before retry (except on last iteration)
  if (i < MAX_RETRIES - 1) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}
```

**Timing:** 5 retries × 1.5s = 7.5 seconds max wait time

---

## Data Flow Diagrams

### Subscription Change Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ In-App        │     │ App Store       │     │ Manage in       │
│ Paywall       │     │ External        │     │ Settings App    │
└───────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ onDismiss     │     │ AppState        │     │ AppState        │
│ callback      │     │ 'active'        │     │ 'active'        │
└───────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                ┌───────────────────────────────┐
                │     REFRESH TRIGGERED          │
                │                               │
                │ 1. restorePurchases()         │
                │ 2. refreshEntitlements()      │
                │ 3. loadAccountData()          │
                └───────────────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │        UI UPDATES             │
                │                               │
                │ - Subscription status         │
                │ - Current plan display        │
                │ - Billing period              │
                │ - Feature access              │
                └───────────────────────────────┘
```

### Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SubscriptionProvider                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ State: isPaid, tier, entitlements, refreshEntitlements()    │   │
│  │ AppState Listener (5s throttle)                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ Context
                                ▼
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌───────────────────────┐                 ┌───────────────────────┐
│ subscription-plans.tsx │                 │ settings.tsx          │
│                       │                 │                       │
│ - usePlacement hook   │                 │ - useFocusEffect      │
│ - loadAccountDataRef  │                 │   (10s throttle)      │
│ - State watcher       │                 │                       │
│   useEffect           │                 │                       │
│ - useFocusEffect      │                 │                       │
│   (10s throttle)      │                 │                       │
└───────────────────────┘                 └───────────────────────┘
```

---

## Testing Checklist

### Manual Testing Steps

- [ ] **Fresh Install Flow**
  1. Install app on clean device/simulator
  2. Sign up as new user
  3. Navigate to subscription page
  4. Purchase monthly subscription
  5. Verify UI shows "Pro Monthly" immediately

- [ ] **Plan Upgrade (Monthly → Annual)**
  1. As existing monthly subscriber
  2. Tap "Upgrade to Annual"
  3. Complete purchase in paywall
  4. Verify UI shows "Pro Annual" within 8 seconds

- [ ] **Plan Downgrade (Annual → Monthly)**
  1. As existing annual subscriber
  2. Tap "Switch to Monthly"
  3. Complete flow
  4. Verify UI reflects change

- [ ] **Background/Foreground Transition**
  1. Open app, note subscription status
  2. Press Home, open Settings → Apple ID → Subscriptions
  3. Modify subscription externally
  4. Return to app
  5. Verify status updates within 5 seconds

- [ ] **Tab Navigation Refresh**
  1. View subscription page
  2. Navigate to Contacts tab
  3. Wait 15 seconds
  4. Return to Settings tab
  5. Verify data refreshes (check console logs)

- [ ] **Network Error Resilience**
  1. Enable airplane mode
  2. Try to purchase
  3. Verify graceful error handling
  4. Disable airplane mode
  5. Retry purchase
  6. Verify success

### Console Log Verification

Look for these log messages:

```
[SubscriptionPlans] Paywall dismissed: {...}
[SubscriptionPlans] 🔄 Refreshing subscription data after paywall close...
[SubscriptionPlans] Polling for updated subscription (1/5)...
[SubscriptionPlans] Fresh entitlements: {...}
[SubscriptionPlans] ✅ Subscription confirmed active
[SubscriptionPlans] ✅ Page data refreshed

[SubscriptionProvider] 🔄 App returned to foreground - refreshing entitlements
[SubscriptionProvider] ✅ Auto-refresh completed

[Settings] 🔄 Screen focused - refreshing entitlements
```

---

## Troubleshooting Guide

### Issue: UI Not Updating After Purchase

**Symptoms:** Paywall closes but subscription status unchanged

**Debug Steps:**
1. Check console for `[SubscriptionPlans] Paywall dismissed`
2. Verify polling logs appear
3. Check network tab for `/api/v1/me/entitlements` calls
4. Verify backend `/api/v1/billing/restore` is called

**Common Causes:**
- Backend not receiving RevenueCat webhook
- `loadAccountDataRef.current` is null (check ref assignment)
- Network timeout during polling

---

### Issue: Excessive API Calls

**Symptoms:** High API usage, slow performance

**Debug Steps:**
1. Check throttle refs are working
2. Verify `lastRefreshRef` and `lastFocusRefreshRef` values
3. Look for multiple event listeners

**Fix:** Ensure throttle values are appropriate:
- AppState: 5000ms
- Screen Focus: 10000ms
- Polling: 1500ms × 5 retries

---

### Issue: Stale Closure Warning

**Symptoms:** ESLint warns about stale closure in `onDismiss`

**Fix:** This is expected behavior. The ref pattern intentionally bypasses the closure. Add ESLint disable comment if needed:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

---

## Subscription Page Structure

### File: `app/subscription-plans.tsx`

This is the main subscription management screen. Below is a comprehensive breakdown of its structure.

---

### Component Overview (1801 lines total)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SubscriptionPlansScreen                          │
│                                                                     │
│  Lines 1-28:     Imports                                           │
│  Lines 30-137:   TypeScript Interfaces & Plan Definitions          │
│  Lines 139-303:  Hooks & State Setup                               │
│  Lines 305-430:  Data Loading Functions                            │
│  Lines 432-581:  Effects & Lifecycle                               │
│  Lines 583-820:  Event Handlers                                    │
│  Lines 822-1257: JSX Render                                        │
│  Lines 1260-end: StyleSheet                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Imports (Lines 1-28)

```typescript
// React & React Native
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, 
         SafeAreaView, Alert, ActivityIndicator, Platform, Linking } from 'react-native';

// Navigation
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

// Icons
import { Check, ArrowLeft, RefreshCw, Crown, Zap } from 'lucide-react-native';

// App-specific
import { useSubscription } from '@/providers/SubscriptionProvider';
import { apiFetch } from '@/lib/api';
import { usePlacement, useUser } from 'expo-superwall';
import { FLAGS } from '@/constants/flags';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PaywallRouter } from '@/components/paywall/PaywallRouter';
import { SubscriptionRepo, Entitlements } from '@/repos/SubscriptionRepo';
import { CancelSubscriptionButton } from '@/components/CancelSubscriptionButton';
import { SubscriptionCancellationBanner } from '@/components/SubscriptionCancellationBanner';
```

---

### TypeScript Interfaces (Lines 30-70)

```typescript
interface PlanFeature {
  name: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;           // 'core' | 'pro' | 'enterprise'
  name: string;         // Display name
  price: string;        // e.g., '$15/month'
  description: string;
  features: PlanFeature[];
  isPopular?: boolean;
  isAvailable: boolean; // Controls if plan can be purchased
}

interface UsageSummaryResponse {
  usage: { 
    compose_runs_used: number; 
    voice_minutes_used: number; 
    screenshot_count: number;
    messages_sent: number;
  };
  limits: { 
    compose_runs: number; 
    voice_minutes: number;
    screenshots: number;
    messages: number;
  };
}

interface AccountInfoResponse {
  user: { id: string; email: string | null; display_name: string | null };
  org: any;
  billing: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    subscription_status: string | null;
    current_period_end: string | null;
  } | null;
}
```

---

### Plan Definitions (Lines 72-137)

```typescript
const plans: SubscriptionPlan[] = [
  {
    id: 'core',
    name: 'EverReach Core',
    price: '$15/month',
    isPopular: true,
    isAvailable: true,
    features: [
      { name: 'Voice notes', included: true },
      { name: 'Screenshot-to-reply', included: true },
      { name: 'Goal-based responses', included: true },
      { name: 'Warmth score', included: true },
      // ... more features
    ],
  },
  {
    id: 'pro',
    name: 'EverReach Pro',
    price: '$35/month',
    isAvailable: false,  // Not yet available
    features: [/* ... */],
  },
  {
    id: 'enterprise',
    name: 'EverReach Enterprise',
    price: 'Custom pricing',
    isAvailable: false,
    features: [/* ... */],
  },
];
```

---

### Hooks & State (Lines 139-303)

#### Context Hooks
```typescript
// From SubscriptionProvider - global subscription state
const { 
  upgradeToPaid,           // Function to upgrade user
  tier,                    // 'free_trial' | 'paid' | 'expired'
  trialStartDate,
  subscriptionStartDate,
  trialDaysRemaining,
  isPaid,                  // Boolean - is user paying?
  isTrialExpired,
  paymentPlatform,         // 'apple' | 'google' | 'stripe'
  trialGroup,
  trialEndsAt,
  trialGateStrategy,
  trialUsageSeconds,
  trialUsageSecondsLimit,
  refreshEntitlements      // Function to refresh from backend
} = useSubscription();

// URL parameters (for Stripe redirect)
const params = useLocalSearchParams<{ success?: string; canceled?: string }>();

// Analytics
const screenAnalytics = useAnalytics('SubscriptionPlans', {...});

// Superwall hooks
const { setSubscriptionStatus: setSuperwallStatus } = useUser();
const { registerPlacement, state: paywallState } = usePlacement({...});
```

#### Local State
```typescript
const [loading, setLoading] = useState<boolean>(false);
const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
const [accountInfo, setAccountInfo] = useState<AccountInfoResponse | null>(null);
const [loadError, setLoadError] = useState<string | null>(null);
const [isRetrying, setIsRetrying] = useState(false);
const [rcOfferings, setRcOfferings] = useState<any>(null);
const [isRestoring, setIsRestoring] = useState(false);
```

#### Refs (for closure fixes & throttling)
```typescript
const loadAccountDataRef = React.useRef<(() => Promise<void>) | null>(null);
const lastFocusRefreshRef = React.useRef<number>(0);
const prevIsPaidRef = React.useRef(isPaid);
const prevTierRef = React.useRef(tier);
const prevBillingPeriodRef = React.useRef(entitlements?.billing_period);
```

---

### Key Functions (Lines 305-820)

| Function | Lines | Purpose |
|----------|-------|---------|
| `showPaywall()` | 229-282 | Triggers Superwall paywall display |
| `handleShowPaywall()` | 285-288 | Wrapper for TouchableOpacity (no forceShow) |
| `handleSwitchToAnnual()` | 291-294 | Forces paywall for plan switching |
| `resolveRcPackageIdentifier()` | 305-324 | Maps plan ID to RevenueCat package |
| `loadAccountData()` | 376-430 | Fetches entitlements, usage, account info |
| `handleManageBilling()` | 435-515 | Opens App Store/Play Store/Stripe portal |
| `handleSelectPlan()` | 605-770 | Main purchase flow handler |
| `handleRestorePurchases()` | 772-820 | RevenueCat restore flow |

---

### Effects & Lifecycle (Lines 517-581)

```typescript
// 1. Initial data load
useEffect(() => {
  void loadAccountData();
}, []);

// 2. Screen focus refresh (with 10s throttle)
useFocusEffect(
  useCallback(() => {
    void loadAccountData();
    if (now - lastFocusRefreshRef.current > 10000) {
      refreshEntitlements();
    }
  }, [refreshEntitlements])
);

// 3. Subscription state change watcher
useEffect(() => {
  if (prevIsPaidRef.current !== isPaid || 
      prevTierRef.current !== tier || 
      billingPeriodChanged) {
    loadAccountData();
  }
}, [isPaid, tier, entitlements?.billing_period]);

// 4. RevenueCat offerings fetch (mobile only)
useEffect(() => {
  if (Platform.OS !== 'web') {
    import('@/lib/revenuecat').then(({ fetchOfferings }) => {...});
  }
}, []);

// 5. Stripe success redirect handler (web only)
useEffect(() => {
  if (Platform.OS === 'web' && params?.success === 'true') {
    refreshEntitlements();
    loadAccountData();
  }
}, [params?.success]);
```

---

### JSX Structure (Lines 822-1257)

```
<SafeAreaView>
  │
  ├── <Stack.Screen>                    // Navigation header
  │     └── headerLeft: Back button
  │
  └── <ScrollView>
        │
        ├── <SubscriptionCancellationBanner>   // Warning if cancelling
        │
        ├── <View testID="current-subscription-card">
        │     │
        │     ├── Status Header
        │     │     ├── "Current Subscription" title
        │     │     └── Badge (Active/Trial/Inactive)
        │     │
        │     ├── Status Details
        │     │     ├── Status row (Paid/Trial/Expired)
        │     │     ├── Plan row (Core/Pro + Monthly/Annual)
        │     │     ├── Trial info (if applicable)
        │     │     │     ├── Days remaining
        │     │     │     ├── Expiry date
        │     │     │     └── Warning boxes
        │     │     ├── Account email
        │     │     ├── Payment method
        │     │     └── Subscription date
        │     │
        │     ├── Usage Section (if data available)
        │     │     └── Grid: Voice Minutes | Screenshots | Messages
        │     │
        │     ├── Debug Section (dev only, if SHOW_DEBUG_INFO)
        │     │     └── isPaid, isTrialExpired, tier, etc.
        │     │
        │     └── Error Section (if loadError)
        │           └── Retry button
        │
        ├── <View> Available Plans Section
        │     │
        │     ├── Title: "Upgrade or Switch Plans" / "Available Plans"
        │     │
        │     └── <View planCardsContainer>
        │           │
        │           ├── Monthly Plan Card (TouchableOpacity)
        │           │     ├── Crown icon + "Most Popular" badge
        │           │     ├── "EverReach Core" title
        │           │     ├── "$14.99/month" price
        │           │     ├── Description
        │           │     └── CTA: "Current Plan" / "Switch to Monthly" / "View Plans"
        │           │
        │           └── Annual Plan Card (TouchableOpacity)
        │                 ├── Zap icon + "Save 15%" badge
        │                 ├── "Annual Plan" title
        │                 ├── "$152.99/year" price
        │                 ├── Description
        │                 └── CTA: "Current Plan" / "Switch to Annual" / "View Plans"
        │
        └── <View footer>
              ├── "7-day free trial" text (if not paid)
              ├── "Manage Billing" button
              └── Legal Links
                    ├── Subscription disclosure (App Store requirement)
                    ├── Terms of Use link
                    └── Privacy Policy link
```

---

### Plan Card Logic (Lines 1129-1206)

The plan cards use dynamic styling based on current subscription:

```typescript
// For each plan card:
const isCurrentPlan = isPaid && entitlements?.billing_period === 'monthly'; // or 'annual'
const isUnselected = isPaid && entitlements?.billing_period === 'annual';   // or 'monthly'

// Colors:
// - Current plan: Purple (#7C3AED)
// - Available/Unselected: Green (#059669)

// CTA Text Logic:
// - If current plan: "Current Plan" (disabled)
// - If paid but different plan: "Switch to Monthly/Annual"
// - If not paid: "View Plans"

// onPress Handler:
// - Monthly card: always calls handleShowPaywall()
// - Annual card: calls handleSwitchToAnnual() if switching, else handleShowPaywall()
```

---

### Billing Management Logic (Lines 435-515)

```typescript
const handleManageBilling = async () => {
  // Platform-specific handling:
  
  if (paymentPlatform === 'apple' || Platform.OS === 'ios') {
    // Opens: https://apps.apple.com/account/subscriptions
    // Fallback: Settings app or Alert with instructions
  }
  
  else if (paymentPlatform === 'google') {
    // Shows Alert with Play Store instructions
    // Opens: https://play.google.com/store/account/subscriptions
  }
  
  else {
    // Stripe - creates portal session via API
    // Redirects to Stripe Customer Portal URL
  }
};
```

---

### StyleSheet (Lines 1260-end)

Key style groups:

| Style Group | Purpose |
|-------------|---------|
| `container`, `scrollView` | Layout containers |
| `statusCard`, `statusHeader`, `statusDetails` | Current subscription card |
| `statusRow`, `statusLabel`, `statusValue` | Status info rows |
| `trialBadge`, `activeBadge` | Status badges |
| `warningBox`, `expiredBox` | Trial warning/expired alerts |
| `usageSection`, `usageGrid`, `usageItem` | Usage statistics |
| `debugSection`, `debugRow` | Dev-only debug info |
| `planCard`, `planCardButton` | Plan selection cards |
| `planCardHeader`, `planCardTitle`, `planCardPrice` | Plan card content |
| `planCardCTA`, `planCardCTAText` | Call-to-action buttons |
| `footer`, `legalLinks` | Footer with legal text |
| `restoreButton`, `refreshButton` | Action buttons |

---

## Related Files

| File | Purpose |
|------|---------|
| `@/repos/SubscriptionRepo.ts` | API calls to backend |
| `@/lib/revenuecat.ts` | RevenueCat SDK wrapper |
| `@/utils/api.ts` | `apiFetch` helper |
| `backend-vercel/app/api/v1/billing/restore/route.ts` | Backend restore endpoint |
| `backend-vercel/app/api/v1/me/entitlements/route.ts` | Entitlements endpoint |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-31 | Initial implementation | Dev Team |

---

*End of Documentation*
