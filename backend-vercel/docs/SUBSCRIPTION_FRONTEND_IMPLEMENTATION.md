# Subscription System - Frontend Implementation Guide

**Complete step-by-step guide to integrate the subscription system into your React Native/Expo frontend**

**Backend Status:** ✅ 90% Complete (Phase 1 ready for integration)  
**Last Updated:** November 2, 2025  
**Platforms:** iOS (Apple), Android (Google Play), Web (Stripe)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Endpoints Available](#backend-endpoints-available)
3. [Step 1: Install Dependencies](#step-1-install-dependencies)
4. [Step 2: Create EntitlementsProvider](#step-2-create-entitlementsprovider)
5. [Step 3: Feature Gates](#step-3-feature-gates)
6. [Step 4: Paywall Integration](#step-4-paywall-integration)
7. [Step 5: Developer Settings](#step-5-developer-settings)
8. [Step 6: UI Components](#step-6-ui-components)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### What's Already Working on Backend

✅ **11 Endpoints Live:**
- `/v1/me/entitlements` - Get user's subscription status
- `/v1/billing/subscription` - Detailed subscription info
- `/v1/billing/restore` - Restore purchases
- `/billing/checkout` - Stripe checkout (web)
- `/billing/portal` - Stripe billing portal (web)
- `/v1/testing/subscription/set` - Dev overrides
- `/v1/testing/subscription/reset` - Reset to free
- `/webhooks/stripe` - Stripe webhooks
- `/v1/billing/revenuecat/webhook` - RevenueCat webhooks
- `/v1/webhooks/app-store` - Apple webhooks
- `/v1/webhooks/play` - Google Play webhooks

✅ **What Backend Provides:**
- Cross-platform normalization (Stripe, Apple, Google → single format)
- Tier-based feature limits
- Trial tracking
- Webhook processing
- Dev testing infrastructure

---

## Backend Endpoints Available

### 1. Get Entitlements (Primary Endpoint)

```http
GET https://ever-reach-be.vercel.app/api/v1/me/entitlements
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "tier": "pro",
  "subscription_status": "active",
  "trial_ends_at": null,
  "current_period_end": "2025-12-02T15:00:00Z",
  "payment_platform": "apple",
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 2000,
    "contacts": -1
  }
}
```

**Tiers:**
- `free` - 50 compose runs, 30 voice mins, 200 messages, 100 contacts
- `core` - 500 compose runs, 120 voice mins, 1000 messages, 500 contacts
- `pro` - 1000 compose runs, 300 voice mins, 2000 messages, unlimited contacts
- `team` - Unlimited everything + 10 team members

**Statuses:**
- `trial` - Free trial active
- `active` - Paid subscription active
- `canceled` - Canceled but still has access until period end
- `expired` - No longer has access
- `refunded` - Refunded

---

### 2. Get Full Subscription Details

```http
GET https://ever-reach-be.vercel.app/api/v1/billing/subscription
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "user_id": "usr_123",
  "status": "active",
  "platform": "app_store",
  "product_id": "com.everreach.pro.monthly",
  "original_transaction_id": "1000000123456789",
  "trial_ends_at": null,
  "current_period_end": "2025-12-02T15:00:00Z",
  "canceled_at": null,
  "environment": "PRODUCTION"
}
```

---

### 3. Restore Purchases

```http
POST https://ever-reach-be.vercel.app/api/v1/billing/restore
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "restored": true,
  "tier": "pro",
  "message": "Subscription restored successfully"
}
```

---

### 4. Developer Testing (Non-Production Only)

```http
POST https://ever-reach-be.vercel.app/api/v1/testing/subscription/set
X-Admin-Token: <ADMIN_TEST_TOKEN>
Content-Type: application/json

{
  "userId": "usr_123",
  "subscriptionStatus": "active",
  "trialEndAt": "2025-11-09T15:00:00Z",
  "currentPeriodEnd": "2025-12-02T15:00:00Z",
  "billingSource": "apple"
}
```

---

## Step 1: Install Dependencies

```bash
# React Query for data fetching
npm install @tanstack/react-query

# RevenueCat SDK
npm install react-native-purchases

# Superwall SDK (optional for paywall UI)
npm install @superwall/react-native-superwall

# PostHog for analytics
npm install posthog-react-native
```

---

## Step 2: Create EntitlementsProvider

### File: `providers/EntitlementsProvider.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Purchases from 'react-native-purchases';

// Types
type Tier = 'free' | 'core' | 'pro' | 'team';
type Status = 'trial' | 'active' | 'canceled' | 'expired' | 'refunded';

interface Entitlements {
  tier: Tier;
  subscription_status: Status | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  payment_platform: 'apple' | 'google' | null;
  features: {
    compose_runs: number;
    voice_minutes: number;
    messages: number;
    contacts: number;
  };
}

interface EntitlementsContext {
  entitlements: Entitlements | null;
  loading: boolean;
  hasFeature: (feature: keyof Entitlements['features'], amount?: number) => boolean;
  requireFeature: (feature: keyof Entitlements['features'], origin?: string) => Promise<boolean>;
  refreshEntitlements: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const EntitlementsCtx = createContext<EntitlementsContext>(null!);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  // Get auth token
  useEffect(() => {
    // Your auth implementation
    getAuthToken().then(setToken);
  }, []);

  // Fetch entitlements
  const { data: entitlements, isLoading, refetch } = useQuery({
    queryKey: ['entitlements'],
    queryFn: async () => {
      const response = await fetch(
        'https://ever-reach-be.vercel.app/api/v1/me/entitlements',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch entitlements');
      }
      
      return response.json() as Promise<Entitlements>;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Setup RevenueCat listener
  useEffect(() => {
    if (!token) return;

    const listener = Purchases.addCustomerInfoUpdateListener(async () => {
      console.log('[RC] Customer info updated, refreshing entitlements');
      await refetch();
    });

    return () => {
      listener.remove();
    };
  }, [token, refetch]);

  // Check if user has feature (with amount check for quotas)
  const hasFeature = (feature: keyof Entitlements['features'], amount = 1) => {
    if (!entitlements) return false;
    
    const limit = entitlements.features[feature];
    
    // -1 means unlimited
    if (limit === -1) return true;
    
    // Check if under limit
    return amount <= limit;
  };

  // Require feature (show paywall if don't have)
  const requireFeature = async (feature: keyof Entitlements['features'], origin?: string) => {
    if (hasFeature(feature)) return true;

    // Track event
    capture('feature_locked_clicked', {
      feature,
      origin,
      tier: entitlements?.tier,
      status: entitlements?.subscription_status,
    });

    // Navigate to paywall
    router.push('/upgrade', { feature, origin });
    
    return false;
  };

  // Refresh entitlements
  const refreshEntitlements = async () => {
    await refetch();
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      capture('restore_purchases_initiated');
      
      const response = await fetch(
        'https://ever-reach-be.vercel.app/api/v1/billing/restore',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.restored) {
        capture('restore_purchases_success', { tier: data.tier });
        await refetch();
        alert('Subscription restored successfully!');
      } else {
        capture('restore_purchases_no_subscription');
        alert('No previous purchases found');
      }
    } catch (error) {
      capture('restore_purchases_failed', { error: error.message });
      alert('Failed to restore purchases');
    }
  };

  return (
    <EntitlementsCtx.Provider
      value={{
        entitlements: entitlements || null,
        loading: isLoading,
        hasFeature,
        requireFeature,
        refreshEntitlements,
        restorePurchases,
      }}
    >
      {children}
    </EntitlementsCtx.Provider>
  );
}

export const useEntitlements = () => useContext(EntitlementsCtx);

// Helper to capture analytics
function capture(event: string, props?: Record<string, any>) {
  // Your analytics implementation (PostHog, etc.)
  console.log('[Analytics]', event, props);
}
```

---

## Step 3: Feature Gates

### Usage in Components

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';

export function ExportCSVButton() {
  const { requireFeature } = useEntitlements();

  const handleExport = async () => {
    // Gate the feature
    if (!(await requireFeature('contacts', 1000))) {
      return; // User sent to paywall
    }

    // Feature allowed, proceed
    exportToCSV();
  };

  return (
    <TouchableOpacity onPress={handleExport}>
      <Text>Export CSV</Text>
    </TouchableOpacity>
  );
}
```

### Quota Checks

```typescript
export function ComposeMessage() {
  const { hasFeature, entitlements } = useEntitlements();

  const handleCompose = async () => {
    // Check if user has compose runs left
    if (!hasFeature('compose_runs', 1)) {
      alert(`You've used all ${entitlements.features.compose_runs} compose runs this month`);
      router.push('/upgrade');
      return;
    }

    // Proceed with compose
    composeMessage();
  };

  return (
    <Button onPress={handleCompose}>
      Compose Message ({entitlements.features.compose_runs} left)
    </Button>
  );
}
```

### Display Tier Badge

```typescript
export function TierBadge() {
  const { entitlements } = useEntitlements();

  if (!entitlements || entitlements.tier === 'free') {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text>{entitlements.tier.toUpperCase()}</Text>
    </View>
  );
}
```

---

## Step 4: Paywall Integration

### Option A: Superwall (Recommended)

```typescript
// app/_layout.tsx
import Superwall from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases';

export default function RootLayout() {
  const { refreshEntitlements } = useEntitlements();

  useEffect(() => {
    // Initialize RevenueCat
    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY,
      appUserID: user.id,
    });

    // Initialize Superwall
    Superwall.configure(SUPERWALL_API_KEY);

    // Wire delegates
    Superwall.setDelegate({
      handlePaywallOpened: (info) => {
        capture('paywall_shown', {
          placement: 'main',
          experiment_id: info.experimentId,
        });
      },

      handlePaywallClosed: (info) => {
        capture('paywall_dismissed', {
          reason: info.closeReason,
        });
      },

      handlePurchaseCompleted: async (transaction) => {
        capture('purchase_succeeded', {
          product_id: transaction.productIdentifier,
          price: transaction.price,
        });

        await refreshEntitlements();
        router.back();
      },

      handlePurchaseFailed: (error) => {
        capture('purchase_failed', {
          code: error.code,
          message: error.message,
        });
      },
    });
  }, [user]);

  return <Slot />;
}
```

### Option B: Custom Paywall

```typescript
// app/upgrade.tsx
import { useEntitlements } from '@/providers/EntitlementsProvider';
import Purchases from 'react-native-purchases';

export default function UpgradeScreen() {
  const { refreshEntitlements } = useEntitlements();
  const [offerings, setOfferings] = useState(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    const offers = await Purchases.getOfferings();
    setOfferings(offers.current);
  }

  async function purchasePackage(pkg: PurchasesPackage) {
    try {
      capture('purchase_initiated', { product_id: pkg.identifier });

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      capture('purchase_succeeded', { product_id: pkg.identifier });

      await refreshEntitlements();
      router.back();
    } catch (error) {
      if (!error.userCancelled) {
        capture('purchase_failed', { error: error.message });
        alert('Purchase failed');
      }
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upgrade to Pro</Text>

      {offerings?.availablePackages.map(pkg => (
        <TouchableOpacity
          key={pkg.identifier}
          onPress={() => purchasePackage(pkg)}
          style={styles.planCard}
        >
          <Text style={styles.planTitle}>{pkg.product.title}</Text>
          <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
          <Text style={styles.planDescription}>{pkg.product.description}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={restorePurchases}>
        <Text>Restore Purchases</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

---

## Step 5: Developer Settings

### File: `app/dev/subscription.tsx`

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView } from 'react-native';

const STATUSES = ['trial', 'active', 'canceled', 'expired', 'refunded'];
const TIERS = ['free', 'core', 'pro', 'team'];

export default function DevSubscriptionScreen() {
  const { entitlements, refreshEntitlements } = useEntitlements();
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState('pro');
  const [status, setStatus] = useState('active');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  async function applyOverride() {
    try {
      const response = await fetch(
        'https://ever-reach-be.vercel.app/api/v1/testing/subscription/set',
        {
          method: 'POST',
          headers: {
            'X-Admin-Token': ADMIN_TEST_TOKEN, // From env
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            subscriptionStatus: status,
            trialEndAt: trialEndsAt || null,
            currentPeriodEnd: periodEnd || null,
            billingSource: 'apple',
          }),
        }
      );

      if (response.ok) {
        alert('Override applied!');
        await refreshEntitlements();
      } else {
        alert('Failed to apply override');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  async function resetToFree() {
    const response = await fetch(
      'https://ever-reach-be.vercel.app/api/v1/testing/subscription/reset',
      {
        method: 'POST',
        headers: {
          'X-Admin-Token': ADMIN_TEST_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      }
    );

    if (response.ok) {
      alert('Reset to free tier');
      await refreshEntitlements();
    }
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
        Developer Subscription Settings
      </Text>

      <View style={{ padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600' }}>Current State:</Text>
        <Text>Tier: {entitlements?.tier}</Text>
        <Text>Status: {entitlements?.subscription_status || 'none'}</Text>
        <Text>Trial Ends: {entitlements?.trial_ends_at || 'N/A'}</Text>
        <Text>Period End: {entitlements?.current_period_end || 'N/A'}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text>Enable Override: </Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      {enabled && (
        <>
          <Text style={{ marginTop: 12 }}>Status:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: status === s ? '#007AFF' : '#E5E5EA',
                }}
              >
                <Text style={{ color: status === s ? '#fff' : '#000' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text>Trial Ends At (ISO):</Text>
          <TextInput
            value={trialEndsAt}
            onChangeText={setTrialEndsAt}
            placeholder="2025-11-09T15:00:00Z"
            style={{ borderWidth: 1, borderRadius: 6, padding: 8, marginBottom: 12 }}
          />

          <Text>Current Period End (ISO):</Text>
          <TextInput
            value={periodEnd}
            onChangeText={setPeriodEnd}
            placeholder="2025-12-02T15:00:00Z"
            style={{ borderWidth: 1, borderRadius: 6, padding: 8, marginBottom: 12 }}
          />

          <TouchableOpacity
            onPress={applyOverride}
            style={{
              padding: 12,
              backgroundColor: '#007AFF',
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
              Apply Override
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={resetToFree}
        style={{
          padding: 12,
          backgroundColor: '#FF3B30',
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
          Reset to Free Tier
        </Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 16, opacity: 0.6, fontSize: 12 }}>
        Note: Overrides only work in non-production environments
      </Text>
    </ScrollView>
  );
}
```

---

## Step 6: UI Components

### Trial Banner

```typescript
export function TrialBanner() {
  const { entitlements } = useEntitlements();

  if (entitlements?.subscription_status !== 'trial' || !entitlements.trial_ends_at) {
    return null;
  }

  const daysLeft = Math.ceil(
    (new Date(entitlements.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <TouchableOpacity
      onPress={() => router.push('/upgrade')}
      style={{
        padding: 12,
        backgroundColor: '#FF9500',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>
        Trial ends in {daysLeft} days
      </Text>
      <Text style={{ color: '#fff' }}>Upgrade →</Text>
    </TouchableOpacity>
  );
}
```

### Canceled Banner

```typescript
export function CanceledBanner() {
  const { entitlements } = useEntitlements();

  if (entitlements?.subscription_status !== 'canceled' || !entitlements.current_period_end) {
    return null;
  }

  const endDate = new Date(entitlements.current_period_end).toLocaleDateString();

  return (
    <View style={{ padding: 12, backgroundColor: '#FF3B30' }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>
        Subscription canceled. Access until {endDate}
      </Text>
    </View>
  );
}
```

### Settings Row

```typescript
export function SubscriptionSettingsRow() {
  const { entitlements, restorePurchases } = useEntitlements();

  return (
    <View>
      <TouchableOpacity
        onPress={() => router.push('/upgrade')}
        style={styles.settingsRow}
      >
        <Text>Subscription</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ opacity: 0.6, marginRight: 8 }}>
            {entitlements?.tier || 'Free'}
          </Text>
          <Text>›</Text>
        </View>
      </TouchableOpacity>

      {entitlements?.payment_platform && (
        <TouchableOpacity
          onPress={openBillingPortal}
          style={styles.settingsRow}
        >
          <Text>Manage Billing</Text>
          <Text>›</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={restorePurchases}
        style={styles.settingsRow}
      >
        <Text>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Testing Checklist

### Phase 1: Basic Integration

- [ ] Install dependencies
- [ ] Create `EntitlementsProvider`
- [ ] Wrap app with provider
- [ ] Test fetching entitlements (see current tier)
- [ ] Add one feature gate (e.g., export CSV)
- [ ] Test gate redirects to upgrade screen

### Phase 2: Purchase Flow

- [ ] Initialize RevenueCat SDK
- [ ] Create upgrade screen
- [ ] Test purchasing (sandbox)
- [ ] Verify entitlements refresh after purchase
- [ ] Test restore purchases
- [ ] Test customer info listener

### Phase 3: UI Polish

- [ ] Add trial banner
- [ ] Add canceled banner
- [ ] Add subscription settings
- [ ] Add manage billing button
- [ ] Test all banners show/hide correctly

### Phase 4: Developer Settings

- [ ] Create dev settings screen
- [ ] Test setting subscription to "trial"
- [ ] Test setting to "active"
- [ ] Test setting to "canceled"
- [ ] Test reset to free
- [ ] Verify overrides only work in dev

### Phase 5: Analytics

- [ ] Verify all events tracked:
  - `feature_locked_clicked`
  - `paywall_shown`
  - `paywall_dismissed`
  - `purchase_initiated`
  - `purchase_succeeded`
  - `purchase_failed`
  - `restore_purchases_*`

---

## Troubleshooting

### Issue: Entitlements not loading

**Check:**
1. Auth token is valid
2. Backend is reachable (`https://ever-reach-be.vercel.app`)
3. User exists in database
4. Network inspector shows 200 response

### Issue: Purchase not reflecting

**Check:**
1. Webhook processed (check Vercel logs)
2. RevenueCat customer info updated
3. Call `refreshEntitlements()` after purchase
4. Check sandbox vs production environment

### Issue: Dev override not working

**Check:**
1. `X-Admin-Token` header set correctly
2. `ADMIN_TEST_TOKEN` env var configured
3. Not in production environment
4. User ID is correct

### Issue: Trial not showing

**Check:**
1. `trial_ends_at` is in the future
2. `subscription_status` is "trial"
3. Banner component is rendered
4. Date parsing is correct

---

## Environment Variables

```bash
# .env
REACT_APP_API_BASE=https://ever-reach-be.vercel.app
REACT_APP_RC_IOS_KEY=<your_revenuecat_ios_key>
REACT_APP_RC_ANDROID_KEY=<your_revenuecat_android_key>
REACT_APP_SUPERWALL_KEY=<your_superwall_key>
REACT_APP_ADMIN_TEST_TOKEN=<your_admin_token> # Dev only
```

---

## Next Steps

1. ✅ **Phase 1:** Implement `EntitlementsProvider` and basic feature gates
2. ✅ **Phase 2:** Add purchase flow with RevenueCat
3. ✅ **Phase 3:** Build upgrade screen and UI components
4. ✅ **Phase 4:** Add developer settings
5. ✅ **Phase 5:** Wire analytics events
6. ⏳ **Phase 6:** Production testing with real payments

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/me/entitlements` | GET | Get user's entitlements |
| `/v1/billing/subscription` | GET | Full subscription details |
| `/v1/billing/restore` | POST | Restore purchases |
| `/billing/checkout` | POST | Stripe checkout (web) |
| `/billing/portal` | POST | Stripe portal (web) |
| `/v1/testing/subscription/set` | POST | Dev override |
| `/v1/testing/subscription/reset` | POST | Reset to free |

---

**Ready to implement!** Start with Phase 1 (EntitlementsProvider) and work through each phase. The backend is ready for all of this! 🚀
