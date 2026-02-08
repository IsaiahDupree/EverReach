# PRD 02: Backend/API Hardening

**Priority:** P0 — Blocking release
**Suggested Branch:** `hardening/backend-v1`
**Estimated Effort:** 3–4 days
**Dependencies:** None (can run in parallel with PRD 01)

---

## Objective

Harden the Vercel-hosted backend (`backend-vercel/`) for production traffic. Ensure all API routes have proper auth, error handling, rate limiting, and observability. Close known gaps in missing endpoints referenced by the iOS app.

---

## Current State

| Area | Status | Notes |
|------|--------|-------|
| Rate limiting | ⚠️ Partial | `checkRateLimit` exists in `lib/rateLimit.ts`, used by ~8 routes. In-memory bucket (resets on cold start). ~60+ routes have NO rate limiting. |
| Auth middleware | ⚠️ Partial | Most `/v1/` routes check auth, but `/api/contacts/`, `/api/interactions/`, `/api/health/` may not consistently verify JWT |
| Error handling | ⚠️ Inconsistent | Some routes return raw error messages; no centralized error handler |
| Health checks | ✅ Basic | `/api/health` and `/v1/ops/health` exist |
| Missing endpoints | ❌ | Contact analysis, suggestions endpoint referenced by `useContactDetail.ts` hooks |
| Logging/observability | ⚠️ Minimal | No structured logging, no request tracing |
| CORS | ⚠️ Unknown | Need to verify CORS headers for mobile app requests |

---

## Deliverables

### 1. Rate Limiting — Expand Coverage
**Current:** 8 routes use `checkRateLimit`. In-memory buckets reset on serverless cold start.
- [ ] Apply `checkRateLimit` to ALL public-facing routes (especially webhooks, auth, billing)
- [ ] Evaluate Vercel KV or Upstash Redis for persistent rate limiting across cold starts
- [ ] Rate limit tiers:
  - Auth endpoints: 10 req/min per IP
  - AI/LLM endpoints (compose, transcribe, analyze): 20 req/min per user
  - CRUD endpoints: 60 req/min per user (current default)
  - Webhooks (Stripe, RevenueCat, App Store): 100 req/min per source IP
  - Cron jobs: Exempt (verified via `CRON_SECRET`)

### 2. Auth Middleware Standardization
- [ ] Create `withAuth` middleware wrapper that:
  - Extracts and validates Supabase JWT from `Authorization` header
  - Attaches `userId` to request context
  - Returns 401 for missing/invalid tokens
  - Returns 403 for insufficient permissions
- [ ] Audit all routes and apply `withAuth` consistently:
  - Public (no auth): `/api/health`, `/api/version`, webhooks (use webhook secret instead)
  - Authenticated: All `/v1/` routes, `/api/contacts/`, `/api/interactions/`
  - Admin: All `/api/admin/` routes (verify admin role)
- [ ] Verify webhook endpoints validate their respective secrets (Stripe signature, RevenueCat auth header)

### 3. Error Handling
- [ ] Create centralized `ApiError` class with status code, user-safe message, and internal details
- [ ] Create `withErrorHandler` wrapper that catches unhandled exceptions and returns structured JSON:
  ```json
  { "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests", "retryAfter": 42 } }
  ```
- [ ] Ensure no raw error messages or stack traces leak to clients in production
- [ ] Add Sentry or equivalent error tracking for unhandled exceptions

### 4. Missing Endpoints
Referenced in `hooks/useContactDetail.ts` but not implemented:
- [ ] **`POST /v1/contacts/:id/analyze`** — Trigger AI analysis of a contact (relationship summary, interaction patterns)
  - Input: `contactId`
  - Output: `{ analysis: string, patterns: string[], suggestions: string[] }`
  - Uses existing AI infrastructure (OpenAI)
- [ ] **`GET /v1/contacts/:id/suggestions`** — Get follow-up suggestions for a contact
  - Input: `contactId`
  - Output: `{ suggestions: [{ type: string, message: string, priority: string }] }`
  - Computed from interaction history + warmth score

### 5. Usage Tracking Endpoint
Referenced in `hooks/useFeatureLimits.ts` (all values hardcoded to 0):
- [ ] **`GET /v1/me/usage`** — Return current period usage
  - Output: `{ aiMessages: number, screenshots: number, voiceNotes: number, periodStart: string, periodEnd: string }`
  - Query `usage_periods` table in Supabase
- [ ] Wire `useFeatureLimits` hook to call this endpoint instead of returning 0s

### 6. Observability
- [ ] Add structured request logging (method, path, userId, duration, status)
- [ ] Add `x-request-id` header for request tracing
- [ ] Log slow queries (> 2s) with context
- [ ] Vercel Analytics integration (if not already enabled)

---

## Acceptance Criteria

1. All routes have either auth or explicit public designation
2. Rate limiting active on all routes (verifiable via 429 response)
3. No raw error messages or stack traces in API responses
4. Missing endpoints (`analyze`, `suggestions`, `usage`) return valid data
5. `useFeatureLimits` shows real usage numbers instead of 0
6. Request logging visible in Vercel logs with request IDs
