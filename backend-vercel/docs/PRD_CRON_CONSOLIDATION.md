# Cron Job Consolidation Plan

> Audit and consolidation of all Vercel cron jobs to reduce invocations,
> fix bugs, and stay within plan limits.
>
> Date: February 13, 2026
> Branch: `feat/subscription-events`

---

## Vercel Cron Limits

| Plan | Max Jobs/Project | Min Frequency | Max Duration | Retries |
|------|-----------------|---------------|-------------|---------|
| **Hobby** | 100 | Daily (once/day) | 10s | None |
| **Pro** | 100 | Every minute | 60s (300s w/ maxDuration) | None |
| **Enterprise** | 100 | Every minute | 900s | None |

- Cron jobs invoke Vercel Functions — same pricing/limits apply
- Vercel does NOT retry on failure
- Timing precision: ±59 minutes on Hobby, tighter on Pro
- No concurrency control built-in (must implement yourself)

---

## Current State: 20 Cron Entries

### Every 5 Minutes (5 jobs × 288/day = 1,440 invocations/day)

| # | Path | Purpose | Tables |
|---|------|---------|--------|
| 1 | `/api/cron/refresh-monitoring-views` | Refresh `mv_webhook_performance`, `mv_rule_performance` | `rpc:refresh_monitoring_views` |
| 2 | `/api/cron/process-enrichment-queue` | Process user enrichment (10/batch) | `user_identity`, `app_user` |
| 3 | `/api/cron/process-imports` | Process contact import jobs | `contact_import_jobs` |
| 4 | `/api/cron/process-contact-photos` | Download/optimize contact photos | `contact_photo_jobs` |
| 5 | `/api/cron/health-check` | Check health of all integrations | `integration_accounts`, `service_status` |

### Every 15 Minutes (4 jobs × 96/day = 384 invocations/day)

| # | Path | Purpose | Tables |
|---|------|---------|--------|
| 6 | `/api/cron/sync-posthog` | PostHog events → metrics | `metrics_timeseries`, `service_status` |
| 7 | `/api/cron/ingest-metrics` | All integration metrics | `integration_accounts`, `metrics_timeseries` |
| 8 | `/api/health/ping` | DB health, webhook lag, Stripe API | `service_status`, `webhook_log` |
| 9 | `/api/alerts/check` | 6 alert conditions → Slack/email | `metrics_timeseries`, `service_status`, `alert_history` |

### Hourly (2 jobs × 24/day = 48 invocations/day)

| # | Path | Purpose | Views Refreshed |
|---|------|---------|----------------|
| 10 | `/api/cron/refresh-dashboard-views` | Dashboard materialized views | 6 views via `rpc:refresh_dashboard_views` + `rpc:refresh_experiment_views` |
| 11 | `/api/cron/refresh-marketing-views` | Marketing materialized views | `mv_daily_funnel`, `mv_user_magnetism_7d`, `mv_user_magnetism_30d` |

### Daily (9 jobs × 1/day = 9 invocations/day)

| # | Path | Schedule | Purpose |
|---|------|----------|---------|
| 12 | `/api/cron/check-warmth-alerts` | 9 AM | Check watched contacts, send push notifications |
| 13 | `/api/cron/sync-ai-context` | 2 AM | Infer user goals from behavior |
| 14 | `/api/cron/dev-activity-digest` | 9 AM | Send developer activity digest |
| 15 | `/api/cron/warmth-snapshots` | Midnight | Record daily warmth score snapshots |
| 16 | `/api/cron/recompute-warmth` | 1 AM | Apply time-based warmth decay |
| 17 | `/api/etl/posthog` | Midnight | Daily PostHog ETL (DAU/WAU/MAU) |
| 18 | `/api/etl/meta-ads` | 1 AM | Daily Meta Ads spend/ROAS ETL |
| 19 | `/api/etl/mobile-acquisition` | 2 AM | Daily ASA + Google Play ETL |
| 20 | `/api/etl/openai-usage` | 3 AM | Daily OpenAI cost/usage ETL |

**Total: ~1,881 function invocations/day**

---

## Bugs Found

### BUG-1: GET/POST Mismatch (3 routes — CRITICAL)

Vercel cron **always calls GET**. These routes only have POST handlers for their core logic:

| Route | GET Handler | POST Handler | Impact |
|-------|-----------|-------------|--------|
| `/api/health/ping` | Returns static JSON | Does actual health checks | **Health checks never run** |
| `/api/alerts/check` | Returns static JSON | Checks 6 alert conditions | **Alerts never fire** |
| `/api/etl/posthog` | None (404) | Does PostHog ETL | **ETL never runs** |
| `/api/etl/meta-ads` | None (404) | Does Meta Ads ETL | **ETL never runs** |
| `/api/etl/mobile-acquisition` | None (404) | Does acquisition ETL | **ETL never runs** |
| `/api/etl/openai-usage` | None (404) | Does OpenAI ETL | **ETL never runs** |

**Fix:** Add GET handlers that delegate to POST logic, or change POST to GET.

### BUG-2: Fail-Open Auth (3 routes)

These routes use `if (cronSecret && ...)` which passes when `CRON_SECRET` is not set:

| Route | Current Auth | Fix |
|-------|-------------|-----|
| `/api/health/ping` | `cronSecret && authHeader !== ...` | Use `verifyCron()` (fail-closed) |
| `/api/alerts/check` | `cronSecret && authHeader !== ...` | Use `verifyCron()` (fail-closed) |
| `/api/etl/*` (4 routes) | `cronSecret && authHeader !== ...` | Use `verifyCron()` (fail-closed) |

### BUG-3: Inline `createClient` (6 routes)

These routes create their own Supabase client instead of using `getServiceClient()`:

- `/api/health/ping`
- `/api/alerts/check`
- `/api/etl/posthog`
- `/api/etl/meta-ads`
- `/api/etl/mobile-acquisition`
- `/api/etl/openai-usage`

### BUG-4: Routes Exist But Not Scheduled

| Route | Intended Frequency | Status |
|-------|-------------------|--------|
| `/api/cron/aggregate-superwall` | Every 15 min | **Not in vercel.json** |
| `/api/cron/process-embeddings` | Every 5 min | **Not in vercel.json** |
| `/api/cron/run-campaigns` | Every 15 min | **Not in vercel.json** |
| `/api/cron/send-email` | Every 5 min | **Not in vercel.json** |
| `/api/cron/send-sms` | Every 5 min | **Not in vercel.json** |
| `/api/cron/sync-email-metrics` | Daily | **Not in vercel.json** |
| `/api/cron/sync-posthog-events` | Every 15 min | **Not in vercel.json** (duplicate of sync-posthog?) |

---

## Consolidation Plan

### Merge Strategy

Create **dispatcher routes** that call multiple operations sequentially. Keep original routes for manual triggering.

### After Consolidation: 10 Cron Entries

| # | New Path | Freq | Merges | Est. Duration |
|---|----------|------|--------|--------------|
| 1 | `/api/cron/monitor` | */5 | health-check + health/ping + refresh-monitoring-views | ~15s |
| 2 | `/api/cron/process-queues` | */5 | enrichment + imports + photos | ~30s |
| 3 | `/api/cron/ingest-all-metrics` | */15 | sync-posthog + ingest-metrics + aggregate-superwall | ~20s |
| 4 | `/api/cron/check-alerts` | */15 | alerts/check (fix GET handler) | ~10s |
| 5 | `/api/cron/refresh-views` | hourly | dashboard-views + marketing-views | ~10s |
| 6 | `/api/cron/daily-warmth` | 0 0 | warmth-snapshots + recompute-warmth | ~120s |
| 7 | `/api/cron/daily-etl` | 0 1 | posthog + meta-ads + mobile-acquisition + openai-usage | ~60s |
| 8 | `/api/cron/sync-ai-context` | 0 2 | (keep as-is) | ~120s |
| 9 | `/api/cron/check-warmth-alerts` | 0 9 | (keep as-is, sends push notifs) | ~30s |
| 10 | `/api/cron/dev-activity-digest` | 0 9 | (keep as-is, sends digest) | ~10s |

### Invocation Savings

| | Before | After | Savings |
|---|--------|-------|---------|
| 5-min jobs | 5 × 288 = 1,440/day | 2 × 288 = 576/day | -864 |
| 15-min jobs | 4 × 96 = 384/day | 2 × 96 = 192/day | -192 |
| Hourly jobs | 2 × 24 = 48/day | 1 × 24 = 24/day | -24 |
| Daily jobs | 9/day | 5/day | -4 |
| **Total** | **1,881/day** | **797/day** | **-57.6%** |

---

## Notes for iOS and Web Apps

### iOS App Impact

- **No cron jobs run on iOS** — all scheduling is backend-side
- iOS should respect `Cache-Control` headers on subscription/entitlement endpoints (30s TTL)
- iOS `SubscriptionManager.syncWithBackend()` polls the backend; this is unaffected by cron changes
- If `daily-warmth` timing changes, push notifications for warmth alerts may arrive at a different time
- **Action:** No iOS code changes required

### Web App Impact

- **No cron jobs run on web** — all scheduling is backend-side
- Web `EntitlementsProviderV3` uses React Query with its own stale time; unaffected
- Web dashboard views will refresh hourly (was: dashboard hourly + marketing hourly separately)
- **Action:** No web code changes required. Dashboard data freshness unchanged.

### App Kit Impact

- Document the consolidated cron pattern in `app-kit/docs/CHANGELOG_EVERREACH_BACKPORT.md`
- App Kit `backend-kit/` has no cron routes; add a `cron/` template in the consolidation pattern
- **Action:** Update app-kit docs with recommended cron structure

---

## Implementation Order

1. **Phase 1 — Bug fixes** (this PR)
   - Fix GET/POST mismatch on health/ping, alerts/check, 4 ETL routes
   - Fix fail-open auth → use `verifyCron()`
   - Replace `createClient` → `getServiceClient()`

2. **Phase 2 — Consolidation** (this PR)
   - Create `/api/cron/monitor` dispatcher
   - Create `/api/cron/refresh-views` dispatcher
   - Create `/api/cron/daily-warmth` dispatcher
   - Create `/api/cron/daily-etl` dispatcher
   - Create `/api/cron/ingest-all-metrics` dispatcher
   - Create `/api/cron/process-queues` dispatcher
   - Update `vercel.json`

3. **Phase 3 — Cleanup** (follow-up PR)
   - Evaluate unscheduled routes (campaigns, email, SMS, embeddings)
   - Add missing routes to schedule or remove dead code
   - Add structured logging with timing for each sub-task
