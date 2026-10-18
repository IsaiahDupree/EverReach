# Experiment: Trial Gating A/B (calendar_days vs screen_time)

Owner: Backend Platform • Consumers: Mobile/Web Frontend, Analytics

## Objective
Compare trial conversion/engagement when the trial is measured by:
- calendar_days: N calendar days from `trial_started_at` (control)
- screen_time: accrued foreground app usage seconds up to `trial_usage_seconds_limit` (variant)

## Assignment & Groups
- experiment_key: `trial_gate_strategy`
- groups:
  - `calendar_days`
  - `screen_time`
- optional parameter: `trial_usage_seconds_limit` (e.g., 1800 for 30 minutes, 3600 for 60 minutes)
- assignment source: server (deterministic per-user via user_id hash or admin override)

## Entitlements contract (/api/v1/me/entitlements)
Extend response with:
- `trial_gate_strategy`: "calendar_days" | "screen_time"
- `trial_usage_seconds_limit`: number | null (seconds) — only relevant for `screen_time`
- `trial_group`: string | null — human-readable label for reporting
- `trial_started_at`: ISO8601
- `trial_duration_days`: number (fallback if `trial_ends_at` absent)
- `trial_ends_at`: ISO8601 (optional; if omitted, client derives from start + duration)
- `subscription_status`: "trial" | "active" | "past_due" | "canceled"

Example payload:
```json
{
  "tier": "free",
  "subscription_status": "trial",
  "trial_group": "screen_time_30m",
  "trial_gate_strategy": "screen_time",
  "trial_usage_seconds_limit": 1800,
  "trial_started_at": "2025-10-27T00:00:00.000Z",
  "trial_duration_days": 7,
  "trial_ends_at": null
}
```

## Client behavior (reference)
- If `trial_gate_strategy === 'screen_time'`, client tracks foreground seconds and considers trial expired when `trial_usage_seconds >= trial_usage_seconds_limit`.
- Otherwise use calendar days (`trial_days_remaining <= 0`).
- Frontend tags analytics with the following trial metadata on paywall/onboarding/profile events:
  - `trial_gate_strategy`, `trial_usage_seconds`, `trial_usage_seconds_limit`, `trial_days_remaining`, `trial_group`, `is_paid`.

## Analytics
- Required properties on relevant events (examples):
  - `trial_gate_strategy`, `trial_usage_seconds`, `trial_usage_seconds_limit`, `trial_days_remaining`, `trial_group`, `is_paid`.
- Recommended events:
  - paywall_viewed, subscription_plan_selected, subscription_upgraded
  - upgrade_onboarding_viewed/page_viewed/video_started/video_completed/cta_clicked
  - profile_card_viewed/profile_cta_clicked/profile_refresh_clicked

## Admin overrides
Endpoints for internal tooling (not public):
- POST `/api/admin/trials/assign` — body: `{ user_id, trial_gate_strategy, trial_usage_seconds_limit?, trial_group? }`
- POST `/api/admin/trials/reset` — body: `{ user_id, trial_started_at?, trial_ends_at?, trial_duration_days? }`
- GET `/api/admin/trials/entitlements?user_id=...` — returns current effective entitlements blob

## Rollout & Safety
- Default control: `calendar_days`
- Staggered rollout: start with small % on `screen_time` and gradually increase
- Guardrails: ensure `/me/entitlements` always includes a valid strategy and sane limits
