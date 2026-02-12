# Vercel Environment Variables — Deployment Guide

## Required for Server-Side Meta CAPI Forwarding

These env vars enable the RevenueCat webhook → Meta Conversions API pipeline.
Without them, RevenueCat lifecycle events (RENEWAL, CANCELLATION, EXPIRATION, etc.)
will **not** reach Meta for ROAS measurement.

### Variables to Add

| Variable | Value Source | Description |
|---|---|---|
| `META_PIXEL_ID` | Same as `EXPO_PUBLIC_META_PIXEL_ID` in `.env` | Meta Pixel ID from Events Manager |
| `META_CONVERSIONS_API_TOKEN` | Same as `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` in `.env` | Conversions API access token |

### How to Add (Manual — Vercel Dashboard)

1. Go to [Vercel Dashboard](https://vercel.com) → your project (`ever-reach-be`)
2. **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `META_PIXEL_ID`
   - **Value**: `10039038026189444`
   - **Environments**: Production, Preview, Development
4. Repeat for `META_CONVERSIONS_API_TOKEN` (paste the full token starting with `EAAOhwkTLb4M...`)
5. Click **Save**
6. **Redeploy** the backend for changes to take effect

### How to Add (CLI — Automated)

```bash
# From the backend-vercel directory:
cd backend-vercel

# Add Meta Pixel ID
vercel env add META_PIXEL_ID production preview development

# Add Conversions API Token
vercel env add META_CONVERSIONS_API_TOKEN production preview development

# Redeploy to pick up new env vars
vercel --prod
```

### How to Add (Script — One-liner)

```bash
# Run from ios-app root:
node scripts/push-vercel-env.mjs
```

---

## Existing Env Vars (Already Configured)

These should already be set in Vercel from initial backend setup:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (webhooks) |
| `REVENUECAT_API_KEY` | RevenueCat V2 API key |
| `REVENUECAT_PROJECT_ID` | RevenueCat project ID |
| `REVENUECAT_WEBHOOK_SECRET` | Webhook signature verification |

---

## Verification

After deploying, verify the Meta CAPI emitter is working:

1. **Check Vercel logs** after a RevenueCat webhook fires:
   ```
   [MetaCAPI] Server-side event sent: { events_received: 1, count: 1 }
   ```

2. **Check Meta Events Manager** → Test Events tab:
   - Look for events with `source: revenuecat_webhook` in custom_data
   - Event IDs will be prefixed with `rc_` (e.g., `rc_evt_abc123`)

3. **Use the RevenueCat webhook monitor script**:
   ```bash
   node scripts/revenuecat-event-monitor.mjs
   ```
