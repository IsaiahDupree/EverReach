# Frontend Subscription & Trial States

This guide describes how the web and mobile frontends should determine user state (trial, trial-ended, paid), route users, gate features, and start/manage billing using EverReach's existing backend APIs.

## Source-of-Truth APIs

- GET /api/v1/me/onboarding-status
  - Returns: completed_initial_onboarding, subscription_status, has_active_subscription, is_trial, trial_ended, subscription_expired, current_period_end, needs_upgrade_flow, should_show_paywall, paywall_reason, payment_platform, recommended_flow
- GET /api/v1/me/entitlements
  - Returns: plan (free|pro), tier, features, subscription_status, valid_until, trial_ends_at, source
  - Paid detection is strict: active only if profiles.subscription_status === "active" or legacy entitlements with valid_until in the future.
- GET /api/me/usage-summary?window=30d
  - Returns: { window, usage: { compose_runs_used, voice_minutes_used, messages_sent, ... }, limits: { compose_runs, voice_minutes, messages } }
- GET /api/v1/me
  - Returns: user and billing account info (stripe ids, subscription_status, current_period_end)
- POST /api/billing/checkout
  - Body: { successUrl, cancelUrl }
  - Returns: { url } (Stripe Checkout)
- POST /api/billing/portal
  - Body: {} (optional return_url set via env)
  - Returns: { url } (Stripe Billing Portal)
- POST /api/v1/billing/restore
  - Body: { recomputeOnly?: boolean } (optional)
  - Returns: { recomputed: boolean, entitlements }

## State Model (High Level)

- recommended_flow: initial_onboarding | upgrade_paywall | normal_app
- should_show_paywall: boolean (use to render paywall)
- is_trial: boolean
- trial_ended: boolean
- has_active_subscription: boolean
- subscription_status: active | trial | canceled | past_due | unpaid | null

## Routing

1. Fetch /api/v1/me/onboarding-status at app bootstrap.
2. If !completed_initial_onboarding → route to onboarding.
3. Else if should_show_paywall (or recommended_flow === 'upgrade_paywall') → route to Paywall screen/modal (include paywall_reason for copy).
4. Else → show main app.

## Feature Gating

- Fetch /api/v1/me/entitlements for tier/features/trial info.
- Fetch /api/me/usage-summary for usage/limits (compose_runs, voice_minutes, messages).
- Gate actions with a simple predicate:
  - isPaid = entitlements.subscription_status === 'active'
  - isTrialExpired = !isPaid && (trial_ended || trialDaysRemaining <= 0)
  - Block premium features when isTrialExpired && !isPaid.

## Billing Actions

- Subscribe (Web):
  - POST /api/billing/checkout with { successUrl, cancelUrl }
  - Redirect browser to response.url
  - On success page, refresh entitlements and onboarding-status; clean query string
- Manage (Stripe):
  - POST /api/billing/portal
  - Redirect to response.url
- Restore (Native/Server):
  - POST /api/v1/billing/restore then refresh entitlements

## Minimal Frontend Patterns (Pseudo/TS)

// Route by onboarding-status
// const { data } = useOnboardingStatus();
// if (!data?.completed_initial_onboarding) return <Onboarding/>;
// if (data?.recommended_flow === 'upgrade_paywall') return <Paywall reason={data?.paywall_reason}/>;
// return <App/>;

// Start checkout (web)
// const startCheckout = async () => {
//   const r = await apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({
//     successUrl: window.location.origin + '/billing/success',
//     cancelUrl: window.location.origin + '/billing/cancel',
//   }), requireAuth: true });
//   const { url } = await r.json(); if (url) window.location.href = url;
// };

// Open billing portal (web)
// const openPortal = async () => {
//   const r = await apiFetch('/api/billing/portal', { method: 'POST', requireAuth: true });
//   const { url } = await r.json(); if (url) window.location.href = url;
// };

## UI Rules

- Paywall should render when onboarding-status.should_show_paywall is true.
- Show trial information using entitlements.trial_ends_at and derived trialDaysRemaining.
- Do not display “Active” unless onboarding-status.has_active_subscription is true AND entitlements.subscription_status === 'active'.
- On web, after returning from Stripe (success/cancel), refresh onboarding-status + entitlements, then clean URL (replaceState).

## Hooks (Suggested)

- useOnboardingStatus: wraps GET /v1/me/onboarding-status (React Query)
- useEntitlementsAndUsage: parallel GET of /v1/me/entitlements and /me/usage-summary

## Analytics (Suggested)

- paywall_viewed (include trial group/days remaining/status)
- subscription_plan_selected, subscription_checkout_started, subscription_checkout_succeeded/failed
- billing_portal_opened
- feature_gated (when gating blocks action)

## Test Plan

Scenarios to cover end-to-end:
- New user: onboarding gate shown, no paywall yet.
- Trial active: main app allowed; paywall accessible from upgrade CTA.
- Trial ended: paywall shown automatically; premium features blocked.
- Active subscription: no paywall; Manage Billing opens portal.
- Canceled/past_due/unpaid: paywall shown with appropriate reason.
- Usage near limits: ensure progress bars show caps; gating triggers when over limits.

## Notes

- The entitlements endpoint was tightened to prevent false-positives for paid; rely on subscription_status === 'active'.
- Usage endpoint lives under /api/me/usage-summary (no v1 prefix) currently.
- Keep UI tolerant to missing optional fields.
