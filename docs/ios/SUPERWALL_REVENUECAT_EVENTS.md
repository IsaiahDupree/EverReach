# Superwall & RevenueCat Event Flow

**Date**: November 23, 2025

---

## 🎯 Events from Superwall (Paywall)

### 1. **`onPresent`** - Paywall Displayed
Fires when the paywall is shown to the user.

```typescript
onPresent: (info) => {
  console.log('[SuperwallPaywallNew] Paywall presented:', info);
  analytics.track('superwall_paywall_displayed', {
    placement: placementId,
    info,
  });
}
```

**Logged Event**: `superwall_paywall_displayed`

---

### 2. **`onDismiss`** - Paywall Closed
Fires when the paywall is dismissed. **This is the key event for purchase detection**.

```typescript
onDismiss: (info, result) => {
  console.log('[SuperwallPaywallNew] Paywall dismissed:', info, result);
  
  // result.type can be:
  // - 'purchased' → User completed purchase
  // - 'restored' → User restored purchases
  // - 'closed' → User closed without action
  // - 'declined' → User declined purchase
}
```

#### Result Types

| Result Type | Description | Action |
|-------------|-------------|--------|
| `'purchased'` | ✅ User completed purchase | Track success, call `onPurchaseComplete()` |
| `'restored'` | ✅ User restored purchases | Call `onPurchaseComplete()` |
| `'closed'` | ❌ User closed paywall | Call `onDismiss()` |
| `'declined'` | ❌ User declined purchase | Call `onDismiss()` |
| `undefined` | ⚠️ Unknown/error | Call `onDismiss()` |

**Current Code**:
```typescript
if (result?.type === 'purchased') {
  console.log('[SuperwallPaywallNew] Purchase completed!');
  analytics.track('superwall_purchase_success', {
    placement: placementId,
  });
  onPurchaseComplete?.();
} else if (result?.type === 'restored') {
  console.log('[SuperwallPaywallNew] Restore completed!');
  onPurchaseComplete?.();
} else {
  onDismiss?.();
}
```

**Logged Events**:
- `superwall_paywall_dismissed` (always)
- `superwall_purchase_success` (only if purchased)

---

### 3. **`onError`** - Paywall Error
Fires if there's a critical error in the Superwall system.

```typescript
onError: (err) => {
  console.error('🚨 [CRITICAL SUPERWALL ERROR] 🚨', err);
  Alert.alert('🚨 Superwall Error', ...);
  analytics.track('superwall_error', { error, placement });
}
```

**Logged Event**: `superwall_error`

---

## 💳 Events from RevenueCat (Purchase System)

### 1. **Customer Info Update Listener**
Fires whenever RevenueCat detects a change in subscription status (purchase, renewal, cancellation, etc).

```typescript
// In app/_layout.tsx
Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
  console.log('[App] RevenueCat customer info updated:', customerInfo);
  
  // Refresh entitlements from backend
  await queryClient.invalidateQueries({ queryKey: ['entitlements'] });
  console.log('[App] Entitlements refreshed after purchase');
});
```

**What Triggers This**:
- ✅ New purchase
- ✅ Subscription renewal
- ✅ Subscription cancellation
- ✅ Restore purchases
- ✅ App becoming active (periodic check)

**Customer Info Object**:
```typescript
{
  originalAppUserId: "user-id",
  allExpirationDates: { 
    "com.everreach.core.monthly": "2025-12-24T00:20:23Z" 
  },
  activeSubscriptions: ["com.everreach.core.monthly"],
  entitlements: {
    active: {
      "EverReach Core": {
        isActive: true,
        willRenew: true,
        productIdentifier: "com.everreach.core.monthly",
        expirationDate: "2025-12-24T00:20:23Z"
      }
    }
  },
  subscriptionsByProductIdentifier: {
    "com.everreach.core.monthly": {
      purchaseDate: "2025-11-24T00:20:23Z",
      expiresDate: "2025-12-24T00:20:23Z",
      isActive: true,
      willRenew: true
    }
  }
}
```

---

### 2. **Backend Entitlements Refresh**
After RevenueCat fires, the app queries the backend for updated entitlements.

```typescript
// GET /api/v1/me/entitlements
{
  "plan": "pro",  // ← Should change from "free"
  "tier": "paid", // ← Should change from "free"
  "subscription_status": "active", // ← Should change from "trial"
  "status": "active",
  "payment_platform": "apple",
  "valid_until": "2025-12-24T00:20:23Z",
  "features": {
    "compose_runs": 999999,
    "voice_minutes": 999999,
    "messages": 999999
  },
  "core_features": true
}
```

---

## 🐛 Current Issue: Purchase Not Registering

### What's Happening in Your Logs

1. ✅ **Paywall dismissed**: `superwall_paywall_dismissed` tracked
2. ⚠️ **NO purchase detected**: Missing `[SuperwallPaywallNew] Purchase completed!` log
3. ✅ **RevenueCat updates**: `[RC] Customer info updated` fires
4. ⚠️ **Entitlements NOT updated**: Still shows `"plan": "free"` and `"status": "trial"`

### Why This Happens

#### Reason 1: Superwall Result Type Not 'purchased'
The `onDismiss` result type is likely **not** `'purchased'`.

**Debug Fix**: Add detailed logging:

```typescript
onDismiss: (info, result) => {
  console.log('[SuperwallPaywallNew] Paywall dismissed:', info, result);
  console.log('[SuperwallPaywallNew] Result type:', result?.type); // ← ADD THIS
  console.log('[SuperwallPaywallNew] Full result:', JSON.stringify(result)); // ← ADD THIS
  
  // Reset the showing flag so paywall can be triggered again
  isShowingRef.current = false;
  
  analytics.track('superwall_paywall_dismissed', {
    placement: placementId,
    result: result?.type,
    resultDetails: result, // ← ADD THIS
  });

  if (result?.type === 'purchased') {
    console.log('[SuperwallPaywallNew] ✅ Purchase completed!');
    analytics.track('superwall_purchase_success', {
      placement: placementId,
    });
    onPurchaseComplete?.();
  } else if (result?.type === 'restored') {
    console.log('[SuperwallPaywallNew] ✅ Restore completed!');
    onPurchaseComplete?.();
  } else {
    console.log('[SuperwallPaywallNew] ❌ No purchase - result type:', result?.type);
    onDismiss?.();
  }
}
```

#### Reason 2: Simulator Purchase Not Completing
In iOS Simulator, StoreKit purchases may not complete properly without a StoreKit Configuration file.

**Solution**: Use a real device or ensure StoreKit config is set up.

#### Reason 3: Backend Not Syncing with RevenueCat
The backend might not be receiving RevenueCat webhook events.

**Check**:
1. RevenueCat webhooks configured in dashboard
2. Backend webhook endpoint `/api/webhooks/revenuecat` is working
3. RevenueCat webhook secret is correct

---

## 🔄 Complete Purchase Flow (How It Should Work)

### Happy Path

```
User clicks "Subscribe" in Superwall
    ↓
Apple/StoreKit processes payment
    ↓
RevenueCat receives purchase from Apple
    ↓
RevenueCat fires customerInfoUpdateListener
    → Log: "[RC] Customer info updated"
    ↓
App invalidates entitlements cache
    → Log: "[App] Entitlements refreshed after purchase"
    ↓
App fetches /api/v1/me/entitlements
    → Should return: { plan: "pro", status: "active" }
    ↓
Superwall onDismiss fires with result.type = 'purchased'
    → Log: "[SuperwallPaywallNew] Purchase completed!"
    ↓
onPurchaseComplete() callback fires
    → App updates UI, dismisses paywall
```

### What's Happening Now (Broken)

```
User clicks "Subscribe" in Superwall
    ↓
Apple/StoreKit processes payment (maybe?)
    ↓
RevenueCat receives purchase (maybe?)
    ↓
RevenueCat fires customerInfoUpdateListener ✅
    → Log: "[RC] Customer info updated" ✅
    ↓
App invalidates entitlements cache ✅
    → Log: "[App] Entitlements refreshed after purchase" ✅
    ↓
App fetches /api/v1/me/entitlements ✅
    → Returns: { plan: "free", status: "trial" } ❌ WRONG!
    ↓
Superwall onDismiss fires with result.type = ??? ⚠️
    → Missing log: "[SuperwallPaywallNew] Purchase completed!" ❌
    ↓
onDismiss() fires instead of onPurchaseComplete()
    → Paywall closes but no purchase detected
```

---

## 🛠️ How to Fix

### 1. Add Better Logging (Immediate)

Update `SuperwallPaywallNew.tsx` with the enhanced logging above.

### 2. Check Simulator vs Real Device

Test on a **real device** with a sandbox test account:
1. Sign out of App Store on device
2. Go to Settings → App Store → Sandbox Account
3. Add a sandbox test account from App Store Connect
4. Test purchase flow

### 3. Verify Backend Webhook

Check that RevenueCat webhooks are hitting your backend:

```bash
# Check webhook logs
tail -f backend/logs/webhooks.log

# Or check in RevenueCat dashboard:
# Settings → Integrations → Webhooks → Event History
```

### 4. Manual Entitlement Update (Testing)

For testing, you can manually update entitlements in the backend to simulate a purchase:

```sql
-- In Supabase SQL Editor
UPDATE user_entitlements
SET 
  plan = 'pro',
  tier = 'paid',
  subscription_status = 'active',
  status = 'active',
  payment_platform = 'apple',
  valid_until = NOW() + INTERVAL '30 days'
WHERE user_id = 'YOUR_USER_ID';
```

---

## 📊 Events Summary

### Superwall Events You Track

| Event | When | What to Check |
|-------|------|---------------|
| `superwall_paywall_displayed` | Paywall opens | Always fires |
| `superwall_paywall_dismissed` | Paywall closes | Check `result.type` |
| `superwall_purchase_success` | Purchase completes | Only if `result.type === 'purchased'` |
| `superwall_error` | Superwall fails | Critical errors |

### RevenueCat Events You Track

| Event | When | What to Check |
|-------|------|---------------|
| Customer Info Updated | Purchase/renewal/restore | Check `customerInfo.activeSubscriptions` |
| Entitlements Refreshed | After customer info update | Check backend response |

### Backend Events You Track

| Event | When | What to Check |
|-------|------|---------------|
| `screen_viewed` | User navigates | Navigation tracking |
| `screen_duration` | User leaves screen | Time tracking |
| `performance_measured` | Screen loads | Load times |

---

## ✅ Next Steps

1. **Add enhanced logging** to `onDismiss` to see what `result.type` actually is
2. **Test on real device** with sandbox account
3. **Check backend webhooks** are receiving RevenueCat events
4. **Verify StoreKit config** is set up in Xcode for simulator testing

The issue is likely that `result.type` is not `'purchased'` when you think it should be. The enhanced logging will tell us exactly what's happening.
