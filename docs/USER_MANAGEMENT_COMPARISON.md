# User Management Comparison: EverReach vs Superwall

## Current State Analysis

### What We Have

#### **Frontend: `useAuth` + `useSubscription`** (Split Hooks)

**`useAuth` (AuthProviderV2.tsx)**
```typescript
{
  // State
  session: Session | null;
  user: User | LocalUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  orgId: string | null;
  
  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email) => Promise<void>;
  clearPasswordRecovery: () => void;
}
```

**`useSubscription` (SubscriptionProvider.tsx)**
```typescript
{
  // Subscription state
  tier: 'free_trial' | 'paid' | 'expired';
  trialStartDate: string | null;
  trialDaysRemaining: number;
  isPaid: boolean;
  paymentPlatform: 'apple' | 'google' | 'stripe' | null;
  
  // Sync state
  cloudSyncEnabled: boolean;
  autoSyncContacts: boolean;
  syncStatus: 'offline' | 'syncing' | 'synced' | 'error';
  lastSyncDate: string | null;
  
  // Actions
  enableCloudSync: () => Promise<void>;
  disableCloudSync: () => Promise<void>;
  startFreeTrial: () => Promise<void>;
  upgradeToPaid: (platform) => Promise<void>;
  syncNow: () => Promise<void>;
}
```

#### **Backend Endpoints**

**`GET /api/v1/me`**
```typescript
Response {
  user: {
    id: string;
    email: string | null;
    display_name: string | null;
  };
  org: null;
  billing: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    subscription_status: string | null;
    current_period_end: string | null;
  } | null;
}
```

**`GET /api/v1/me/entitlements`**
```typescript
Response {
  plan: 'free' | 'pro' | 'enterprise';
  valid_until: string | null;
  source: 'app_store' | 'play' | 'stripe' | 'manual';
  features: {
    compose_runs: number;
    voice_minutes: number;
    messages: number;
  };
  tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'trial' | 'active' | 'canceled' | 'past_due';
  trial_ends_at: string;
}
```

---

## Superwall's `useUser` Hook

```typescript
{
  // Identity
  identify: (userId, options?) => Promise<void>;
  update: (attributes | fn) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<Record<string, any>>;
  
  // Subscription
  setSubscriptionStatus: (status) => void;
  subscriptionStatus?: {
    status: "UNKNOWN" | "INACTIVE" | "ACTIVE";
    entitlements?: Entitlement[];
  };
  
  // User data
  user?: {
    appUserId: string;
    aliasId: string;
    customAttributes: Record<string, any>;
  } | null;
}
```

---

## Gap Analysis: What We're Missing

### ✅ What We Have

| Feature | Status | Location |
|---------|--------|----------|
| **Authentication** | ✅ Complete | `useAuth` |
| **Sign In (Google, Apple, Email)** | ✅ Complete | `useAuth.signInWith*` |
| **Sign Out** | ✅ Complete | `useAuth.signOut()` |
| **Subscription Status** | ✅ Complete | `useSubscription.tier`, `isPaid` |
| **Trial Management** | ✅ Complete | `useSubscription.trialDaysRemaining` |
| **Payment Platform Tracking** | ✅ Complete | `useSubscription.paymentPlatform` |
| **Backend User Data** | ✅ Complete | `GET /api/v1/me` |
| **Backend Entitlements** | ✅ Complete | `GET /api/v1/me/entitlements` |

### ❌ What We're Missing (vs Superwall)

| Feature | Superwall | Our Equivalent | Gap |
|---------|-----------|----------------|-----|
| **Unified Hook** | `useUser` | Split: `useAuth` + `useSubscription` | ❌ No single unified hook |
| **User Attributes** | `user.customAttributes` | None | ❌ No custom attributes system |
| **Identify User** | `identify(userId, options)` | Automatic via Supabase | ⚠️ Not explicit |
| **Update User** | `update(attributes)` | None | ❌ No attribute update method |
| **Refresh from Server** | `refresh()` | Manual reload | ❌ No explicit refresh method |
| **Set Subscription** | `setSubscriptionStatus()` | Fetched from backend | ⚠️ No manual override |
| **Subscription Entitlements** | `entitlements[]` array | `features` object | ⚠️ Different structure |
| **User Alias** | `aliasId` | None | ❌ No alias system |

---

## Recommended Implementation: `useUser` Hook

### Design Goals
1. **Unified Interface**: Single hook combining auth + subscription + attributes
2. **Server-First**: Always sync with backend as source of truth
3. **Graceful Degradation**: Works offline with cached data
4. **Custom Attributes**: Support user metadata and preferences
5. **Explicit Actions**: Clear methods for identity, update, refresh

### Proposed API

```typescript
// Hook API
const {
  // Identity
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    attributes: Record<string, any>; // NEW
  } | null;
  
  // Subscription
  subscription: {
    status: 'UNKNOWN' | 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
    tier: 'free' | 'pro' | 'enterprise';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    paymentPlatform: 'apple' | 'google' | 'stripe' | null;
    entitlements: {
      compose_runs: number;
      voice_minutes: number;
      messages: number;
    };
  } | null;
  
  // State
  loading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  identify: (userId: string) => Promise<void>; // NEW
  update: (attributes: Record<string, any>) => Promise<void>; // NEW
  refresh: () => Promise<void>; // NEW
  signOut: () => Promise<void>;
  
} = useUser();
```

### Backend Endpoints Needed

#### **`PATCH /api/v1/me`** (NEW)
Update user attributes and metadata.

```typescript
Request {
  attributes: Record<string, any>;
}

Response {
  user: {
    id: string;
    email: string;
    display_name: string;
    attributes: Record<string, any>;
  };
}
```

#### **`POST /api/v1/me/refresh`** (NEW)
Manually refresh user data and subscription status from all sources.

```typescript
Response {
  user: { /* ... */ };
  subscription: { /* ... */ };
  refreshedAt: string;
}
```

#### **`POST /api/v1/me/identify`** (OPTIONAL)
Explicitly associate anonymous user with authenticated identity.

```typescript
Request {
  anonymousId: string;
  userId: string;
}

Response {
  merged: boolean;
  user: { /* ... */ };
}
```

---

## Implementation Plan

### Phase 1: Backend Endpoints (Est: 2-3 hours)
1. ✅ `GET /api/v1/me` - Already exists
2. ✅ `GET /api/v1/me/entitlements` - Already exists
3. ❌ **`PATCH /api/v1/me`** - Create for user attribute updates
4. ❌ **`POST /api/v1/me/refresh`** - Create for explicit refresh
5. ⚠️ Add `attributes` JSONB column to `profiles` table

### Phase 2: Frontend Hook (Est: 3-4 hours)
1. ❌ Create `providers/UserProvider.tsx`
2. ❌ Combine `useAuth` + `useSubscription` logic
3. ❌ Add `identify()`, `update()`, `refresh()` methods
4. ❌ Implement caching strategy (React Query recommended)
5. ❌ Add optimistic updates for UX

### Phase 3: Migration (Est: 1-2 hours)
1. ❌ Update all `useAuth` + `useSubscription` usage to `useUser`
2. ❌ Test authentication flows
3. ❌ Test subscription flows
4. ❌ Deprecate old hooks (keep for 1 version)

### Phase 4: Custom Attributes (Est: 2-3 hours)
1. ❌ Define attribute schema (onboarding_completed, preferred_channel, etc.)
2. ❌ Implement server-side validation
3. ❌ Add attribute update UI components
4. ❌ Use attributes for personalization

---

## Benefits of Unified `useUser` Hook

### Developer Experience
- **Single Import**: `useUser()` instead of `useAuth()` + `useSubscription()`
- **Consistent API**: Similar to industry standards (Superwall, Clerk, Auth0)
- **Type Safety**: Single source of truth for user state types
- **Less Boilerplate**: Fewer provider wrappers needed

### User Experience
- **Faster Loads**: Batch user data requests
- **Reliable State**: Single source of truth prevents sync issues
- **Offline Support**: Unified caching strategy
- **Personalization**: Custom attributes enable rich experiences

### Maintenance
- **Easier Debugging**: Single state tree for user data
- **Simpler Testing**: Mock one hook instead of two
- **Future-Proof**: Easy to add new user properties
- **Backend Alignment**: Frontend hook mirrors backend `/me` endpoint

---

## Example Usage Comparison

### Current (Split Hooks)
```typescript
import { useAuth } from '@/providers/AuthProviderV2';
import { useSubscription } from '@/providers/SubscriptionProvider';

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { tier, isPaid, trialDaysRemaining } = useSubscription();
  
  if (!user) return <SignIn />;
  
  return (
    <View>
      <Text>{user.email}</Text>
      <Text>Plan: {tier}</Text>
      <Text>Trial: {trialDaysRemaining} days</Text>
      <Button onPress={signOut}>Sign Out</Button>
    </View>
  );
}
```

### Proposed (Unified Hook)
```typescript
import { useUser } from '@/providers/UserProvider';

function ProfilePage() {
  const { user, subscription, refresh, signOut } = useUser();
  
  if (!user) return <SignIn />;
  
  return (
    <View>
      <Text>{user.email}</Text>
      <Text>Plan: {subscription.tier}</Text>
      <Text>Trial: {subscription.trialDaysRemaining} days</Text>
      <Button onPress={refresh}>Refresh</Button>
      <Button onPress={signOut}>Sign Out</Button>
    </View>
  );
}
```

---

## Next Steps

### Immediate Actions
1. **Decide on Approach**: Unified `useUser` vs keep split hooks?
2. **Backend First**: Implement `PATCH /api/v1/me` and `POST /api/v1/me/refresh`
3. **Database Migration**: Add `attributes` column to `profiles` table
4. **Frontend Hook**: Create `UserProvider` combining auth + subscription
5. **Gradual Migration**: Update high-traffic pages first

### Long-term Considerations
- **Custom Attributes Schema**: What user properties do we need?
- **Analytics Integration**: Track attribute changes in PostHog
- **Personalization Strategy**: How do we use attributes?
- **Multi-tenancy**: How do organizations fit into user model?
- **RevenueCat Integration**: If we add, how does it sync with our backend?

---

## Conclusion

**We have 70% of Superwall's functionality**, but it's split across two hooks and lacks:
- Unified developer interface
- Custom user attributes system
- Explicit refresh mechanism
- Manual subscription status overrides

**Recommended**: Implement unified `useUser` hook for better DX and future flexibility.

**Estimated Total Effort**: 8-12 hours
**Priority**: Medium (not blocking, but improves maintainability)
**Risk**: Low (can implement gradually alongside existing hooks)
