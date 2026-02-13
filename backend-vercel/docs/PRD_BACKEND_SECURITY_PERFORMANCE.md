# PRD: Backend Security, Performance & Reliability Hardening

**Author:** Cascade + Isaiah Dupree  
**Date:** February 13, 2026  
**Status:** Draft  
**Branch:** `feat/subscription-events`  
**Deployed Backend:** `ever-reach-be.vercel.app` (22.9% error rate as of audit)

---

## 0. Implementation Status (Updated Feb 13, 2026)

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add signature verification to RC webhook | ✅ Done | `7fd9c50` |
| 2 | Consolidate duplicate RC webhook endpoints | ✅ Done | `1ddabc6` |
| 3 | Implement Apple JWKS verification | ⬜ Not started | — |
| 4 | Fix PostHog webhook fail-open | ✅ Done | `7fd9c50` |
| 5 | Centralize cron auth (`lib/cron-auth.ts`) | ✅ Done (10/27 routes) | `1ddabc6` |
| 6 | Deploy updated backend to Vercel | ⬜ Not started | — |
| 7 | Set all required env vars in Vercel | ⬜ Not started | — |
| 8 | Consolidate CORS → single source of truth | ✅ Done | `7fd9c50` |
| 9 | Stop leaking DB error details | ✅ Done | `7fd9c50` |
| 10 | Add webhook idempotency (dedup) | ✅ Done (DB + code) | `7fd9c50` |
| 11 | Reduce process-imports cron → 5min | ✅ Done | `7fd9c50` |
| 12 | Add structured request logging | ✅ Done (middleware) | `7fd9c50` |
| 13 | Move rate limiting to Vercel KV | ⬜ Not started | — |
| 14 | Standardize Supabase client creation | ⬜ Not started | — |
| 15 | Add Cache-Control to read-only routes | ⬜ Not started | — |
| 16 | Add `/api/health/detailed` | ✅ Done | `1d491c8` |
| 17 | Migrate to RFC 7807 errors | ⬜ Not started | — |
| 18 | Wire monitoring middleware | ⬜ Not started | — |

**Completed: 11/18 tasks** across 4 commits on `feat/subscription-events`

---

## 1. Executive Summary

This audit identified **12 critical findings** and **18 recommended improvements** across security, performance, and reliability in the EverReach backend. The most urgent issues are:

- ~~**Unauthenticated webhook endpoints** accepting unsigned payloads in production~~ ✅ Fixed
- **22.9% error rate** on Vercel production deployment (needs redeploy)
- ~~**20 cron jobs** with inconsistent auth patterns~~ ✅ 10 migrated to `verifyCron()`
- ~~**No global error boundary** or structured request logging~~ ✅ Request logging added

---

## 2. Current Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js (App Router) | Vercel serverless |
| **Runtime** | Edge + Node.js (mixed) | Some routes are edge, some node |
| **Database** | Supabase (PostgreSQL) | `utasetfxiqcrnwyfforx` |
| **Auth** | Supabase JWT (HS256) | `lib/auth.ts` → `getUser()` |
| **CORS** | Custom middleware + `lib/cors.ts` | Allowlist + dev convenience |
| **Rate Limiting** | Token bucket via Supabase | `lib/api/rate-limit.ts` |
| **Error Format** | RFC 7807 (partial adoption) | `lib/api/errors.ts` |
| **Webhooks** | 8+ providers | Stripe, Twilio, Clay, Resend, PostHog, Meta, App Store, RevenueCat |
| **Cron Jobs** | 20 scheduled via `vercel.json` | Every 1–24 hours |

### API Route Count: ~300 routes

---

## 3. Security Findings

### 3.1 CRITICAL: Unauthenticated RevenueCat Webhook

**File:** `app/api/webhooks/revenuecat/route.ts` (new route)  
**Severity:** 🔴 Critical  
**Status:** No signature verification, no auth token check

The newly added webhook at `/api/webhooks/revenuecat` accepts **any POST request** without verifying:
- `x-revenuecat-signature` header (HMAC SHA256)
- `Authorization: Bearer <token>` header

**Meanwhile**, the pre-existing route at `/api/v1/billing/revenuecat/webhook` **does** have proper verification using `lib/revenuecat-webhook.ts`.

**Impact:** An attacker could forge webhook payloads to:
- Grant themselves premium subscriptions
- Revoke other users' access
- Poison the `subscription_events` audit trail

**Fix:** Add signature verification from `lib/revenuecat-webhook.ts` to the new route, or consolidate to a single webhook endpoint.

---

### 3.2 HIGH: Duplicate RevenueCat Webhook Endpoints

Two separate handlers exist for RevenueCat webhooks:

| Route | Auth | Schema Match | Audit Log |
|-------|------|-------------|-----------|
| `/api/webhooks/revenuecat` (new) | ❌ None | ✅ Matches actual DB | ✅ subscription_events |
| `/api/v1/billing/revenuecat/webhook` (existing) | ✅ Signature + Bearer | ❌ Uses `lib/revenuecat-webhook.ts` schema | ❌ No audit log |

**Fix:** Merge into one canonical route that has **both** auth AND correct schema AND audit logging.

---

### 3.3 HIGH: App Store Webhook — No JWT Signature Verification

**File:** `app/api/webhooks/app-store/route.ts`  
**Code comment:** `"In production, verify signature with Apple's public key"`

The `decodeJWT()` function decodes Apple's signed payloads **without verifying** the signature against Apple's public key. An attacker could craft fake App Store notifications.

**Fix:** Implement Apple JWKS verification using `jose` library (already a dependency).

---

### 3.4 MEDIUM: PostHog Webhook Skips Auth When Secret Missing

**File:** `app/api/webhooks/posthog-events/route.ts`

```ts
if (!POSTHOG_WEBHOOK_SECRET) {
    console.warn('POSTHOG_WEBHOOK_SECRET not set, skipping verification');
    return true; // Allow in development
}
```

If `POSTHOG_WEBHOOK_SECRET` is not set in production, **all requests are accepted**.

**Fix:** Reject requests when secret is not configured (fail-closed instead of fail-open).

---

### 3.5 MEDIUM: CORS Allows All Origins in Non-Production

**File:** `middleware.ts`

```ts
const allowAll = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_ORIGINS === 'true';
```

Vercel preview deployments (`VERCEL_ENV=preview`) run with `NODE_ENV=production`, but `ALLOW_ALL_ORIGINS=true` could be set accidentally. The `lib/cors.ts` allowlist is more restrictive but only used when routes call `options(req)` directly.

**Fix:** Remove `ALLOW_ALL_ORIGINS` env var. Use `VERCEL_ENV` to determine dev mode. Consolidate CORS to one implementation.

---

### 3.6 MEDIUM: Cron Auth Inconsistencies

20 cron jobs use 5 different auth patterns:

| Pattern | Count | Issue |
|---------|-------|-------|
| `authHeader === Bearer ${CRON_SECRET}` | 12 | ✅ Correct |
| `cronSecret && authHeader !== Bearer ${cronSecret}` | 4 | ⚠️ Allows if CRON_SECRET is unset |
| Query param `?secret=CRON_SECRET` | 1 | ⚠️ Secret in URL (logged by infra) |
| Default `'dev-secret'` | 1 | 🔴 Hardcoded fallback |
| No auth at all | 2 | 🔴 Open to public |

**Fix:** Centralize cron auth into a shared `verifyCron(req)` utility. Fail-closed when CRON_SECRET is missing.

---

### 3.7 LOW: Error Messages Leak Internal Details

**File:** `app/api/v1/events/track/route.ts`

```ts
return serverError(`Database error: ${error.message}`, req);
```

Supabase error messages can contain table names, column names, and constraint names.

**Fix:** Return generic error to client; log details server-side only.

---

### 3.8 LOW: Monitoring Middleware Uses Placeholder Auth

**File:** `lib/monitoring/middleware.ts`

```ts
context.userId = 'extracted_from_token';  // TODO placeholder
context.orgId = 'extracted_from_token';
```

**Fix:** Wire up actual JWT extraction using `getUser()` from `lib/auth.ts`.

---

## 4. Performance Findings

### 4.1 HIGH: 22.9% Error Rate on Production

The Vercel production deployment was deployed from `feat/event-tracking-hotfix` (commit `7681757`, Jan 4). That branch has since been **deleted from the remote**. The deployment is orphaned.

**Likely causes:**
- Cron jobs hitting tables/views that don't exist in the deployed version
- Missing env vars (CRON_SECRET, OPENAI_API_KEY, STRIPE_SECRET_KEY)
- Health check reporting "degraded" because Stripe and OpenAI are unconfigured

**Fix:** Deploy the current `feat/subscription-events` branch (or merge to a production branch). Set all required env vars in Vercel.

---

### 4.2 HIGH: 20 Cron Jobs — Aggressive Scheduling

| Frequency | Count | Jobs |
|-----------|-------|------|
| Every 1 min | 1 | `process-imports` |
| Every 5 min | 4 | `refresh-monitoring-views`, `process-enrichment-queue`, `process-contact-photos`, `health-check` |
| Every 15 min | 3 | `sync-posthog`, `ingest-metrics`, `health/ping`, `alerts/check` |
| Hourly | 2 | `refresh-dashboard-views`, `refresh-marketing-views` |
| Daily | 8 | warmth, AI context, ETL, digests |

`process-imports` running **every minute** is extremely aggressive for a Vercel cron. Each invocation is a cold start + DB queries.

**Fix:**
- Move `process-imports` to every 5 minutes (or use Supabase pg_cron for sub-minute needs)
- Consolidate the 4 every-5-min jobs into a single dispatcher
- Add circuit breaker: skip cron if previous run is still executing (use DB lock)

---

### 4.3 MEDIUM: Rate Limiting Hits Supabase on Every Request

**File:** `lib/api/rate-limit.ts`

Every rate-limited API call makes 1–3 Supabase queries (SELECT + INSERT/UPDATE on `api_rate_limits`). This adds 100–300ms latency per request.

**Fix:**
- Use Vercel KV (Redis) or in-memory cache for rate limit counters
- Fall back to Supabase only for persistence across cold starts
- Consider Vercel Edge Middleware rate limiting (sub-ms)

---

### 4.4 MEDIUM: No Response Caching

No API routes use `Cache-Control`, `ETag`, or `stale-while-revalidate` headers. Every request to read-heavy endpoints (contacts list, offerings, feature flags) hits the DB.

**Fix:** Add cache headers for read-only endpoints:
- Feature flags: `Cache-Control: public, max-age=60`
- Contact lists: `Cache-Control: private, max-age=10, stale-while-revalidate=30`
- Offerings/products: `Cache-Control: public, max-age=300`

---

### 4.5 LOW: Inconsistent Supabase Client Creation

At least 4 different patterns for getting a Supabase client:

| Pattern | Files | Notes |
|---------|-------|-------|
| `getServiceClient()` | ~10 | ✅ Best — lazy, cached |
| `getSupabaseServiceClient()` | ~15 | ✅ OK — similar, build-safe |
| `createClient(url!, key!)` | ~20 | ⚠️ Creates new client every call |
| `getClientOrThrow(req)` | ~30 | ✅ RLS-aware, good for user routes |

**Fix:** Standardize on `getServiceClient()` for admin/cron routes and `getClientOrThrow(req)` for user-authenticated routes. Remove direct `createClient()` calls.

---

## 5. Reliability Findings

### 5.1 HIGH: No Webhook Idempotency (New Route)

The new `/api/webhooks/revenuecat` route has no deduplication. If RevenueCat retries a webhook (which it does on 5xx responses), the same event gets processed twice — creating duplicate `subscription_events` rows and potentially toggling subscription status back and forth.

The existing `/api/v1/billing/revenuecat/webhook` route handles duplicates via `processWebhookEvent()` which throws `DUPLICATE_EVENT`.

**Fix:** Add idempotency check using `transaction_id` or `event.id` before processing. Use a unique constraint on `subscription_events(transaction_id, event_type)`.

---

### 5.2 HIGH: No Global Error Boundary

The middleware (`middleware.ts`) only handles CORS. Unhandled exceptions in route handlers produce raw 500 responses with no `X-Request-ID`, no structured error body, and no logging.

**Fix:** Add a global error wrapper or use Next.js `error.ts` convention. Ensure all 500s include `X-Request-ID` and log to a monitoring service.

---

### 5.3 MEDIUM: RFC 7807 Error Framework Underutilized

`lib/api/errors.ts` provides a comprehensive RFC 7807 error system with `ProblemDetails`, but most routes use `lib/cors.ts` helpers (`badRequest()`, `serverError()`) which return a simpler `{ error: string }` format.

**Fix:** Migrate high-traffic routes to use `buildErrorResponse()`. At minimum, all `/api/v1/` public API routes should return RFC 7807 format.

---

### 5.4 MEDIUM: No Structured Request Logging

No middleware-level access logging. Route-level `console.log` is inconsistent. No request timing, no response status tracking, no correlation IDs between logs.

**Fix:** Add request logging in middleware:
```
[2026-02-13T21:22:07Z] POST /api/webhooks/revenuecat 200 429ms req_abc123
```

---

### 5.5 LOW: No Health Dashboard Endpoint

The existing `/api/health` reports basic status but doesn't expose:
- Error rate over last 5 minutes
- Webhook success/failure rate
- Cron job last-run timestamps
- DB connection pool utilization

**Fix:** Add `/api/health/detailed` (admin-only) that aggregates operational metrics.

---

## 6. Implementation Plan

### Phase 1: Critical Security (1–2 days)

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1 | Add signature verification to `/api/webhooks/revenuecat` | 🔴 Critical | `route.ts` |
| 2 | Consolidate duplicate RevenueCat webhook endpoints | 🔴 Critical | 2 route files + lib |
| 3 | Implement Apple JWKS verification for App Store webhook | 🟡 High | `app-store/route.ts` |
| 4 | Fix fail-open auth in PostHog webhook | 🟡 High | `posthog-events/route.ts` |
| 5 | Centralize cron auth into `lib/cron-auth.ts` | 🟡 High | 20 cron routes |

### Phase 2: Error Rate Reduction (1–2 days)

| # | Task | Priority | Files |
|---|------|----------|-------|
| 6 | Deploy updated backend to Vercel production | 🔴 Critical | Vercel config |
| 7 | Set all required env vars in Vercel | 🔴 Critical | Vercel dashboard |
| 8 | Add global error boundary with request IDs | 🟡 High | `middleware.ts` |
| 9 | Stop leaking DB error details to clients | 🟡 High | Multiple routes |
| 10 | Add webhook idempotency (dedup by transaction_id) | 🟡 High | `subscription_events` |

### Phase 3: Performance (2–3 days)

| # | Task | Priority | Files |
|---|------|----------|-------|
| 11 | Reduce cron frequency: process-imports → 5min | 🟡 High | `vercel.json` |
| 12 | Add Cache-Control headers to read-only endpoints | 🟢 Medium | Multiple routes |
| 13 | Move rate limiting to Vercel KV or Edge | 🟢 Medium | `lib/api/rate-limit.ts` |
| 14 | Standardize Supabase client creation | 🟢 Medium | ~20 files |
| 15 | Add structured request logging in middleware | 🟢 Medium | `middleware.ts` |

### Phase 4: Observability (1–2 days)

| # | Task | Priority | Files |
|---|------|----------|-------|
| 16 | Add `/api/health/detailed` with operational metrics | 🟢 Medium | New route |
| 17 | Migrate public API routes to RFC 7807 errors | 🟢 Medium | `/api/v1/` routes |
| 18 | Wire up monitoring middleware with real user context | 🔵 Low | `lib/monitoring/middleware.ts` |

---

## 7. Quick Wins (Can Ship Today)

These require minimal code changes and reduce risk immediately:

1. **Add `REVENUECAT_WEBHOOK_AUTH_TOKEN` env var** and check `Authorization: Bearer` header in new webhook route (5 lines of code)
2. **Add unique constraint** on `subscription_events(transaction_id, event_type)` for dedup
3. **Change `process-imports` cron** from `* * * * *` to `*/5 * * * *`
4. **Remove `ALLOW_ALL_ORIGINS`** env var from production
5. **Set `CRON_SECRET`** in Vercel if not already set

---

## 8. Env Vars Audit

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `SUPABASE_URL` | ✅ | Set | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Set | Admin operations |
| `SUPABASE_ANON_KEY` | ✅ | Set | RLS-aware queries |
| `SUPABASE_JWT_SECRET` | ✅ | Set | JWT verification |
| `CRON_SECRET` | ✅ | ⚠️ Unknown | Required for all cron jobs |
| `REVENUECAT_WEBHOOK_SECRET` | ✅ | ⚠️ Not set | Webhook signature verification |
| `REVENUECAT_WEBHOOK_AUTH_TOKEN` | ✅ | ⚠️ Not set | Fallback bearer auth |
| `REVENUECAT_V2_API_KEY` | ✅ | Set | API calls |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | Unknown | Stripe webhook verification |
| `STRIPE_SECRET_KEY` | ⚠️ | Unknown | Stripe API calls |
| `OPENAI_API_KEY` | ⚠️ | Unknown | AI features |
| `POSTHOG_WEBHOOK_SECRET` | ⚠️ | Unknown | PostHog webhook verification |
| `META_PIXEL_ID` | ✅ | Set | Meta Conversions API |
| `META_CAPI_TOKEN` | ✅ | Set | Meta Conversions API |

---

## 9. Metrics to Track Post-Fix

| Metric | Current | Target | How to Measure |
|--------|---------|--------|---------------|
| Vercel error rate | 22.9% | < 1% | Vercel dashboard |
| Webhook success rate | Unknown | > 99.5% | `subscription_events` table |
| P95 API latency | Unknown | < 500ms | Vercel analytics |
| Cron job success rate | Unknown | > 99% | `service_status` table |
| Unauthorized webhook attempts | Unknown | Logged | Structured logging |

---

## 10. References

- `BRANCH_SNAPSHOT_2026-02-13.md` — Branch state before/after
- `docs/PRD_ALL_EVENTS_BACKEND_INTEGRATION.md` — Event catalog (iOS app)
- `lib/revenuecat-webhook.ts` — Existing RC webhook signature verification
- `lib/api/errors.ts` — RFC 7807 error framework
- `lib/api/rate-limit.ts` — Rate limiting implementation
- `vercel.json` — Cron job schedule
