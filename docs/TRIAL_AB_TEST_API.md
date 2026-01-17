# Trial and A/B Testing API (Backend Spec)

Owner: Backend Team
Status: Proposal (ready to implement)
Consumers: EverReach mobile/web app (Expo) via SubscriptionRepo

## Goals
- Start a user-specific free trial automatically at sign-up.
- Each user gets their own timer (default 7 days).
- Enable server-controlled trial duration and grouping for A/B tests.
- Allow overrides and resets per user for support/testing.

## Contract Summary
- The app fetches the user’s entitlements at runtime: `GET /api/v1/me/entitlements`.
- Response MUST include the fields below so the client can compute gating consistently.
- Admin endpoints allow assigning A/B groups, overriding trial durations, and resetting trials.

## Entitlements Response
Endpoint: GET /api/v1/me/entitlements
Auth: Required (user scope)

Response body (200):
```json
{
  "tier": "free" | "pro" | "enterprise",
  "features": ["basic_crm", "..."],
  "subscription_status": "active" | "canceled" | "past_due" | "trial",

  "trial_started_at": "2025-10-27T19:18:00.000Z",
  "trial_ends_at": "2025-11-03T19:18:00.000Z",
  "trial_duration_days": 7,
  "trial_group": "control" | "variant_14d" | "...",

  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_..."
}
```

Notes:
- If `subscription_status === "active"`, the client treats the user as paid regardless of trial.
- If `subscription_status === "trial"`, the client uses `trial_started_at`, `trial_ends_at`, and `trial_duration_days` to compute remaining days and gating.
- Server MUST set all four trial fields (started, ends, duration, group). The client has fallbacks, but the goal is full control server-side.

## Server Behavior
- On user creation/sign-up, assign a trial group using your A/B allocation rules (e.g., 50/50 split):
  - Example groups: `control` (7 days), `variant_14d` (14 days).
- Set `trial_started_at = now()` and compute `trial_ends_at = trial_started_at + (trial_duration_days * 1 day)`.
- If a user becomes paid, set `subscription_status = "active"` (and keep trial fields for analytics if desired).
- If the trial expires without payment, set `subscription_status` back to `trial` (or another status as appropriate) and ensure `trial_ends_at < now()`; client will gate.

## Admin/Support Endpoints

1) Assign/Override Trial Group and Duration
- Method: POST /api/v1/admin/trials/assign
- Auth: Admin only
- Body:
```json
{
  "user_id": "uuid",
  "trial_group": "control" | "variant_14d" | "custom",
  "trial_duration_days": 7,
  "start_now": true
}
```
- Behavior:
  - If `start_now` is true, set `trial_started_at = now()` and recompute `trial_ends_at`.
  - If `start_now` is false and the user has an active trial, update `trial_group` and `trial_duration_days` but do not reset start/end unless `reset` is also sent (see below).

2) Reset Trial (Support)
- Method: POST /api/v1/admin/trials/reset
- Auth: Admin only
- Body:
```json
{
  "user_id": "uuid",
  "trial_duration_days": 7,
  "trial_group": "control"
}
```
- Behavior:
  - Set `trial_started_at = now()`;
  - Set `trial_ends_at = now() + trial_duration_days`;
  - Update `trial_group`.

3) Get Entitlements (Admin view)
- Method: GET /api/v1/admin/users/{user_id}/entitlements
- Auth: Admin only
- Returns the same shape as the user endpoint.

Security:
- All admin endpoints must require admin auth and be rate-limited. Consider audit logging for changes.

## A/B Allocation
- Allocation example (server-side):
  - 50% `control` → `trial_duration_days = 7`
  - 50% `variant_14d` → `trial_duration_days = 14`
- Persist the assigned `trial_group` on the user record for consistency across sessions/devices.

## Client Expectations (already implemented)
- Client consumes `GET /api/v1/me/entitlements` and computes:
  - `trialDaysRemaining` from `trial_started_at`, `trial_ends_at`, and `trial_duration_days`.
  - `isTrialExpired` convenience flag (trial over and not paid).
- Client hides Paywall when `isPaid` is true.
- Client shows Paywall (and gating) when `isTrialExpired` is true.
- Client does not reset trial timers locally; all authoritative trial timing comes from the server.

## Analytics (optional but recommended)
We recommend emitting the following properties on relevant events:
- `trial_group`, `trial_duration_days`, `trial_days_remaining`, `trial_started_at`, `trial_ends_at`, `subscription_status`.
Events of interest:
- `Trial Started`, `Trial Converted`, `Trial Canceled`, `Paywall Viewed`, `Subscription Purchased`.

## Error Handling
- If the entitlements endpoint fails, the client falls back to a conservative default (trial 7d, status trial) until next refresh.
- Use consistent types and defaults to avoid partial/broken payloads.

## Examples
1) New User (control / 7 days)
```json
{
  "tier": "free",
  "features": ["basic_crm"],
  "subscription_status": "trial",
  "trial_group": "control",
  "trial_duration_days": 7,
  "trial_started_at": "2025-10-27T18:00:00.000Z",
  "trial_ends_at": "2025-11-03T18:00:00.000Z"
}
```

2) Variant (14 days) still in trial
```json
{
  "tier": "free",
  "features": ["basic_crm"],
  "subscription_status": "trial",
  "trial_group": "variant_14d",
  "trial_duration_days": 14,
  "trial_started_at": "2025-10-20T18:00:00.000Z",
  "trial_ends_at": "2025-11-03T18:00:00.000Z"
}
```

3) Paid user
```json
{
  "tier": "pro",
  "features": ["basic_crm", "..."],
  "subscription_status": "active",
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_...",
  "trial_group": "control",
  "trial_duration_days": 7,
  "trial_started_at": "2025-10-20T18:00:00.000Z",
  "trial_ends_at": "2025-10-27T18:00:00.000Z"
}
```

## Data Model (example)
- Table: `user_entitlements`
  - `user_id` (pk)
  - `tier`
  - `features[]`
  - `subscription_status`
  - `trial_group`
  - `trial_duration_days`
  - `trial_started_at`
  - `trial_ends_at`
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - timestamps (created_at, updated_at)

## Testing Checklist
- New sign-up in control → receives 7-day trial.
- New sign-up in variant → receives 14-day trial.
- Admin override of duration → client reflects new end date.
- Admin reset → restarts timer and end date.
- Conversion to paid → app hides Paywall, subscription active.
- Expired trial (not paid) → Paywall shown and gating enabled.
