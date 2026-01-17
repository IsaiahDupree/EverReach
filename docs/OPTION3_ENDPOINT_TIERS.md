# Option 3 (People-Centric) – Endpoint Tiers

Reference: docs/ALL_ENDPOINTS_MASTER_LIST.md

Goal: Prioritize the endpoints that power the Contact Detail experience (Option 3), so we ship in layers with graceful fallbacks.

---

## Tier 0 – Core (MVP must-have)
The minimum to render a useful Contact Detail with timeline, notes, and files.

- Contacts
  - GET /v1/contacts/:id
- Interactions
  - GET /v1/interactions?contact_id=:id&limit=50&sort=created_at:desc
- Notes
  - GET /v1/contacts/:id/notes?limit=5&sort=created_at:desc
- Files
  - GET /v1/contacts/:id/files?limit=3
- Channels (email/phone/social)
  - Data comes from contact shape when present; else fallback to manual list

UX delivered
- Header (name, company, avatar, warmth)
- Timeline (recent interactions)
- Recent notes (with skeletons when loading)
- Files & documents (with skeletons when loading)
- Channels (email, phone; social shown if present)

---

## Tier 1 – Enhanced Insights (P0 once core is stable)
Adds AI insights and next actions; improves execution speed.

- AI Analysis & Suggestions
  - GET /v1/analysis/:id
  - GET /v1/analysis/:id/suggestions
  - Fallback: GET /v1/contacts/:id/context-summary (when analysis not yet available)
- Compose
  - POST /v1/agent/compose/smart (draft AI messages for this contact)
- CRUD helpers
  - POST /v1/contacts/:id/notes (quick add)
  - POST /v1/contacts/:id/files (avatar/doc upload)
  - POST /v1/interactions (log call/email/meeting)

UX delivered
- AI Insights Card (summary, risk, best time to contact)
- AI Next Actions (top 3 suggestions)
- One-tap flows: add note, upload file/avatar, log interaction

---

## Tier 2 – Pipeline & Goals (P1 after insights)
Brings deal/state context and guided outcomes.

- Pipeline/State
  - GET /v1/contacts/:id/pipeline
  - POST /v1/contacts/:id/pipeline (change pipeline)
  - POST /v1/contacts/:id/pipeline/move (move stage)
  - GET /v1/contacts/:id/pipeline/history
- Goals
  - GET /v1/goals?contact_id=:id
- Messaging/Outbox (read-only here)
  - GET /v1/messages?contact_id=:id
  - GET /v1/messages/drafts?contact_id=:id

UX delivered
- Pipeline Theme + Status chips (with history timeline)
- Goals widget (existing GoalSuggestionsCard)
- Message summary (drafts/scheduled as context)

---

## Tier 3 – Automation & Autopilot (P2 future)
Scale impact with policies and approvals.

- Autopilot/Policies
  - GET /v1/autopilot/policies
  - POST /v1/autopilot/policies (create/update)
- Approvals/Outbox
  - GET /v1/messages?status=pending|scheduled
  - POST /v1/messages (approve/send)
- Intake extras (cross-surface)
  - POST /v1/agent/voice-note/process
  - POST /v1/screenshots (upload)
  - POST /v1/screenshots/:id/analyze

UX delivered
- Policy-driven next actions
- Approvals (for sensitive/bulk)
- Voice/Screenshot intake stitched into Contact history and insights (optional)

---

## Fallback Strategy (if Enhanced APIs are missing)
- Analysis/suggestions unavailable → show Context Summary (last topics, last contact delta) instead
- Files upload route missing → fallback to /v1/files (presigned) → public URL via files bucket
- Channels
  - Always render email/phone if present
  - Social channels appear only if contact.social_channels exists; else offer Add Social dialog

---

## What’s implemented (code status)
- Tier 0 (Core)
  - GET /v1/contacts/:id – wired via useContactDetail
  - GET /v1/interactions?contact_id – wired
  - GET /v1/contacts/:id/notes – wired, with skeletons
  - GET /v1/contacts/:id/files – wired, with skeletons
  - Channels – deep links for email/phone/social supported
- Tier 1 (Enhanced)
  - GET /v1/analysis/:id – wired (AIInsightsCard)
  - GET /v1/analysis/:id/suggestions – wired (AIInsightsCard)
  - POST /v1/contacts/:id/files – upload utility added with fallback to /v1/files
  - POST /v1/contacts/:id/notes – supported in Contact Detail quick note

Pending (nice-to-haves)
- Warmth history chart – GET /v1/warmth/history?contact_id=:id (if available)
- Inline message compose (POST /v1/agent/compose/smart) – CTA hook up on Contact page

---

## Rollout Plan for Option 3
1) Ship Tier 0 + Insights Card (Tier 1) – already wired
2) Add inline compose CTA using POST /v1/agent/compose/smart (Tier 1)
3) Enable Pipeline status move + history (Tier 2)
4) (Optional) Policy/Autopilot surfaces (Tier 3)

---

## Testing Checklist
- Contact detail loads with timeline, notes, files
- AI Insights renders when /v1/analysis/:id responds; else context summary is shown
- Social links open deep links when present
- Skeletons display while notes/files load

---

## Notes
- This tiering aligns with the ALL_ENDPOINTS_MASTER_LIST; we only consume existing endpoints and degrade gracefully.
- Option 3 remains the primary path; Inbox Command Center can be A/B tested later via a settings toggle without backend changes.
