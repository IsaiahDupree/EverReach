# Backend Roadmap & Status (Work-from Doc)

This checklist extracts only the backend work from the larger multi-team plan, compares it to the current codebase, and tracks live status. Use it to plan, execute, and verify backend deliverables.

Legend: [x] Done | [~] In progress/partial | [ ] Not started

## Phase 0 — Foundations (P0)

- [x] **Paywall stack architecture (RevenueCat + Stripe) documented**
  - Evidence: `REVENUECAT_IMPLEMENTATION.md`, `STRIPE_AND_API_SETUP.md`
  - Done when: One architecture doc exists (SDKs, env vars, webhook endpoints, state chart)
  - Notes: State chart present in `REVENUECAT_IMPLEMENTATION.md` (status transitions).

- [ ] **Event taxonomy + IDs (server ingestion)**
  - Spec: `app_opened`, `onboarding_started`, `paywall_viewed:{surface}`, `purchase_initiated`, `purchase_succeeded`, `subscription_state_changed:{state}`, `media_upload_*`, `error:{surface, code}`, etc.
  - Acceptance: JSON schema + server validation + events appear in dashboard.
  - Evidence: No matches for event names like `paywall_viewed` found.
  - Next: Add schema + `/api/v1/events` ingestion with idempotency, privacy filters.

## Phase 1 — Onboarding & Permissions (P0)

- [ ] **Persist user consent (permissions) on backend**
  - Spec: `profiles.permissions_consent JSONB` with `{type, granted, timestamp, version}` per permission.
  - Acceptance: GET/POST route to read/write, reflected in Settings.
  - Evidence: No `permissions_consent` column/routes found.
  - Next: Migration + `GET/POST /api/v1/me/permissions`.

## Phase 2 — Paywall & Purchases (P0)

- [~] **RevenueCat integration (iOS/Android)**
  - Endpoint: `app/api/v1/billing/revenuecat/webhook/route.ts`
  - Library: `lib/revenuecat-webhook.ts`
  - DB: `supabase/migrations/20251026172100_revenuecat_subscriptions.sql`
  - Entitlements: `app/api/v1/me/entitlements/route.ts`
  - Acceptance: Webhook updates `user_subscriptions` and `GET /v1/me/entitlements` reflects status within seconds.
  - Status: Implemented; E2E failing with 401 in tests (likely secret mismatch or missing service role env in prod). Migration may not yet be applied in prod.
  - Next: Ensure `REVENUECAT_WEBHOOK_SECRET` matches test env or run against env where it does. Apply migration to prod. Re-run `test/backend/revenuecat-webhook.mjs`.

- [~] **Stripe for Web (Checkout + Webhooks)**
  - Endpoints: `app/api/billing/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`
  - Acceptance: Live-mode test purchase flips entitlement in <30s and shows in dashboard.
  - Status: Implemented; depends on env vars (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, success/cancel URLs). Needs live integration validation.
  - Next: Verify envs in Vercel, run checkout in test mode, confirm webhook path `/api/webhooks/stripe` receives events.

- [x] **Restore/Sync purchases**
  - Endpoint: `app/api/v1/billing/restore/route.ts` recomputes entitlements from snapshots.
  - Acceptance: POST returns latest entitlement summary.

## Phase 3 — Contacts, Notes, Images & Audio (P0)

- [x] **Storage + uploads: signed URLs, ACL, server records**
  - Endpoints:
    - `POST /api/v1/files` (create signed upload URL) → `app/api/v1/files/route.ts`
    - `GET /api/v1/files` (list, filter by type/contact) → `app/api/v1/files/route.ts`
    - `GET/PATCH/DELETE /api/v1/files/:id` → `app/api/v1/files/[id]/route.ts`
    - `GET/POST /api/v1/contacts/:id/files` (link to contact, list) → `app/api/v1/contacts/[id]/files/route.ts`
  - DB: using `attachments` table for metadata (path, mime, size, contact_id, etc.)
  - Acceptance: 5–50MB upload works; download via signed URL; server records created.
  - Notes: Virus scanning and thumbnails/duration extraction not present.

- [ ] **Guards & processing**
  - Virus/type guard; image thumbnails; audio duration extraction.
  - Evidence: Not implemented in current code.

- [x] **Create & attach media to notes**
  - Implemented via `POST /api/v1/contacts/:id/files` (links an uploaded file path to a contact). Rendering/inline is frontend.

## Phase 4 — Contacts Page Refinement (P1)

- [ ] **Custom backgrounds (profile_theme) scaffold**
  - Backend: add column and accept patch on contacts; disabled by feature flag.
  - Evidence: Not implemented in current backend.

## Phase 5 — Integration Interfaces Tested E2E (P0)

- [~] **Backend integration tests**
  - Runner: `test/backend/run-all.mjs` (unified)
  - Suites: `test/backend/file-crud.mjs`, `test/backend/revenuecat-webhook.mjs`
  - Status: Runner works; tests failing due to auth/signature. File CRUD expects valid Supabase JWT; RevenueCat expects matching webhook secret.
  - Next: Fix token acquisition (`test-token.txt` or Supabase sign-in) and align `REVENUECAT_WEBHOOK_SECRET` across envs.

## Phase 6 — Tracking & Developer Dashboard (P0→P1)

- [ ] **Ingestion wiring (client+server) for analytics events**
  - Acceptance: Events hit backend and are queryable; idempotency key support.
  - Evidence: No event ingestion endpoint in backend yet.

- [~] **Minimal Dev Dashboard (pre-launch)**
  - Note: Admin/analytics endpoints may exist in separate admin scope; not verified in this repo for backend-vercel.

## Phase 7 — Go-Live Readiness (P0)

- [ ] **Stripe LIVE switch + test**
  - Needs: Live keys, webhook secret, run $0.50 live test.

- [ ] **Store configs (App Store / Play)**
  - Needs: Products mapped in RevenueCat; ensure webhook points to backend `/api/v1/billing/revenuecat/webhook`.

- [ ] **Privacy/consent**
  - Backend: finalize consent schema/versions + deletion flow.

- [ ] **Performance & crash budget (server)**
  - Benchmarks and error tracking configuration.

---

## Gaps vs Proposed Schema (Mapping Notes)

- **media_assets vs attachments**
  - Proposed: `media_assets` table. Actual: using `attachments` for files/notes linkage.
  - Recommendation: Continue with `attachments` (avoid parallel schemas) per coding rules; extend it if needed (duration, thumbnails).

- **user_entitlements vs subscriptions snapshots**
  - Actual: Entitlements computed via `entitlements` table using snapshots from `subscriptions` (Stripe) and `user_subscriptions` (RevenueCat).
  - Evidence: `lib/entitlements.ts`, `lib/revenuecat-webhook.ts`.

- **permissions_consent**
  - Not present; add to `profiles`.

---

## Environment Variables (Backend Critical)

- RevenueCat: `REVENUECAT_WEBHOOK_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

Verify in Vercel: `npx vercel env ls` and redeploy after changes.

---

## Recent Work Status (auto-filled from repo)

- **RevenueCat webhook stack**: Implemented (`app/api/v1/billing/revenuecat/webhook/route.ts`, `lib/revenuecat-webhook.ts`), migration created (`supabase/migrations/20251026172100_revenuecat_subscriptions.sql`). Tests failing with 401; align secrets between env and tests.
- **Stripe checkout + webhook**: Implemented (`app/api/billing/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`). Pending end-to-end verification with env.
- **Files API (CRUD + linking)**: Implemented (`app/api/v1/files/*`, `app/api/v1/contacts/[id]/files/route.ts`). Unified tests exist; fix JWT for tests.
- **Entitlements endpoint**: Implemented (`app/api/v1/me/entitlements/route.ts`) backed by subscription data.
- **Unified backend test runner**: Implemented (`test/backend/run-all.mjs`), with suites for file CRUD and RevenueCat webhook.

---

## Immediate Next Actions (Backend)

- **[high] Fix backend E2E auth/signature**
  - Set `REVENUECAT_WEBHOOK_SECRET` in the target environment to match tests or set test env to match prod. Ensure Supabase auth in `_shared.mjs` works (JWT via `TEST_EMAIL/TEST_PASSWORD`).
- **[high] Apply RevenueCat migration in prod**
  - Use SQL Editor on Supabase or `npx supabase db push` with the migration at `supabase/migrations/20251026172100_revenuecat_subscriptions.sql`.
- **[med] Add permissions consent backend**
  - Migration for `profiles.permissions_consent JSONB`, add GET/POST route.
- **[med] Add media processing enhancements**
  - Thumbnails for images, duration extraction for audio (background job or on upload callback).
- **[low] Event ingestion endpoint**
  - Implement `/api/v1/events` with schema validation and idempotency.

---

Generated: ${new Date().toISOString()}
