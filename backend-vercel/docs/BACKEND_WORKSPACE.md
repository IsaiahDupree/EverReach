# Backend Workspace Guide

Authoritative workflow for `backend-vercel/`: environment, schema-first migrations, tests, and deploy. Mirrors the agent runner style and our backend refactor conventions.

## Goals

- Simple, repeatable CLI flows
- Schema-first migrations
- Unified test runner (same pattern as `test/agent/run-all.mjs`)
- Zero duplication; no mocks in dev/prod

## 1) Environment

- Local: `backend-vercel/.env.local`
- Do not overwrite existing `.env*` without confirmation
- Required (examples):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `TEST_EMAIL`, `TEST_PASSWORD`
  - `REVENUECAT_WEBHOOK_SECRET`
  - `TEST_BASE_URL=https://ever-reach-be.vercel.app`
- Prod/Preview: Vercel Project env vars; redeploy after changes

## 2) Auth for Tests

Auth resolution precedence (implemented in `test/backend/_shared.mjs`):
1. `backend-vercel/test-token.txt` (JWT)
2. `TEST_JWT` env
3. Supabase email/password sign-in using `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `TEST_EMAIL`/`TEST_PASSWORD`

To refresh token.txt, delete it and rerun backend tests (flow will sign in).

## 3) Unified Test Runner

- Shared utils: `test/backend/_shared.mjs` (env, auth, apiFetch, log, writeReport)
- Suites:
  - `test/backend/file-crud.mjs`
  - `test/backend/revenuecat-webhook.mjs`
- Orchestrator: `test/backend/run-all.mjs` (mirrors `test/agent/run-all.mjs`)
- Target selection: `TEST_BASE_URL` sets the API host (local or deployed)
- Expectations: each suite prints sections, accumulates pass/fail, writes a single report artifact

## 4) Schema-First Migrations (Supabase CLI)

We always pull current schema and author migrations as SQL. Keep changes minimal and idempotent.

Recommended flow:
1. Install Supabase CLI (Windows: `winget install SupabaseCLI.Supabase` or `choco install supabase`)
2. `supabase login`
3. `supabase link --project-ref utasetfxiqcrnwyfforx`
4. Pull schema (read-only baseline): `supabase db pull`
5. Author migration SQL in `supabase/migrations/<timestamp>_<name>.sql`
   - Use guards: `IF NOT EXISTS`, `DO $$ BEGIN ... END $$;`
   - Add a verification `RAISE NOTICE` section
6. Apply to dev: `supabase db push` (or paste SQL in SQL Editor)
7. Run backend tests: `node test/backend/run-all.mjs`
8. Apply to prod (SQL Editor recommended)
9. Redeploy Vercel if env changed or routes rely on new schema

Prefer extending existing tables (e.g., `attachments`) over introducing parallel schemas.

## 5) RevenueCat & Stripe

- RevenueCat:
  - Endpoint: `/api/v1/billing/revenuecat/webhook`
  - Secret: `REVENUECAT_WEBHOOK_SECRET` (must match tests and RC dashboard)
  - Migration: `supabase/migrations/20251026172100_revenuecat_subscriptions.sql`
- Stripe:
  - Checkout: `/api/billing/checkout`
  - Webhook: `/api/webhooks/stripe`
  - Env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`

## 6) Backwards-Compatible Changes

- Add columns with defaults or allow NULLs
- Gate new flows behind env/flags where helpful
- Avoid breaking API shapes; add rather than remove, then deprecate cleanly

## 7) Conventions

- Keep files < 300 lines; refactor when approaching that size
- No mocks or fake data paths in dev/prod
- Avoid duplicate logic; reuse helpers (e.g., `lib/entitlements.ts`, `lib/storage.ts`)
- Test logs: concise, actionable errors only

## 8) Quickstart — Fix Current E2E Failures

- Token: ensure `backend-vercel/test-token.txt` is valid, or rely on TEST_EMAIL/PASSWORD in `.env.local`
- Webhook secret: align `REVENUECAT_WEBHOOK_SECRET` between tests & Vercel
- Migration: apply `20251026172100_revenuecat_subscriptions.sql` to project `utasetfxiqcrnwyfforx`
- Run: `node test/backend/run-all.mjs`

## 9) PR Checklist

- Routes + migrations + env noted in PR
- `test/backend/run-all.mjs` passes (attach summary)
- No duplicate implementations introduced
- Migrations are idempotent and verified
- Deployment steps (if any) documented
