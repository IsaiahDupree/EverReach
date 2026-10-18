# Branch Snapshot — February 13, 2026 @ 4:07 PM EST

This document captures the exact state of every repo and branch before starting backend integration work.

---

## iOS App Repo

- **Location:** `/Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/`
- **Remote:** `origin` → `https://github.com/IsaiahDupree/EverReach.git`
- **Current Branch:** `qa/test-coverage-v1`
- **Latest Commit:** `c6cb3bd` — "docs: PRD_ALL_EVENTS_BACKEND_INTEGRATION.md — complete event catalog with DB integration spec"
- **Remote Sync:** ✅ Pushed to `origin/qa/test-coverage-v1` (matches local)
- **Working Tree:** Clean (no uncommitted changes)

### Recent Commits on `qa/test-coverage-v1`
```
c6cb3bd docs: PRD_ALL_EVENTS_BACKEND_INTEGRATION.md
92fde3d feat: add RC SDK mode - independent RevenueCat event testing
21e09bc fix: RC test page routes Direct CAPI to Meta monitor (3456)
46f69b0 fix: auto-fallback to direct Meta CAPI when monitor is ON but unreachable
1b84585 feat: PRD + implement all RevenueCat event gaps (GAP 1-5)
```

### Other Local Branches
| Branch | Commit | Notes |
|--------|--------|-------|
| `ios-app` | `1aa2d3f` | Main iOS branch |
| `master` | `cf4a857` | Behind by 6 commits |

---

## Backend Repo

- **Location:** `/Users/isaiahdupree/Documents/Software/EverReachOrganized/backend/`
- **Remote:** `origin` → `https://github.com/IsaiahDupree/EverReach.git`
- **Current Branch:** `master` (tracks `origin/backend`)
- **Latest Commit:** `7906849` — "Initial commit: Backend API"
- **Remote Sync:** ✅ Pushed to `origin/backend` (matches local)
- **Working Tree:** Clean (no uncommitted changes)

### Remote Branches Available
```
origin/app-kit
origin/backend          ← current (7906849)
origin/backend-kit
origin/ios-app
origin/ios-kit
origin/marketing
origin/master
origin/qa/test-coverage-v1
origin/web-frontend
origin/web-kit
```

---

## Vercel Production Deployment

- **Project:** `backend-vercel`
- **URL:** `ever-reach-be.vercel.app`
- **Deployed From:** `feat/event-tracking-hotfix` (commit `7681757`)
- **Deploy Message:** "docs: Add comprehensive Meta Conversions API backend setup guide"
- **Deploy Date:** January 4, 2026
- **Status:** ⚠️ Branch `feat/event-tracking-hotfix` NO LONGER EXISTS on remote
- **Error Rate:** 22.9% (as of snapshot)

### Vercel Preview Branches
| Branch | Status | Date |
|--------|--------|------|
| `e2e-ios` | Preview | Feb 1 |
| `feat/event-tracking-hotfix` | Production | Jan 4 |
| `e2e-web` | Preview | Dec 31 |
| `feat/evidence-reports` | Preview | Dec 6 |
| `everreach-dashboard-latest` | Preview | Dec 6 |

---

## Key Observations

1. **iOS app is safe** — all work committed and pushed on `qa/test-coverage-v1`
2. **Backend `origin/backend` has only 1 commit** — the initial commit from Jan 17
3. **Vercel production branch (`feat/event-tracking-hotfix`) is deleted from remote** — deployment is orphaned
4. **Both repos share the same GitHub remote** (`IsaiahDupree/EverReach.git`) but track different branches
5. **Latest backend-vercel code** exists in TWO places:
   - `ios-app/backend-vercel/` on `qa/test-coverage-v1` (has our UNCANCELLATION/REFUND fixes)
   - `backend/backend-vercel/` on `origin/backend` (older, initial commit version)

---

## Post-Work State (4:22 PM EST)

### Backend Repo — New Branch Pushed
- **Branch:** `feat/subscription-events` (off `origin/backend`)
- **Commit:** `56fef8e` — "feat: add RevenueCat webhook handler + subscription_events audit table"
- **Pushed:** ✅ `origin/feat/subscription-events`
- **PR ready:** https://github.com/IsaiahDupree/EverReach/pull/new/feat/subscription-events

### DB Migrations Applied to Supabase (utasetfxiqcrnwyfforx)
1. `create_subscription_events` — new audit log table with indexes + RLS
2. `dedup_subscriptions_and_add_constraints` — unique index on (user_id, store), expanded plan/source checks, nullable current_period_end, dropped product_id FK

### Tested Locally (all pass)
- INITIAL_PURCHASE → status: active, plan: core ✅
- CANCELLATION → status: canceled, canceled_at set ✅
- REFUND → status: expired, plan: free ✅
- All events logged to subscription_events audit table ✅

### iOS Repo — Unchanged
- **Branch:** `qa/test-coverage-v1` at `c6cb3bd`
- **Status:** ✅ Safe, untouched during backend work
