# Deployment & Analytics TODO Runbook

Date: 2025-11-01
Branch: `feat/dev-dashboard`

---

## In Progress

- Run Supabase migration: `migrations/onboarding-system.sql` on project `utasetfxiqcrnwyfforx` (creates `onboarding_responses`, `user_tags`, profile columns, RLS)

---

## Pending

- Migration step 1: Verify DB connection with psql (SELECT now())
- Migration step 2: Apply `migrations/onboarding-system.sql` via psql
- Migration step 3: Verify tables and policies created (describe tables, select count)
- Post-deploy: curl POST `/api/v1/ops/warmth/advance-time` (simulate 1 day)
- Post-deploy: curl GET `/api/v1/files?type=image&limit=5`
- Run `node test/backend/test-media-crud.mjs`
- Share `docs/ONBOARDING_PAYWALL_SLIDES.md` with frontend/marketing/design
- Author `analytics/events.yml` taxonomy (prompt_submitted, ai_response_generated, paywall_shown, purchase_succeeded, etc.)
- Create analytics tables (`01_events.sql`): `app_events`, `prompts`, `responses`, `ml_response_samples` view; run SQL
- Build Expo RN Analytics wrapper (PostHog + durable collector forwarding)
- Implement `/api/ingest` collector: write to Supabase `app_events`, mirror to PostHog, forward to MI webhook
- Gate features with RevenueCat entitlements + Superwall (iOS); emit paywall/purchase events
- Implement password reset flow via Resend (tokens table + 2 endpoints)
- Nightly ML dataset export: SQL view + API to dump CSV to Supabase storage
- Write acceptance tests for copy/like/dislike, paywall, restore, reset, export
- Roll out new flows behind feature flags/experiments; track conversion by variant

---

## Analytics Loop (Ship-This-Week)

- **Event Taxonomy & DB**
  - Author `analytics/events.yml` taxonomy (canonical names + required props)
  - Create and run `01_events.sql` (tables: `app_events`, `prompts`, `responses`; view: `ml_response_samples`)
  - Define data retention for `app_events` (e.g., 90d) and schedule cleanup
- **Server Collector**
  - Implement `/api/ingest` collector: write to `app_events`, upsert prompts/responses
  - Secure collector with API key and rate limiting; scrub PII
  - Ensure idempotent upserts to avoid duplicates on retries
  - Configure Marketing Intelligence webhook `MI_WEBHOOK_URL`
- **Client Instrumentation (Expo RN)**
  - Build Analytics wrapper (PostHog + durable collector forwarding)
  - Instrument key UI: copy/like/dislike, paywall_shown, purchase attempted/succeeded/failed, trial_expired
  - Emit `entitlement_refreshed` on login/restore (RevenueCat)
  - Add `response_rendered` and compute `dwell_ms` (render → first interaction)
  - Set `EXPO_PUBLIC_COLLECTOR_URL` in Expo; deploy base URL to Vercel env
- **Payments & Trials**
  - iOS: Wire Superwall bridge and callbacks; emit paywall/purchase events
  - Android: Build paywall fallback using RevenueCat offerings UI
  - Setup Apple/Google Sandbox testers; validate RC entitlements (`Purchases.debugLogsEnabled = true`)
  - RevenueCat: enable "transfer purchases on multiple App User IDs" if needed
  - Implement `enforceTrial()` on app start/foreground
  - Implement restore purchases flow and entitlement refresh on login
- **Password Reset (Web)**
  - Create `password_resets` table (token, user_id, expires_at, index)
  - Implement `request-reset` and `perform-reset` endpoints (Resend + Supabase admin)
  - Build frontend reset page (Next.js)
  - Decide: Supabase SMTP reset vs Custom token flow; document decision
- **ML Export**
  - Create `02_ml_export.sql` (curated CSV/export view)
  - Implement `/api/export/ml-dump` to write CSV to Supabase storage
  - Create `ml-datasets` bucket and configure access
  - Add nightly cron (Vercel or Supabase) to trigger export
- **Observability & Env**
  - Build PostHog dashboards and funnels (onboarding → paywall → purchase); add alerts
  - Verify PostHog receives events end-to-end
  - Update `.env.example` with `EXPO_PUBLIC_COLLECTOR_URL`, `POSTHOG_API_KEY/HOST`, `MI_WEBHOOK_URL`
- **Feature Flags**
  - Roll out new flows behind flags/experiments; track conversion by variant
- **Acceptance Tests**
  - Detox/E2E: copy/like/dislike events, paywall flow, restore, password reset, ML export

---

## Completed

- Fix failing avatar_url test (PATCH `/v1/contacts/:id` returns `avatar_url`)
- Implement POST `/v1/onboarding/answers` endpoint
- Implement GET `/v1/me/trial-stats` endpoint
- Run `node test/backend/test-warmth-advance-time.mjs`

---

## Commands & Snippets

### 1) Run Supabase Migration (psql)

PowerShell (set password via environment variable; do not commit secrets):

```powershell
# Test connection
$env:PGPASSWORD = '<your_postgres_password>'
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -c "select now();"

# Apply migration (run from backend-vercel folder)
$env:PGPASSWORD = '<your_postgres_password>'
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations\onboarding-system.sql
```

Verification queries:

```sql
select to_regclass('public.onboarding_responses');
select to_regclass('public.user_tags');
select column_name, data_type from information_schema.columns where table_name='profiles' and column_name in ('default_cadence','preferred_channels','privacy_mode','ai_assistance_level','analytics_consent');
```

### 2) Post-Deploy API Checks

Warmth advance (simulate 1 day):

```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/ops/warmth/advance-time \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 1}'
```

List recent images:

```bash
curl "https://ever-reach-be.vercel.app/api/v1/files?type=image&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3) Local Test Scripts

```bash
node test/backend/test-warmth-advance-time.mjs
node test/backend/test-media-crud.mjs
```

---

## Notes

- Keep secrets out of docs and commits. Set credentials via environment variables at runtime.
- Frontend work is required to consume the new onboarding and trial stats endpoints.
- Track progress by updating this checklist and the PostHog funnels as events go live.
