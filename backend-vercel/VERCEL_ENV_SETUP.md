# Set RevenueCat Webhook Secret in Vercel

The endpoint is deployed but needs the environment variable configured in Vercel.

## Quick Setup via Vercel CLI

```powershell
# Set for all environments
npx vercel env add REVENUECAT_SECRET_KEY
# When prompted, paste: sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX
# Select: Production, Preview, Development

# Alternative variable name (both supported)
npx vercel env add REVENUECAT_WEBHOOK_SECRET
# Paste the same value
```

## Manual Setup via Dashboard

1. Go to: https://vercel.com/dashboard
2. Select project: `backend-vercel` or `ever-reach-be`
3. Go to: **Settings** → **Environment Variables**
4. Click: **Add New**
5. Add these variables:

| Name | Value | Environments |
|------|-------|--------------|
| `REVENUECAT_SECRET_KEY` | `sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX` | Production, Preview, Development |
| `REVENUECAT_WEBHOOK_SECRET` | `sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX` | Production, Preview, Development |

6. Click **Save**
7. Vercel will automatically redeploy with the new variables

## Verify Setup

After adding the env vars and redeployment completes (~2 minutes):

```powershell
# Run tests
.\scripts\test-revenuecat-webhook.ps1
```

Expected: 10/10 tests passing ✅

## Troubleshooting

**If still getting 405 errors:**
- Wait 2-3 minutes for deployment to complete
- Check deployment status: https://vercel.com/dashboard
- Verify the route file deployed: Check build logs

**If signature verification fails:**
- Verify the secret matches in Vercel dashboard
- Check no extra spaces or quotes in the value
