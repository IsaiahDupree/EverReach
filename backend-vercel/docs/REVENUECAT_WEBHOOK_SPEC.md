# RevenueCat Webhook and Backend Interface Spec

This spec defines how our backend mirrors RevenueCat state into EverReach entitlements, so we have full visibility and accurate status.

## Endpoint

- Method: POST
- Path: `/api/v1/billing/revenuecat/webhook`
- Auth: optional signature verification (recommended)
  - Header: `X-RevenueCat-Signature` (HMAC, see RC docs)
  - Env: `REVENUECAT_WEBHOOK_SECRET`
- Response: 200 on success, 4xx/5xx on errors

## Security

- Verify request signature (if enabled) using `REVENUECAT_WEBHOOK_SECRET`.
- Enforce IP allowlist (optional) or RC domain verification.
- Idempotency: de-duplicate by `event_id` (store processed IDs for 24–48h).

## Event types to handle

Handle at a minimum:
- `INITIAL_PURCHASE`
- `RENEWAL`
- `EXPIRATION`
- `CANCELLATION`
- `UNCANCELLATION`
- `PRODUCT_CHANGE`
- `REFUND`

Optional:
- `BILLING_ISSUE`, `SUBSCRIBER_ALIAS`, etc.

## Payload (representative)

```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "id": "evt_123",              
    "app_user_id": "<USER_ID>",   
    "product_id": "com.everreach.core.monthly",
    "entitlement_ids": ["core"],
    "environment": "SANDBOX",      
    "purchased_at_ms": 1730000000000,
    "expiration_at_ms": 1730604800000,
    "period_type": "TRIAL",        
    "store": "APP_STORE",          
    "country_code": "US",
    "presented_offering_id": "default",
    "original_transaction_id": "100000000000000",
    "transaction_id": "200000000000000"
  }
}
```

Note: RC sends iOS and Android specific fields depending on the store.

## Mapping to EverReach

- Input → Internal subscription table (`user_subscriptions`)
  - `user_id`: map from `app_user_id` (we configure Purchases with our app user ID)
  - `platform`: `app_store` / `play`
  - `product_id`: RC `product_id`
  - `status` (derived): `active` | `canceled` | `expired` | `trial` | `refunded`
  - `original_transaction_id` (iOS), `purchase_token` (Android)
  - `current_period_end`: from `expiration_at_ms`
  - `last_event_id`: `event.id`
  - `last_event_at`: now()
  - `source`: `app_store` | `play`

- Input → Entitlements object returned by `GET /api/v1/me/entitlements`
  - `tier`: `core` for `com.everreach.core.*` products; otherwise map as needed
  - `subscription_status`: `active` | `trial` | `canceled` | `expired`
  - `trial_ends_at`: if `period_type = TRIAL`
  - `current_period_end`: from RC `expiration_at_ms`
  - `payment_platform`: `apple` | `google`
  - `features`: union of features for the tier

## Status transitions

- `INITIAL_PURCHASE` → status: `trial` or `active` (depending on `period_type` and `expiration_at_ms` in the future)
- `RENEWAL` → status: `active` (update `current_period_end`)
- `CANCELLATION` → status: `canceled` (keep access through `current_period_end`)
- `EXPIRATION` → status: `expired`
- `REFUND` → status: `refunded` (access removed)
- `PRODUCT_CHANGE` → update `product_id` and recompute tier

## Idempotency

- Use `event.id` as unique constraint. If already processed, return 200 with `{ ok: true, duplicate: true }`.

## Errors and retries

- On transient errors return 5xx so RC retries.
- On validation/signature failure return 4xx.

## Logging and observability

- Log: `event.id`, `type`, `app_user_id`, `product_id`, `status_before → status_after`, `current_period_end`.
- Metrics (optional): counter per event type, gauge of active subs, trial count.

## Test plan

- Unit: handler maps each event type correctly.
- Integration: run `test/agent/revenuecat-webhook.mjs` (already added) against deployed backend.
- Manual: trigger RC test webhooks from dashboard and verify entitlements with `GET /v1/me/entitlements`.

## Example 200 response

```json
{
  "ok": true,
  "processed": true,
  "event_id": "evt_123",
  "user_id": "<USER_ID>",
  "subscription": {
    "status": "trial",
    "product_id": "com.everreach.core.monthly",
    "current_period_end": "2025-11-02T12:00:00.000Z"
  }
}
```

## Future extensions

- Write revenue and MRR snapshots for analytics
- Emit internal events for in-app messaging (e.g., welcome premium)
- Reconciliation job to compare RC state and internal DB
