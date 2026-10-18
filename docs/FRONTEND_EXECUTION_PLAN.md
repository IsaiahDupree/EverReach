# EverReach Frontend Execution Plan

A focused, implementation-ready plan scoped to the frontend only. Derived from your master roadmap and grounded in the current codebase. Status reflects what exists in this repo today.

Legend: ✅ Completed  🟡 Partial  🔴 Pending

---

## Phase 0 — Foundations (P0)

- **Event taxonomy + IDs** — 🟡 Partial
  - Evidence
    - `services/analytics.ts` provides structured tracking helpers.
    - `hooks/useAnalytics` referenced across screens (e.g., `app/contact/[id].tsx`).
  - Gaps
    - No single JSON schema file present for event validation.
    - No automated runtime validation of event payloads in client.
  - Next
    - Add `docs/analytics-schema.json` and a tiny validator wrapper in `lib/analytics.ts`.

- **Data Access Layer (DAL) pattern** — ✅ Completed (baseline)
  - Evidence
    - React Query present and used widely: `@tanstack/react-query` and hooks (`useQuery`, `useMutation`).
    - tRPC client setup: `lib/trpc.ts` (client-only) with `@trpc/react-query`.
    - Multiple data hooks: `hooks/useContacts.ts`, `hooks/useContactDetail.ts`, `hooks/useDashboardData.ts`.
  - Next
    - Add short ADR in `docs/adr/0001-dal-pattern.md` documenting query keys, caching and offline strategy.

- **Decide paywall stack (cross-platform)** — 🔴 Pending (frontend init)
  - Evidence
    - RevenueCat docs in `docs/REVENUECAT_SETUP.md`.
    - Backend endpoints for Stripe exist (web), but frontend wiring not found.
  - Next
    - Implement RC init on native startup; define shared paywall component (see Phase 2).

---

## Phase 1 — Onboarding & Permissions (P0)

- **Onboarding flow (screens & routing)** — 🟡 Partial
  - Evidence
    - `providers/OnboardingProvider.tsx` referenced in docs (provider exists in summaries), onboarding tracking in `services/analytics.ts`.
  - Next
    - Verify screen files (welcome → why → permissions → account → paywall preview). If missing, create `app/onboarding/*` screens and route.

- **Permissions prompts + persistence** — 🟡 Partial
  - Evidence
    - Audio (Mic): `expo-av` permission flows across voice components (`components/VoiceMicButton.tsx`, `components/VoiceRecorder.tsx`, `hooks/useAudioRecorder.ts`).
    - Contacts: `helpers/nativePicker.ts` requests contacts permission (Android) and uses Expo Contacts picker.
  - Gaps
    - No unified “Permissions & Privacy” settings screen detected.
    - Notifications/Camera/Photos not audited in this pass.
  - Next
    - Create `app/settings/permissions.tsx` with per-permission state and re-prompt/OS-settings deep link.

---

## Phase 2 — Paywall & Purchases (P0)

- **RevenueCat integration (iOS/Android)** — 🔴 Pending
  - Evidence
    - `ios/Pods/RevenueCat` present; `node_modules/react-native-purchases` types available.
    - No frontend RC configure/init or offerings retrieval found.
  - Next
    - Add `lib/revenuecat.ts` init (configure Purchases; already has `restorePurchases()` helper).
    - Add `providers/SubscriptionProvider.tsx` (if not present) to expose entitlement state.

- **Stripe for Web** — 🔴 Pending (frontend)
  - Evidence
    - Backend endpoints exist (docs & server code for checkout/portal).
    - No `repos/SubscriptionRepo.ts` found in repo snapshot.
  - Next
    - Create `repos/SubscriptionRepo.ts` using `apiFetch` to call:
      - `POST /api/v1/billing/checkout`
      - `POST /api/v1/billing/portal`
      - `GET /api/v1/me/entitlements`

- **Unified paywall UI (cross-platform)** — 🟡 Partial (placeholder)
  - Evidence
    - `app/subscription-plans.tsx` exists (local mock data per `ENDPOINT_MAPPING.md`).
  - Next
    - Replace mocks with real offerings (RC on native; Stripe price catalog or server-driven copy on web).
    - Componentize into `components/paywall/Paywall.tsx` with server-driven config.

- **Restore/Sync purchases** — 🟡 Partial
  - Evidence
    - `lib/revenuecat.ts::restorePurchases()` helper.
  - Next
    - Wire to settings/paywall screen and update entitlements via backend `GET /api/v1/me/entitlements`.

---

## Phase 3 — Contacts, Notes, Images & Audio (P0)

- **Storage + uploads** — ✅ Completed (baseline)
  - Evidence
    - Screenshot flow docs and hooks using multipart uploads: `SCREENSHOT_IMPLEMENTATION_GUIDE.md`, `CRM_ASSISTANT_SCREENSHOT_FEATURE.md`.
    - Audio recording and playback implemented with `expo-av`.

- **Create & attach media to notes** — ✅ Completed (baseline)
  - Evidence
    - Screens and hooks for notes + media (e.g., voice notes in `features/notes/screens/VoiceNote.tsx`).

- **Playback** — ✅ Completed (baseline)
  - Evidence
    - `expo-av` play/pause flows in `components/VoiceRecorder.tsx`.

---

## Phase 4 — Contacts Page Refinement (P1)

- **Contact profile** — 🟡 In Progress
  - Evidence (recent work)
    - Consolidated contact communication panel: `components/ContactChannels.tsx`.
    - Social media channels rendered from `contact.social_channels` (fallback to `contact.metadata.social_channels`).
    - Add/Edit/Delete channel flows implemented (prefilled modal edit, long-press menu, pencil button).
    - Deep linking supported via `lib/deepLinking.ts` (iOS schemes required in app config).
    - Removed Pipeline History and “Currently in” from `app/contact/[id].tsx`.

- **Future: Custom backgrounds** — 🔴 Pending
  - Next
    - Add schema stub and feature flag; defer UI.

---

## Phase 5 — Integration Interfaces Tested E2E (P0)

- **Frontend integration tests** — 🔴 Pending (repo-side)
  - Next
    - Add Detox (native) or Playwright (web) smoke E2Es for: onboarding → permissions → paywall → purchase (mock) → contact → add note w/ media → playback.

---

## Phase 6 — Tracking & Developer Dashboard (P0 → P1)

- **Ingestion wiring (client)** — 🟡 Partial
  - Evidence
    - Analytics events emit via `services/analytics.ts` and `useAnalytics`.
  - Next
    - Ensure all critical events in the taxonomy are present and standardized.

- **Minimal Dev Dashboard (web)** — 🔴 Pending (frontend)
  - Next
    - Not in scope of this repo; add a simple web dashboard later.

---

## Phase 7 — Go-Live Readiness (P0)

Frontend actions largely depend on backend/store readiness. Track via separate checklist once paywall UI and RC init are in.

---

## Phase 8 — Marketing Materials (Pre-launch) (P0)

Out of scope for this repo.

---

## Recent Frontend Work (Oct 26–27, 2025)

- Social channels panel consolidated into `ContactChannels`.
- Added add/edit/delete flows for social media channels with prefilled modal.
- Saving persists to `social_channels` and mirrors in `metadata.social_channels` for compatibility.
- Display reads from `social_channels` with metadata fallback.
- Deep-link opening with app fallback to web; added console guidance for iOS `LSApplicationQueriesSchemes`.
- Removed Pipeline History and "Currently in" from contact page.

Code refs:
- `app/contact/[id].tsx`
- `components/ContactChannels.tsx`
- `components/AddSocialChannelModal.tsx`
- `lib/deepLinking.ts`

---

## Immediate Next Actions (Frontend)

1. RevenueCat init and offerings
   - Add RC `configure()` at app startup; create `providers/SubscriptionProvider.tsx`.
   - Paywall UI reads RC offerings; restore purchases button.
2. Stripe web purchase
   - Implement `repos/SubscriptionRepo.ts` with checkout/portal calls; open URLs via `Linking.openURL()`.
3. Permissions & Privacy screen
   - Centralize device permission state + user-consent persistence surface; re-prompt flows.
4. Analytics schema
   - Create `docs/analytics-schema.json`; add client-side validation wrapper and CI check.
5. Clean up lints
   - Remove legacy component imports in `app/legacy/contact/[id]-enhanced.tsx`.
6. Dashboard: Personal Profile card (P0)
   - [data] Add client repo calls: `GET /api/v1/me` (+ optional `GET /api/v1/me/usage`).
   - [ui] Add `ProfileCard` on Home dashboard showing identity + plan/trial/usage.
   - [actions] Buttons: View Plans, Manage Billing (web/native), Refresh Profile.
   - [analytics] Track `profile_card_viewed`, `profile_refresh_clicked`, `profile_cta_clicked` with trial AB properties.

---

## Acceptance Criteria (Snapshot)

- Paywall (P0)
  - [ ] RC offerings render on iOS/Android; subscribe/restore update entitlement state in-app.
  - [ ] Web Stripe checkout/portal buttons function; entitlement reflects after webhook.
- Permissions (P0)
  - [ ] Settings page shows permission + consent states and lets user re-prompt.
- Contacts (P1)
  - [x] Social media channels add/edit/delete working and persisted.
  - [x] Contact Channels consolidated; no Pipeline History/Currently In.
- Analytics (P0)
  - [ ] Events conform to schema and appear in the analytics store.

---

## Ownership

- Foundations / DAL / Analytics wrappers — Frontend Eng Lead
- Paywall UI + RC init — Mobile Eng
- Stripe web integration — Web/Backend Eng
- Permissions & Privacy — Frontend Eng
- Contacts refinements — Frontend Eng

