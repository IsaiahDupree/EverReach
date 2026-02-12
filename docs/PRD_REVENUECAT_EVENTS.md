# PRD: RevenueCat Event Tracking — Gaps, Delivery, and Testing

## 1. Overview

RevenueCat events are tracked at **three layers** in EverReach:

| Layer | Where | Logger | Destination |
|-------|-------|--------|-------------|
| **Client SDK** | App code (RN) | `logRevenueCatEvent()` → `paymentEventLogger` | In-memory store + Event Dashboard |
| **Client Analytics** | App code (RN) | `analytics.track()` → PostHog + Meta CAPI | Backend, PostHog, Meta Conversions API |
| **Server Webhook** | Backend (Vercel) | RevenueCat → `/api/webhooks/revenuecat` | Supabase DB + Meta CAPI (via emitter) |

This PRD audits every RevenueCat-specific event, identifies gaps, and defines how each should be sent, tested, and verified.

---

## 2. Current State — All RevenueCat Events

### 2.1 Client SDK Events (via `logRevenueCatEvent`)

These go to `paymentEventLogger` (in-memory) and show in Event Dashboard. They do **NOT** reach PostHog or Meta.

| Event | File | Tracked? | Notes |
|-------|------|----------|-------|
| `revenuecat_initialized` | `_layout.tsx` | ✅ | Added recently |
| `revenuecat_init_failed` | `_layout.tsx` | ✅ | Added recently |
| `revenuecat_identified` | `_layout.tsx` | ✅ | Added recently |
| `revenuecat_identify_failed` | `_layout.tsx` | ✅ | Added recently |
| `revenuecat_customer_info_updated` | `_layout.tsx` | ✅ | Added recently |
| `purchase_attempt` | `subscription-plans.tsx` | ✅ | |
| `purchase_success` | `subscription-plans.tsx` | ✅ | |
| `purchase_cancelled` | `subscription-plans.tsx` | ✅ | |
| `restore_attempt` | `subscription-plans.tsx` | ✅ | |
| `restore_success` | `subscription-plans.tsx` | ✅ | |
| `restore_error` | `subscription-plans.tsx` | ✅ | |

### 2.2 Client Analytics Events (via `analytics.track`)

These go to Backend + PostHog + Meta (if mapped). Dual-tracked with SDK events in some cases.

| Event | File | PostHog? | Meta? | Notes |
|-------|------|----------|-------|-------|
| `revenuecat_offerings_loaded` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_offerings_failed` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_plan_selected` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_success` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | Duplicate of `purchase_completed` |
| `revenuecat_purchase_failed` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_cancelled` | `RevenueCatPaywall.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_offering_loaded` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | Slightly different name |
| `revenuecat_offering_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_started` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_success` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_purchase_cancelled` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_restore_started` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_restore_success` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `revenuecat_restore_error` | `RevenueCatPaywallUI.tsx` | ✅ | ❌ no mapping | |
| `plan_selected` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `purchase_initiated` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `purchase_succeeded` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `purchase_completed` | `subscription-plans.tsx` | ✅ | ✅ → `Purchase` | **Critical for ROAS** |
| `purchase_failed` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `trial_started` | `subscription-plans.tsx` | ✅ | ✅ → `StartTrial` | |
| `subscription_upgraded` | `subscription-plans.tsx` | ✅ | ✅ → `Subscribe` | |
| `restore_purchases_initiated` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `restore_purchases_success` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |
| `restore_purchases_failed` | `subscription-plans.tsx` | ✅ | ❌ no mapping | |

### 2.3 SubscriptionManager Events (via `emitEvent`)

Internal state machine events. Go to registered listeners only. **NOT sent to analytics or RevenueCat logger.**

| Event | Tracked to analytics? | Tracked to paymentEventLogger? |
|-------|----------------------|-------------------------------|
| `PURCHASE_STARTED` | ❌ GAP | ❌ GAP |
| `PURCHASE_COMPLETED` | ❌ GAP | ❌ GAP |
| `PURCHASE_CANCELLED` | ❌ GAP | ❌ GAP |
| `PURCHASE_FAILED` | ❌ GAP | ❌ GAP |
| `RESTORE_STARTED` | ❌ GAP | ❌ GAP |
| `RESTORE_COMPLETED` | ❌ GAP | ❌ GAP |
| `RESTORE_FAILED` | ❌ GAP | ❌ GAP |
| `BACKEND_SYNC_STARTED` | ❌ GAP | ❌ GAP |
| `BACKEND_SYNC_COMPLETED` | ❌ GAP | ❌ GAP |
| `BACKEND_SYNC_FAILED` | ❌ GAP | ❌ GAP |
| `ENTITLEMENTS_REFRESHED` | ❌ GAP | ❌ GAP |
| `ENTITLEMENTS_SYNCED` | ❌ GAP | ❌ GAP |

### 2.4 Server-Side Webhook Events (via RevenueCat → Backend)

These come from RevenueCat's server to our Vercel backend. Currently update Supabase DB. Meta CAPI emitter exists but backend **not yet redeployed**.

| RC Webhook Event | DB Update? | Meta CAPI Emit? | Meta Event |
|-----------------|------------|-----------------|------------|
| `INITIAL_PURCHASE` | ✅ | ✅ (pending deploy) | `Purchase` |
| `RENEWAL` | ✅ | ✅ (pending deploy) | `Purchase` |
| `CANCELLATION` | ✅ | ✅ (pending deploy) | `Cancel` |
| `EXPIRATION` | ✅ | ✅ (pending deploy) | `Churn` |
| `BILLING_ISSUE` | ✅ | ✅ (pending deploy) | `BillingIssue` |
| `PRODUCT_CHANGE` | ✅ | ✅ (pending deploy) | `Subscribe` |
| `UNCANCELLATION` | ❌ not handled | ✅ (pending deploy) | `Reactivate` |
| `REFUND` | ❌ not handled | ✅ (pending deploy) | `Refund` |
| `SUBSCRIBER_ALIAS` | ❌ not handled | ❌ | — |

---

## 3. Identified Gaps

### GAP 1: `subscriptionManager.ts` events are siloed
The `SubscriptionManager` emits 12 events (`PURCHASE_STARTED`, `BACKEND_SYNC_COMPLETED`, etc.) but they only go to local listeners. They don't reach `paymentEventLogger` or `analytics.track`. These are the most granular events in the purchase flow.

**Fix:** Bridge `subscriptionManager.emitEvent` to `logRevenueCatEvent` so all state transitions appear in the Event Dashboard and are persisted.

### GAP 2: RC-specific analytics events have no Meta mapping
Events like `revenuecat_purchase_started`, `revenuecat_offerings_loaded` etc. go to PostHog but not Meta. Most of these don't need Meta mapping (they're operational), but a few should:
- `revenuecat_purchase_started` → Meta `InitiateCheckout`
- `revenuecat_restore_success` → Meta `Subscribe` (re-activation)

**Fix:** Add two Meta mappings in `metaAppEvents.ts`.

### GAP 3: Backend webhook doesn't handle UNCANCELLATION, REFUND, SUBSCRIBER_ALIAS
The webhook route at `app/api/webhooks/revenuecat/route.ts` only handles: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE. Missing:
- `UNCANCELLATION` → should set status back to `active`
- `REFUND` → should set status to `expired` and tier to `free`

**Fix:** Add cases for UNCANCELLATION and REFUND in webhook handler.

### GAP 4: Duplicate event names across components
- `RevenueCatPaywall.tsx` tracks `revenuecat_offerings_loaded`
- `RevenueCatPaywallUI.tsx` tracks `revenuecat_offering_loaded` (singular)
- Both track `revenuecat_purchase_success`, `revenuecat_purchase_cancelled`

**Fix:** Normalize to consistent naming. Not blocking but creates noisy data.

### GAP 5: `fetchOfferings` in `revenuecat.ts` has no event tracking
When offerings are fetched directly via `lib/revenuecat.ts` (not through paywall components), no event is logged.

**Fix:** Add `logRevenueCatEvent` calls in `fetchOfferings`.

---

## 4. Event Flow Diagram

```
User taps "Subscribe"
        │
        ▼
  subscription-plans.tsx
  ├── analytics.track('purchase_initiated')        → PostHog
  ├── logRevenueCatEvent('purchase_attempt')        → paymentEventLogger
  │
  ▼
  revenuecat.ts → purchasePackageById()
  ├── Purchases.getOfferings()
  ├── Purchases.purchasePackage()                   → Apple/Google StoreKit
  │
  ▼  (on success)
  subscription-plans.tsx
  ├── logRevenueCatEvent('purchase_success')        → paymentEventLogger
  ├── analytics.track('purchase_completed')         → PostHog + Meta Purchase
  ├── analytics.track('trial_started')              → PostHog + Meta StartTrial (if trial)
  ├── analytics.track('subscription_upgraded')      → PostHog + Meta Subscribe
  │
  ▼  (async, server-side)
  RevenueCat Server → webhook → backend
  ├── Supabase DB update (subscriptions + entitlements)
  ├── Meta CAPI emitter → Purchase/StartTrial       → Meta Conversions API
  │
  ▼  (async, client-side)
  addCustomerInfoUpdateListener
  ├── logRevenueCatEvent('revenuecat_customer_info_updated') → paymentEventLogger
  ├── queryClient.invalidateQueries(['entitlements']) → refresh UI
```

---

## 5. Implementation Plan

### 5.1 Bridge SubscriptionManager → paymentEventLogger (GAP 1)
In `subscriptionManager.ts`, add `logRevenueCatEvent` call inside `emitEvent`:
```ts
private emitEvent(event: SubscriptionEvent, data?: any, error?: string) {
    // ... existing code ...
    logRevenueCatEvent(`sm_${event.toLowerCase()}`, { ...data, error });
}
```

### 5.2 Add Meta mappings for key RC events (GAP 2)
In `metaAppEvents.ts` `mapToMetaEvent`:
```ts
'revenuecat_purchase_started': { metaEvent: 'InitiateCheckout', mapper: ... },
'revenuecat_restore_success': { metaEvent: 'Subscribe', mapper: ... },
```

### 5.3 Handle UNCANCELLATION + REFUND in webhook (GAP 3)
In `backend-vercel/app/api/webhooks/revenuecat/route.ts`, add:
- `UNCANCELLATION` → set status to `active`
- `REFUND` → set status to `expired`, tier to `free`

### 5.4 Add tracking to `fetchOfferings` (GAP 5)
In `lib/revenuecat.ts`:
```ts
logRevenueCatEvent('revenuecat_offerings_fetched', { count, current_id });
```

---

## 6. Testing Strategy

### 6.1 In-App Test Pages

| Page | URL | What it tests |
|------|-----|---------------|
| **RevenueCat Event Test** | `/revenuecat-event-test` | Direct Meta CAPI (simulated RC → Meta events) |
| **Meta Pixel Test** | `/meta-pixel-test` | Client-side Meta event pipeline |
| **Event Dashboard** | `/event-dashboard` | All events in real-time as user navigates |

### 6.2 Local Monitor Scripts

| Script | Command | What it monitors |
|--------|---------|-----------------|
| Meta monitor | `node scripts/meta-event-monitor.mjs` | All Meta CAPI events (port 3456) |
| RC monitor | `node scripts/revenuecat-event-monitor.mjs` | RC webhook events (port 3457) |

### 6.3 Testing Checklist

#### Client-Side (StoreKit Test / Sandbox)
1. Open **Event Dashboard** (`/event-dashboard`)
2. Navigate to **Subscription Plans**
3. Tap a plan → should see in dashboard:
   - `purchase_initiated` (analytics)
   - `purchase_attempt` (RC logger)
   - `revenuecat_purchase_started` (analytics, if PaywallUI)
   - `sm_purchase_started` (subscriptionManager bridge — after GAP 1 fix)
4. Complete purchase in StoreKit sandbox → should see:
   - `purchase_success` / `purchase_completed` / `trial_started`
   - `revenuecat_customer_info_updated`
   - `sm_purchase_completed` / `sm_backend_sync_completed`

#### Server-Side (Webhook)
1. Use **RevenueCat Event Test** page → Direct Meta CAPI mode
2. Verify all 9 event types show green ✅
3. Switch to Backend Webhook mode (after deploy) to test full pipeline
4. Check Meta Events Manager → Test Events for `TEST48268` code

#### RevenueCat Dashboard Verification
1. Open https://app.revenuecat.com → Activity
2. Verify sandbox events appear
3. Check that `app_user_id` matches your Supabase user ID

#### PostHog Verification
1. Open PostHog dashboard → Events
2. Filter by `revenuecat_*` events
3. Verify all purchase/restore events appear with correct properties

---

## 7. Event Name Reference (Post-Implementation)

### Canonical RC Event Names (paymentEventLogger)
| Event | Trigger |
|-------|---------|
| `revenuecat_initialized` | SDK configured successfully |
| `revenuecat_init_failed` | SDK configure failed |
| `revenuecat_identified` | User identified with RC |
| `revenuecat_identify_failed` | Identify call failed |
| `revenuecat_customer_info_updated` | Entitlements changed (listener) |
| `revenuecat_offerings_fetched` | Offerings loaded (NEW) |
| `purchase_attempt` | User tapped subscribe |
| `purchase_success` | StoreKit purchase confirmed |
| `purchase_cancelled` | User cancelled purchase sheet |
| `restore_attempt` | User tapped restore |
| `restore_success` | Restore returned active entitlements |
| `restore_error` | Restore threw error |
| `sm_purchase_started` | SubscriptionManager started (NEW) |
| `sm_purchase_completed` | SubscriptionManager confirmed (NEW) |
| `sm_purchase_cancelled` | SubscriptionManager cancelled (NEW) |
| `sm_purchase_failed` | SubscriptionManager error (NEW) |
| `sm_restore_started` | SubscriptionManager restore (NEW) |
| `sm_restore_completed` | SubscriptionManager restore done (NEW) |
| `sm_restore_failed` | SubscriptionManager restore error (NEW) |
| `sm_backend_sync_started` | Backend sync began (NEW) |
| `sm_backend_sync_completed` | Backend sync succeeded (NEW) |
| `sm_backend_sync_failed` | Backend sync failed (NEW) |
| `sm_entitlements_refreshed` | Entitlements manual refresh (NEW) |
| `sm_entitlements_synced` | Entitlements synced from backend (NEW) |

### Meta-Mapped Events (via analytics.track)
| Internal Event | Meta Event |
|---------------|------------|
| `purchase_completed` | `Purchase` |
| `trial_started` | `StartTrial` |
| `subscription_upgraded` | `Subscribe` |
| `revenuecat_purchase_started` | `InitiateCheckout` (NEW) |
| `revenuecat_restore_success` | `Subscribe` (NEW) |

---

## 8. Success Criteria

- [ ] All 12 SubscriptionManager events bridged to paymentEventLogger
- [ ] `fetchOfferings` tracked
- [ ] Two new Meta mappings added
- [ ] UNCANCELLATION + REFUND handled in webhook
- [ ] All events visible in Event Dashboard during purchase flow
- [ ] StoreKit sandbox purchase produces complete event chain
- [ ] RevenueCat Event Test page: all 9 events green in Direct Meta CAPI mode
