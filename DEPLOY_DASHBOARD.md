# Deploy Dashboard to Vercel

## ✅ Issue Found

Vercel is deploying from the **root directory** (backend) instead of `dashboard-app/`.

## 🔧 Fix: Update Vercel Project Settings

### Option 1: Vercel Dashboard (Recommended)

1. **Go to:** https://vercel.com/isaiahduprees-projects/everreach-dashboard/settings

2. **General → Root Directory**
   - Current: `.` (root)
   - Change to: `dashboard-app`
   - Click **Save**

3. **Redeploy:**
   - Go to Deployments
   - Click on latest deployment
   - Click **Redeploy** button

### Option 2: Via Vercel CLI

```bash
cd dashboard-app

# Link to project (if not already)
vercel link
# Select: isaiahduprees-projects/everreach-dashboard

# Deploy
vercel --prod
```

---

## ✅ Expected Result After Fix

**Routes should be:**
```
├ ƒ /                          → redirects to /dashboard/events
├ ƒ /dashboard/events          → Event analytics (NEW)
├ ƒ /dashboard/paywall         → Paywall settings
├ ƒ /dashboard/geodesic        → Geodesic
```

**NOT:**
```
❌ /auth/v1/login              (backend route)
❌ /dashboard/acquisition      (backend route)
❌ /dashboard/analytics        (backend route)
```

---

## 🚀 After Deployment

1. **Visit:** https://reports.everreach.app
2. **Should redirect to:** https://reports.everreach.app/dashboard/events
3. **Verify:**
   - Event analytics page loads
   - Real event data displays
   - Charts render
   - No 404 errors

---

## 📝 Environment Variables Needed

Make sure these are set in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BACKEND_URL=https://ever-reach-be.vercel.app
NEXT_PUBLIC_DASHBOARD_TITLE=EverReach Analytics
NEXT_PUBLIC_REFRESH_INTERVAL=30000
```

**To add:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste the key from dashboard-app/.env.local
```

---

## 🧹 Clean Up Old Backend Routes

The backend routes (`/auth`, `/dashboard/acquisition`, etc.) should NOT appear in the dashboard deployment. 

If they still appear after changing Root Directory:
1. Check `dashboard-app/src/app/` only has:
   - `layout.tsx`
   - `page.tsx`
   - `globals.css`
   - `(main)/dashboard/events/page.tsx`
   - `(main)/dashboard/paywall/page.tsx`
   - `(main)/dashboard/geodesic/page.tsx`

2. Remove any other route directories

---

**Status:** Ready to deploy after changing Root Directory to `dashboard-app`
