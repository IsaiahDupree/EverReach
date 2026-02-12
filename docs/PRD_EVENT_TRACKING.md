# PRD: Full Event Tracking Coverage — Meta + RevenueCat

## Overview

EverReach tracks user events across three destinations: **Backend API**, **PostHog**, and **Meta Conversions API**. This PRD closes all gaps so that every monetization journey event reaches Meta for ROAS measurement, and RevenueCat server-side lifecycle events are forwarded to Meta.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (iOS App)                         │
│                                                                 │
│  analytics.track(event, props)                                  │
│       ├─► Backend API (/api/v1/events/track)                    │
│       ├─► PostHog                                               │
│       └─► autoTrackToMeta() ─► mapToMetaEvent() ─► trackMeta() │
│                                      │                          │
│                            Conversions API (CAPI)               │
│                            + Native SDK (if avail)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SERVER (Backend - Vercel)                      │
│                                                                 │
│  RevenueCat Webhook ─► processWebhookEvent()                    │
│       ├─► Upsert Supabase (subscriptions + entitlements)        │
│       └─► [NEW] forwardToMetaCAPI() ─► Meta Conversions API     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Client-Side Fixes

### 1.1 Fix `purchase_completed` → Meta Purchase Event

**Problem:** The mapping `purchase_completed → Purchase` exists in `mapToMetaEvent()` but the event is never fired through `analytics.track()`.

**Root Cause:** `subscription-plans.tsx` fires `purchase_succeeded` and `subscription_upgraded` after a successful purchase. Neither maps to Meta's `Purchase` event. The `subscriptionEvents.ts` class calls `analytics.capture()` which doesn't exist on the default export.

**Fix:**
- In `subscription-plans.tsx`, after successful purchase (line ~690), add:
  ```ts
  analytics.track('purchase_completed', {
    amount: packagePrice,
    currency: 'USD',
    plan: planId,
    product_id: rcPackageId,
    payment_platform: Platform.OS === 'ios' ? 'apple' : 'google',
  });
  ```
- This triggers the existing `mapToMetaEvent` mapping: `purchase_completed → Purchase`

**Files:** `app/subscription-plans.tsx`

### 1.2 Fix `trial_started` → Meta StartTrial Event

**Problem:** Mapping exists but `trial_started` may not fire with proper properties after a real trial begins.

**Fix:**
- In `subscription-plans.tsx`, detect trial purchases (period_type = TRIAL) and fire:
  ```ts
  analytics.track('trial_started', {
    trial_days: 7,
    plan: planId,
    product_id: rcPackageId,
  });
  ```

**Files:** `app/subscription-plans.tsx`

### 1.3 Verify `auth_sign_up` → Meta CompleteRegistration

**Problem:** Need to confirm `auth_sign_up` fires through `analytics.track()` during the signup flow.

**Fix:** Audit the auth/signup flow and ensure `analytics.track('auth_sign_up', { method })` is called. Add it if missing.

**Files:** `app/(auth)/*.tsx` or relevant auth screen

### 1.4 Add `paywall_viewed` → Meta ViewContent Mapping

**Problem:** Paywall views are tracked via `subscriptionEvents.trackPaywall('viewed')` but that uses the broken `analytics.capture()`. These should reach Meta as ViewContent events for funnel analysis.

**Fix:**
- Add mapping in `mapToMetaEvent()`:
  ```ts
  'paywall_viewed': {
    metaEvent: 'ViewContent',
    mapper: (p) => ({ content_name: 'paywall', content_type: 'paywall', content_category: p.source }),
  },
  ```
- Ensure `paywall_viewed` fires through `analytics.track()` when the paywall screen mounts.

**Files:** `lib/metaAppEvents.ts`, paywall components

### 1.5 Fix broken `subscriptionEvents.ts`

**Problem:** Calls `analytics.capture()` which doesn't exist.

**Fix:** Change `analytics.capture(event, data)` to `analytics.track(event, data)` so subscription lifecycle events actually reach Meta.

**Files:** `lib/subscriptionEvents.ts`

---

## Part 2: Server-Side Meta Forwarding (RevenueCat Webhooks)

### 2.1 Create `lib/meta-server.ts` in backend

A lightweight Meta Conversions API client for the backend that sends events server-to-server.

```ts
interface MetaServerEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  user_data: { external_id: string[]; em?: string[]; ph?: string[] };
  custom_data?: Record<string, any>;
  action_source: 'app';
}

async function sendMetaEvent(events: MetaServerEvent[]): Promise<void>
```

**Env vars required:** `META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`

### 2.2 Forward RevenueCat events to Meta

In the webhook handler, after processing each event, forward to Meta:

| RevenueCat Event | Meta Event | custom_data |
|---|---|---|
| `INITIAL_PURCHASE` (TRIAL) | `StartTrial` | `{ predicted_ltv: 0, currency: 'USD', content_name: product_id }` |
| `INITIAL_PURCHASE` (NORMAL) | `Purchase` | `{ value: price, currency: 'USD', content_name: product_id }` |
| `RENEWAL` | `Purchase` | `{ value: price, currency: 'USD', content_name: product_id }` |
| `CANCELLATION` | `Cancel` (custom) | `{ content_name: product_id, cancel_reason }` |
| `EXPIRATION` | `Churn` (custom) | `{ content_name: product_id }` |
| `BILLING_ISSUE` | `BillingIssue` (custom) | `{ content_name: product_id }` |
| `PRODUCT_CHANGE` | `Subscribe` | `{ value: new_price, content_name: new_product_id }` |
| `UNCANCELLATION` | `Reactivate` (custom) | `{ content_name: product_id }` |

**Files:** `backend-vercel/lib/meta-server.ts` (new), `backend-vercel/app/api/webhooks/revenuecat/route.ts`

---

## Part 3: Full Event Map (After Changes)

### Standard Meta Events (optimizable by Meta's algorithm)

| Internal Event | Meta Event | Source | Priority |
|---|---|---|---|
| `auth_sign_up` | CompleteRegistration | Client | High |
| `trial_started` | StartTrial | Client + Server | High |
| `purchase_completed` | Purchase | Client | **Critical** |
| `subscription_upgraded` | Subscribe | Client | High |
| `screen_viewed` | ViewContent | Client | Medium |
| `contact_viewed` | ViewContent | Client | Medium |
| `paywall_viewed` | ViewContent | Client | High |
| `contact_created` | AddToWishlist | Client | Medium |
| `contact_searched` | Search | Client | Low |
| `message_sent` | Contact | Client | Low |
| `lead_captured` | Lead | Client | Medium |
| `install_tracked` | AppInstall | Client | High |
| `ai_message_generated` | CustomizeProduct | Client | Low |
| `payment_info_added` | AddPaymentInfo | Client | Medium |

### Server-Side Events (RevenueCat Webhook → Meta CAPI)

| RevenueCat Event | Meta Event | Priority |
|---|---|---|
| `INITIAL_PURCHASE` (trial) | StartTrial | High |
| `INITIAL_PURCHASE` (paid) | Purchase | **Critical** |
| `RENEWAL` | Purchase | **Critical** |
| `CANCELLATION` | Cancel (custom) | High |
| `EXPIRATION` | Churn (custom) | High |
| `BILLING_ISSUE` | BillingIssue (custom) | Medium |
| `PRODUCT_CHANGE` | Subscribe | Medium |
| `UNCANCELLATION` | Reactivate (custom) | Medium |

### Client-Side Only Events (not sent to Meta)

| Event | Destination | Purpose |
|---|---|---|
| `purchase_started` | Backend + PostHog | Funnel analysis |
| `purchase_failed` | Backend + PostHog | Error tracking |
| `purchase_cancelled` | Backend + PostHog | Funnel drop-off |
| `restore_*` | Backend + PostHog | Support debugging |
| `backend_sync_*` | Backend + PostHog | Infrastructure |
| `paywall_dismissed` | Backend + PostHog | Funnel analysis |
| `feature_locked` | Backend + PostHog | Gate analytics |

---

## Part 4: Deduplication Strategy

Both client and server may fire the same event (e.g., Purchase from client + INITIAL_PURCHASE from webhook). Meta deduplicates on `event_id`.

**Approach:**
- Client generates `event_id` = `ev_{timestamp}_{random}` (already done)
- Server generates `event_id` = `rc_{revenuecat_event_id}`
- These are different IDs, so Meta counts both — **this is correct** because:
  - Client event has rich `user_data` (fbp, fbc, IP, device info)
  - Server event has authoritative purchase data (price, transaction_id)
  - Meta merges the best of both for attribution

If we want to deduplicate, we'd need to pass the client's `event_id` through RevenueCat's `attributes` — this is a future optimization.

---

## Part 5: Testing Plan

### Unit Tests

| Test | File | Validates |
|---|---|---|
| `mapToMetaEvent('purchase_completed')` returns Purchase | `__tests__/lib/metaAppEvents.test.ts` | Mapping exists |
| `mapToMetaEvent('trial_started')` returns StartTrial | `__tests__/lib/metaAppEvents.test.ts` | Mapping exists |
| `mapToMetaEvent('paywall_viewed')` returns ViewContent | `__tests__/lib/metaAppEvents.test.ts` | New mapping |
| `subscriptionEvents.track()` calls `analytics.track()` | `__tests__/lib/subscriptionEvents.test.ts` | Fix verified |
| `autoTrackToMeta` forwards purchase_completed | `__tests__/lib/metaAppEvents.test.ts` | E2E mapping |

### Integration Tests (using meta-event-monitor.mjs)

| Scenario | Steps | Expected |
|---|---|---|
| Purchase fires to Meta | 1. Open paywall 2. Purchase 3. Check monitor | Monitor shows Purchase with value + currency |
| Trial fires to Meta | 1. Start trial 2. Check monitor | Monitor shows StartTrial |
| Paywall view fires to Meta | 1. Open paywall 2. Check monitor | Monitor shows ViewContent (paywall) |
| Signup fires to Meta | 1. Create account 2. Check monitor | Monitor shows CompleteRegistration |

### Server-Side Tests

| Test | File | Validates |
|---|---|---|
| Webhook forwards INITIAL_PURCHASE to Meta | `__tests__/webhooks/revenuecat.test.ts` | Server CAPI call |
| Webhook forwards RENEWAL to Meta | same | Server CAPI call |
| Webhook forwards CANCELLATION to Meta | same | Custom event |
| Meta CAPI client sends correct payload | `__tests__/lib/meta-server.test.ts` | Payload format |

---

## Implementation Order

1. **Fix `subscriptionEvents.ts`** — change `capture` → `track` (1 line)
2. **Add `purchase_completed` to purchase flow** — `subscription-plans.tsx` (5 lines)
3. **Add `trial_started` detection** — `subscription-plans.tsx` (10 lines)
4. **Add `paywall_viewed` mapping** — `metaAppEvents.ts` (3 lines)
5. **Verify `auth_sign_up`** — audit auth flow
6. **Write client-side tests** — new test file
7. **Create `meta-server.ts`** — backend CAPI client (~50 lines)
8. **Wire webhook → Meta forwarding** — `route.ts` (~30 lines)
9. **Write server-side tests** — new test file
10. **E2E test with monitor script** — manual verification

**Estimated total: ~150 lines of production code + ~200 lines of tests**

---

## Environment Variables Needed

### Client (already set)
- `EXPO_PUBLIC_META_PIXEL_ID` ✅
- `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` ✅

### Server (need to add)
- `META_PIXEL_ID` — same as client
- `META_CONVERSIONS_API_TOKEN` — same as client (or dedicated server token)

Set in Vercel dashboard: `Settings → Environment Variables`
