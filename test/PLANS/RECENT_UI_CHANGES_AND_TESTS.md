# Recent UI Changes & Test Plan

**Date**: 2025-10-18  
**Scope**: Web app (Playwright), contact detail/context pages, notes, goal suggestions, avatar upload

---

## 1) Warmth-based visual accents

- **Goal**: Contact visuals should reflect relationship warmth.
- **Implementation surfaces**:
  - `app/(tabs)/people.tsx`: list items pass `warmthColor` to `Avatar` and color the `warmthScore` text using `getWarmthColorFromBand()`.
  - `app/contact/[id].tsx`: header `Avatar` ring and `warmthBadge` use warmth band via `getWarmthColorFromBand()`.
  - Mapping source: `lib/imageUpload.ts` → `getWarmthColorFromBand()` and `getWarmthColorFromScore()`
- **Color mapping**:
  - hot → `#FF6B6B`
  - warm → `#FFD93D`
  - cool/cooling/neutral → `#95E1D3`
  - cold → `#4ECDC4`
- **Acceptance Criteria**:
  - Contact detail shows uppercase band label and badge background color equals one of the mapped colors.
  - People list warmth score text color equals one of the mapped colors.
- **Tests**:
  - `warmth-visuals.spec.ts`: Fetch a real contact ID via API, open `/contact/:id`, assert the badge background computed CSS color ∈ {mapped colors} and `Score:` is visible.

## 2) AI Goal Suggestions collapsible/expandable

- **Goal**: Suggestions section can be collapsed/expanded; "Get Suggestions" triggers fetch.
- **Implementation surface**:
  - `app/contact/[id].tsx` uses `GoalSuggestionsCard` (collapsible behavior expected in the card component).
  - Backend endpoint: `backend-vercel/app/api/v1/contacts/[id]/goal-suggestions/route.ts` (GET)
- **Acceptance Criteria**:
  - Header "AI Goal Suggestions" visible.
  - Clicking "Get Suggestions" triggers a request to `/api/v1/contacts/:id/goal-suggestions`.
  - If list exists, expanding reveals items; if empty, shows "No suggestions available" (or similar empty state) without errors.
- **Tests**:
  - `goal-suggestions.spec.ts`: Capture network calls; assert GET goal-suggestions fired. If a toggler is present, click to expand and verify presence of list OR empty-state text.

## 3) Richer timeline history (contacts & message interactions)

- **Goal**: Show more metadata in timelines (channel badge, occurred_at, optional direction/duration).
- **Implementation surfaces**:
  - `app/contact-context/[id].tsx`: `renderInteractions()` normalizes interactions → `InteractionCard`.
  - `app/contact/[id].tsx`: `InteractionsTimeline` for recent interactions; `contact-notes/[id].tsx` shows a combined notes/interactions timeline.
- **Acceptance Criteria**:
  - Each item displays date/time and a channel badge (e.g., NOTE, CALL, EMAIL) and a non-empty summary.
- **Tests**:
  - `notes-crud.spec.ts` (see below) validates newly created text note appears in timeline with summary and date.

## 4) Notes: create/edit/delete (text) and voice visibility

- **Goal**: Support saving/editing/deleting text notes; voice notes appear when present.
- **Implementation surfaces**:
  - `app/contact/[id].tsx`: "Add Note" saves via `POST /api/v1/contacts/:id/notes` and refreshes.
  - `app/contact-notes/[id].tsx`: Full CRUD UX for text notes (edit/delete are local-only today), and listing of voice notes from provider.
- **Acceptance Criteria**:
  - Creating a text note on `contact-notes/:id` adds the note to the timeline immediately.
  - Editing a note updates the timeline text locally.
  - Deleting a note removes it from the timeline locally.
- **Tests**:
  - `notes-crud.spec.ts`: Fetch contact ID, open `contact-notes/:id`, add a unique text note, assert it appears. (Edit/delete assertions can be added once stable selectors exist.)

## 5) Contact image upload

- **Goal**: Upload an avatar image to a contact.
- **Implementation surfaces**:
  - `app/avatar-upload-test.tsx` page exercises `uploadContactAvatar()`
  - `lib/imageUpload.ts`: `uploadContactAvatar()` stores to Supabase when cloud enabled; returns local URI in `LOCAL_ONLY` mode.
  - Backend field: `PATCH /v1/contacts/:id` with `avatar_url` (documented on the test page)
- **Acceptance Criteria**:
  - Avatar upload test page loads, lists contacts, and exposes per-contact upload button.
  - Bulk test control visible and enabled when contacts exist.
- **Tests**:
  - `avatar-upload.spec.ts`: Open `/avatar-upload-test`, assert presence of title, contact list, and camera upload button(s). (Full upload interaction on web is limited by file-picker; covered more thoroughly on mobile flows.)

---

## Test Data & Environment Notes

- Tests fetch a real contact ID via `request.get(baseURL→apiBase: /api/v1/contacts?limit=1)` and skip if none available.
- Web server must be running on port 8081; backend on 3000 (as in existing tests).
- Optional: Enable `EXPO_PUBLIC_LOCAL_ONLY=true` to avoid cloud storage during tests.

## Suggested Selectors (non-blocking)

- Add `testID` attributes to improve selector stability in future:
  - Warmth badge: `testID="warmth-badge"`
  - Goal suggestions header/toggle: `testID="goal-suggestions-toggle"`, list: `testID="goal-suggestions-list"`
  - Timeline item container: `testID="timeline-item"`
  - Note input/button: `testID="note-input"`, `testID="note-add-btn"`
  - Avatar upload contact row: `testID="avatar-upload-row"`, button: `testID="avatar-upload-btn"`

## Files Referenced

- People list: `app/(tabs)/people.tsx`
- Contact detail: `app/contact/[id].tsx`
- Contact context: `app/contact-context/[id].tsx`
- Contact notes: `app/contact-notes/[id].tsx`
- Avatar upload test page: `app/avatar-upload-test.tsx`
- Warmth color utils: `lib/imageUpload.ts`
- Endpoints: see `test/PLANS/ENDPOINT_UI_COVERAGE.md`
