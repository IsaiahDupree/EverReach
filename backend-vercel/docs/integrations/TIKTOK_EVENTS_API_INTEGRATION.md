# TikTok Events API Integration (EverReach)

Configure TikTok Events API to receive subscription and purchase events server‑to‑server.

## 1) Required Settings

- **Pixel ID** (Events Manager → Assets → Event Source): `TIKTOK_PIXEL_ID`
- **Access Token** (Events Manager → Settings → Generate Access Token): `TIKTOK_ACCESS_TOKEN`
- Optional Sandbox:
  - `TIKTOK_PIXEL_ID_SANDBOX`
  - `TIKTOK_ACCESS_TOKEN_SANDBOX`

## 2) Event Names and Mapping

Chosen defaults (use TikTok standard events when possible):

| RevenueCat Event            | TikTok Event       | Notes |
|----------------------------|--------------------|-------|
| Trial Started               | `StartTrial`       | Include `value=0`, `trial_days` |
| Trial Converted             | `Subscribe`        | Transition trial → paid |
| Initial Purchase            | `Subscribe`        | Include `value` and `currency` |
| Renewal                     | `Subscribe`        | Recurring billing |
| Non-Subscription Purchase   | `CompletePayment`  | One‑off purchases |
| Cancellation                | `Subscribe`        | Use custom param `status="cancelled"` |
| Uncancellation              | `Subscribe`        | Use custom param `status="uncancelled"` |
| Expiration                  | `Subscribe`        | Use custom param `status="expired"` |
| Billing Issue               | `Subscribe`        | Use custom param `billing_issue=true` |
| Product Change              | `Subscribe`        | Include new SKU |

## 3) Payload Guidelines (Events API)

Endpoint: `https://business-api.tiktok.com/open_api/v1.3/event/track/`

Common fields:
- `pixel_code` (Pixel ID)
- `event` (e.g., `Subscribe`, `CompletePayment`)
- `timestamp` (ms)
- `context` (ip, user_agent)
- `properties` (custom data):
  - `currency`, `value`
  - `product_id`, `entitlements`, `environment`, `platform`, `status`, `country`
- `event_id` (idempotency)

User identify options:
- `external_id` (hashed), email/phone hashes when available

## 4) Env Variables (suggested)

- `TIKTOK_PIXEL_ID`, `TIKTOK_ACCESS_TOKEN`
- `TIKTOK_PIXEL_ID_SANDBOX`, `TIKTOK_ACCESS_TOKEN_SANDBOX`
- `TIKTOK_USE_SANDBOX=true|false`

## 5) Verification Checklist

- [ ] Pixel ID/Access Token configured
- [ ] Event mapping confirmed (table above)
- [ ] Test events visible in TikTok Events Manager
- [ ] Production events flowing
