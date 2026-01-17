# API Access Policy for Gated Users (Post-Trial Upsell)

Owner: Backend Platform • Consumers: Mobile/Web Frontend, API

## Objective
Define API behavior when the app UI is gated after a free trial expires. Users should retain limited API access during the upsell period to:
- Explore the API (e.g., via API Playground)
- Trigger lightweight, non-premium operations for onboarding or evaluation

## Policy Options (Recommend A)

A. Allowlisted Endpoints for Gated Users (Recommended)
- Maintain standard auth (JWT/session) but restrict to an allowlist while `subscription_status !== 'active'` and trial is expired.
- Example allowlist (adjust per product):
  - `GET /api/v1/me`
  - `GET /api/v1/me/entitlements`
  - `GET /api/v1/me/usage`
  - `POST /api/v1/compose` with limited inputs, rate-limited to small quota (e.g., 1–2/day)
  - `GET /api/v1/contacts/*` read-only
  - `POST /api/v1/interactions` disabled or limited

B. Role-Based Flag
- Add a role/feature flag (e.g., `gated_api_access: true`) while upsell is active. Authorization middleware checks role and enforces limited scopes and quotas.

## Entitlements Contract (Reference)
- `subscription_status`: `trial | active | past_due | canceled`
- `trial_gate_strategy`: `calendar_days | screen_time`
- `trial_usage_seconds_limit`: number | null
- `trial_group`: string | null
- `trial_started_at`, `trial_duration_days`, `trial_ends_at`

These fields already flow to the client and are included in analytics events.

## Error Semantics
- If an endpoint is blocked under gating, return
  - HTTP 402 Payment Required (preferred for upsell) or 403 Forbidden
  - Body contains reason and actionable link (e.g., billing/upgrade URL)
```json
{
  "error": "payment_required",
  "message": "Your plan does not include this endpoint.",
  "upgrade_url": "https://app.example.com/subscription-plans",
  "allowed": ["/api/v1/me", "/api/v1/me/usage", "/api/v1/compose"],
  "quota": { "compose_daily": { "used": 1, "limit": 2 } }
}
```

## Quotas & Rate Limits (Examples)
- `POST /api/v1/compose`: max 2/day while gated
- `GET /api/v1/me/usage`: standard
- Per-IP and per-user limits enforced (429 Too Many Requests with `Retry-After`)

## Instrumentation
- Log decisions at authz layer with:
  - `user_id`, `subscription_status`, `trial_gate_strategy`, `trial_usage_seconds_limit`, `is_expired`, `endpoint`, `decision` (allow|deny), `quota` snapshot
- Aggregate in analytics for A/B evaluation

## Rollout Steps
1. Implement middleware to read entitlements and enforce allowlist/quota when trial expired and not active.
2. Add a config switch to disable policy if needed.
3. Document the allowlist and quotas; keep in sync with client (API Playground presets).

## Notes
- The frontend already presents an Upgrade Onboarding screen after trial expiry but intentionally keeps API Playground accessible.
- Ensure CORS and auth tokens are valid for the playground flows.
