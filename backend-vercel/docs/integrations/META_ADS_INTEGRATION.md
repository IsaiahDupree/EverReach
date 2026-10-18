# Meta Ads Integration (EverReach)

Use this doc to configure Meta Ads to receive subscription and purchase events from EverReach.
We support the Conversions API (recommended) and the legacy App Events API.

## 1) Choose API

- **Conversions API (Recommended)**
  - More reliable and supported long-term by Meta
  - Sends events server-to-server
- **App Events API (Legacy)**
  - Maintained for compatibility
  - Migrate to Conversions API when possible

Record your choice:
- [ ] Conversions API
- [ ] App Events API

## 2) Required Credentials & IDs

Fill these from Meta Business Manager → Events Manager → Your Data Source.

- **Datasource ID (Pixel ID)** (required)
  - Example: `123456789012345`
- **Conversions API Token** (required)
  - Found in Data Source → Settings → Generate Access Token
- **Send events when ATT consent is not authorized**
  - [ ] Enable (send limited events even without IDFA/ATT consent)
  - [ ] Disable
- **Sandbox Datasource ID** (optional)
  - Pixel for sandbox/testing
- **Sandbox Conversions API Token** (optional)

Recommended environment variables:
- `META_PIXEL_ID`
- `META_CAPI_TOKEN`
- `META_PIXEL_ID_SANDBOX`
- `META_CAPI_TOKEN_SANDBOX`
- `META_SEND_WITHOUT_ATT=true|false`

## 3) RevenueCat → Meta Event Mapping

Chosen defaults below (you can adjust if your reporting needs differ).

| RevenueCat Event            | Chosen Meta Event (defaults pre-selected) | Notes |
|----------------------------|---------------------------|-------|
| Trial Started               | `StartTrial`              | Include `trial_period_days`, `value=0` |
| Trial Converted             | `Subscribe`               | Mark transition from trial → paid |
| Initial Purchase            | `Subscribe`               | Use `value` and `currency` |
| Renewal                     | `Subscribe`               | Recurring billing event |
| Non-Subscription Purchase   | `Purchase`                | One-off purchases |
| Cancellation                | `Subscribe` (with status) | Send as churn signal (custom prop) |
| Uncancellation              | `Subscribe`               | Re-enable auto-renew |
| Expiration                  | `Subscribe` (expired)     | Status change (custom prop) |
| Billing Issue               | `Subscribe` (billing)     | Include `billing_issue=true` |
| Product Change              | `Subscribe`               | Include new SKU in props |

You may choose different standard/custom events if they better fit your reporting.

## 4) Event Payload Guidelines (CAPI)

Meta Conversions API commonly expects:
- `event_name` (e.g., `Subscribe`, `Purchase`)
- `event_time` (unix seconds)
- `event_source_url` (optional)
- `action_source` (e.g., `email`, `website`, `app`, `other`)
- `event_id` (idempotency)
- `user_data` (hashed identifiers when available):
  - `external_id` (hash), `email` (sha256), `phone` (sha256), `client_ip_address`, `client_user_agent`
- `custom_data`:
  - `currency`, `value`
  - `subscription_id`, `product_id`, `entitlements`, `period_type`, `environment`, `platform`, `country`
  - `status` (e.g., `trial`, `active`, `canceled`, `expired`)

Privacy and ATT:
- If sending without ATT consent, avoid IDFA and keep to non-PII or hashed identifiers per policy
- Consider setting Limited Data Use and region flags as applicable

## 5) Sales Reporting Basis

Document which basis you’ll use across dashboards (be consistent):
- [ ] **Gross** (before store commission/taxes)
- [ ] **Net** (after estimated commission/taxes)

## 6) Sandbox vs Production

- Use your Sandbox Pixel and Token for test events
- Switch to Production Pixel and Token for go-live
- Maintain toggles in env:
  - `META_USE_SANDBOX=true|false`

## 7) Implementation Notes

- Preferred: centralize emission via a service (e.g., `services/analytics.ts`) and map from RevenueCat webhook events
- Include `event_id` to deduplicate retries
- Include `action_source` (e.g., `other`) when source is server-side
- Log responses and backoff on non-2xx

## 8) Verification Checklist

- [ ] Pixel ID(s) and Token(s) filled
- [ ] ATT behavior chosen
- [ ] Event mapping confirmed (table above)
- [ ] Sales basis chosen (Gross/Net)
- [ ] Test events visible in Events Manager (Test Events tab)
- [ ] Production events visible in Aggregated Event Measurement

## 9) Example (pseudo payload)

```json
{
  "event_name": "Subscribe",
  "event_time": 1730000000,
  "action_source": "other",
  "event_id": "rc_evt_12345",
  "user_data": {
    "external_id": "<sha256>",
    "client_ip_address": "203.0.113.10",
    "client_user_agent": "RevenueCat/1.0"
  },
  "custom_data": {
    "currency": "USD",
    "value": 9.99,
    "subscription_id": "orig_txn_abc",
    "product_id": "com.everreach.core.monthly",
    "period_type": "NORMAL",
    "environment": "PRODUCTION",
    "platform": "APP_STORE",
    "status": "active"
  }
}
```
