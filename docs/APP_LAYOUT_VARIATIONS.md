# 5 App-wide Layout Variations (Agentic AI + All Endpoints)

Below are five end-to-end layout concepts that leverage the full API surface (contacts, user, AI, messages, interactions, goals, pipelines, voice notes, screenshots, search, warmth). Each includes what it looks like, who it’s best for, agentic behavior, and exact endpoint usage.

---

## 1) Agent-First Workspace (Chat OS)

- **What it is**
  - Agent/chat is the primary UI. Everything else is context cards the agent summons.
  - Left dock: Threads. Center: Chat + live plan. Right: Context panels (Contact, Draft, Timeline, Approvals).

- **Best for**
  - Business + Networking. Power users who want “ask → done.”

- **Key surfaces**
  - Agent thread (streaming), Suggestion stack, Action queue (approvals), Context panel (contact/goal/timeline).

- **Agentic behavior**
  - The agent monitors your graph and proposes next actions (compose, schedule, update pipeline), spawns tools, routes approvals to Outbox.

- **Endpoints (core map)**
  - Chat/Agent
    ```
    POST /v1/agent/chat
    GET  /v1/agent/chat/stream
    GET  /v1/agent/tools
    POST /v1/agent/compose/smart
    POST /v1/agent/suggest/actions
    ```
  - Contacts + Timeline
    ```
    GET /v1/contacts/:id
    GET /v1/interactions?contact_id=:id&limit=50&sort=created_at:desc
    GET /v1/analysis/:id
    ```
  - Intake + Approvals
    ```
    POST /v1/agent/voice-note/process
    POST /v1/agent/analyze/screenshot
    GET  /v1/messages/drafts?limit=20
    GET  /v1/messages?status=pending|scheduled
    POST /v1/messages (send/queue)
    ```

- **Pros**
  - One UX for all ICPs; very scalable with tools.
- **Tradeoffs**
  - Requires strong agent guardrails and error visibility.

---

## 2) Inbox Command Center (Triage Everything)

- **What it is**
  - Unified Inbox: suggestions, due follow-ups, drafts awaiting approval, new interactions, alerts. Users triage with quick actions.

- **Best for**
  - Busy operators; works for all ICPs by sorting streams.

- **Key surfaces**
  - Tabs: All, Suggestions, Approvals, Due Today, Overdue, New (voice/screenshot), Mentions/Replies.
  - Bulk actions: approve/send, schedule, assign, snooze.

- **Agentic behavior**
  - Agent pre-triages items, attaches suggested actions/drafts, and escalates risky items.

- **Endpoints (core map)**
  ```
  GET  /v1/agent/suggest/actions
  GET  /v1/messages?status=draft|pending|scheduled
  GET  /v1/interactions?sort=created_at:desc&limit=20
  GET  /v1/warmth/summary
  GET  /v1/voice-notes?status=pending
  GET  /v1/screenshots?status=pending
  POST /v1/messages (approve/send)
  POST /v1/agent/compose/smart (regenerate)
  ```

- **Pros**
  - Fast decision loop, great for daily ops.
- **Tradeoffs**
  - Less “exploratory” than a people-first UI.

---

## 3) People-Centric CRM (Directory First)

- **What it is**
  - People list is the home. Filters (hot/warm/cool/cold), tags, search. Contact detail is rich (AI insights, actions, timeline, files, notes).

- **Best for**
  - Networking + Personal; sales reps comfortable with a directory.

- **Key surfaces**
  - People list + Saved filters.
  - Contact detail with AI suggestions (compose, call script, follow-up times).

- **Agentic behavior**
  - Agent personalizes suggestions per-contact and keeps warmth fresh based on recent interactions.

- **Endpoints (core map)**
  ```
  GET /v1/contacts?q&tag&warmth_band&limit=1000&sort=warmth.desc
  GET /v1/interactions?contact_id=:id&limit=20
  GET /v1/analysis/:id
  GET /v1/analysis/:id/suggestions
  POST /v1/agent/compose/smart
  GET /v1/contacts/:id/files
  GET /v1/contacts/:id/notes
  ```

- **Pros**
  - Intuitive; aligns with current app model.
- **Tradeoffs**
  - Users must navigate more than in an agent-first flow.

---

## 4) Timeline/Calendar Hub (Chronological OS)

- **What it is**
  - Single timeline of all activity across contacts: interactions, messages, notes, voice/screenshot intakes, goals. Calendar overlay for planning.

- **Best for**
  - Scheduling-minded users; people who “run their day” from a time view.

- **Key surfaces**
  - Calendar (day/week) + infinite timeline. Inline quick actions and drafts.

- **Agentic behavior**
  - Agent proposes the day plan (who to contact and why), auto-batches outreach, inserts planned time blocks.

- **Endpoints (core map)**
  ```
  GET /v1/interactions?start&end&sort=occurred_at:desc
  GET /v1/messages?scheduled_between=start,end
  GET /v1/goals?due_between=start,end
  GET /v1/agent/suggest/actions?scope=today
  POST /v1/agent/compose/smart (batch)
  ```

- **Pros**
  - Clear “today/this week” execution.
- **Tradeoffs**
  - Less helpful for deep contact research.

---

## 5) Goal/Playbook + Autopilot (Policy-Driven)

- **What it is**
  - Goals and playbooks drive the app. Define policies (cadence, segments, guardrails), agent executes, you approve.

- **Best for**
  - Business users optimizing throughput; teams.

- **Key surfaces**
  - Goals board, Playbooks/Policies, Segments, Outbox approvals, Performance analytics.

- **Agentic behavior**
  - Agent runs policies: segment contacts, draft sequences, schedule sends, balance risk/safety. You approve deviations.

- **Endpoints (core map)**
  ```
  GET /v1/goals?status=open
  GET /v1/pipelines
  GET /v1/autopilot/policies
  POST /v1/autopilot/policies (create/update)
  GET /v1/messages?status=pending|scheduled
  POST /v1/agent/compose/smart (sequence/variant)
  ```

- **Pros**
  - Scales impact; repeatable outcomes.
- **Tradeoffs**
  - Heavier setup; needs trust in agent policy.

---

## Adaptive UI: Satisfy Everyone With Agentic Personalization

- **Per-user home mode**
  - Save preferred mode in user settings
  ```
  GET /v1/me
  GET /v1/user/settings
  PATCH /v1/user/settings { default_home: 'agent|inbox|people|timeline|playbooks' }
  ```
- **Per-contact rendering**
  - Use tags/analysis to switch detail templates (business/personal/networking).
- **Daily morphing**
  - Agent sets your “Home” to Inbox on busy days, Timeline on meeting days, Agent-first when you’re ideating.

---

## Rollout Path (Low Risk)

- **Phase 1 (2–3 days)**: Add “Home Mode” toggle (Settings) with 2 options (Agent-First, People-Centric).
- **Phase 2 (1 week)**: Add Inbox Command Center (triage tab) + Outbox approvals.
- **Phase 3 (1 week)**: Add Timeline view.
- **Phase 4 (1–2 weeks)**: Add Playbooks/Autopilot, guarded by approvals.

---

## Endpoint Prefetch Map (initial screen load)

- **Common**
  ```
  GET /v1/contacts?limit=1000&sort=warmth.desc
  GET /v1/interactions?limit=20&sort=created_at:desc
  GET /v1/agent/suggest/actions
  GET /v1/messages?status=pending|scheduled
  GET /v1/warmth/summary
  GET /v1/templates
  ```
- **Optional per mode**
  - Timeline: `GET /v1/interactions?start&end`
  - Playbooks: `GET /v1/autopilot/policies`, `GET /v1/goals`
  - Agent-first: `GET /v1/agent/tools`

---

## Recommendation

- **Start** with Variation 2 (Inbox Command Center) + Variation 3 (People-Centric) as tabs.
- **Keep** Variation 1 (Agent-First) as a third tab for chat-driven workflows.
- **Add** “Home Mode” in Settings to default to any of the five.
- We can ship iteratively without backend changes—each view uses documented endpoints from ALL_ENDPOINTS_MASTER_LIST.

---

## Next Actions

- **Pick your default “Home Mode”** to build first:
  - Agent | Inbox | People | Timeline | Playbooks
- If helpful, I’ll produce low-fi wireframes + endpoint→component maps for the chosen mode and begin implementation behind a feature flag.
