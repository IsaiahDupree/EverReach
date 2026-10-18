# EverReach v1.1.0 — Session Work Summary

**Date:** February 13, 2026
**App Version:** 1.1.0 (Build #28 submitted to TestFlight)
**Branches:** ios-app → `qa/test-coverage-v1` | backend → `origin/backend` (`feat/subscription-events`)

---

## 1. Warmth EWMA Unification (Core Feature)

### What Changed
Replaced **3 different warmth formulas** (client-side exponential decay, backend heuristic with recency/frequency/channel, dashboard inline thresholds) with a **single EWMA (Exponentially Weighted Moving Average) model**.

### EWMA Formula
```
score = 30 + amplitude × e^(-λ × daysSinceUpdate)
```
- **BASE** = 30 (neglected contacts settle here)
- **λ (decay rate)** depends on `warmth_mode`:
  - fast = 0.138629 (half-life ≈ 5 days)
  - medium = 0.085998 (half-life ≈ 8 days)
  - slow = 0.046210 (half-life ≈ 15 days)
- **Impulse weights** (added to amplitude on interaction):
  - meeting = 9, call = 7, email = 5, sms = 4, note = 3

### Band Thresholds (Unified Everywhere)
| Band | Score Range | Color |
|------|-----------|-------|
| Hot | ≥ 80 | #EF4444 (red) |
| Warm | ≥ 60 | #F59E0B (orange) |
| Neutral | ≥ 40 | #10B981 (green) |
| Cool | ≥ 20 | #3B82F6 (blue) |
| Cold | < 20 | #6B7280 (gray) |

> Dashboard shows **4 bands** (Hot/Warm/Cool/Cold) — neutral count merged into cool.

### Backend Changes
- **daily-warmth cron** (`/api/cron/daily-warmth/route.ts`): Rewritten to use `computeWarmthFromAmplitude()` instead of per-contact interaction counting. Much faster.
- **Contact creation** (`POST /api/v1/contacts`): Now initializes EWMA fields: `warmth=30, amplitude=0, warmth_last_updated_at=now, warmth_band='cool'`
- **All interaction endpoints** already call `updateAmplitudeForContact()`:
  - `POST /api/v1/interactions`
  - `POST /api/v1/messages/send`
  - `POST /api/v1/contacts/:id/notes`
  - `POST /api/interactions` (legacy)

### iOS App Changes
| File | Change |
|------|--------|
| `providers/WarmthProvider.tsx` | Band thresholds → 80/60/40/20, default fallback → 30 |
| `providers/WarmthSettingsProvider.tsx` | Default thresholds → 80/60/40/20, new lead default → 30 |
| `lib/warmth-utils.ts` | Removed orphaned `calculateWarmth()`, aligned color/label thresholds |
| `lib/supabase.ts` | Removed `calculateWarmth` from re-exports |
| `hooks/useDashboardData.ts` | Thresholds → 80/60/40/20, renamed `cooling` → `cool` |
| `hooks/useContacts.ts` | Fixed `warmth_band` type: `cooling` → `cool` |
| `app/(tabs)/home.tsx` | Fixed `by_band.cooling` → `.cool`, merged neutral into cool for 4-band display |
| `components/WarmthGraph.tsx` | Updated legend to EWMA thresholds + correct band order |
| `lib/imageUpload.ts` | Removed stale `cooling` case from band color switch |
| `app/message-results.tsx` | Removed redundant warmth recompute call (backend already does it) |

---

## 2. Meta Conversions API (CAPI) Integration

### What's Deployed
- Full server-side event tracking via Meta Graph API
- Events queued in batches (10s intervals, max 20 per batch)
- All events logged to `meta_conversion_event` Supabase table for audit

### Event Match Quality Improvements
- **Persisted parameters** via AsyncStorage: `fbp`, `fbc` (7-day TTL), hashed email/phone/name/city/state/zip/country
- **IP address**: cached + refreshed on init (3s timeout)
- **ATT-aware**: user_data fields only populated when tracking consent granted
- `test_event_code` (`TEST48268`) only used in `__DEV__` mode — **NOT sent in production CAPI calls**

### Standard Meta Events Mapped
| Meta Event | App Trigger |
|-----------|------------|
| CompleteRegistration | auth_sign_up |
| StartTrial | trial_started |
| Subscribe / Purchase | subscription_upgraded |
| ViewContent | screen_viewed / contact_viewed |
| Lead | lead_captured |
| Contact | message_sent |
| AddToWishlist | contact_created |
| Search | contact_searched |

---

## 3. RevenueCat Webhook Integration

### Backend
- `POST /api/webhooks/revenuecat` handles all RC events
- Signature verification with `REVENUECAT_WEBHOOK_SECRET`
- Logs every event to `subscription_events` audit table
- Updates `subscriptions` and `entitlements` tables
- DB schema: `subscription_events` with `event_type, product_id, store, environment, period_type, plan, status, transaction_id, revenue, currency, entitlement_ids, is_trial_conversion, raw_payload`

### iOS App
- Full RevenueCat SDK lifecycle tracking (initialized, identified, customer_info_updated)
- All RC event gaps (GAP 1-5) implemented
- RC SDK mode for independent testing

---

## 4. Backend Security & Performance Hardening

| Area | Change |
|------|--------|
| **Supabase client** | 72 files migrated from `createClient` → `getServiceClient()` |
| **Cron consolidation** | 20 → 10 cron entries, ~1,881/day → ~797/day (−57.6%) |
| **Webhook security** | stripe, clay, resend, twilio: fail-open → fail-closed auth |
| **Error sanitization** | Fixed `error.message` leaks across 138 routes |
| **Cron auth** | All 27 cron routes migrated to `verifyCron()` |
| **Cache headers** | Added `Cache-Control` to read-only endpoints |
| **Health endpoint** | Added `/api/health/detailed` with operational metrics |

---

## 5. API Health Check & Developer Tools

- Expanded from 39 → 68 API health check tests covering all app endpoints
- Developer settings consolidated into single "Developer & Testing" section
- Centralized `SHOW_DEV_SETTINGS` from `config/dev.ts`
- All dev flags (`EXPO_PUBLIC_ENABLE_DEV_FEATURES`, etc.) set to `false` for production

---

## 6. EAS Build & TestFlight

- **72 environment variables** pushed to EAS secrets
- **Version bumped** to 1.1.0 in both `app.json` and native `ios/Info.plist`
- **EAS Build #28** completed and submitted to TestFlight
- **App Store Connect**: App Privacy tracking declarations needed for Meta CAPI data types

---

## 7. Tests

- **552 tests passing** across 33 suites
- 61 EWMA-specific tests (warmth-decay.test.ts + warmth-ewma.test.ts)
- Old heuristic warmth tests fully replaced with EWMA formula tests
- Backend integration tests: 31 subscription type tests
