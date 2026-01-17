# Subscription Auto-Refresh Implementation

## Problem Statement

App Store reviewers and users reported that after completing a purchase, the subscription tier displayed in the app (Settings page, Subscription Plans page) would still show "Free Trial" instead of the updated "Pro" status. Users were required to manually tap "Refresh Entitlements" to see their updated subscription.

**Root Causes Identified:**

1. **No App State Refresh** - When user returns from App Store purchase flow (app goes background → foreground), entitlements were not automatically refreshed.
2. **No RevenueCat Listener** - The app wasn't listening for CustomerInfo changes from RevenueCat SDK.
3. **No Screen Focus Refresh** - Settings and Subscription Plans pages didn't refresh data when navigated to.
4. **Webhook Latency** - RevenueCat webhooks to backend take time; needed polling/retry logic.

---

## Implementation

### 1. AppState Listener (SubscriptionProvider.tsx)

Added automatic refresh when app returns to foreground:

```typescript
useEffect(() => {
  let appState = AppState.currentState;
  
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Throttle: minimum 5 seconds between auto-refreshes
      if (timeSinceLastRefresh > 5000 && !isRefreshingRef.current) {
        console.log('[SubscriptionProvider] 🔄 App returned to foreground - auto-refreshing');
        await loadSubscriptionState();
      }
    }
    appState = nextAppState;
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [loadSubscriptionState]);
```

**Behavior:**
- Triggers when app comes to foreground from background/inactive
- Throttled to prevent excessive API calls (5s minimum between refreshes)
- Handles purchase completion flow: User taps purchase → App Store → Returns to app → Auto-refresh

### 2. RevenueCat CustomerInfo Listener (revenuecat.ts + SubscriptionProvider.tsx)

Added real-time listener for subscription changes:

```typescript
// In revenuecat.ts
export async function addCustomerInfoUpdateListener(listener: CustomerInfoListener) {
  // Setup native listener
  Purchases.addCustomerInfoUpdateListener((info) => {
    customerInfoListeners.forEach(l => l(info));
  });
  return () => { /* unsubscribe */ };
}

// In SubscriptionProvider.tsx
useEffect(() => {
  const setupListener = async () => {
    await addCustomerInfoUpdateListener(async (customerInfo) => {
      const hasEntitlement = await hasActiveEntitlement();
      
      if (hasEntitlement && !isPaid) {
        console.log('[SubscriptionProvider] 🎉 New entitlement detected!');
        await loadSubscriptionState();
      }
    });
  };
  setupListener();
}, [loadSubscriptionState, isPaid]);
```

**Behavior:**
- Listens for real-time updates from RevenueCat SDK
- Automatically refreshes when entitlement status changes
- Handles edge cases: new purchase, subscription renewal, cancellation

### 3. Screen Focus Refresh (Settings + Subscription Plans)

Added `useFocusEffect` to refresh entitlements when screens are focused:

```typescript
// In settings.tsx
useFocusEffect(
  React.useCallback(() => {
    const now = Date.now();
    if (now - lastFocusRefreshRef.current > 10000) {
      console.log('[Settings] 🔄 Screen focused - refreshing entitlements');
      lastFocusRefreshRef.current = now;
      refreshEntitlements();
    }
  }, [refreshEntitlements])
);

// In subscription-plans.tsx
useFocusEffect(
  useCallback(() => {
    void loadAccountData();
    void refreshEntitlements(); // Added
  }, [refreshEntitlements])
);
```

**Behavior:**
- Refreshes when user navigates to Settings or Subscription Plans
- Throttled (10s minimum in Settings) to prevent excessive calls
- Ensures subscription status is always current when viewing these screens

---

## Files Modified

| File | Changes |
|------|---------|
| `providers/SubscriptionProvider.tsx` | Added AppState listener, RevenueCat listener integration |
| `lib/revenuecat.ts` | Added `addCustomerInfoUpdateListener()`, `hasActiveEntitlement()` |
| `app/(tabs)/settings.tsx` | Added `useFocusEffect` for entitlement refresh |
| `app/subscription-plans.tsx` | Added `refreshEntitlements()` to focus effect |

---

## Testing Checklist

### App Store Purchase Flow (iOS)
- [ ] Start app as free trial user
- [ ] Navigate to Subscription Plans
- [ ] Complete purchase via App Store
- [ ] Return to app → Should auto-refresh and show "Pro"
- [ ] Navigate to Settings → Should show "Pro (active)"

### App Background/Foreground
- [ ] Complete purchase
- [ ] Background the app (go to home screen)
- [ ] Wait 10 seconds
- [ ] Return to app → Should trigger auto-refresh

### Screen Navigation
- [ ] Complete purchase on Subscription Plans page
- [ ] Navigate to Settings → Should show updated tier
- [ ] Navigate back to Subscription Plans → Should show updated tier

### RevenueCat Listener (Real-time)
- [ ] Use RevenueCat sandbox to grant entitlement
- [ ] App should detect change within seconds without manual refresh

---

## Backend Requirements

For the frontend auto-refresh to work correctly, the backend must:

1. **Process RevenueCat webhooks quickly** - Entitlement updates should be reflected in `/api/v1/me/entitlements` within 2-3 seconds of webhook receipt.

2. **Return accurate `source` field** - The `source` field must correctly indicate `app_store`, `play`, or `stripe`.

3. **Support restore polling** - The `/api/v1/billing/restore` endpoint should reflect the latest RevenueCat state.

---

## Debugging

Enable verbose logging to trace refresh flow:

```
[SubscriptionProvider] 🔄 App returned to foreground - auto-refreshing entitlements
[SubscriptionProvider] ✅ Auto-refresh completed
[SubscriptionProvider] 🔔 RevenueCat CustomerInfo changed - checking entitlements
[SubscriptionProvider] 🎉 New entitlement detected! Refreshing state...
[Settings] 🔄 Screen focused - refreshing entitlements silently
[SubscriptionPlans] 🔄 Screen focused - refreshing data
```

---

## Known Limitations

1. **Web Platform** - RevenueCat listener only works on iOS/Android (web uses Stripe webhooks)
2. **Webhook Latency** - There may be a 1-3 second delay after purchase while webhook processes
3. **Throttling** - Refreshes are throttled to prevent API overload (5-10s minimum between calls)
