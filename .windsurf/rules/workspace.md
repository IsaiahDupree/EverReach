---
trigger: model_decision
description: Backend Workspace Guide
---

# Backend Workspace Guide

Authoritative workflow for `backend-vercel/`: environment, schema-first migrations, tests, and deploy. This mirrors the agent test runner style and our backend refactor conventions.

# To do

Refer back and update status of todolists

## Goals

- Simple, repeatable CLI flows
- Schema-first migrations
- Unified test runner (same pattern as `test/agent/run-all.mjs`)
- Zero duplication; no mocks in dev/prod

## 1) Environment

- Local: [backend-vercel/.env.local](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/.env.local:0:0-0:0)
- Do not overwrite existing `.env*` without confirmation
- Required (examples):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `TEST_EMAIL = isaiahdupree33@gmail.com`, `TEST_PASSWORD=frogger12`
  - `REVENUECAT_WEBHOOK_SECRET`
  - `TEST_BASE_URL=https://ever-reach-be.vercel.app`
- Prod/Preview: Vercel Project env vars; redeploy after changes

## 2) Auth for Tests

Auth resolution precedence (implemented in [test/backend/_shared.mjs](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/_shared.mjs:0:0-0:0)):
1. [backend-vercel/test-token.txt](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test-token.txt:0:0-0:0) (JWT)
2. `TEST_JWT` env
3. Supabase email/password sign-in using `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `TEST_EMAIL`/`TEST_PASSWORD`

To refresh token.txt, delete it and rerun backend tests (flow will sign in).

## 3) Unified Test Runner

- Shared utils: [test/backend/_shared.mjs](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/_shared.mjs:0:0-0:0) (env, auth, apiFetch, log, writeReport)
- Suites:
  - [test/backend/file-crud.mjs](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/file-crud.mjs:0:0-0:0)
  - [test/backend/revenuecat-webhook.mjs](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:0:0-0:0)
- Orchestrator: `test/backend/run-all.mjs` (mirrors `test/agent/run-all.mjs`)
- Target selection:
  - `TEST_BASE_URL` sets the API host (local or deployed)
- Expectations:
  - Each suite prints sections, accumulates pass/fail, writes a single report artifact

## 4) Schema-First Migrations (Supabase CLI)

We always pull current schema and author migrations as SQL. Keep changes minimal and idempotent.

Recommended flow:
1. `supabase login`
2. `supabase link --project-ref utasetfxiqcrnwyfforx`
3. Pull schema (read-only baseline):
   - `supabase db pull`  # inspect current remote schema
4. Author migration SQL in `supabase/migrations/<timestamp>_<name>.sql`
   - Include guards: `IF NOT EXISTS`, `DO $$ BEGIN ... END $$;`
   - Include a verification section that `RAISE NOTICE` on success
5. Apply to dev:
   - `npx supabase db push`  (or paste SQL into SQL Editor on the dev project)
6. Run backend tests (`test/backend/run-all.mjs`)
7. Apply to prod (SQL Editor recommended for control)
8. Redeploy Vercel if env changed or route logic depends on new schema

Note: prefer extending existing tables (e.g., `attachments`) over introducing parallel schemas.

## 5) RevenueCat & Stripe

- RevenueCat:
  - Endpoint: `/api/v1/billing/revenuecat/webhook`
  - Secret: `REVENUECAT_WEBHOOK_SECRET` (must match tests and RC dashboard)
  - Migration: [supabase/migrations/20251026172100_revenuecat_subscriptions.sql](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/supabase/migrations/20251026172100_revenuecat_subscriptions.sql:0:0-0:0)
- Stripe:
  - Checkout: `/api/billing/checkout`
  - Webhook: `/api/webhooks/stripe`
  - Env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`

## 6) Backwards-Compatible Changes

- Add columns with defaults or `NULL` acceptance
- Gate new flows behind env/flags
- Avoid breaking API shapes; add, don’t remove (until migration path is documented)

## 7) Conventions

- Keep files < 300 lines; refactor if growing
- No mocks or fake data paths in dev/prod
- Avoid duplicate logic; reuse existing helpers (e.g., [lib/entitlements.ts](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/lib/entitlements.ts:0:0-0:0), `lib/storage.ts`)
- Test logs: concise, actionable errors only

## 8) Quickstart — Fix Current E2E Failures

- Token: ensure [backend-vercel/test-token.txt](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test-token.txt:0:0-0:0) is valid, or rely on TEST_EMAIL/PASSWORD in [.env.local](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/.env.local:0:0-0:0)
- Webhook secret: align `REVENUECAT_WEBHOOK_SECRET` between tests & Vercel
- Migration: apply [20251026172100_revenuecat_subscriptions.sql](cci:7://file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/supabase/migrations/20251026172100_revenuecat_subscriptions.sql:0:0-0:0) to the project `utasetfxiqcrnwyfforx`
- Run: `node test/backend/run-all.mjs`

## 9) PR Checklist

- Routes + migrations + env noted in PR
- `test/backend/run-all.mjs` passes (attach summary)
- No duplicate implementations introduced
- Migrations are idempotent and verified
- Deployment steps (if any) documented


lets always get new tokens at the begining of each test run