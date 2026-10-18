# Subscription & Entitlements System - Complete Guide

**Complete documentation for subscription management, entitlements, and paywall flows across web and mobile**

**Status:** Production Implemented  
**Last Updated:** November 2, 2025  
**Platforms:** Stripe (Web), Apple App Store, Google Play Store via RevenueCat  
**Analytics:** PostHog, Superwall  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Backend API](#backend-api)
4. [Webhooks](#webhooks)
5. [Frontend Implementation](#frontend-implementation)
6. [Analytics & Events](#analytics-events)
7. [State Machine & Flows](#state-machine-flows)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

### Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│              Frontend (Mobile/Web)               │
│  - EntitlementsProvider (React Context)         │
│  - Feature Gates (require() guards)             │
│  - Paywall UI (Superwall)                       │
│  - Purchase SDK (RevenueCat)                    │
└────────┬─────────────────────────────────┬──────┘
         │                                  │
         ↓                                  ↓
┌────────────────────┐           ┌─────────────────┐
│  Backend API       │←──────────│  Webhooks       │
│  /v1/me/           │           │  /webhooks/     │
│  entitlements      │           │  - stripe       │
└─────────┬──────────┘           │  - revenuecat   │
          │                      │  - app-store    │
          ↓                      │  - play         │
┌─────────────────────┐          └─────────┬───────┘
│  Supabase DB        │                    │
│  - subscriptions    │←───────────────────┘
│  - subscription_    │
│    changes (audit)  │
└─────────────────────┘
```

### Key Principles

1. **Single Source of Truth:** Backend normalizes all subscription data
2. **Platform Agnostic:** Same API contract regardless of payment platform
3. **Real-time Sync:** Webhooks + client polling for instant updates
4. **Grace Periods:** Smart handling of billing issues and trial endings
5. **Analytics First:** Every state change tracked for optimization

---

## Data Model

### Normalized Subscription Object

**All platforms (Stripe, Apple, Google) normalize to this shape:**

```typescript
// lib/types/subscription.ts

export type Tier = 'free' | 'pro' | 'teams' | 'lifetime';
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'refunded' | 'grace';
export type PaymentPlatform = 'stripe' | 'app_store' | 'play_store' | 'revenuecat';

export interface NormalizedSubscription {
  // Core access control
  tier: Tier;
  subscription_status: SubscriptionStatus | null;
  active: boolean;  // ← PRIMARY GATE: true = has access
  
  // Timing
  trial_ends_at: string | null;  // ISO 8601
  current_period_end: string | null;
  grace_ends_at: string | null;
  canceled_at: string | null;
  expires_at: string | null;
  
  // Product info
  product_id: string | null;
  plan_interval: 'month' | 'year' | 'lifetime' | null;
  payment_platform: PaymentPlatform | null;
  environment: 'PRODUCTION' | 'SANDBOX';
  
  // Features (tier-based limits)
  features: {
    compose_runs: number;     // AI message generations per month
    voice_minutes: number;    // Voice note transcription minutes
    messages: number;         // Outbound messages per month
    contacts: number;         // Maximum contacts
    custom_fields: boolean;   // Custom fields access
    advanced_analytics: boolean;
    team_collaboration: boolean;
  };
  
  // Metadata
  last_synced_at: string;
  will_expire_within_days: number | null;
  
  // Platform-specific IDs (for reconciliation)
  rc_app_user_id?: string;
  stripe_customer_id?: string;
  apple_original_transaction_id?: string;
  google_purchase_token?: string;
}
```

### Timing Parameters

```typescript
// Configured per tier/plan
const TIMING_DEFAULTS = {
  trial_days: 7,              // Free trial length
  grace_days: 3,              // Billing issue grace period
  expiring_soon_days: 3,      // Show "renew soon" prompts
  
  // Cache TTLs
  client_cache_ttl: 15 * 60,  // 15 minutes (client polling)
  server_cache_ttl: 60,       // 1 minute (server-side cache)
};
```

### Tier Feature Matrix

| Feature | Free | Pro | Teams | Lifetime |
|---------|------|-----|-------|----------|
| Compose Runs | 50/mo | 500/mo | Unlimited | Unlimited |
| Voice Minutes | 30/mo | 300/mo | Unlimited | Unlimited |
| Messages | 200/mo | 2000/mo | Unlimited | Unlimited |
| Contacts | 100 | 1000 | Unlimited | Unlimited |
| Custom Fields | ❌ | ✅ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ | ✅ |
| Team Collaboration | ❌ | ❌ | ✅ | ✅ |

---

## Backend API

### Implemented Endpoints

#### 1. Get Entitlements

```http
GET /api/v1/me/entitlements
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "pro",
  "subscription_status": "active",
  "trial_ends_at": null,
  "current_period_end": "2025-12-02T15:00:00Z",
  "payment_platform": "revenuecat",
  "features": {
    "compose_runs": 500,
    "voice_minutes": 300,
    "messages": 2000,
    "contacts": 1000,
    "custom_fields": true,
    "advanced_analytics": true,
    "team_collaboration": false
  }
}
```

**Error Fallback:** Returns `free` tier if subscription data unavailable.

---

#### 2. Get Subscription Details

```http
GET /api/v1/billing/subscription
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user_id": "usr_123",
  "tier": "pro",
  "status": "active",
  "product_id": "com.everreach.pro.monthly",
  "plan_interval": "month",
  "payment_platform": "app_store",
  "environment": "PRODUCTION",
  "trial_ends_at": null,
  "current_period_end": "2025-12-02T15:00:00Z",
  "canceled_at": null,
  "will_expire_within_days": 30,
  "original_transaction_id": "1000000123456789",
  "last_synced_at": "2025-11-02T15:30:00Z"
}
```

---

#### 3. Restore Purchases

```http
POST /api/v1/billing/restore
Authorization: Bearer <token>
```

**Use Case:** User installed app on new device, needs to restore subscription.

**Response:**
```json
{
  "restored": true,
  "tier": "pro",
  "message": "Subscription restored successfully"
}
```

---

#### 4. Stripe Checkout Session (Web Only)

```http
POST /api/billing/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "price_id": "price_1234",
  "success_url": "https://everreach.app/success",
  "cancel_url": "https://everreach.app/upgrade"
}
```

**Response:**
```json
{
  "session_id": "cs_test_123",
  "url": "https://checkout.stripe.com/pay/cs_test_123"
}
```

---

#### 5. Billing Portal (Web Only)

```http
POST /api/billing/portal
Authorization: Bearer <token>
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

#### 6. Testing Endpoints (Development Only)

```http
POST /api/v1/testing/subscription/set
Content-Type: application/json

{
  "user_id": "usr_123",
  "tier": "pro",
  "trial_ends_at": "2025-11-09T15:00:00Z"
}
```

```http
POST /api/v1/testing/subscription/reset
Content-Type: application/json

{
  "user_id": "usr_123"
}
```

---

## Webhooks

### 1. RevenueCat Webhook

```http
POST /api/v1/billing/revenuecat/webhook
X-RevenueCat-Signature: <hmac_sha256_signature>
Content-Type: application/json
```

**Handles Events:**
- `INITIAL_PURCHASE` - First subscription purchase
- `RENEWAL` - Recurring billing success
- `EXPIRATION` - Subscription expired
- `CANCELLATION` - User canceled subscription
- `UNCANCELLATION` - User renewed after cancel
- `PRODUCT_CHANGE` - Upgraded/downgraded plan
- `REFUND` - Purchase refunded
- `BILLING_ISSUE` - Payment failed (grace period)
- `SUBSCRIBER_ALIAS` - User account linked

**Event Processing:**
1. Verify HMAC signature
2. Normalize to `ProcessedSubscription`
3. Upsert to `subscriptions` table
4. Log to `subscription_changes` audit table
5. Emit analytics events
6. Trigger real-time update to user (optional SSE)

**Example Payload:**
```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "id": "evt_123",
    "app_user_id": "usr_456",
    "product_id": "com.everreach.pro.monthly",
    "entitlement_ids": ["pro"],
    "environment": "PRODUCTION",
    "purchased_at_ms": 1698768000000,
    "expiration_at_ms": 1701446400000,
    "period_type": "NORMAL",
    "store": "APP_STORE",
    "original_transaction_id": "1000000123456789"
  }
}
```

---

### 2. Stripe Webhook

```http
POST /api/webhooks/stripe
Stripe-Signature: <stripe_signature>
Content-Type: application/json
```

**Handles Events:**
- `checkout.session.completed` - Purchase complete
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Plan change, renewal
- `customer.subscription.deleted` - Canceled
- `invoice.payment_succeeded` - Billing success
- `invoice.payment_failed` - Billing issue (grace)
- `charge.refunded` - Refund issued

**Processing:**
1. Verify Stripe signature
2. Map to normalized subscription
3. Mirror to RevenueCat (if needed)
4. Upsert database
5. Emit analytics

---

### 3. Apple App Store Webhook

```http
POST /api/v1/webhooks/app-store
Content-Type: application/json
```

**Handles:** App Store Server Notifications V2

---

### 4. Google Play Webhook

```http
POST /api/v1/webhooks/play
Content-Type: application/json
```

**Handles:** Real-time Developer Notifications (RTDN)

---

### 5. Superwall Webhook

```http
POST /api/v1/billing/superwall/webhook
Superwall-Signature: <signature>
```

**Handles:** Superwall paywall analytics events

---

## Frontend Implementation

### 1. EntitlementsProvider (React Context)

```typescript
// providers/EntitlementsProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Entitlements {
  tier: Tier;
  subscription_status: SubscriptionStatus | null;
  active: boolean;
  features: Features;
  trial_ends_at: string | null;
  current_period_end: string | null;
  payment_platform: PaymentPlatform | null;
}

interface EntitlementsContext {
  entitlements: Entitlements | null;
  loading: boolean;
  hasFeature: (feature: keyof Features) => boolean;
  requireFeature: (feature: keyof Features, origin?: string) => Promise<boolean>;
  refreshEntitlements: () => Promise<void>;
}

const EntitlementsCtx = createContext<EntitlementsContext>(null!);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data: entitlements, isLoading, refetch } = useQuery({
    queryKey: ['entitlements'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/me/entitlements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const hasFeature = (feature: keyof Features) => {
    if (!entitlements) return false;
    const value = entitlements.features[feature];
    return typeof value === 'boolean' ? value : value > 0;
  };

  const requireFeature = async (feature: keyof Features, origin?: string) => {
    if (hasFeature(feature)) return true;

    // Track attempt
    capture('feature_locked_clicked', { feature, origin, tier: entitlements?.tier });

    // Navigate to upgrade flow
    router.push('/upgrade-onboarding', { feature, origin });
    
    return false;
  };

  const refreshEntitlements = async () => {
    await refetch();
  };

  return (
    <EntitlementsCtx.Provider value={{
      entitlements: entitlements || null,
      loading: isLoading,
      hasFeature,
      requireFeature,
      refreshEntitlements,
    }}>
      {children}
    </EntitlementsCtx.Provider>
  );
}

export const useEntitlements = () => useContext(EntitlementsCtx);
```

---

### 2. Feature Gates

```typescript
// Usage in any component
import { useEntitlements } from '@/providers/EntitlementsProvider';

export function ExportCSVButton() {
  const { requireFeature } = useEntitlements();

  const handleExport = async () => {
    // Guard with feature gate
    if (!(await requireFeature('advanced_analytics', 'export_csv_button'))) {
      return; // User sent to paywall
    }

    // Feature allowed, proceed
    exportToCSV();
  };

  return <Button onPress={handleExport}>Export CSV</Button>;
}
```

---

### 3. Upgrade Onboarding Screen

```typescript
// app/upgrade-onboarding.tsx
import { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import Superwall from '@superwall/react-native-superwall';

export default function UpgradeOnboarding() {
  const route = useRoute();
  const { feature, origin } = route.params;
  const { refreshEntitlements } = useEntitlements();

  useEffect(() => {
    capture('onboarding_2_shown', { feature, origin });
  }, []);

  const handleContinue = async () => {
    capture('paywall_requested', { placement: 'upgrade_onboarding', feature });
    
    // Present Superwall paywall
    await Superwall.presentPaywall('main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock {feature}</Text>
      <Text style={styles.description}>
        Upgrade to Pro to access {feature} and more premium features.
      </Text>
      <Button onPress={handleContinue}>Continue to Upgrade</Button>
    </View>
  );
}
```

---

### 4. Wire Superwall + RevenueCat

```typescript
// app/_layout.tsx or App.tsx
import Superwall from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases';

useEffect(() => {
  // Initialize RevenueCat
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY,
    appUserID: user.id,
  });

  // Initialize Superwall
  Superwall.configure(SUPERWALL_API_KEY);

  // Wire Superwall delegates
  Superwall.setDelegate({
    handlePaywallOpened: (info) => {
      capture('paywall_shown', {
        placement: 'main',
        experiment_id: info.experimentId,
        variant_id: info.variantId,
      });
    },
    
    handlePaywallClosed: (info) => {
      capture('paywall_dismissed', { reason: info.closeReason });
    },
    
    handlePurchaseCompleted: async (transaction) => {
      capture('purchase_succeeded', {
        product_id: transaction.productIdentifier,
        price: transaction.price,
        currency: transaction.currency,
      });
      
      // Refresh entitlements
      await refreshEntitlements();
      
      // Navigate back to origin
      router.back();
    },
    
    handlePurchaseFailed: (error) => {
      capture('purchase_failed', {
        code: error.code,
        message: error.message,
      });
    },
  });

  // Wire RevenueCat listener
  Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
    console.log('[RC] Customer info updated');
    await refreshEntitlements();
  });
}, [user]);
```

---

## Analytics & Events

### Event Taxonomy

| Event | When | Properties |
|-------|------|------------|
| `subscription_status_fetched` | After /me/entitlements | `{tier, status, active, payment_platform}` |
| `feature_locked_clicked` | User taps gated feature | `{feature, origin, tier}` |
| `onboarding_2_shown` | Upgrade onboarding appears | `{feature, origin}` |
| `paywall_requested` | Before showing paywall | `{placement, feature}` |
| `paywall_shown` | Superwall opened | `{placement, experiment_id, variant_id}` |
| `paywall_dismissed` | Superwall closed | `{reason}` |
| `purchase_started` | Before SDK call | `{product_id, offering_id}` |
| `purchase_succeeded` | Purchase complete | `{product_id, price, currency, period}` |
| `purchase_failed` | Error or cancel | `{code, message}` |
| `trial_started` | Free trial begins | `{days, product_id}` |
| `trial_converted` | First bill after trial | `{product_id}` |
| `renewal_billed` | Recurring success | `{product_id}` |
| `billing_issue` | Payment failed | `{grace_ends_at}` |
| `subscription_canceled` | User canceled | `{effective_end}` |
| `subscription_expired` | Access lost | `{expired_at}` |

### Analytics Helper

```typescript
// lib/analytics.ts
import posthog from 'posthog-js'; // or @posthog/react-native

export function capture(event: string, properties: Record<string, any> = {}) {
  try {
    posthog.capture(event, properties);
    
    // Also send to server for audit
    fetch(`${API_BASE}/api/v1/events/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, properties }),
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
  }
}
```

---

## State Machine & Flows

### Subscription States

```
FREE (default)
  ↓ user starts trial
TRIAL
  ├→ trial ends without purchase → EXPIRED
  ├→ purchase during trial → ACTIVE
  └→ trial converted → ACTIVE

ACTIVE
  ├→ renewal success → ACTIVE
  ├→ cancel at period end → ACTIVE (canceled_at set, access until period_end)
  ├→ billing issue → GRACE
  └→ period ends (if canceled) → EXPIRED

GRACE (billing issue)
  ├→ payment success → ACTIVE
  └→ grace period ends → EXPIRED

EXPIRED
  ├→ restore purchase → ACTIVE
  ├→ new purchase → ACTIVE
  └→ no action → FREE

LIFETIME
  └→ permanent ACTIVE
```

### User Flows

#### Flow 1: New User → Trial → Purchase

```
1. User signs up → FREE tier
2. System checks: eligible for trial? → Yes
3. Grant 7-day trial → TRIAL
4. User tries premium feature → Access granted
5. Trial day 6 → Show "Trial ending soon" banner
6. User taps "Upgrade" → onboarding_2_shown → paywall_shown
7. User purchases → purchase_succeeded → ACTIVE
8. Access continues seamlessly
```

#### Flow 2: Free User → Paywall

```
1. User on FREE tier
2. Taps "Export CSV" (premium feature)
3. feature_locked_clicked tracked
4. Navigate to /upgrade-onboarding
5. onboarding_2_shown tracked
6. User taps "Continue" → paywall_requested → paywall_shown
7. User selects plan → purchase flow
8. Purchase success → ACTIVE → feature unlocked
```

#### Flow 3: Billing Issue → Grace → Recovery

```
1. User ACTIVE → Renewal fails
2. Webhook: BILLING_ISSUE → status=GRACE
3. Show banner: "Update payment method"
4. grace_days=3, grace_ends_at set
5. User updates card → billing retried
6. Webhook: RENEWAL → status=ACTIVE
7. Banner removed, access continues
```

#### Flow 4: Cancel at Period End

```
1. User ACTIVE → Cancels via settings
2. Webhook: CANCELLATION → status=ACTIVE, canceled_at set
3. Show banner: "Access until {current_period_end}"
4. Period ends → Webhook: EXPIRATION → status=EXPIRED
5. Next feature tap → Blocked → Paywall
```

---

## Testing Guide

### Test Matrix

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **New user trial** | 1. Sign up<br>2. Access premium feature | Granted, trial_ends_at set |
| **Trial expiration** | 1. Set trial_ends_at to -1 day<br>2. Tap premium feature | Blocked → Paywall |
| **Purchase during trial** | 1. During trial<br>2. Purchase | Trial converts, status=ACTIVE |
| **Billing issue** | 1. Simulate failed payment<br>2. Check status | status=GRACE, banner shows |
| **Grace recovery** | 1. In GRACE<br>2. Simulate successful payment | status=ACTIVE, banner removed |
| **Stripe web purchase** | 1. Web checkout<br>2. Webhook processed | status=ACTIVE, tier=PRO |
| **Restore purchases** | 1. New device<br>2. Tap "Restore" | Previous subscription restored |
| **Cancel subscription** | 1. ACTIVE user cancels<br>2. Period not ended | status=ACTIVE, canceled_at set, access until period_end |
| **Subscription expired** | 1. Canceled, period ended<br>2. Tap premium feature | Blocked → Paywall |
| **Lifetime purchase** | 1. Purchase lifetime<br>2. Check status | status=ACTIVE, tier=LIFETIME, no period_end |

### Testing Endpoints

```bash
# Set user to PRO for testing
curl -X POST https://ever-reach-be.vercel.app/api/v1/testing/subscription/set \
  -H "Content-Type: application/json" \
  -d '{"user_id": "usr_123", "tier": "pro", "trial_ends_at": "2025-11-09T15:00:00Z"}'

# Reset to FREE
curl -X POST https://ever-reach-be.vercel.app/api/v1/testing/subscription/reset \
  -H "Content-Type: application/json" \
  -d '{"user_id": "usr_123"}'
```

---

## Troubleshooting

### Issue: Subscription not syncing

**Symptoms:** User purchased but still shows FREE tier

**Solutions:**
1. Check webhook logs in Vercel
2. Verify webhook signatures are correct
3. Manually trigger refresh: `POST /api/v1/billing/restore`
4. Check `subscriptions` table for user_id

### Issue: Feature gate not working

**Symptoms:** User has PRO but feature still blocked

**Solutions:**
1. Check `entitlements.features` response
2. Verify `hasFeature()` logic
3. Ensure `features` object has correct shape
4. Check tier mapping in backend

### Issue: Paywall not showing

**Symptoms:** `requireFeature()` doesn't trigger paywall

**Solutions:**
1. Check Superwall configuration
2. Verify Superwall API key
3. Check paywall placement ID matches
4. Review Superwall dashboard for errors

---

## Implementation Checklist

### Backend ✅ (Already Implemented)

- [x] `/v1/me/entitlements` endpoint
- [x] `/v1/billing/subscription` endpoint
- [x] `/v1/billing/restore` endpoint
- [x] `/webhooks/stripe` handler
- [x] `/v1/billing/revenuecat/webhook` handler
- [x] `/v1/webhooks/app-store` handler
- [x] `/v1/webhooks/play` handler
- [x] Subscription normalization logic
- [x] Analytics event emission
- [x] Testing endpoints

### Frontend 🔧 (Ready to Implement)

- [ ] `EntitlementsProvider` context
- [ ] `useEntitlements()` hook
- [ ] Feature gate guards (`requireFeature`)
- [ ] Upgrade onboarding screen
- [ ] Superwall integration
- [ ] RevenueCat SDK setup
- [ ] Analytics tracking (PostHog)
- [ ] Subscription status UI (settings)
- [ ] Grace/expiration banners
- [ ] Restore purchases button

---

## Quick Start (Frontend)

### 1. Install Dependencies

```bash
npm install @tanstack/react-query
npm install react-native-purchases
npm install @superwall/react-native-superwall
npm install posthog-js # or @posthog/react-native
```

### 2. Copy Provider

Copy `EntitlementsProvider` code from section 5.1 to `providers/EntitlementsProvider.tsx`

### 3. Wrap App

```typescript
// app/_layout.tsx
import { EntitlementsProvider } from '@/providers/EntitlementsProvider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <EntitlementsProvider>
        <Slot />
      </EntitlementsProvider>
    </QueryClientProvider>
  );
}
```

### 4. Use in Components

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';

const { requireFeature } = useEntitlements();

await requireFeature('advanced_analytics', 'export_csv');
```

---

**Ready to implement!** All backend infrastructure is live. Frontend just needs to integrate with the existing APIs. 🚀
