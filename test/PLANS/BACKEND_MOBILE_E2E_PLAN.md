# Backend Endpoints + Mobile UI E2E Test Plan

Last updated: 2025-10-18

## Goals

- **Catalog** backend endpoints and mobile app pages/screens
- **Define** test coverage (integration + E2E UI) per endpoint/screen
- **Prioritize** a phased rollout that exercises critical value paths
- **Standardize** test data patterns (idempotent writes, read-only where possible)

---

## Backend Endpoint Inventory (by route)

All routes live under `backend-vercel/app/api/`.

- **Health**
  - `GET /api/health`

- **Contacts (core)**
  - `GET /api/v1/contacts`
  - `POST /api/v1/contacts`
  - `GET /api/v1/contacts/:id`
  - `POST /api/v1/contacts/:id/warmth/recompute`
  - `GET /api/v1/contacts/:id/context-summary`
  - `GET /api/v1/contacts/:id/messages` (unified timeline)
  - `POST /api/v1/contacts/:id/files` (link uploads)
  - `POST /api/v1/contacts/:id/notes`
  - Pipeline
    - `POST /api/v1/contacts/:id/pipeline`
    - `POST /api/v1/contacts/:id/pipeline/move`
    - `GET  /api/v1/contacts/:id/pipeline/history`
  - `POST /api/contacts/search`

- **Messages + Compose**
  - `POST /api/v1/messages/prepare`
  - `POST /api/v1/messages/send`
  - `POST /api/v1/compose`
  - `POST /api/v1/compose/validate`

- **Agent + Analysis**
  - `POST /api/v1/agent/chat`
  - `POST /api/v1/analysis/screenshot`
  - `GET  /api/v1/analysis/screenshot/:id`

- **Me + Usage**
  - `GET /api/v1/me`
  - `GET /api/v1/me/usage-summary`
  - `GET /api/v1/me/impact-summary`
  - `GET /api/v1/me/plan-recommendation`

- **Billing**
  - `POST /api/v1/billing/restore`
  - `POST /api/v1/billing/app-store/transactions`
  - `POST /api/v1/billing/play/transactions`
  - `GET  /api/billing/checkout` (legacy)
  - `GET  /api/billing/portal`   (legacy)

- **Uploads / Files**
  - `POST /api/v1/uploads/sign`

- **Recommendations & Trending**
  - `GET /api/v1/recommendations/daily`
  - `GET /api/v1/trending/prompts`

- **Telemetry**
  - `POST /api/v1/telemetry/prompt-first`

- **Warmth (batch)**
  - `POST /api/v1/warmth/recompute` ({ contact_ids: [] })

- **Cron (internal)**
  - `POST /api/cron/*` (daily-recs, entitlements-sanity, interaction-metrics, paywall-rollup, prompts-rollup, score-leads)

---

## Mobile App Page/Screen Inventory (Expo)

Routes under `app/` (selected high-value screens):

- **Core**
  - `app/index.tsx` (entry)
  - `(tabs)/home.tsx` — Home
  - `(tabs)/people.tsx` — People list
  - `contact/[id].tsx` — Contact details
  - `contact/[id]-enhanced.tsx` — Enhanced contact view
  - `contact-context/[id].tsx` — Context bundle
  - `contact-history/[id].tsx` — Timeline
  - `contact-notes/[id].tsx` — Notes

- **Messaging**
  - `message-templates.tsx`
  - `message-results.tsx`
  - `message-sent-success.tsx`
  - `chat-intro.tsx`

- **Health & Debug**
  - `health.tsx` — Connectivity Health
  - `health-status.tsx` — Status view
  - `supabase-debug.tsx`
  - `api-test-suite.tsx`

- **Auth & Onboarding**
  - `sign-in.tsx`, `auth/callback.tsx`, `reset-password.tsx`
  - `onboarding.tsx`

- **Settings & Preferences**
  - `(tabs)/settings.tsx`
  - `mode-settings.tsx`
  - `privacy-settings.tsx`
  - `notifications.tsx`
  - `subscription-plans.tsx`

- **Import & Files**
  - `import-contacts.tsx`
  - `avatar-upload-test.tsx`

- **Misc Dev/Test**
  - `openai-test.tsx`, `audio-test.tsx`, `supabase-test.tsx`, etc.

---

## Test Strategy

- **Integration tests (Jest)**
  - Exercise backend endpoints with read-only or idempotent writes
  - Use `Idempotency-Key` for write tests to avoid duplicate data
  - Validate authentication (401), rate limits (single-shot headers), request IDs
  - Confirm response shape, status codes, and critical invariants

- **E2E UI (Playwright, Web)**
  - Use real authentication (saved session from `auth.setup.ts`)
  - Drive flows that call backend via the app (e.g., prepare/send message)
  - Assert visible UI state, URL changes, and selected data properties on page

- **E2E Mobile (Maestro)**
  - Device-level flows for critical journeys; keep stable and short
  - Prefer deep links for faster navigation (`everreach://health` / contact pages)

- **Data Management**
  - Idempotency keys on write endpoints
  - Poll-and-assert for eventually consistent updates (e.g., warmth recompute)
  - Keep test user/org isolated; avoid touching production contacts

---

## Coverage Matrix (Phase 1 → Phase 3)

### Phase 1 — Critical Flows (Now)

- **Health**
  - Backend: `GET /api/health` (done)
  - UI: `health.spec.ts` (done), `health-detailed.spec.ts` (done)

- **Contacts (create/read)**
  - Backend: `POST /v1/contacts` (idempotent), `GET /v1/contacts/:id`
  - UI: Navigate to contact, verify core fields appear

- **Messaging (prepare → send → warmth)**
  - Backend: `POST /v1/messages/prepare`, `POST /v1/messages/send`
  - UI: `warmth-on-send.spec.ts` (done) — verifies `last_interaction_at` and `warmth` advance

- **Subscription Plans**
  - UI: `subscription-plans.spec.ts` (done)

### Phase 2 — Breadth & Context

- **Contacts**
  - Backend: `/contacts/search`, `/contacts/:id/context-summary`
  - UI: Contact context page shows recent interactions and computed deltas

- **Files/Notes**
  - Backend: `/contacts/:id/files` (link), `/contacts/:id/notes`
  - UI: Attach a file (stub upload), add and view note

- **Pipeline**
  - Backend: `/contacts/:id/pipeline`, `/pipeline/move`, `/pipeline/history`
  - UI: Move a contact between stages and verify stage label

- **Compose**
  - Backend: `/v1/compose`, `/v1/compose/validate`
  - UI: Compose page renders suggested body and validation state

### Phase 3 — Advanced & Analytics

- **Me/Usage**
  - Backend: `/v1/me`, `/v1/me/usage-summary`, `/v1/me/impact-summary`
  - UI: Usage cards reflect backend data

- **Agent & Analysis**
  - Backend: `/v1/agent/chat` (sanity), `/v1/analysis/screenshot`
  - UI: Agent chat intro renders, minimal smoke

- **Trending/Recommendations**
  - Backend: `/v1/recommendations/daily`, `/v1/trending/prompts`
  - UI: Any summary or cards shown in home

---

## Concrete Test Additions (Files to create)

All paths relative to repo root.

- **Integration (Jest) — `test/backend/__tests__/`**
  - `contacts-create-read.test.ts` — create via idempotency, read, verify fields
  - `messages-prepare-send.test.ts` — prepare + send; verify interaction + last_interaction_at via contact GET
  - `contacts-search-context.test.ts` — search happy-path; context-summary shape
  - `contacts-files-notes.test.ts` — link file (signed URL mocked or pre-uploaded), add note
  - `contacts-pipeline.test.ts` — set pipeline, move stage, read history
  - `compose.test.ts` — compose + validate payloads

- **E2E Web (Playwright) — `test/frontend/tests/`**
  - `contact-create.spec.ts` — create contact via UI, land on contact page
  - `contact-pipeline.spec.ts` — move stage via UI
  - `contact-notes.spec.ts` — add a note via UI
  - `files-link.spec.ts` — link a dummy file via UI (or stub UI control)
  - `agent-chat.smoke.spec.ts` — open chat intro and see ready state

- **E2E Mobile (Maestro) — `test/mobile/flows/`**
  - `contact-create.yaml` — create contact via UI (if page exists), assert appears on list
  - `message-send.yaml` — draft and send, verify success screen
  - `pipeline-move.yaml` — deep link to contact, perform move if supported

---

## Standards & Patterns

- **Idempotency**: Set `Idempotency-Key` header for any write, use timestamped suffixes
- **Auth**: Use saved session from `auth.setup.ts`; extract Supabase access token from `localStorage` for backend calls when needed inside Playwright
- **Retry/Poll**: Use small retry helper for eventually consistent updates (e.g., warmth recompute)
- **Selectors**: Use robust text/id selectors; avoid brittle deep DOM traversal
- **Data Cleanup**: Prefer idempotent creation; if deletes are required, ensure test org segregation first

---

## Ownership & Milestones

- **Milestone 1 (Today)**
  - Done: Health E2E (2), Home (2), Navigation (3), Subscription Plans (1), Warmth-on-send (1)
  - Add: Backend integration for contacts create/read and messages prepare/send

- **Milestone 2 (Next 2–3 days)**
  - Add Playwright: contact-create, notes, pipeline move
  - Add Jest integration: search, context-summary, files/notes, pipeline move

- **Milestone 3 (After Android build)**
  - Run Maestro flows (4 existing) and add message-send + contact-create flows

---

## Open Questions

- Should write tests run only on a dedicated test org to avoid data pollution? If yes, provide org bootstrap route or seed script.
- For files: provide a deterministic mock (e.g., pre-uploaded public object) to link instead of uploading in tests.
- For agent/analysis: smoke-only vs full prompt journeys?

---

## References

- Backend endpoints in `backend-vercel/app/api/`
- Mobile screens in `app/`
- Existing tests:
  - Playwright: `test/frontend/tests/*.spec.ts`
  - Maestro: `test/mobile/flows/*.yaml`
  - Integration: `test/backend/__tests__/*.test.ts`
  - Unit: `__tests__/*`
