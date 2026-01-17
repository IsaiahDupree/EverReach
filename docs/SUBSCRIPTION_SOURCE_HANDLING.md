# Subscription Source Handling

## Overview

EverReach supports subscriptions from three payment platforms:
- **Apple App Store** (iOS in-app purchases via RevenueCat)
- **Google Play Store** (Android in-app purchases via RevenueCat)
- **Stripe** (Web payments)

The frontend must correctly identify the subscription source and display appropriate billing management options.

---

## Backend API Contract

### Entitlements Endpoint
`GET /api/v1/me/entitlements` 

**Response:**
```json
{
  "plan": "pro",
  "valid_until": "2026-01-17T03:32:58+00:00",
  "source": "app_store" | "play" | "stripe" | "revenuecat" | "manual",
  "features": { ... },
  "tier": "core",
  "subscription_status": "active" | "trial" | "canceled" | "expired",
  "trial_ends_at": null,
  "product_id": "com.everreach.core.monthly",
  "billing_period": "monthly" | "yearly"
}
```

### Source Field Values
| Value | Description | Billing Management |
|-------|-------------|-------------------|
| `app_store` | Apple App Store subscription | Open iOS Settings or App Store |
| `play` | Google Play Store subscription | Open Google Play subscription settings |
| `stripe` | Web/Stripe subscription | Open Stripe Customer Portal |
| `revenuecat` | Legacy - maps to app_store or play | Determine from platform context |
| `manual` | Admin-granted subscription | No self-service management |

---

## Frontend Implementation

### Current Issue (Fixed)
The "Manage Billing" button was attempting to open Stripe portal for ALL web users, regardless of their actual subscription source. This caused a 500 error when the user had an App Store subscription.

### Fix: Conditional Billing Management

```tsx
// Determine subscription source from entitlements
const subscriptionSource = useMemo(() => {
  const src = (entitlements as any)?.source as string | undefined;
  
  // Map revenuecat to more specific source based on product_id
  if (src === 'revenuecat') {
    const productId = (entitlements as any)?.product_id || '';
    if (productId.includes('ios') || productId.startsWith('com.')) return 'app_store';
    if (productId.includes('android')) return 'play';
  }
  
  return src || null;
}, [entitlements]);

// Show appropriate billing management UI
{subscriptionSource === 'stripe' && (
  <TouchableOpacity onPress={handleStripePortal}>
    <Text>Manage Billing</Text>
  </TouchableOpacity>
)}

{subscriptionSource === 'app_store' && (
  <View>
    <Text>Manage via App Store</Text>
    <Text style={styles.helperText}>
      Open Settings → Apple ID → Subscriptions → EverReach
    </Text>
  </View>
)}

{subscriptionSource === 'play' && (
  <View>
    <Text>Manage via Google Play</Text>
    <Text style={styles.helperText}>
      Open Play Store → Menu → Subscriptions → EverReach
    </Text>
  </View>
)}
```

---

## UI/UX Requirements

### Subscription Plans Page

#### When `source === 'stripe'`:
- Show "Manage Billing" button
- Opens Stripe Customer Portal
- User can update payment method, cancel, or view invoices

#### When `source === 'app_store'`:
- Show "Subscribed via App Store" badge
- Show helper text with instructions
- On iOS: Button to open App Store subscriptions
- On Web: Show instructions only (no action)

#### When `source === 'play'`:
- Show "Subscribed via Google Play" badge
- Show helper text with instructions
- On Android: Button to open Play Store subscriptions
- On Web: Show instructions only (no action)

#### When `source === 'manual'`:
- Show "Enterprise Subscription" badge
- Show "Contact support for billing changes"

---

## Test Cases

### E2E Test: Subscription Source UI Tracing

| Test ID | Source | Platform | Expected UI |
|---------|--------|----------|-------------|
| SUB-001 | stripe | web | "Manage Billing" button visible, opens Stripe portal |
| SUB-002 | app_store | web | "Subscribed via App Store" message, no Stripe button |
| SUB-003 | app_store | ios | "Manage Billing" opens App Store subscriptions |
| SUB-004 | play | web | "Subscribed via Google Play" message, no Stripe button |
| SUB-005 | play | android | "Manage Billing" opens Play Store subscriptions |
| SUB-006 | manual | any | "Enterprise" badge, "Contact support" message |

### Unit Tests

```typescript
describe('SubscriptionPlans', () => {
  it('shows Stripe portal button for stripe subscriptions', () => {
    // Mock entitlements with source: 'stripe'
    // Assert "Manage Billing" button is visible
    // Assert clicking it calls createPortalSession
  });

  it('hides Stripe portal button for app_store subscriptions', () => {
    // Mock entitlements with source: 'app_store'
    // Assert "Manage Billing" button is NOT visible
    // Assert App Store instructions are shown
  });

  it('shows correct instructions for Google Play subscriptions', () => {
    // Mock entitlements with source: 'play'
    // Assert Google Play instructions are shown
  });
});
```

---

## Analytics Events

Track subscription management interactions:

```typescript
analytics.track('billing_management_clicked', {
  subscription_source: 'stripe' | 'app_store' | 'play' | 'manual',
  platform: 'web' | 'ios' | 'android',
  action: 'portal_opened' | 'instructions_shown' | 'app_store_opened',
});
```

---

## Backend Requirements

### Billing Portal Endpoint
`POST /api/billing/portal` 

**Pre-conditions:**
- User must have `source === 'stripe'` 
- User must have a valid Stripe customer ID

**Error Handling:**
```json
{
  "error": "Cannot create portal for non-Stripe subscription",
  "code": "INVALID_SUBSCRIPTION_SOURCE",
  "subscription_source": "app_store"
}
```

The backend should return a 400 (not 500) with clear error messaging when portal is requested for non-Stripe subscriptions.

---

## Migration Notes

1. **Backend**: Update `/api/billing/portal` to check `source` before attempting Stripe call
2. **Frontend**: Update `subscription-plans.tsx` to conditionally render billing options
3. **Analytics**: Add tracking for billing management interactions
4. **Testing**: Add E2E tests for all subscription source scenarios

---

## TestIDs for QA Tracing

```
subscription-source-label
manage-billing-stripe-button
app-store-instructions
play-store-instructions
enterprise-instructions
manage-billing-native-button
```

---

## Related Files

- `app/subscription-plans.tsx` - Main subscription management UI
- `providers/SubscriptionProvider.tsx` - Subscription state management
- `repos/SubscriptionRepo.ts` - API calls for subscription data
- `__tests__/e2e/subscription-source.spec.ts` - E2E tests
