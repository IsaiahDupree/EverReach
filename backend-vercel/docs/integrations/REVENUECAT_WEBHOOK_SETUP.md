# RevenueCat Webhook Setup (EverReach)

Use this checklist to configure RevenueCat → EverReach backend webhooks. Supports either HMAC signature verification or Authorization header.

## Basics

- **Webhook URL**: `https://ever-reach-be.vercel.app/api/v1/billing/revenuecat/webhook`
- **Route**: `backend-vercel/app/api/v1/billing/revenuecat/webhook/route.ts`
- **Environment scope**: Both Production and Sandbox
- **Events filter**: All apps, All events

## Event Types Received from RevenueCat

The webhook may deliver the following subscription and purchase events. Your downstream integrations (PostHog, Meta, etc.) should map these.

- **Trial Started**
- **Trial Converted**
- **Initial Purchase**
- **Renewal**
- **Cancellation**
- **Uncancellation**
- **Subscription Paused**
- **Expiration**
- **Billing Issue**
- **Product Change**
- **Non-Subscription Purchase**

## Security Methods

Pick ONE of the two options below and fill the settings accordingly.

### Option A: Signature Signing (HMAC-SHA256)

- **RevenueCat dashboard**
  - Enable webhook signing
  - **Signing secret**: `<YOUR_STRONG_SECRET>`
- **Vercel backend env**
  - `REVENUECAT_WEBHOOK_SECRET=<YOUR_STRONG_SECRET>`
  - (Fallback key also supported) `REVENUECAT_SECRET_KEY=<YOUR_STRONG_SECRET>`
- The server verifies header `X-RevenueCat-Signature` over the raw body

### Option B: Authorization Header (Alternative)

- **RevenueCat dashboard**
  - Authorization header value: `Bearer <YOUR_STRONG_TOKEN>`
- **Vercel backend env**
  - `REVENUECAT_WEBHOOK_AUTH_TOKEN=<YOUR_STRONG_TOKEN>`
- The server compares `Authorization` header to `Bearer ${REVENUECAT_WEBHOOK_AUTH_TOKEN}`

> The handler authorizes a request if EITHER signature OR Authorization is valid.

## Required Backend Environment Variables

- `SUPABASE_SERVICE_ROLE_KEY`  (write access for subscription updates)
- `SUPABASE_URL`               (already set in most envs)
- Optional for user-auth routes (not required by webhook):
  - `SUPABASE_JWT_SECRET`

## Database Migration

Apply the RevenueCat subscription schema before testing:

- File: `backend-vercel/supabase/migrations/20251026172100_revenuecat_subscriptions.sql`
- Project: `utasetfxiqcrnwyfforx`

Supabase CLI (recommended schema-first flow):

```powershell
supabase login
supabase link --project-ref utasetfxiqcrnwyfforx
supabase db pull
supabase db push
```

Or paste the SQL into Supabase SQL Editor and run.

## Test Locally (E2E)

Signature path:
```powershell
$env:REVENUECAT_WEBHOOK_SECRET = "<YOUR_STRONG_SECRET>"
node test/backend/revenuecat-webhook.mjs
```

Authorization header path:
```powershell
$env:REVENUECAT_WEBHOOK_AUTH_TOKEN = "<YOUR_STRONG_TOKEN>"
node test/backend/revenuecat-webhook.mjs
```

Defaults in test script:
- API base: `https://ever-reach-be.vercel.app`
- Secret default: `test_secret_key_12345` (override with env)

## Troubleshooting

- **401 Unauthorized**
  - Signing: secret mismatch or missing `X-RevenueCat-Signature`
  - Authorization: header missing or token mismatch
- **500 Processing failed**
  - Migration not applied or `SUPABASE_SERVICE_ROLE_KEY` missing
- **Duplicate event** returns 200 with `{ duplicate: true, processed: false }`

## Fill-in Checklist

- [ ] Pick security method: Signature / Authorization
- [ ] Set RC settings (secret or Authorization header)
- [ ] Set Vercel env to match
- [ ] Apply migration to Supabase project
- [ ] Deploy backend
- [ ] Run `node test/backend/revenuecat-webhook.mjs` and verify success
