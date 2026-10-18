# PostHog Integration (EverReach)

Use this doc to configure PostHog for subscription/event analytics mapped from RevenueCat events and in-app events.

## Project Settings

- **PostHog Region**: `<US | EU>`
  - Must match your PostHog project region
- **API key (prod)**: `<phc_xxx>`
- **API key (sandbox)**: `<phc_xxx_sandbox>` (optional if you use one project)

Recommended environment variables (examples):
- Mobile/Web: `EXPO_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`
- Backend: `POSTHOG_KEY`, `POSTHOG_HOST`

## Event Names (fill these)

RevenueCat → PostHog event mapping (finalized canonical names):

- **Initial purchase event** (required): `subscription_purchase_initial`
- **Trial started event** (required): `subscription_trial_started`
- **Trial converted event** (required): `subscription_trial_converted`
- **Trial cancelled event** (required): `subscription_trial_cancelled`
- **Renewal event** (required): `subscription_renewed`
- **Cancellation event** (required): `subscription_cancelled`
- **Uncancellation event**: `subscription_uncancelled`
- **Non subscription purchase event**: `purchase_non_subscription`
- **Subscription paused event**: `subscription_paused`
- **Expiration event**: `subscription_expired`
- **Billing issue event**: `subscription_billing_issue`
- **Product change event**: `subscription_product_changed`

Optional in-app events (examples):
- `<app_opened>`, `<message_generated>`, `<message_sent>`, `<contact_created>`

## Sales Reporting

Set preferred revenue basis in your analytics dashboards:
- **Gross revenue** (before app store commission)
- **Net revenue** (after store commission and/or estimated taxes)

Document chosen basis and keep it consistent across reports.

## Properties (suggested schema)

Standardize key properties for subscription events:
- `user_id` (hashed or UUID)
- `platform` (`app_store` | `play_store`)
- `environment` (`PRODUCTION` | `SANDBOX`)
- `product_id` (SKU)
- `entitlements` (array)
- `transaction_id`, `original_transaction_id`
- `period_type` (`TRIAL` | `NORMAL`)
- `purchased_at`, `expiration_at`
- `country_code`

## Emission Points

- From webhook processor: map RC events → PostHog using backend service (e.g., `services/analytics.ts`)
- From clients: send UX/feature events (mobile/web) via SDKs

## Verification Checklist

- [ ] Region matches project
- [ ] Keys configured for mobile/web/backend
- [ ] Event names finalized and implemented
- [ ] Sales reporting basis chosen
- [ ] QA in PostHog Live Events and verify properties

## Example (pseudo)

```ts
// On INITIAL_PURCHASE webhook
track('subscription_purchase_initial', {
  user_id: rc.app_user_id,
  product_id: rc.product_id,
  entitlements: rc.entitlement_ids,
  platform: rc.store === 'APP_STORE' ? 'app_store' : 'play_store',
  environment: rc.environment,
  period_type: rc.period_type,
  purchased_at: rc.purchased_at_ms,
  expiration_at: rc.expiration_at_ms,
});
```
