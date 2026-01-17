# Subscription & Entitlements System - Implementation Guide

**Complete implementation of subscription management, entitlements, and feature gates**

**Status:** ✅ Production Ready  
**Implemented:** November 2, 2025  
**Platforms:** Stripe (Web), Apple App Store, Google Play Store via RevenueCat  

---

## Implementation Summary

Successfully implemented a comprehensive entitlements system with:

1. ✅ **EntitlementsProvider** - React Context with React Query caching
2. ✅ **Feature Gates** - `requireFeature()` with automatic upgrade flows  
3. ✅ **Tier System** - Free, Pro, Teams, Lifetime support
4. ✅ **Feature Limits** - Per-tier limits (contacts, messages, analytics, etc.)
5. ✅ **Upgrade Flows** - Automatic navigation to upgrade screens
6. ✅ **Analytics Integration** - Tracks all feature gate interactions

---

## Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│          EntitlementsProvider (React Context)    │
│  - Fetches from /api/v1/me/entitlements         │
│  - React Query caching (15min stale)            │
│  - hasFeature() checks                          │
│  - requireFeature() with upgrade flow           │
└────────┬─────────────────────────────────┬───────┘
         │                                  │
         ↓                                  ↓
┌────────────────────┐           ┌──────────────────┐
│  Backend API       │           │  Upgrade Flow    │
│  /v1/me/           │           │  /upgrade-       │
│  entitlements      │           │   onboarding     │
└─────────┬──────────┘           └──────────────────┘
          │
          ↓
┌─────────────────────┐
│  Supabase DB        │
│  - subscriptions    │
│  - subscription_    │
│    changes (audit)  │
└─────────────────────┘
```

---

## Data Model

### Entitlements Interface

```typescript
export interface Entitlements {
  // Core access control
  tier: 'free' | 'pro' | 'teams' | 'lifetime';
  subscription_status: 'trial' | 'active' | 'canceled' | 'expired' | 'refunded' | 'grace' | null;
  active: boolean;  // PRIMARY GATE: true = has access
  
  // Timing
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  canceled_at: string | null;
  expires_at: string | null;
  
  // Product info
  product_id: string | null;
  plan_interval: 'month' | 'year' | 'lifetime' | null;
  payment_platform: 'stripe' | 'app_store' | 'play_store' | 'revenuecat' | null;
  environment: 'PRODUCTION' | 'SANDBOX';
  
  // Features
  features: {
    compose_runs: number;          // AI message generations per month
    voice_minutes: number;         // Voice note transcription minutes
    messages: number;              // Outbound messages per month
    contacts: number;              // Maximum contacts
    custom_fields: boolean;        // Custom fields access
    advanced_analytics: boolean;   // Export, charts, etc.
    team_collaboration: boolean;   // Team features
  };
  
  // Metadata
  last_synced_at: string;
  will_expire_within_days: number | null;
}
```

---

## Feature Matrix

| Feature | Free | Pro | Teams | Lifetime |
|---------|------|-----|-------|----------|
| **compose_runs** | 50/mo | 500/mo | Unlimited | Unlimited |
| **voice_minutes** | 30/mo | 300/mo | Unlimited | Unlimited |
| **messages** | 200/mo | 2000/mo | Unlimited | Unlimited |
| **contacts** | 100 | 1000 | Unlimited | Unlimited |
| **custom_fields** | ❌ | ✅ | ✅ | ✅ |
| **advanced_analytics** | ❌ | ✅ | ✅ | ✅ |
| **team_collaboration** | ❌ | ❌ | ✅ | ✅ |

---

## Files Created

### 1. `providers/EntitlementsProvider.tsx`

**What it provides:**
- `useEntitlements()` hook
- `hasFeature()` - Check if user has a feature
- `requireFeature()` - Guard feature access, show upgrade if locked
- `getFeatureLimit()` - Get numeric/boolean feature value
- `isPro`, `isFree`, `isLifetime` - Tier checks
- `refreshEntitlements()` - Force refresh from backend

**Caching:**
- **Stale Time:** 15 minutes (won't refetch until 15min passes)
- **GC Time:** 1 hour (data persists in memory)
- **Refetch:** On window focus, reconnect, and mount

---

## Usage Examples

### Example 1: Feature Gate with Upgrade Flow

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';

export function ExportCSVButton() {
  const { requireFeature } = useEntitlements();

  async function handleExport() {
    // Guard with feature gate
    if (!(await requireFeature('advanced_analytics', 'export_csv_button'))) {
      return; // User redirected to upgrade flow
    }

    // Feature allowed, proceed
    exportToCSV();
  }

  return (
    <TouchableOpacity onPress={handleExport}>
      <Text>Export to CSV</Text>
    </TouchableOpacity>
  );
}
```

**What happens:**
1. User taps "Export to CSV"
2. `requireFeature()` checks if user has `advanced_analytics`
3. If no → Tracks `feature_locked_clicked` event
4. If no → Navigates to `/upgrade-onboarding?feature=advanced_analytics&origin=export_csv_button`
5. If yes → Proceeds with export

---

### Example 2: Conditional UI Based on Feature

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';

export function SettingsScreen() {
  const { hasFeature, getFeatureLimit } = useEntitlements();

  const maxContacts = getFeatureLimit('contacts');
  const canUseCustomFields = hasFeature('custom_fields');

  return (
    <View>
      <Text>Contact Limit: {maxContacts === Infinity ? 'Unlimited' : maxContacts}</Text>
      
      {canUseCustomFields && (
        <TouchableOpacity onPress={() => router.push('/custom-fields')}>
          <Text>Manage Custom Fields</Text>
        </TouchableOpacity>
      )}
      
      {!canUseCustomFields && (
        <TouchableOpacity onPress={() => requireFeature('custom_fields', 'settings')}>
          <Text>🔒 Custom Fields (Pro)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

### Example 3: Tier-Based UI

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';

export function ProfileHeader() {
  const { entitlements, isPro, isLifetime } = useEntitlements();

  return (
    <View>
      <Text>{entitlements?.tier.toUpperCase()}</Text>
      
      {isPro && <Badge text="PRO" color="gold" />}
      {isLifetime && <Badge text="LIFETIME" color="purple" />}
      
      {!isPro && (
        <TouchableOpacity onPress={() => router.push('/upgrade-onboarding')}>
          <Text>Upgrade to Pro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

### Example 4: Usage Tracking (Messages, Compose Runs)

```typescript
import { useEntitlements } from '@/providers/EntitlementsProvider';
import { useState, useEffect } from 'react';

export function ComposeScreen() {
  const { getFeatureLimit, requireFeature } = useEntitlements();
  const [monthlyUsage, setMonthlyUsage] = useState({ composeRuns: 0, messages: 0 });

  const composeLimit = getFeatureLimit('compose_runs');
  const messagesLimit = getFeatureLimit('messages');

  async function handleCompose() {
    // Check if under limit
    if (monthlyUsage.composeRuns >= composeLimit) {
      // Hit limit, require upgrade
      if (!(await requireFeature('compose_runs', 'compose_limit_reached'))) {
        return;
      }
    }

    // Proceed with compose
    await generateMessage();
    setMonthlyUsage(prev => ({ ...prev, composeRuns: prev.composeRuns + 1 }));
  }

  return (
    <View>
      <Text>Compose Runs: {monthlyUsage.composeRuns} / {composeLimit === Infinity ? '∞' : composeLimit}</Text>
      <Button onPress={handleCompose}>Generate Message</Button>
    </View>
  );
}
```

---

## Integration

### Add to App Providers

Update `app/_layout.tsx` to wrap the app with `EntitlementsProvider`:

```typescript
// app/_layout.tsx
import { EntitlementsProvider } from '@/providers/EntitlementsProvider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EntitlementsProvider>  {/* ← Add here */}
            <SubscriptionProvider>
              {/* ... other providers */}
              <Slot />
            </SubscriptionProvider>
          </EntitlementsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## Analytics Events

The `EntitlementsProvider` automatically tracks:

### `feature_locked_clicked`
Fired when user attempts to use a locked feature.

**Properties:**
- `feature` - Feature name (e.g., `advanced_analytics`)
- `origin` - Where the attempt came from (e.g., `export_csv_button`)
- `tier` - Current user tier
- `subscription_status` - Current subscription status

**Example:**
```json
{
  "event": "feature_locked_clicked",
  "properties": {
    "feature": "advanced_analytics",
    "origin": "export_csv_button",
    "tier": "free",
    "subscription_status": null
  }
}
```

---

## Backend API

### Endpoint: Get Entitlements

```http
GET /api/v1/me/entitlements
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "pro",
  "subscription_status": "active",
  "active": true,
  "trial_ends_at": null,
  "current_period_end": "2025-12-02T15:00:00Z",
  "grace_ends_at": null,
  "canceled_at": null,
  "expires_at": null,
  "product_id": "com.everreach.pro.monthly",
  "plan_interval": "month",
  "payment_platform": "revenuecat",
  "environment": "PRODUCTION",
  "features": {
    "compose_runs": 500,
    "voice_minutes": 300,
    "messages": 2000,
    "contacts": 1000,
    "custom_fields": true,
    "advanced_analytics": true,
    "team_collaboration": false
  },
  "last_synced_at": "2025-11-02T15:30:00Z",
  "will_expire_within_days": 30
}
```

**Error Handling:**
- Returns `free` tier defaults if subscription data unavailable
- Logs warning but doesn't crash
- Client retries once on failure

---

## Testing

### Manual Testing

#### 1. Test Free Tier
```typescript
// Should block advanced_analytics
await requireFeature('advanced_analytics'); // → Redirects to upgrade
hasFeature('custom_fields'); // → false
getFeatureLimit('contacts'); // → 100
```

#### 2. Test Pro Tier
```typescript
// Should allow advanced_analytics
hasFeature('advanced_analytics'); // → true
getFeatureLimit('compose_runs'); // → 500
```

#### 3. Test Upgrade Flow
1. As free user, tap "Export CSV"
2. Should navigate to `/upgrade-onboarding?feature=advanced_analytics&origin=export_csv_button`
3. Should track `feature_locked_clicked` event

---

### Backend Testing Endpoints

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

## Troubleshooting

### Entitlements Not Loading

**Symptoms:** `entitlements === null` or stuck on free tier

**Checks:**
1. ✅ Backend `/api/v1/me/entitlements` returns 200
2. ✅ User is authenticated
3. ✅ React Query cache not stale
4. ✅ No network errors in console

**Solution:**
```typescript
const { refreshEntitlements } = useEntitlements();
await refreshEntitlements(); // Force refresh
```

---

### Feature Gate Not Working

**Symptoms:** User can access locked features

**Checks:**
1. ✅ `requireFeature()` called before feature access
2. ✅ Backend returns correct tier
3. ✅ Feature name matches exactly (case-sensitive)

**Debug:**
```typescript
const { entitlements, hasFeature } = useEntitlements();
console.log('Tier:', entitlements?.tier);
console.log('Has advanced_analytics:', hasFeature('advanced_analytics'));
console.log('Features:', entitlements?.features);
```

---

### Upgrade Flow Not Triggering

**Symptoms:** `requireFeature()` doesn't navigate to upgrade

**Checks:**
1. ✅ `router` imported from `expo-router`
2. ✅ `/upgrade-onboarding` route exists
3. ✅ Feature is actually locked (check `hasFeature()`)

**Debug:**
```typescript
const result = await requireFeature('advanced_analytics', 'test');
console.log('Require result:', result); // false = upgrade triggered
```

---

## Performance

### Caching Strategy

- **Initial Load:** 1 API call on mount
- **Subsequent Access:** 0 API calls (cached)
- **Refetch:** Only after 15 minutes of staleness
- **Memory:** Persists 1 hour after last use

### Network Requests

| Action | Network Calls |
|--------|---------------|
| App startup | 1 (fetch entitlements) |
| Navigate screens | 0 (cached) |
| After 15 min | 1 (refetch) |
| Force refresh | 1 (manual refetch) |

---

## Migration from SubscriptionProvider

The new `EntitlementsProvider` works alongside the existing `SubscriptionProvider`:

**Old (SubscriptionProvider):**
```typescript
const { isPaid, tier } = useSubscription();
```

**New (EntitlementsProvider):**
```typescript
const { isPro, hasFeature, requireFeature } = useEntitlements();
```

**Recommendation:** Gradually migrate feature gates to use `EntitlementsProvider` for more granular control.

---

## Summary

### What Was Implemented

✅ **EntitlementsProvider** - React Context with React Query  
✅ **Feature Gates** - `requireFeature()` with upgrade flows  
✅ **Tier System** - Free, Pro, Teams, Lifetime  
✅ **Feature Limits** - Per-tier numeric/boolean limits  
✅ **Analytics** - Automatic event tracking  
✅ **Caching** - 15min stale, 1hr GC, auto-refetch  
✅ **Error Handling** - Graceful fallbacks to free tier  
✅ **Type Safety** - Full TypeScript support  

### Benefits

- 🎯 **Granular Control** - Feature-by-feature gates
- 🚀 **Better UX** - Automatic upgrade flows
- 📊 **Analytics** - Track feature lock attempts
- ⚡ **Performance** - Smart caching reduces API calls
- 🔒 **Security** - Backend-enforced access control
- 🧪 **Testable** - Easy to test with backend endpoints

---

**🎉 Entitlements system is production-ready!**

Users now have seamless feature gating with automatic upgrade flows, comprehensive analytics tracking, and performant caching.
