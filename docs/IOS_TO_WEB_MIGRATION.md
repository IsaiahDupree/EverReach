# iOS → Web Frontend Migration Guide

> All changes made to `ios-app/` on branch `qa/test-coverage-v1` that must be replicated in `web-frontend/`.
> Generated: 2026-02-13

---

## Context

The backend (`feat/subscription-events`) was hardened with:
- Expanded subscription statuses: `trial, active, grace, paused, past_due, canceled, expired, refunded`
- Expanded entitlement plans: `free, core, pro, team`
- Expanded sources: `app_store, play, stripe, manual, revenuecat`
- Webhook idempotency (unique constraint on `transaction_id + event_type`)
- Cache-Control headers on read-only endpoints
- Sanitized error responses (no DB error leaks)

The iOS app was updated to handle these. The web app has the **old code** and needs the same updates.

---

## 1. `providers/EntitlementsProviderV3.tsx`

### 1a. Expand `SubscriptionStatus` type (line 23)

**Before (web):**
```ts
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'refunded';
```

**After (match iOS):**
```ts
export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
```

### 1b. Add `isGrace`, `isPaused`, `hasAccess` to context interface (lines 68-72)

**Before (web):**
```ts
  // Status checks
  isTrial: boolean;
  isActive: boolean;
  isCanceled: boolean;
  isExpired: boolean;
```

**After (match iOS):**
```ts
  // Status checks
  isTrial: boolean;
  isActive: boolean;
  isGrace: boolean;
  isPaused: boolean;
  isCanceled: boolean;
  isExpired: boolean;
  hasAccess: boolean; // active, trial, grace, or past_due
```

### 1c. Add computed status values (lines 374-378)

**Before (web):**
```ts
  const isTrial = entitlements?.subscription_status === 'trial';
  const isActive = entitlements?.subscription_status === 'active';
  const isCanceled = entitlements?.subscription_status === 'canceled';
  const isExpired = entitlements?.subscription_status === 'expired';
```

**After (match iOS):**
```ts
  const isTrial = entitlements?.subscription_status === 'trial';
  const isActive = entitlements?.subscription_status === 'active';
  const isGrace = entitlements?.subscription_status === 'grace';
  const isPaused = entitlements?.subscription_status === 'paused';
  const isCanceled = entitlements?.subscription_status === 'canceled';
  const isExpired = entitlements?.subscription_status === 'expired';
  const hasAccess = isActive || isTrial || isGrace || entitlements?.subscription_status === 'past_due';
```

### 1d. Add new values to context `value` object (lines 394-398)

**Before (web):**
```ts
    isTrial,
    isActive,
    isCanceled,
    isExpired,
```

**After (match iOS):**
```ts
    isTrial,
    isActive,
    isGrace,
    isPaused,
    isCanceled,
    isExpired,
    hasAccess,
```

---

## 2. `repos/SubscriptionRepo.ts`

### 2a. Expand `subscription_status` type (line 14)

**Before (web):**
```ts
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trial';
```

**After (match iOS):**
```ts
  subscription_status?: 'active' | 'trial' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
```

### 2b. (iOS-only, already done) Add `subscription_started_at` field

The iOS `SubscriptionRepo` also has `subscription_started_at?: string | null` — add if the web needs it for display.

---

## 3. New Test File

### Copy `__tests__/subscription/backendIntegration.test.ts`

Copy the entire file from `ios-app/__tests__/subscription/backendIntegration.test.ts` to `web-frontend/__tests__/subscription/backendIntegration.test.ts`.

The test mocks `react-native-purchases` and tests:
- All 8 subscription statuses defined
- `hasAccess` grant/deny for every status + null
- Grace period access retention
- Paused users lose access
- Tier feature limits (free < core < pro < team)
- Backend sanitized error handling
- RevenueCat fallback logic (webhook lag)
- No downgrade flash during webhook processing
- API caching behavior (3s TTL, 15min staleTime)
- Backend endpoint compatibility audit
- Dead `/api/v1/subscriptions/sync` endpoint flagged

**31 tests total — all should pass in web-frontend as-is.**

---

## 4. Web-Specific Considerations

These do NOT need changes but are worth noting:

### `lib/api.ts` — no changes needed
The `apiFetch` wrapper is identical between iOS and web. It already has:
- 3s GET cache/dedup
- 30s timeout
- Auto 401 retry with token refresh
- Session caching

### `lib/subscriptionManager.ts` — audit recommended
Contains a `syncWithBackend()` call to `POST /api/v1/subscriptions/sync` which may be a **dead endpoint**. Backend sync now happens via RevenueCat webhook. On **web**, this is already gated by `Platform.OS === 'web'` (skips), so it's harmless but should be cleaned up eventually.

### RevenueCat fallback — web-only note
The `EntitlementsProviderV3` RevenueCat fallback logic (lines 106-131, 157-181) is gated by `Platform.OS !== 'web'`, so it only runs on native. **Web users rely entirely on the backend response** — which is correct since web subscriptions go through Stripe, not RevenueCat.

---

## 5. Migration Checklist

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `providers/EntitlementsProviderV3.tsx:23` | Expand `SubscriptionStatus` union (add `grace`, `paused`, `past_due`) | **High** |
| 2 | `providers/EntitlementsProviderV3.tsx:68-72` | Add `isGrace`, `isPaused`, `hasAccess` to context interface | **High** |
| 3 | `providers/EntitlementsProviderV3.tsx:374-378` | Add computed `isGrace`, `isPaused`, `hasAccess` values | **High** |
| 4 | `providers/EntitlementsProviderV3.tsx:394-398` | Add new values to context `value` object | **High** |
| 5 | `repos/SubscriptionRepo.ts:14` | Expand `subscription_status` to all 8 statuses | **High** |
| 6 | `__tests__/subscription/backendIntegration.test.ts` | Copy test file from iOS (31 tests) | **Medium** |
| 7 | `lib/subscriptionManager.ts` | Audit dead `syncWithBackend()` endpoint | **Low** |

---

## 6. Verification

After applying changes, run:

```bash
cd web-frontend
npx jest __tests__/subscription/backendIntegration.test.ts --no-coverage
```

Expected: **31 tests passing**.

Also run existing subscription tests to confirm no regressions:

```bash
npx jest __tests__/subscription/ --no-coverage
```
