# PRD: Complete Event Catalog — Backend & Database Integration

## 1. Executive Summary

This document catalogs **every event** fired across EverReach's client and server, where each event currently lands, and exactly what needs to happen to make every event persist in the backend/database for analytics, debugging, and business intelligence.

**Key finding:** Many events are currently client-only (in-memory or PostHog-only). This PRD defines how to route them all through the backend into Supabase so they survive sessions and are queryable.

**No reconfiguration is needed when developer mode is off.** All production pipelines are already ungated (see §7).

---

## 2. Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (React Native)                                         │
│                                                                 │
│  ┌──────────────┐   ┌───────────────────┐   ┌───────────────┐ │
│  │ paymentEvent  │   │  analytics.track() │   │ metaAppEvents │ │
│  │ Logger        │   │                   │   │  (CAPI)       │ │
│  │ (in-memory)   │   │ → AnalyticsRepo   │   │ → Meta Graph  │ │
│  │               │   │ → PostHog         │   │   API         │ │
│  │ ⚠️ NO DB     │   │ → Meta (mapped)   │   │               │ │
│  └──────────────┘   └────────┬──────────┘   └───────────────┘ │
│                              │                                  │
│                    POST /api/v1/events/track                    │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│  BACKEND (Vercel Edge)       │                                  │
│                              ▼                                  │
│                    ┌──────────────────┐                         │
│                    │   app_events     │ ← generic analytics     │
│                    │   (Supabase)     │                         │
│                    └──────────────────┘                         │
│                                                                 │
│  RevenueCat Server ──webhook──▶ /api/webhooks/revenuecat        │
│                                       │                         │
│                              ┌────────┴────────┐               │
│                              ▼                  ▼               │
│                    ┌──────────────┐   ┌──────────────┐         │
│                    │ subscriptions│   │ entitlements  │         │
│                    │ (Supabase)   │   │ (Supabase)    │         │
│                    └──────────────┘   └──────────────┘         │
│                                                                 │
│  ⚠️ NO subscription_events table (webhook events not logged)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Tables (Current)

### 3.1 `app_events` — Generic Analytics Store

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK → auth.users (nullable) |
| `event_name` | text | NOT NULL, snake_case |
| `event_type` | text | Legacy alias of event_name |
| `platform` | text | ios / android / web |
| `app_version` | text | e.g. "1.0.0" |
| `metadata` | jsonb | All event properties |
| `device_info` | jsonb | User agent etc. |
| `session_info` | jsonb | `{ session_id }` |
| `occurred_at` | timestamptz | When event happened |

**Fed by:** `analytics.track()` → `AnalyticsRepo.trackEvent()` → `POST /api/v1/events/track`

**Gate:** `EXPO_PUBLIC_ENABLE_BACKEND_ANALYTICS=true` (currently ON in `.env`)

### 3.2 `subscriptions` — Subscription State

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | PK (with store) |
| `tier` | text | free / core / pro / team |
| `status` | text | active / trial / canceled / expired |
| `product_id` | text | App Store product ID |
| `store` | text | app_store / play / stripe |
| `current_period_end` | timestamptz | When subscription expires |
| `transaction_id` | text | Latest transaction |
| `original_transaction_id` | text | Original transaction |
| `updated_at` | timestamptz | Last webhook update |

**Fed by:** RevenueCat webhook → `POST /api/webhooks/revenuecat`

### 3.3 `entitlements` — Feature Access

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | PK |
| `tier` | text | free / core / pro / team |
| `subscription_status` | text | active / trial / canceled / expired |
| `payment_platform` | text | "revenuecat" |
| `environment` | text | PRODUCTION / SANDBOX |
| `trial_ends_at` | timestamptz | Trial expiry |
| `current_period_end` | timestamptz | Period expiry |
| `features` | jsonb | `{ compose_runs, voice_minutes, ... }` |
| `updated_at` | timestamptz | Last update |

**Fed by:** RevenueCat webhook → `POST /api/webhooks/revenuecat`

---

## 4. Complete Event Catalog

### 4.1 RevenueCat SDK Events (Client — `logRevenueCatEvent`)

These fire on the client via `paymentEventLogger`. Currently **in-memory only** — they do NOT reach the backend or DB.

| Event Name | Trigger Location | Payload | Hits Backend? | Hits DB? |
|-----------|-----------------|---------|:---:|:---:|
| `revenuecat_initialized` | `_layout.tsx` | `{ user_id, platform }` | ❌ | ❌ |
| `revenuecat_init_failed` | `_layout.tsx` | `{ user_id, platform }` | ❌ | ❌ |
| `revenuecat_identified` | `_layout.tsx` | `{ user_id, created }` | ❌ | ❌ |
| `revenuecat_identify_failed` | `_layout.tsx` | `{ user_id, error }` | ❌ | ❌ |
| `revenuecat_customer_info_updated` | `_layout.tsx` | `{ active_entitlements[], has_active }` | ❌ | ❌ |
| `revenuecat_offerings_fetched` | `revenuecat.ts` | `{ offering_count, current_id, package_count }` | ❌ | ❌ |
| `revenuecat_offerings_empty` | `revenuecat.ts` | `{ has_current }` | ❌ | ❌ |
| `purchase_attempt` | `subscription-plans.tsx` | `{ plan_id, price }` | ❌ | ❌ |
| `purchase_success` | `subscription-plans.tsx` | `{ plan_id, transaction_id }` | ❌ | ❌ |
| `purchase_cancelled` | `subscription-plans.tsx` | `{ plan_id }` | ❌ | ❌ |
| `restore_attempt` | `subscription-plans.tsx` | `{}` | ❌ | ❌ |
| `restore_success` | `subscription-plans.tsx` | `{ entitlements[] }` | ❌ | ❌ |
| `restore_error` | `subscription-plans.tsx` | `{ error }` | ❌ | ❌ |

### 4.2 SubscriptionManager Events (Client — bridged to `logRevenueCatEvent`)

State machine transitions. Bridged to `paymentEventLogger` via `sm_*` prefix. Currently **in-memory only**.

| Event Name | Trigger | Payload | Hits Backend? | Hits DB? |
|-----------|---------|---------|:---:|:---:|
| `sm_purchase_started` | User taps purchase | `{ package_id }` | ❌ | ❌ |
| `sm_purchase_completed` | StoreKit confirms | `{ transaction_id, product_id }` | ❌ | ❌ |
| `sm_purchase_cancelled` | User cancels sheet | `{ reason }` | ❌ | ❌ |
| `sm_purchase_failed` | Purchase error | `{ error }` | ❌ | ❌ |
| `sm_restore_started` | User taps restore | `{}` | ❌ | ❌ |
| `sm_restore_completed` | Restore succeeds | `{ entitlements[] }` | ❌ | ❌ |
| `sm_restore_failed` | Restore errors | `{ error }` | ❌ | ❌ |
| `sm_backend_sync_started` | Syncing to backend | `{ user_id }` | ❌ | ❌ |
| `sm_backend_sync_completed` | Backend confirmed | `{ tier, status }` | ❌ | ❌ |
| `sm_backend_sync_failed` | Backend error | `{ error, status_code }` | ❌ | ❌ |
| `sm_entitlements_refreshed` | Manual refresh | `{ entitlements[] }` | ❌ | ❌ |
| `sm_entitlements_synced` | Sync from backend | `{ tier, features }` | ❌ | ❌ |

### 4.3 Client Analytics Events (via `analytics.track`)

These go through `AnalyticsRepo.trackEvent()` → `POST /api/v1/events/track` → `app_events` table.

| Event Name | File | PostHog | Meta CAPI | Backend DB (`app_events`) |
|-----------|------|:---:|:---:|:---:|
| `revenuecat_offerings_loaded` | `RevenueCatPaywall.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_offerings_failed` | `RevenueCatPaywall.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_plan_selected` | `RevenueCatPaywall.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_purchase_started` | `RevenueCatPaywallUI.tsx` | ✅ | ✅ → InitiateCheckout | ✅ |
| `revenuecat_purchase_success` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_purchase_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_purchase_cancelled` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_restore_started` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_restore_success` | `RevenueCatPaywallUI.tsx` | ✅ | ✅ → Subscribe | ✅ |
| `revenuecat_restore_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_offering_loaded` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `revenuecat_offering_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ | ✅ |
| `plan_selected` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `purchase_initiated` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `purchase_succeeded` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `purchase_completed` | `subscription-plans.tsx` | ✅ | ✅ → Purchase | ✅ |
| `purchase_failed` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `trial_started` | `subscription-plans.tsx` | ✅ | ✅ → StartTrial | ✅ |
| `subscription_upgraded` | `subscription-plans.tsx` | ✅ | ✅ → Subscribe | ✅ |
| `restore_purchases_initiated` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `restore_purchases_success` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |
| `restore_purchases_failed` | `subscription-plans.tsx` | ✅ | ❌ | ✅ |

### 4.4 Server-Side Webhook Events (RevenueCat → Backend)

These come from RevenueCat's server. Currently update `subscriptions` + `entitlements` tables but are NOT logged as discrete events.

| RC Webhook Type | DB Tables Updated | Logged to `app_events`? | Meta CAPI? |
|----------------|:-----------------:|:---:|:---:|
| `INITIAL_PURCHASE` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `RENEWAL` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `CANCELLATION` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `UNCANCELLATION` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `EXPIRATION` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `BILLING_ISSUE` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `PRODUCT_CHANGE` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `REFUND` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `NON_RENEWING_PURCHASE` | subscriptions, entitlements | ❌ GAP | ❌ (planned) |
| `SUBSCRIPTION_PAUSED` | (not handled) | ❌ GAP | ❌ |
| `SUBSCRIBER_ALIAS` | skipped (informational) | ❌ | ❌ |

### 4.5 Meta Conversions API Events

These are sent directly to Meta's Graph API. They are NOT stored in Supabase.

| Meta Event | Internal Trigger | Stored in DB? |
|-----------|-----------------|:---:|
| `Purchase` | `purchase_completed`, `INITIAL_PURCHASE`, `RENEWAL` | ❌ (Meta only) |
| `StartTrial` | `trial_started`, `INITIAL_PURCHASE` (trial) | ❌ (Meta only) |
| `Subscribe` | `subscription_upgraded`, `revenuecat_restore_success` | ❌ (Meta only) |
| `InitiateCheckout` | `revenuecat_purchase_started` | ❌ (Meta only) |
| `Cancel` | `CANCELLATION` webhook | ❌ (Meta only) |
| `Churn` | `EXPIRATION` webhook | ❌ (Meta only) |
| `BillingIssue` | `BILLING_ISSUE` webhook | ❌ (Meta only) |
| `Reactivate` | `UNCANCELLATION` webhook | ❌ (Meta only) |
| `Refund` | `REFUND` webhook | ❌ (Meta only) |

---

## 5. Identified Gaps for Backend/DB Integration

### GAP A: `logRevenueCatEvent` events never reach backend

**Impact:** 25 events (§4.1 + §4.2) are client-only, lost on app close.

**Fix:** Add a `forwardToBackend` option to `paymentEventLogger` that sends critical RC events to `POST /api/v1/events/track`.

```
logRevenueCatEvent('revenuecat_initialized', data)
  → paymentEventLogger.logRevenueCat(type, data)
    → in-memory (existing)
    → POST /api/v1/events/track (NEW)
      → app_events table
```

**Priority events to forward (high-value for debugging/analytics):**

| Event | Why it matters |
|-------|---------------|
| `revenuecat_initialized` | Confirms SDK health per user |
| `revenuecat_init_failed` | Catches broken installs |
| `revenuecat_identified` | Confirms RC ↔ Supabase user link |
| `revenuecat_identify_failed` | Catches auth mismatches |
| `revenuecat_customer_info_updated` | Tracks entitlement changes client-side |
| `purchase_attempt` | Funnel top — user intent |
| `purchase_success` | Funnel bottom — conversion |
| `sm_backend_sync_failed` | Catches sync failures |

**Low-priority (can skip for now):**
- `revenuecat_offerings_fetched/empty` (operational)
- `sm_entitlements_refreshed/synced` (internal state)

### GAP B: Webhook events not logged as discrete events

**Impact:** When RevenueCat sends RENEWAL, CANCELLATION, etc., we update `subscriptions` + `entitlements` but don't log the event itself. No audit trail of what happened when.

**Fix:** Create `subscription_events` table and log each webhook.

### GAP C: No `subscription_events` table

**Proposed schema:**

```sql
CREATE TABLE subscription_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id),
  event_type    text NOT NULL,           -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.
  product_id    text,                    -- App Store product ID
  store         text,                    -- app_store / play / stripe
  environment   text,                    -- PRODUCTION / SANDBOX
  period_type   text,                    -- NORMAL / TRIAL / INTRO
  tier          text,                    -- free / core / pro / team (computed)
  status        text,                    -- active / trial / canceled / expired (computed)
  transaction_id text,
  original_transaction_id text,
  revenue       numeric(10,2),           -- purchase price (if available)
  currency      text DEFAULT 'USD',
  entitlement_ids text[],               -- array of entitlement identifiers
  is_trial_conversion boolean DEFAULT false,
  raw_payload   jsonb,                   -- full RC webhook payload for debugging
  meta_capi_sent boolean DEFAULT false,  -- whether Meta CAPI was fired
  occurred_at   timestamptz NOT NULL,    -- event timestamp (from RC)
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_sub_events_user ON subscription_events(user_id);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX idx_sub_events_occurred ON subscription_events(occurred_at DESC);
```

### GAP D: Meta CAPI events not stored

**Impact:** No way to audit what was sent to Meta or debug mismatches.

**Fix:** Add a `meta_events` table or log Meta sends as rows in `app_events` with `event_name = 'meta_capi_sent'` and payload in metadata.

---

## 6. Implementation Plan

### Phase 1: Webhook Event Logging (Server-Side — Highest Value)

**What:** Log every RevenueCat webhook to `subscription_events` table.

**Where:** `backend-vercel/app/api/webhooks/revenuecat/route.ts`

**Change:** After the existing `subscriptions` + `entitlements` upserts, add:

```typescript
// Log the webhook event for audit trail
await supabase.from('subscription_events').insert({
  user_id: userId,
  event_type: event.type,
  product_id: appStoreProductId,
  store,
  environment: event.environment,
  period_type: event.period_type,
  tier,
  status: subscriptionStatus,
  transaction_id: event.transaction_id,
  original_transaction_id: event.original_transaction_id,
  entitlement_ids: event.entitlement_ids,
  is_trial_conversion: event.is_trial_conversion || false,
  raw_payload: payload,
  occurred_at: event.purchased_at_ms
    ? new Date(event.purchased_at_ms).toISOString()
    : new Date().toISOString(),
});
```

**Migration:** Create `subscription_events` table (see §5 GAP C).

### Phase 2: Forward Critical Client RC Events to Backend

**What:** Make `paymentEventLogger` optionally forward events to `POST /api/v1/events/track`.

**Where:** `lib/paymentEventLogger.ts`

**Change:**

```typescript
// In PaymentEventLogger class, after addEvent():
private async forwardToBackend(event: PaymentEvent) {
  // Only forward high-value events
  const FORWARD_EVENTS = [
    'revenuecat_initialized', 'revenuecat_init_failed',
    'revenuecat_identified', 'revenuecat_identify_failed',
    'revenuecat_customer_info_updated',
    'purchase_attempt', 'purchase_success', 'purchase_cancelled',
    'restore_attempt', 'restore_success', 'restore_error',
    'sm_backend_sync_failed',
  ];
  if (!FORWARD_EVENTS.includes(event.type)) return;

  try {
    const { apiFetch } = await import('@/lib/api');
    await apiFetch('/api/v1/events/track', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        event_type: event.type,
        timestamp: new Date(event.timestamp).toISOString(),
        metadata: { ...event.data, source: event.source },
      }),
    });
  } catch {} // Fire-and-forget
}
```

**Result:** These events land in `app_events` table, queryable alongside other analytics.

### Phase 3: Meta CAPI Audit Logging (Optional)

**What:** After each successful Meta CAPI flush, log a summary to `app_events`.

**Where:** `lib/metaAppEvents.ts` → `flushEventQueue()`

**Change:** After `response.ok`, fire:

```typescript
// Log Meta CAPI send for audit
AnalyticsRepo.trackEvent({
  event: 'meta_capi_flushed',
  properties: {
    events_sent: events.length,
    events_received: result.events_received,
    event_names: events.map(e => e.event_name),
  },
});
```

---

## 7. Production Readiness — No Reconfiguration Needed

| System | Dev Gate? | Production Behavior |
|--------|-----------|-------------------|
| `analytics.track()` → Backend + PostHog + Meta | ❌ No gate | Always fires |
| `autoTrackToMeta()` | ❌ No gate | Always fires (if mapping exists) |
| `logRevenueCatEvent()` | ❌ No gate | Always logs in-memory |
| `subscriptionManager` bridge | ❌ No gate | Always emits `sm_*` |
| Meta CAPI (`metaAppEvents.ts`) | `IS_ENABLED` (env vars) | Fires if `PIXEL_ID` + `TOKEN` set |
| `AnalyticsRepo` → DB | `ENABLE_BACKEND_ANALYTICS` | Currently `true` in `.env` |
| RC webhook handler | ❌ No gate (server-side) | Always processes |
| RC SDK debug logging | `__DEV__` only | Silent in prod (correct) |
| Debug Event Dashboard | `__DEV__` only | Hidden in prod (correct) |
| Test pages | `SHOW_DEV_SETTINGS` | Hidden in prod (correct) |

**Env vars required in production EAS build:**

```
EXPO_PUBLIC_META_PIXEL_ID=10039038026189444
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=EAAOhwkTLb4M...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
EXPO_PUBLIC_ENABLE_BACKEND_ANALYTICS=true
EXPO_PUBLIC_BACKEND_URL=https://ever-reach-be.vercel.app
```

---

## 8. Event Flow Summary (Post-Integration)

```
USER ACTION: Taps "Subscribe to Pro"
│
├─► CLIENT: paymentEventLogger
│   ├── logRevenueCatEvent('purchase_attempt')     → in-memory
│   └── forwardToBackend()                         → app_events table (NEW)
│
├─► CLIENT: analytics.track('purchase_initiated')
│   ├── → PostHog
│   ├── → AnalyticsRepo → /api/v1/events/track    → app_events table
│   └── → autoTrackToMeta() (no mapping, skipped)
│
├─► CLIENT: analytics.track('revenuecat_purchase_started')
│   ├── → PostHog
│   ├── → AnalyticsRepo → /api/v1/events/track    → app_events table
│   └── → autoTrackToMeta() → InitiateCheckout     → Meta CAPI
│
├─► STOREKIT: Purchase confirmed
│
├─► CLIENT: analytics.track('purchase_completed')
│   ├── → PostHog
│   ├── → AnalyticsRepo → /api/v1/events/track    → app_events table
│   └── → autoTrackToMeta() → Purchase             → Meta CAPI
│
├─► SERVER: RevenueCat webhook → INITIAL_PURCHASE
│   ├── → subscriptions table (upsert)
│   ├── → entitlements table (upsert)
│   └── → subscription_events table (insert) (NEW)
│
└─► CLIENT: customerInfoUpdateListener
    ├── logRevenueCatEvent('revenuecat_customer_info_updated')
    └── forwardToBackend()                         → app_events table (NEW)
```

---

## 9. Prioritized Implementation Order

| # | Task | Tables Affected | Effort | Value |
|---|------|----------------|--------|-------|
| 1 | Create `subscription_events` table (migration) | new table | Small | **High** — audit trail for all webhook events |
| 2 | Log webhook events to `subscription_events` | route.ts | Small | **High** — every RC event persisted |
| 3 | Forward critical RC client events to backend | paymentEventLogger.ts | Medium | **High** — SDK health + purchase funnel in DB |
| 4 | Add Meta CAPI audit logging | metaAppEvents.ts | Small | Medium — debugging aid |
| 5 | Normalize duplicate event names | Multiple files | Small | Low — data cleanliness |

---

## 10. Success Criteria

- [ ] `subscription_events` table created in Supabase
- [ ] Every RC webhook logged to `subscription_events` with full payload
- [ ] Critical client RC events (`revenuecat_initialized`, `purchase_attempt`, etc.) reach `app_events`
- [ ] All `analytics.track()` events confirmed in `app_events` table
- [ ] No events gated behind `__DEV__` that should be in production
- [ ] Queryable: "Show me all events for user X in the last 30 days" works across both tables
- [ ] Meta CAPI sends optionally auditable in `app_events`

---

## 11. Appendix: Quick Reference — Where Every Event Lands

| Destination | What goes there | Count |
|------------|----------------|-------|
| **In-memory** (`paymentEventLogger`) | All `logRevenueCatEvent` + `sm_*` events | ~25 events |
| **PostHog** | All `analytics.track` events | ~22 events |
| **Meta CAPI** | Mapped events only (Purchase, StartTrial, etc.) | 5 client + 9 server |
| **`app_events`** (Supabase) | All `analytics.track` events (via AnalyticsRepo) | ~22 events |
| **`subscriptions`** (Supabase) | Latest subscription state per user+store | Updated by webhook |
| **`entitlements`** (Supabase) | Latest feature access per user | Updated by webhook |
| **`subscription_events`** (Supabase) | Every webhook event (NEW — to be created) | ~10 event types |
