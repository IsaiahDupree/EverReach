# PRD 04: Testing & QA

**Priority:** P1 — Important for launch confidence
**Suggested Branch:** `qa/test-coverage-v1`
**Estimated Effort:** 3–4 days
**Dependencies:** PRD 02 and PRD 03 should be mostly complete first

---

## Objective

Expand automated test coverage from the current baseline to a level that provides confidence for App Store release. Focus on critical user paths, payment flows, and data integrity — areas where bugs have the highest business impact.

---

## Current State

### Existing Tests (17 total)

| Test File | Type | Area |
|-----------|------|------|
| `e2e/meta-pixel.spec.ts` | E2E (Playwright) | Meta Pixel Conversions API — 10 tests ✅ |
| `__tests__/SubscriptionProvider.test.tsx` | Unit | Subscription state management |
| `__tests__/components/PaywallRouter.test.tsx` | Unit | Paywall routing logic |
| `__tests__/components/RevenueCatPaywallUI.test.tsx` | Unit | RevenueCat paywall rendering |
| `__tests__/components/SuperwallPaywallUI.test.tsx` | Unit | Superwall paywall rendering |
| `__tests__/debounce.test.ts` | Unit | Debounce utility |
| `__tests__/integration/paywall-integration.test.tsx` | Integration | Paywall end-to-end flow |
| `__tests__/lib/imageUpload.avatar.test.ts` | Unit | Avatar image upload |
| `__tests__/repos/SupabaseVoiceNotesRepo.abort.test.ts` | Unit | Voice notes abort handling |
| `__tests__/setup/verify-sdk-installation.test.ts` | Unit | SDK installation verification |
| `__tests__/subscription-plans.test.tsx` | Unit | Subscription plan definitions |
| `__tests__/subscription/subscriptionStatus.test.ts` | Unit | Subscription status logic |
| `__tests__/subscription/validatePaidUsers.test.ts` | Unit | Paid user validation |
| `__tests__/tone.test.ts` | Unit | Tone analysis |
| `__tests__/useLivePaywall.test.ts` | Unit | Live paywall hook |
| `__tests__/warmth-colors.test.ts` | Unit | Warmth color mapping |
| `__tests__/warmth-utils.test.ts` | Unit | Warmth calculation utilities |

### Coverage Gaps

| Critical Path | Has Tests | Risk |
|---------------|-----------|------|
| Auth flow (sign up, sign in, sign out) | ❌ | Users locked out |
| Contact CRUD (create, read, update, delete) | ❌ | Data loss |
| Interaction logging | ❌ | Core feature broken |
| Voice note recording + transcription | ⚠️ Partial (abort only) | Feature unusable |
| Onboarding flow | ❌ | First-time user drop-off |
| Warmth computation (end-to-end) | ⚠️ Utils only | Incorrect scores |
| Push notifications | ❌ | Silent failure |
| Backend API routes (unit) | ❌ | 500 errors in production |
| Rate limiting | ❌ | Abuse or false blocks |
| Meta Pixel (live app) | ⚠️ CLI + E2E only | EMQ regression |

---

## Deliverables

### 1. Critical Path Tests (P0)

#### Auth Flow (`__tests__/auth/`)
- [ ] `auth-flow.test.ts` — Sign up with email, sign in, sign out, session refresh
- [ ] `apple-signin.test.ts` — Apple Sign-In token exchange (mocked)
- [ ] `auth-guard.test.ts` — Protected routes redirect unauthenticated users

#### Contact CRUD (`__tests__/contacts/`)
- [ ] `contact-crud.test.ts` — Create contact, read back, update fields, delete
- [ ] `contact-import.test.ts` — Import from device contacts (mocked native module)
- [ ] `contact-search.test.ts` — Search by name, filter by tag/pipeline
- [ ] `social-channels.test.ts` — Add/edit/remove social channels

#### Interactions (`__tests__/interactions/`)
- [ ] `interaction-create.test.ts` — Log call, meeting, email, text
- [ ] `interaction-warmth.test.ts` — Verify warmth score updates after interaction

### 2. Backend API Tests (P0)

#### Route Tests (`backend-vercel/__tests__/api/`)
- [ ] `health.test.ts` — Health endpoint returns 200
- [ ] `contacts-api.test.ts` — CRUD operations with auth, validation, error cases
- [ ] `interactions-api.test.ts` — Create/list with auth
- [ ] `billing.test.ts` — Checkout/portal endpoints, webhook signature validation
- [ ] `rate-limit.test.ts` — Verify 429 response after limit exceeded
- [ ] `auth-middleware.test.ts` — Valid JWT passes, invalid/missing JWT returns 401

### 3. Integration Tests (P1)

#### End-to-End Flows (`e2e/`)
- [ ] `onboarding.spec.ts` — Complete onboarding flow (welcome → name → contacts → done)
- [ ] `contact-lifecycle.spec.ts` — Create contact → add interaction → check warmth → delete
- [ ] `voice-note.spec.ts` — Record (mocked) → transcribe → verify saved
- [ ] `paywall.spec.ts` — Free user hits limit → sees paywall → upgrade flow (mocked purchase)

### 4. Regression Tests (P1)

- [ ] `meta-pixel-regression.test.ts` — Verify all Meta event types include full user_data params
- [ ] `supabase-schema.test.ts` — Verify expected tables, columns, RLS policies exist
- [ ] `env-config.test.ts` — Verify production env has no dev flags enabled

### 5. Test Infrastructure

- [ ] Configure Jest coverage reporting (`--coverage` flag)
- [ ] Set coverage thresholds: 60% lines for `lib/`, 50% for `hooks/`, 40% for `app/`
- [ ] Add `npm test` script that runs all unit + integration tests
- [ ] Add `npm run test:e2e` script for Playwright tests
- [ ] CI integration: Run tests on PR to `ios-app` branch (GitHub Actions or EAS)

---

## Acceptance Criteria

1. All P0 tests written and passing
2. Zero test failures on `npm test`
3. Coverage report generated — baseline established
4. CI runs tests on every PR (no merge without green)
5. No regressions in existing 17 tests
