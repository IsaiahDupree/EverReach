# EverReach → App Kit Backport Changelog

> Production improvements from the EverReach backend, iOS app, and web app that should be
> applied to the App Kit (`backend-kit/`, `ios-starter/`, `web-kit/`).
>
> Generated: February 13, 2026
> Source branches: `feat/subscription-events` (backend), `qa/test-coverage-v1` (iOS), `web-frontend` (web)

---

## Table of Contents

1. [Backend Kit Improvements](#1-backend-kit-improvements)
2. [iOS Starter Improvements](#2-ios-starter-improvements)
3. [Web Kit Improvements](#3-web-kit-improvements)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Meta Conversions API Integration](#5-meta-conversions-api-integration)
6. [RevenueCat Event Tracking](#6-revenuecat-event-tracking)
7. [Migration Checklist](#7-migration-checklist)

---

## 1. Backend Kit Improvements

### 1.1 Webhook Security — Signature Verification + Fail-Closed Auth

**Current app-kit state:** RevenueCat webhook (`backend-kit/app/api/webhooks/revenuecat/route.ts`) uses only Bearer token auth. No HMAC signature verification. Error responses leak `error.message` with DB details.

**Production fix:**
- Add dual auth: HMAC signature verification (`x-revenuecat-signature`) **and** Bearer token
- Fail-closed: reject in production when secret is not configured (don't allow requests through)
- Return generic error messages, log details server-side only

```typescript
// BEFORE (app-kit): Only Bearer token
const token = authorization.replace('Bearer ', '');
if (token !== webhookSecret) { return 401; }

// AFTER (production): Signature + Bearer, fail-closed
const isSignatureValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
const isBearerValid = Boolean(expectedBearer) && authHeader === `Bearer ${expectedBearer}`;
const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
if (!isSignatureValid && !isBearerValid && !isDev) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Files to update:**
- `backend-kit/app/api/webhooks/revenuecat/route.ts`
- `backend-kit/app/api/webhooks/stripe/route.ts` (same pattern for error sanitization)

### 1.2 Webhook Idempotency

**Current app-kit state:** No deduplication. If RevenueCat retries a webhook, duplicate rows are created.

**Production fix:**
- Add `subscription_events` audit table with unique constraint on `(transaction_id, event_type)`
- Log every webhook event before processing; skip if duplicate
- Return 200 for duplicates (so provider stops retrying)

```typescript
// Log event first — skip if duplicate
const { error: logError } = await supabase
  .from('subscription_events')
  .insert({ transaction_id, event_type, user_id, ... });

if (logError?.code === '23505') { // unique_violation
  console.log('Duplicate event, skipping');
  return NextResponse.json({ success: true, skipped: 'duplicate' });
}
```

**Files to create/update:**
- `backend-kit/app/api/webhooks/revenuecat/route.ts` — add idempotency check
- DB migration: `subscription_events` table (see §4)

### 1.3 Expanded Subscription Status + RevenueCat Event Types

**Current app-kit state:**
- `RevenueCatEventType` only has: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `TEST`
- `mapStripeStatus()` maps `past_due` → `expired` (wrong — should be `grace`)

**Production fix:**
- Add RC events: `BILLING_ISSUE`, `PRODUCT_CHANGE`, `SUBSCRIBER_ALIAS`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `TRANSFER`
- Map `past_due` → `grace` (user still has access during payment retry)
- Add `paused` status support

```typescript
// BEFORE (app-kit Stripe mapping)
case 'past_due': return 'expired';    // ❌ Wrong — locks out users still in retry
case 'unpaid': return 'expired';

// AFTER (production Stripe mapping)
case 'past_due': return 'grace';      // ✅ User keeps access during payment retry
case 'paused': return 'paused';       // ✅ New status
case 'unpaid': return 'canceled';
```

**Files to update:**
- `backend-kit/app/api/webhooks/revenuecat/route.ts` — expand event types
- `backend-kit/app/api/webhooks/stripe/route.ts` — fix `mapStripeStatus()`

### 1.4 Centralized Supabase Client (Singleton)

**Current app-kit state:** `createAdminClient()` creates a new client every call. This is fine for the kit's scale but doesn't match production pattern.

**Production fix:**
- `getServiceClient()` — lazy singleton, cached across invocations
- All cron routes and webhooks use it instead of inline `createClient()`

```typescript
// lib/supabase.ts (production pattern)
let _serviceClient: SupabaseClient | null = null;
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _serviceClient;
}
```

**Note:** The app-kit's `adminClient` singleton in `lib/supabase/admin.ts` is similar. The key fix is ensuring all routes use it consistently rather than calling `createAdminClient()` each time.

### 1.5 Cron Auth Utility (Fail-Closed)

**Current app-kit state:** No cron routes exist in the kit.

**Production addition:** Centralized `lib/cron-auth.ts` — reusable for any cron route.

```typescript
// lib/cron-auth.ts
export function verifyCron(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // Auth passed
}
```

**Files to create:**
- `backend-kit/lib/utils/cron-auth.ts`

### 1.6 Cache-Control Headers for Read-Only Endpoints

**Current app-kit state:** No caching headers on any endpoint.

**Production fix:** Add `Cache-Control` to read-only routes:

| Endpoint Pattern | Cache Header |
|-----------------|-------------|
| Public data (changelog, offerings) | `public, max-age=300, s-maxage=300` |
| Health check | `public, max-age=10, s-maxage=10` |
| User-specific reads (subscription) | `private, max-age=30, must-revalidate` |

**Files to update:**
- `backend-kit/app/api/health/route.ts`
- `backend-kit/app/api/subscriptions/status/route.ts`

### 1.7 Error Response Sanitization

**Current app-kit state:** Webhook handlers return `message: error.message` in 500 responses, which can leak DB table names, column names, and constraint details.

**Production fix:** The app-kit `handleError()` in `lib/utils/errors.ts` already does this correctly for regular `Error` instances. But the webhook routes bypass it and leak details directly:

```typescript
// BEFORE (app-kit webhooks):
return NextResponse.json({
  error: 'Internal Server Error',
  message: error.message,          // ❌ Leaks DB details
}, { status: 500 });

// AFTER:
console.error('[Webhook] Error:', error);  // Log server-side
return NextResponse.json({
  error: 'Internal Server Error',          // ✅ Generic
}, { status: 500 });
```

**Files to update:**
- `backend-kit/app/api/webhooks/revenuecat/route.ts` — 4 error responses
- `backend-kit/app/api/webhooks/stripe/route.ts` — 3 error responses

---

## 2. iOS Starter Improvements

### 2.1 Expanded Subscription Types

**Current app-kit state:**
```typescript
// types/subscription.ts
enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIALING = 'trialing',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
```

**Production fix:**
```typescript
export type SubscriptionStatus =
  | 'trial' | 'active' | 'grace' | 'paused'
  | 'past_due' | 'canceled' | 'expired' | 'refunded';
```

Key changes:
- `TRIALING` → `trial` (matches backend schema)
- `INACTIVE` removed (not a real status)
- `CANCELLED` → `canceled` (American spelling, matches Stripe)
- Added: `grace`, `paused`, `past_due`, `refunded`

**Files to update:**
- `ios-starter/types/subscription.ts`

### 2.2 `hasAccess` Computed Property

**Current app-kit state:** `useSubscription.ts` only checks `ACTIVE` and `TRIALING`:
```typescript
const activeStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];
return activeStatuses.includes(subscription.status);
```

**Production fix:** Users in `grace` and `past_due` should retain access:
```typescript
const hasAccess = isActive || isTrial || isGrace
  || entitlements?.subscription_status === 'past_due';
```

**Files to update:**
- `ios-starter/hooks/useSubscription.ts` — add `isGrace`, `isPaused`, `hasAccess`

### 2.3 EntitlementsProvider Pattern (Backend-First)

**Current app-kit state:** `useSubscription` fetches directly from Supabase `subscriptions` table.

**Production pattern:** `EntitlementsProviderV3` fetches from a backend API endpoint (`/api/v1/billing/entitlements`) which combines subscription data, tier limits, and feature gates into a single response. Falls back to RevenueCat on mobile if backend is down.

This is a larger architectural change — document as recommended upgrade path.

### 2.4 Subscription Tier Updates

**Current app-kit state:** Tiers: `free`, `basic`, `pro`, `premium`/`enterprise`

**Production tiers:** `free`, `core`, `pro`, `team`

**Files to update:**
- `ios-starter/types/subscription.ts` — update `SubscriptionTier` enum

---

## 3. Web Kit Improvements

### 3.1 Same Type Expansions as iOS

Apply the same `SubscriptionStatus` and `SubscriptionTier` changes from §2.1 and §2.4.

**Files to update:**
- `web-kit/hooks/use-subscription.ts`

### 3.2 `hasAccess` for Web

Same `hasAccess` logic from §2.2. Web users rely entirely on the backend response (no RevenueCat fallback), so this is the **only** access check.

---

## 4. Database Schema Changes

### 4.1 Subscriptions Table Expanded

```sql
-- Add new status values
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial','active','grace','paused','past_due','canceled','expired','refunded'));

-- Add store column
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS store TEXT
  CHECK (store IN ('app_store', 'play', 'stripe'));

-- Unique constraint: one subscription per user per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_store
  ON subscriptions(user_id, store);
```

### 4.2 Entitlements Table

```sql
CREATE TABLE IF NOT EXISTS entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'core', 'pro', 'team')),
  valid_until TIMESTAMPTZ,
  source TEXT CHECK (source IN ('app_store', 'play', 'stripe', 'manual', 'revenuecat')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  subscription_id UUID REFERENCES subscriptions(id)
);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own entitlements"
  ON entitlements FOR SELECT USING (auth.uid() = user_id);
```

### 4.3 Subscription Events Audit Table (NEW)

```sql
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_id TEXT,
  store TEXT,
  environment TEXT,
  period_type TEXT,
  plan TEXT,
  status TEXT,
  transaction_id TEXT,
  original_transaction_id TEXT,
  revenue NUMERIC,
  currency TEXT,
  entitlement_ids TEXT[],
  is_trial_conversion BOOLEAN DEFAULT false,
  raw_payload JSONB,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotency: prevent duplicate event processing
CREATE UNIQUE INDEX idx_subscription_events_dedup
  ON subscription_events(transaction_id, event_type)
  WHERE transaction_id IS NOT NULL;

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policy — only service role writes
```

---

## 5. Meta Conversions API Integration

### 5.1 Server-Side Event Tracking (NEW for App Kit)

**Production implementation:** `ios-app/lib/metaAppEvents.ts`

Key features to backport:
- SHA-256 hashed user data (email, phone, name, location) per Meta requirements
- `fbp` cookie persisted to AsyncStorage (survives restart)
- `fbc` click ID persisted with 7-day expiry
- `client_ip` cached and refreshed on init
- Batch event queue with flush interval
- Server-side Conversions API calls (not pixel-based)

```typescript
// lib/metaAppEvents.ts — Core interface
interface MetaUserProfile {
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Call on login/signup
identifyMetaUser(email, phone, profile: MetaUserProfile);

// Call on logout
clearMetaUserData();

// Track events
trackMetaEvent('Purchase', { value: 9.99, currency: 'USD' });
trackMetaEvent('Subscribe', { predicted_ltv: 120 });
```

### 5.2 Required Environment Variables

```bash
# .env
EXPO_PUBLIC_META_PIXEL_ID=your_pixel_id
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=your_token  # Generate from Events Manager, NOT Business Settings
EXPO_PUBLIC_META_TEST_EVENT_CODE=TESTxxxxx          # For testing only
```

**Important:** Generate the token from **Events Manager → Pixel Settings → Conversions API → Set up manually → Generate access token**. Do NOT use Business Settings → System Users (causes error #270).

### 5.3 Event Match Quality Parameters

| Parameter | Persistence | Cleared On |
|-----------|------------|------------|
| `em` (email hash) | AsyncStorage | Logout |
| `ph` (phone hash) | AsyncStorage | Logout |
| `fn` (first name hash) | AsyncStorage | Logout |
| `ln` (last name hash) | AsyncStorage | Logout |
| `ct` (city hash) | AsyncStorage | Logout |
| `st` (state hash) | AsyncStorage | Logout |
| `zp` (zip hash) | AsyncStorage | Logout |
| `country` (hash) | AsyncStorage | Logout |
| `fbp` (browser ID) | AsyncStorage | Never (device-level) |
| `fbc` (click ID) | AsyncStorage | 7-day expiry |
| `client_ip` | Memory | Refreshed on init |

**Files to create:**
- `ios-starter/lib/metaAppEvents.ts`
- `web-kit/lib/metaEvents.ts` (web version using cookies instead of AsyncStorage)

---

## 6. RevenueCat Event Tracking

### 6.1 Expanded Webhook Events

**Current app-kit:** Handles 4 events.
**Production:** Handles 10+ events.

| Event | App Kit | Production | Action |
|-------|---------|-----------|--------|
| `INITIAL_PURCHASE` | ✅ | ✅ | Upsert subscription + entitlements |
| `RENEWAL` | ✅ | ✅ | Update status → active |
| `CANCELLATION` | ✅ | ✅ | Update status → canceled |
| `EXPIRATION` | ✅ | ✅ | Update status → expired |
| `BILLING_ISSUE` | ❌ | ✅ | Update status → grace |
| `PRODUCT_CHANGE` | ❌ | ✅ | Update plan + product_id |
| `SUBSCRIBER_ALIAS` | ❌ | ✅ | Log only, no DB update |
| `UNCANCELLATION` | ❌ | ✅ | Update status → active |
| `NON_RENEWING_PURCHASE` | ❌ | ✅ | One-time purchase handling |
| `TRANSFER` | ❌ | ✅ | Update user_id mapping |
| `TEST` | ✅ | ✅ | Log only |

### 6.2 Entitlement Recomputation

After every subscription change, production recomputes entitlements:

```typescript
async function recomputeEntitlements(userId: string, supabase: SupabaseClient) {
  // 1. Find the user's highest-priority active subscription
  // 2. Map product_id → plan (free/core/pro/team)
  // 3. Upsert into entitlements table
  // 4. Set valid_until from current_period_end
}
```

This ensures the `entitlements` table is always the single source of truth for what features a user can access.

### 6.3 Client-Side Event Logging

Production iOS app logs subscription events for analytics:

```typescript
analytics.track('subscription_purchased', {
  product_id, plan, store, price, period_type
});
analytics.track('subscription_restored', { tier, source });
analytics.track('subscription_canceled', { reason });
```

---

## 7. Migration Checklist

### Backend Kit (`backend-kit/`)

| # | Change | Priority | Complexity |
|---|--------|----------|------------|
| 1 | Add HMAC signature verification to RC webhook | 🔴 Critical | Low |
| 2 | Add idempotency to RC webhook (subscription_events table) | 🔴 Critical | Medium |
| 3 | Fix `mapStripeStatus()` — `past_due` → `grace` | 🔴 Critical | Low |
| 4 | Sanitize error.message in webhook 500 responses (6 places) | 🟡 High | Low |
| 5 | Expand RC webhook event types (BILLING_ISSUE, PRODUCT_CHANGE, etc.) | 🟡 High | Medium |
| 6 | Add `lib/utils/cron-auth.ts` utility | 🟢 Medium | Low |
| 7 | Add Cache-Control headers to read endpoints | 🟢 Medium | Low |
| 8 | Add entitlements recomputation after subscription changes | 🟢 Medium | Medium |

### iOS Starter (`ios-starter/`)

| # | Change | Priority | Complexity |
|---|--------|----------|------------|
| 9 | Expand `SubscriptionStatus` to 8 values | 🔴 Critical | Low |
| 10 | Update `SubscriptionTier` (basic→core, premium→team) | 🟡 High | Low |
| 11 | Add `hasAccess` (includes grace + past_due) | 🔴 Critical | Low |
| 12 | Add Meta Conversions API integration (`lib/metaAppEvents.ts`) | 🟡 High | High |
| 13 | Add subscription event analytics tracking | 🟢 Medium | Low |

### Web Kit (`web-kit/`)

| # | Change | Priority | Complexity |
|---|--------|----------|------------|
| 14 | Same status/tier type expansions as iOS (#9, #10) | 🔴 Critical | Low |
| 15 | Add `hasAccess` to web subscription hook | 🔴 Critical | Low |
| 16 | Add Meta Conversions API (web version with cookies) | 🟡 High | Medium |

### Database

| # | Change | Priority | Complexity |
|---|--------|----------|------------|
| 17 | Expand subscriptions status check constraint | 🔴 Critical | Low |
| 18 | Add `store` column + unique index | 🟡 High | Low |
| 19 | Create `entitlements` table | 🟡 High | Medium |
| 20 | Create `subscription_events` audit table | 🟡 High | Medium |

### Documentation

| # | Change | Priority | Complexity |
|---|--------|----------|------------|
| 21 | Update `docs/06-PAYMENTS.md` with expanded statuses + grace period | 🟡 High | Low |
| 22 | Update `docs/10-SECURITY.md` with webhook signature verification | 🟡 High | Low |
| 23 | Update `docs/13-ANALYTICS.md` with Meta CAPI integration | 🟡 High | Medium |
| 24 | Add `docs/15-EVENT-TRACKING.md` — unified event tracking guide | 🟢 Medium | Medium |

---

## 8. Warmth EWMA Unification (v1.1.0 — February 13, 2026)

### Overview

Replaced **3 different warmth formulas** (client-side exponential decay, backend heuristic, dashboard inline thresholds) with a **single EWMA (Exponentially Weighted Moving Average) model**.

### Formula

```
score = 30 + amplitude × e^(-λ × daysSinceUpdate)
```

- **BASE** = 30 (neglected contacts settle here)
- **λ (decay rate)** by `warmth_mode`: fast=0.138629, medium=0.085998, slow=0.046210
- **Impulse weights**: meeting=9, call=7, email=5, sms=4, note=3

### Band Thresholds (Unified Standard)

| Band | Score | Color |
|------|-------|-------|
| Hot | ≥ 80 | #EF4444 (red) |
| Warm | ≥ 60 | #F59E0B (orange) |
| Neutral | ≥ 40 | #10B981 (green) |
| Cool | ≥ 20 | #3B82F6 (blue) |
| Cold | < 20 | #6B7280 (gray) |

### Backend Changes

- `lib/warmth-ewma.ts` — `computeWarmthFromAmplitude()` + `updateAmplitudeForContact()`
- `api/cron/daily-warmth/route.ts` — Rewritten to use EWMA instead of per-contact interaction counting
- `api/v1/contacts/route.ts` — POST initializes `warmth=30, amplitude=0, warmth_band='cool'`
- All interaction endpoints call `updateAmplitudeForContact()`: interactions, messages/send, notes

### iOS / Web Frontend Changes

| File | Change |
|------|--------|
| `lib/warmth-utils.ts` | Removed `calculateWarmth()`, updated thresholds to 80/60/40/20 |
| `lib/supabase.ts` | Removed `calculateWarmth` re-export |
| `hooks/useDashboardData.ts` | EWMA thresholds, `cooling` → `cool`, added `neutral` band |
| `hooks/useContacts.ts` | Fixed `warmth_band` type: `cooling` → `cool` |
| `providers/WarmthProvider.tsx` | EWMA thresholds, added `neutral` band, default fallback → 30 |
| `app/(tabs)/home.tsx` | `by_band.cooling` → merged `cool` + `neutral` |
| `components/WarmthGraph.tsx` | Updated legend to EWMA thresholds |
| `lib/imageUpload.ts` | Removed stale `cooling` case |
| `__tests__/warmth-utils.test.ts` | Removed `calculateWarmth` tests, updated expectations |

### Database Columns on `contacts` Table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `warmth` | integer | 30 | EWMA score |
| `warmth_band` | text | 'cool' | hot/warm/neutral/cool/cold |
| `warmth_mode` | text | 'medium' | fast/medium/slow decay rate |
| `warmth_anchor_score` | numeric | 30 | Score at last interaction |
| `warmth_anchor_at` | timestamptz | now() | When last interaction occurred |
| `amplitude` | numeric | 0 | Accumulated interaction impulse |
| `warmth_last_updated_at` | timestamptz | now() | Last recompute timestamp |

### App Kit Action Items

| # | Change | Priority |
|---|--------|----------|
| 25 | Add `warmth-ewma.ts` to backend-kit with `computeWarmthFromAmplitude` + `updateAmplitudeForContact` | 🟡 High |
| 26 | Update any warmth threshold references to 80/60/40/20 | 🟡 High |
| 27 | Remove any client-side `calculateWarmth` functions — warmth is backend-computed | 🟡 High |
| 28 | Add warmth EWMA columns to database schema docs | 🟡 High |
| 29 | Update `docs/02-ARCHITECTURE.md` with EWMA warmth model description | 🟢 Medium |
| 30 | Update `docs/04-DATABASE.md` with contacts EWMA columns | 🟢 Medium |

---

## Appendix: Source Files Reference

| Production File | App Kit Equivalent | Status |
|----------------|-------------------|--------|
| `backend/app/api/webhooks/revenuecat/route.ts` | `backend-kit/app/api/webhooks/revenuecat/route.ts` | Needs update |
| `backend/app/api/webhooks/stripe/route.ts` | `backend-kit/app/api/webhooks/stripe/route.ts` | Needs update |
| `backend/lib/cron-auth.ts` | *(does not exist)* | Create new |
| `backend/lib/supabase.ts` (getServiceClient) | `backend-kit/lib/supabase/admin.ts` | Similar, OK |
| `backend/lib/warmth-ewma.ts` | *(does not exist)* | Create new |
| `backend/app/api/cron/daily-warmth/route.ts` | *(does not exist)* | Create new |
| `ios-app/providers/EntitlementsProviderV3.tsx` | `ios-starter/hooks/useSubscription.ts` | Needs update |
| `ios-app/repos/SubscriptionRepo.ts` | *(no equivalent)* | Create new |
| `ios-app/lib/metaAppEvents.ts` | *(does not exist)* | Create new |
| `ios-app/lib/warmth-utils.ts` | *(review for kit)* | Display-only funcs |
| `web-frontend/providers/EntitlementsProviderV3.tsx` | `web-kit/hooks/use-subscription.ts` | Needs update |
