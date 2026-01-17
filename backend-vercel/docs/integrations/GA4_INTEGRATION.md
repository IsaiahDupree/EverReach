# Google Analytics 4 (GA4) Integration (EverReach)

Configure GA4 Measurement Protocol to receive subscription and purchase events server‑to‑server from the backend.

## 1) Required Settings

- **Property / Data Stream**: Web or App stream linked to your GA4 property
- **Measurement ID**: e.g., `G-XXXXXXXXXX`
- **API Secret**: Create in GA4 Admin → Data Streams → Measurement Protocol API secrets

Environment variables (suggested):
- `GA4_MEASUREMENT_ID`
- `GA4_API_SECRET`
- Optional debug:
  - `GA4_DEBUG=true|false` (use debug endpoint for validation)

## 2) Identity

Measurement Protocol requires one of:
- `client_id` (web identifier), or
- `user_id` (your app user id)

Recommendation: Prefer `user_id` (stable) for subscription events. Fall back to a synthesized `client_id` when not available.

## 3) RevenueCat → GA4 Event Mapping

GA4 accepts custom events. Choose either:
- A) Custom event names matching our canonical naming (recommended for clarity), or
- B) GA4 standard `purchase` for monetary events with extra params.

Chosen defaults (A):

| RevenueCat Event            | Chosen GA4 Event (custom)           | Notes |
|----------------------------|--------------------------------------|-------|
| Trial Started               | `subscription_trial_started`         | Include `trial_period_days`, `value=0` |
| Trial Converted             | `subscription_trial_converted`       | Transition from trial → paid |
| Initial Purchase            | `subscription_purchase_initial`      | Include `value`, `currency`, `items` |
| Renewal                     | `subscription_renewed`               | Recurring billing |
| Non-Subscription Purchase   | `purchase_non_subscription`          | One‑off purchases (or use `purchase`) |
| Cancellation                | `subscription_cancelled`             | Status change signal |
| Uncancellation              | `subscription_uncancelled`           | Re‑enable auto‑renew |
| Expiration                  | `subscription_expired`               | Status change |
| Billing Issue               | `subscription_billing_issue`         | Include `billing_issue=true` |
| Product Change              | `subscription_product_changed`       | Include new SKU |

Alternative (B):
- Use `purchase` for Initial Purchase, Renewal, Non‑subscription purchase, with params `currency`, `value`, `items`, and custom params for status and SKU.

## 4) Payload Guidelines (Measurement Protocol)

Endpoint (prod): `https://www.google-analytics.com/mp/collect`
Endpoint (debug): `https://www.google-analytics.com/debug/mp/collect`

Body shape:
```json
{
  "measurement_id": "G-XXXXXXXXXX",
  "api_secret": "<API_SECRET>",
  "user_id": "user-123", // or client_id
  "timestamp_micros": 1730000000000000,
  "events": [
    {
      "name": "subscription_purchase_initial",
      "params": {
        "currency": "USD",
        "value": 9.99,
        "transaction_id": "orig_txn_abc",
        "product_id": "com.everreach.core.monthly",
        "environment": "PRODUCTION",
        "platform": "APP_STORE",
        "status": "active",
        "debug_mode": true
      }
    }
  ]
}
```

Notes:
- Include `items` array for purchase‑like events when appropriate
- Use `timestamp_micros` for accurate timing
- Set `debug_mode` param for validation in DebugView

## 5) Verification Checklist

- [ ] Measurement ID and API Secret configured
- [ ] Identity strategy chosen (user_id/client_id)
- [ ] Event mapping confirmed (table above)
- [ ] Debug mode validated in GA4 DebugView
- [ ] Events visible in standard reports
