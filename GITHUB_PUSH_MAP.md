# GitHub Push Map — EverReach v1.1.0

**Repo:** `IsaiahDupree/EverReach.git`
**Date Range:** February 2026 sessions

---

## iOS App — Branch: `qa/test-coverage-v1`

All commits are in the `ios-app/` local repo, pushed to `origin/qa/test-coverage-v1`.

| Commit | Description | Category |
|--------|-------------|----------|
| `60825b4` | chore: add @expo/cli to devDependencies | Build |
| `b3545e5` | refactor: replace old heuristic warmth tests with EWMA formula tests | Tests |
| `15d5ae2` | chore: remove orphaned calculateWarmth + align remaining band references | Cleanup |
| `9f0b8ae` | chore: bump native Info.plist version to 1.1.0 to match app.json | Release |
| `4efc2cc` | chore: bump version to 1.1.0 for TestFlight submission | Release |
| `a674ea8` | fix: dashboard shows Hot/Warm/Cool/Cold (4 bands), fix broken cooling reference | Warmth UI |
| `0b6539b` | fix: remove redundant warmth recompute + align dashboard bands to EWMA | Warmth |
| `093fcb4` | refactor: unify warmth system on EWMA model with consistent band thresholds | Warmth |
| `eef9641` | test: add 27 comprehensive warmth decay formula tests | Tests |
| `1e8df3f` | fix: remove 400 fallback for updated_at sort — backend deployed to Vercel | API fix |
| `4d58ce8` | fix: audit all app pages — fix 6 broken API paths, 1 broken route, 1 response parse bug | API fix |
| `f5fde55` | fix: accept 400 for updated sort until backend redeploy | API fix |
| `a2c21ac` | feat: log Meta Conversions API events to Supabase for audit trail | Meta CAPI |
| `e97f911` | fix: contacts updated sort uses .desc format matching backend Zod schema | API fix |
| `1ac4b5a` | fix: correct 9 health check expected status codes | Tests |
| `e4d336e` | feat: expand API Health Check from 39 to 68 tests covering all app endpoints | Tests |
| `f0c698b` | refactor: organize dev section into 4 categorized groups | Dev tools |
| `2217f6e` | refactor: merge 3 dev sections into single 'Developer & Testing' section | Dev tools |
| `93f49d9` | fix: developer settings page now uses centralized SHOW_DEV_SETTINGS from config/dev.ts | Dev tools |
| `aad5275` | refactor: consolidate 7 scattered dev settings blocks into 3 clean sections | Dev tools |
| `92cee0e` | feat: comprehensive API Health Check page for developer settings | Dev tools |
| `7854311` | docs: iOS→Web migration guide for subscription type changes | Docs |
| `f3d2845` | feat: iOS subscription types + backend integration tests (31 tests) | RevenueCat |
| `cb8236d` | fix: sync webhook route with backend — match actual DB schema | RevenueCat |
| `c6cb3bd` | docs: PRD_ALL_EVENTS_BACKEND_INTEGRATION.md — complete event catalog | Docs |
| `92fde3d` | feat: add RC SDK mode - independent RevenueCat event testing | RevenueCat |
| `21e09bc` | fix: RC test page routes Direct CAPI to Meta monitor, not RC monitor | Meta/RC |
| `46f69b0` | fix: auto-fallback to direct Meta CAPI when monitor is ON but unreachable | Meta CAPI |
| `1b84585` | feat: PRD + implement all RevenueCat event gaps (GAP 1-5) | RevenueCat |
| `4db87f7` | feat: track RevenueCat SDK lifecycle events | RevenueCat |

### Files changed (key files only)
- `providers/WarmthProvider.tsx` — band thresholds, default fallback
- `providers/WarmthSettingsProvider.tsx` — default thresholds, new lead default
- `lib/warmth-utils.ts` — removed calculateWarmth, aligned thresholds
- `lib/supabase.ts` — removed calculateWarmth re-export
- `lib/imageUpload.ts` — removed stale 'cooling' case
- `lib/metaAppEvents.ts` — CAPI integration, Supabase audit logging
- `hooks/useDashboardData.ts` — EWMA thresholds, cooling→cool rename
- `hooks/useContacts.ts` — warmth_band type fix
- `app/(tabs)/home.tsx` — 4-band display, merged neutral into cool
- `app/message-results.tsx` — removed redundant recompute call
- `components/WarmthGraph.tsx` — updated legend to EWMA thresholds
- `__tests__/warmth-decay.test.ts` — replaced with EWMA tests
- `__tests__/warmth-ewma.test.ts` — comprehensive EWMA tests
- `__tests__/warmth-utils.test.ts` — removed calculateWarmth tests
- `app.json` — version 1.0.0 → 1.1.0
- `ios/AIEnhancedPersonalCRM/Info.plist` — CFBundleShortVersionString → 1.1.0

---

## Backend — Branch: `feat/subscription-events` (pushed to `origin/backend`)

All commits are in the `backend/` local repo.

| Commit | Description | Category |
|--------|-------------|----------|
| `639584d` | fix: initialize EWMA warmth fields on contact creation | Warmth |
| `a0444f0` | refactor: daily-warmth cron uses EWMA instead of heuristic | Warmth |
| `3c49150` | fix: daily-warmth cron processes ALL contacts, formula aligned | Warmth |
| `10d9fa0` | feat: add updated_at sort support to contacts list endpoint | API |
| `ad3a988` | fix: changelog returns empty instead of 500, billing portal uses getServiceClient | Fix |
| `e1b2f2c` | fix: sanitize error.message leaks across 138 routes | Security |
| `f21603d` | fix: eliminate all createClient from 60 API routes → getServiceClient() | Security |
| `36e1b0c` | fix: standardize 12 webhook/dev routes — fail-closed auth | Security |
| `736518b` | feat: cron consolidation — 20→10 jobs, fix 6 broken routes | Performance |
| `22eb849` | fix: security hardening round 2 — webhooks, cron, events | Security |
| `f0fe961` | refactor: standardize Supabase client creation in 16 cron routes | Security |
| `2d329b1` | feat: add Cache-Control headers to read-only endpoints | Performance |
| `1a114e4` | fix: migrate all 27 cron routes to verifyCron() | Security |
| `f593f49` | docs: update PRD with implementation status | Docs |
| `1d491c8` | feat: add /api/health/detailed endpoint | Monitoring |
| `1ddabc6` | fix: consolidate RC webhook + migrate 10 cron routes to verifyCron() | RevenueCat |
| `7fd9c50` | fix: security + performance hardening (Phase 1 + quick wins) | Security |
| `930e394` | docs: PRD_BACKEND_SECURITY_PERFORMANCE.md | Docs |
| `56fef8e` | feat: add RevenueCat webhook handler + subscription_events audit table | RevenueCat |
| `7906849` | Initial commit: Backend API | Initial |

### Files changed (key files only)
- `app/api/cron/daily-warmth/route.ts` — EWMA rewrite
- `app/api/v1/contacts/route.ts` — EWMA field initialization
- `app/api/webhooks/revenuecat/route.ts` — RC webhook handler
- `lib/supabase.ts` — centralized getServiceClient()
- `lib/warmth-ewma.ts` — computeWarmthFromAmplitude, updateAmplitudeForContact
- 72 files migrated from createClient → getServiceClient

---

## Web Frontend — Branch: `origin/web-frontend`

| Commit | Description | Category |
|--------|-------------|----------|
| `3fce3c5` | refactor: align web-frontend warmth system to EWMA standard (9 files) | Warmth |
| `067325a` | feat: expand subscription types to match backend schema | RevenueCat |
| `4fb473f` | Initial commit: Web frontend | Initial |

### Files changed in `3fce3c5`
- `lib/warmth-utils.ts` — removed calculateWarmth, EWMA thresholds
- `lib/supabase.ts` — removed calculateWarmth re-export
- `hooks/useDashboardData.ts` — EWMA thresholds, cooling→cool
- `hooks/useContacts.ts` — warmth_band type fix
- `providers/WarmthProvider.tsx` — EWMA thresholds, neutral band, default→30
- `app/(tabs)/home.tsx` — merged cool+neutral for 4-band display
- `components/WarmthGraph.tsx` — updated legend
- `lib/imageUpload.ts` — removed cooling case
- `__tests__/warmth-utils.test.ts` — removed calculateWarmth tests

---

## App Kit — Branch: `origin/app-kit`

| Commit | Description | Category |
|--------|-------------|----------|
| `f2b29a88` | feat: add backend-kit lib templates + update subscription types | Templates |
| `09226175` | docs: update architecture, database, payments, analytics with v1.1.0 | Docs |
| `44831c8a` | docs: add v1.1.0 warmth EWMA unification to backport changelog | Docs |
| `0630c4af` | docs: EverReach → App Kit backport changelog | Docs |
| `381dc591` | Add consolidated Developer Handoff guide | Docs |
| `e8a63cac` | Add Web App Starter Kit PRD | Docs |
| `8acfcc99` | Add Backend Starter Kit PRD | Docs |
| `be88bc8c` | Enhanced PRD with detailed developer handoff guide | Docs |
| `ffa66313` | Add PRD for iOS Starter Kit (Option A) | Docs |
| `03668b0a` | App Kit v2: scaffolding, DevModeOverlay, 14 docs | Initial |

### New files in `f2b29a88`
- `backend-kit/lib/warmth-ewma.ts` — EWMA computation template
- `backend-kit/lib/supabase.ts` — getServiceClient singleton
- `backend-kit/lib/webhook-security.ts` — HMAC verification, fail-closed auth
- `backend-kit/lib/cron-auth.ts` — cron route authentication
- `templates/types/models.ts` — expanded Subscription, Entitlement, SubscriptionEvent types

---

## Deployment Status

| Target | Status | Details |
|--------|--------|---------|
| **iOS (TestFlight)** | ✅ Build #28 submitted | v1.1.0, includes all ios-app commits |
| **Backend (Vercel)** | ✅ Redeployed Feb 15 | `ever-reach-be.vercel.app` from `origin/backend` (639584d) — health 200 OK |
| **Web Frontend** | ✅ EWMA aligned | Commit `3fce3c5` pushed to `origin/web-frontend` |
| **App Kit** | ✅ Docs + templates updated | Commits `44831c8a` → `09226175` → `f2b29a88` pushed to `origin/app-kit` |
| **Supabase** | ✅ Active | Project `utasetfxiqcrnwyfforx`, us-east-2 |
