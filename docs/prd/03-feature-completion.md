# PRD 03: Feature Completion

**Priority:** P1 — Important for launch quality
**Suggested Branch:** `feature/completion-v1`
**Estimated Effort:** 4–5 days
**Dependencies:** PRD 02 (Backend Hardening) for usage tracking endpoint

---

## Objective

Complete partially-implemented features that are referenced in the UI but not fully wired up. These gaps create dead-end experiences for users — buttons that don't work, empty states that never resolve, or features that silently fail.

---

## Current State

| Feature | Status | Code Location | Gap |
|---------|--------|---------------|-----|
| Usage tracking (AI messages, screenshots, voice notes) | ❌ Hardcoded to 0 | `hooks/useFeatureLimits.ts:66-68` | No endpoint, no tracking |
| Contact analysis | ❌ TODO stub | `hooks/useContactDetail.ts:153` | Backend endpoint missing |
| Contact suggestions | ❌ TODO stub | `hooks/useContactDetail.ts:166` | Backend endpoint missing |
| Social channels UI | ⚠️ Partial | `app/contact/[id].tsx`, `app/contact-context/[id].tsx` | Column added to DB, UI reads it, but edit/add flow untested with live schema |
| Batch analytics | ❌ TODO | `lib/backendAnalytics.ts:156` | Single events only, no batching |
| Contact analysis (AI) | ⚠️ Partial | `app/contact-context/[id].tsx` | UI exists, backend stub |

---

## Deliverables

### 1. Usage Tracking (P0 within this PRD)
The app has a paywall with feature limits (AI messages, screenshots, voice notes) but `useFeatureLimits` returns `0` for all usage counters.

**Frontend:**
- [ ] Wire `useFeatureLimits` to call `GET /v1/me/usage` (from PRD 02)
- [ ] Show real-time usage in settings/billing screen
- [ ] Show usage warnings when approaching limits (80%, 100%)
- [ ] Block feature access when limit exceeded (show upgrade prompt)

**Backend:**
- [ ] Increment usage counters when AI features are used:
  - `POST /v1/compose` → increment `aiMessages`
  - `POST /v1/transcribe` → increment `voiceNotes`
  - `POST /v1/screenshots/:id/analyze` → increment `screenshots`
- [ ] Query `usage_periods` table for current period totals
- [ ] Reset counters at period boundaries (monthly)

### 2. Contact Social Channels — End-to-End Verification
The `social_channels` JSONB column was just added to the live DB. The UI already reads/writes it.

- [ ] Verify add/edit social channel flow works on simulator against live DB
- [ ] Test CRUD: add Instagram handle → save → reload → verify persisted
- [ ] Test edge cases: empty array, malformed data, duplicate platforms
- [ ] Ensure RLS allows users to update their own contacts' social channels

### 3. Batch Analytics
`lib/backendAnalytics.ts` sends events one at a time. For a CRM app with frequent interactions, this creates excessive network overhead.

- [ ] Implement event batching in `backendAnalytics.ts`:
  - Queue events in memory (max 20 or 30-second window)
  - Flush on queue full, timer, or app background
  - Retry failed batches with exponential backoff
- [ ] Create `POST /v1/telemetry/batch` endpoint (or use existing `POST /telemetry/prompt-first` pattern)
- [ ] Fall back to single-event sending if batch endpoint unavailable

### 4. Contact Analysis & Suggestions
The hooks reference endpoints that don't exist yet. Users may see loading spinners that never resolve.

**Option A (Full implementation):**
- [ ] Implement `POST /v1/contacts/:id/analyze` — AI-powered contact analysis
- [ ] Implement `GET /v1/contacts/:id/suggestions` — Follow-up suggestions
- [ ] Wire hooks to endpoints, handle loading/error states

**Option B (Graceful degradation — faster to ship):**
- [ ] Update `useContactDetail.ts` to return empty/null for analysis and suggestions instead of calling nonexistent endpoints
- [ ] Show "Coming soon" or hide the section entirely
- [ ] Add feature flag: `EXPO_PUBLIC_ENABLE_CONTACT_ANALYSIS=false`

**Recommendation:** Ship with Option B for v1, implement Option A in v1.1.

---

## Acceptance Criteria

1. `useFeatureLimits` returns real usage data from backend
2. Users see accurate usage counts in settings
3. Feature access blocked when limits exceeded
4. Social channels CRUD works end-to-end on live DB
5. Analytics events batched (verify network tab shows fewer requests)
6. Contact analysis/suggestions either work or gracefully degrade (no spinners/errors)
