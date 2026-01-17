# Vercel Environment Variables Setup

## Quick Fix for PostHog Error

You need to add these environment variables to your Vercel project:

### Option 1: Via Vercel Dashboard (Recommended - 2 minutes)

1. Go to https://vercel.com/isaiahduprees-projects/web/settings/environment-variables
2. Add these variables for **Production**:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

3. Click "Save"
4. Redeploy: `vercel --prod`

### Option 2: Via CLI (Interactive)

Run each command and paste the value when prompted:

```bash
cd web

# PostHog Key
vercel env add NEXT_PUBLIC_POSTHOG_KEY production
# Paste: phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb

# PostHog Host
vercel env add NEXT_PUBLIC_POSTHOG_HOST production
# Paste: https://us.i.posthog.com
```

Then redeploy:
```bash
vercel --prod
```

### Other Important Environment Variables

While you're at it, add these too (from your .env.local):

**Supabase (Required for auth):**
```
EXPO_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04
```

**Backend API (If not already set):**
```
NEXT_PUBLIC_API_URL=https://ever-reach-be.vercel.app
```

---

## About the Custom Fields 500 Error

The backend `/api/v1/custom-fields` endpoint is returning 500, but **your frontend is now safe** thanks to our fixes:

- `getJsonArray()` catches the error and returns `[]`
- React Query retries once
- Page continues to work despite backend error

**To fix the backend 500:**
The backend needs the `custom_field_defs` table created. This is a separate task for the backend deployment.

For now, the frontend gracefully handles the missing data.

---

## Quick Test

After adding env vars and redeploying:

1. Visit: https://web-azg7zd2l9-isaiahduprees-projects.vercel.app
2. Open browser console (F12)
3. You should NOT see the PostHog error
4. Custom fields should show empty state (not crash)

✅ **Expected**: No PostHog errors, dashboard loads fine
❌ **Before**: PostHog error, potential crashes
