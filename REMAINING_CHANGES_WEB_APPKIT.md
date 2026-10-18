# Remaining Changes — Web Frontend & App Kit

**Date:** February 13, 2026
**Reference:** Changes made in iOS app (`qa/test-coverage-v1`) and backend (`origin/backend`) that need to be ported.

---

## Web Frontend (`web-frontend/`, branch: `origin/web-frontend`)

### HIGH PRIORITY — Warmth EWMA Alignment

These files still use the **old warmth thresholds and band names**. They must be updated to match the EWMA standard deployed on the backend.

#### 1. `lib/warmth-utils.ts` — Remove `calculateWarmth`
- **Current:** Exports `calculateWarmth()` (client-side heuristic: `100 × e^(-daysSince/14)`)
- **Action:** Remove `calculateWarmth()`. Keep only `getWarmthColor()` and `getWarmthLabel()`.
- **Update thresholds** in `getWarmthColor` and `getWarmthLabel` to EWMA standard:
  - hot ≥ 80, warm ≥ 60, neutral ≥ 40, cool ≥ 20, cold < 20
- **Reference:** `ios-app/lib/warmth-utils.ts` (already done)

#### 2. `lib/supabase.ts` — Remove `calculateWarmth` re-export
- **Current (line 206):** `export { calculateWarmth, getWarmthColor, getWarmthLabel } from './warmth-utils'`
- **Action:** Remove `calculateWarmth` from the re-export
- **Reference:** `ios-app/lib/supabase.ts` (already done)

#### 3. `hooks/useDashboardData.ts` — Fix thresholds + `cooling` → `cool`
- **Current:** `WARMTH_THRESHOLDS = { hot: 70, warm: 50, cool: 30 }`, uses `'cooling'` band name
- **Action:**
  - Update thresholds: `{ hot: 80, warm: 60, neutral: 40, cool: 20 }`
  - Rename `calculateWarmthBand` return type: `'cooling'` → `'cool'`
  - Update `WarmthSummary.by_band`: `cooling` → `cool` (add `neutral`)
  - Update `Interaction.contact_warmth_band`: `'cooling'` → `'cool'`
  - Fix `useWarmthSummaryLegacy` line 224: `by_band.cooling` → `by_band.cool`
  - Fix `by_band` object init: add `neutral: 0`, rename `cooling` → `cool`
  - Update needs-attention logic: `band === 'cooling'` → `band === 'cool'`
- **Reference:** `ios-app/hooks/useDashboardData.ts` (already done)

#### 4. `hooks/useContacts.ts` — Fix `warmth_band` type
- **Current (line 21):** `warmth_band?: 'hot' | 'warm' | 'neutral' | 'cooling' | 'cold'`
- **Action:** Change `'cooling'` → `'cool'`
- **Reference:** `ios-app/hooks/useContacts.ts` (already done)

#### 5. `providers/WarmthProvider.tsx` — Fix thresholds + default
- **Current:** `WARMTH_BANDS` uses `hot: 70, warm: 50, cool: 30`; default fallback is `50`
- **Action:**
  - Update bands: `hot: { min: 80 }, warm: { min: 60 }, cool: { min: 20 }, cold: { min: 0 }`
  - Add neutral band: `neutral: { min: 40, ... }`
  - Change default fallback from `50` → `30` (lines 112, 166)
- **Reference:** `ios-app/providers/WarmthProvider.tsx` (already done)

#### 6. `app/(tabs)/home.tsx` — Fix `by_band.cooling`
- **Current (line 143):** `cool: warmthSummary.data.by_band.cooling`
- **Action:** Change to `by_band.cool` (after useDashboardData fix)
- **Reference:** `ios-app/app/(tabs)/home.tsx` (already done)

#### 7. `components/WarmthGraph.tsx` — Fix legend
- **Current (line 140):** `Cooling (26-50)` with old thresholds/order
- **Action:** Update legend to match EWMA bands: Hot (80-100), Warm (60-79), Cool (20-39), Cold (0-19)
- **Reference:** `ios-app/components/WarmthGraph.tsx` (already done)

#### 8. `lib/imageUpload.ts` — Remove `cooling` case
- **Current (line 217):** `case 'cooling':` in band color switch
- **Action:** Remove the `case 'cooling':` line
- **Reference:** `ios-app/lib/imageUpload.ts` (already done)

#### 9. `__tests__/warmth-utils.test.ts` — Remove `calculateWarmth` tests
- **Current:** Tests import and test `calculateWarmth`
- **Action:** Remove `calculateWarmth` import and its 2 test cases. Keep color/label tests. Update expected values if thresholds change.
- **Reference:** `ios-app/__tests__/warmth-utils.test.ts` (already done)

---

### MEDIUM PRIORITY — Meta Conversions API

#### 10. Web frontend does NOT have Meta CAPI
- The iOS app has full Meta Conversions API integration in `lib/metaAppEvents.ts`
- **Decision needed:** Does the web frontend need Meta pixel/CAPI tracking?
- If yes, port `metaAppEvents.ts` or add standard Meta Pixel `<script>` tag for web
- If no, no action needed

---

### MEDIUM PRIORITY — RevenueCat

#### 11. Subscription types already updated
- Commit `067325a` expanded subscription types to match backend schema
- **No further action needed** for RevenueCat in web frontend

---

### LOW PRIORITY — Other

#### 12. `app/notifications.tsx` — "cooling down" text
- **Current:** "Get notified when connections are cooling down"
- **Action:** This is natural English copy, NOT a band name. **No change needed.**

#### 13. `constants/pipelines.ts` — "Dormant / Cooling"
- **Current:** Pipeline stage name "Dormant / Cooling"
- **Action:** This is a pipeline label, NOT a warmth band. **No change needed.**

#### 14. `app/onboarding.tsx` — "cooling down" text
- **Current:** "we'll show you who's cooling down"
- **Action:** Natural English copy. **No change needed.**

---

## App Kit (`app-kit/`, branch: `origin/app-kit`)

The App Kit templates have **none** of the warmth, Meta, or RevenueCat changes. These are starter templates, so the scope of changes depends on what the kit is meant to include.

### Templates to Review

| Template Path | What Needs Updating |
|--------------|-------------------|
| `templates/app/` | If warmth scoring is part of the kit, add EWMA-based provider |
| `templates/components/` | If WarmthGraph is included, update legend/thresholds |
| `templates/services/` | If API service layer is included, ensure EWMA endpoints are documented |
| `templates/types/` | If warmth types are included, use `'cool'` not `'cooling'` |

### Documentation to Update

| Doc | What Needs Updating |
|-----|-------------------|
| `docs/02-ARCHITECTURE.md` | Add EWMA warmth model description |
| `docs/06-PAYMENTS.md` | Add RevenueCat webhook setup + subscription_events table |
| `docs/13-ANALYTICS.md` | Add Meta Conversions API setup guide |
| `docs/04-DATABASE.md` | Add subscription_events schema, EWMA columns on contacts |
| `CHANGELOG_EVERREACH_BACKPORT.md` | Add v1.1.0 changes |

### Backend Kit — ✅ COMPLETED (commit f2b29a88)

| Path | Status |
|------|--------|
| `backend-kit/lib/warmth-ewma.ts` | ✅ Created — `computeWarmthFromAmplitude` + `updateAmplitudeForContact` |
| `backend-kit/lib/webhook-security.ts` | ✅ Created — HMAC verification, fail-closed auth, error sanitization |
| `backend-kit/lib/supabase.ts` | ✅ Created — `getServiceClient()` singleton pattern |
| `backend-kit/lib/cron-auth.ts` | ✅ Created — `verifyCron()` middleware |
| `templates/types/models.ts` | ✅ Updated — Subscription, Entitlement, SubscriptionEvent types |

### Web Kit

| Path | What Needs Updating |
|------|-------------------|
| `web-kit/` | Same warmth threshold changes as web-frontend above |
| | Meta Pixel script tag if analytics is included |

---

## Summary Checklist

### Web Frontend (9 file changes) — ✅ COMPLETED (commit 3fce3c5, pushed to origin/web-frontend)
- [x] `lib/warmth-utils.ts` — remove `calculateWarmth`, update thresholds
- [x] `lib/supabase.ts` — remove `calculateWarmth` re-export
- [x] `hooks/useDashboardData.ts` — EWMA thresholds, `cooling` → `cool`
- [x] `hooks/useContacts.ts` — `cooling` → `cool` in type
- [x] `providers/WarmthProvider.tsx` — EWMA thresholds, neutral band, default → 30
- [x] `app/(tabs)/home.tsx` — `by_band.cooling` → merged `.cool` + `.neutral`
- [x] `components/WarmthGraph.tsx` — update legend
- [x] `lib/imageUpload.ts` — remove `cooling` case
- [x] `__tests__/warmth-utils.test.ts` — remove `calculateWarmth` tests

### App Kit (docs + templates) — ✅ COMPLETED (commits 44831c8a + 09226175, pushed to origin/app-kit)
- [x] Update architecture docs with EWMA model (`docs/02-ARCHITECTURE.md`)
- [x] Update payments docs with RevenueCat webhook (`docs/06-PAYMENTS.md`)
- [x] Update analytics docs with Meta CAPI (`docs/13-ANALYTICS.md`)
- [x] Update database docs with new schema (`docs/04-DATABASE.md`)
- [x] Update CHANGELOG with v1.1.0 (`docs/CHANGELOG_EVERREACH_BACKPORT.md`)
- [x] Review templates — no warmth code exists in templates (confirmed via grep)
