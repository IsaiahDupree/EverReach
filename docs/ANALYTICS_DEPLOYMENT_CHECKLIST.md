# PostHog Analytics - Deployment Checklist

## 🚀 Quick Deployment Guide

### 1. PostHog Setup (5 min)

**Create PostHog Account:**
1. Go to [posthog.com](https://posthog.com)
2. Sign up (free tier available)
3. Create a new project: "EverReach"

**Get API Keys:**
1. Go to Project Settings → API Keys
2. Copy **Project API Key** (starts with `phc_`)
3. Copy **Personal API Key** (for server-side)

**Configure Webhook:**
1. Go to Data Management → Destinations
2. Add new destination → Webhook
3. URL: `https://ever-reach-be.vercel.app/api/posthog-webhook`
4. Method: POST
5. Add header: `x-posthog-secret: <generate-random-secret>`
6. Save webhook destination

---

### 2. Environment Variables

**Mobile App (`expo` workspace):**
```bash
# .env
EXPO_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
```

**Web App (`web` workspace):**
```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
```

**Backend (`backend-vercel` workspace):**
```bash
# Vercel Environment Variables
POSTHOG_PERSONAL_API_KEY=phx_your_personal_key_here
POSTHOG_WEBHOOK_SECRET=your_random_secret_here

# Existing (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=sk-proj-...
CRON_SECRET=your_cron_secret
```

**Set in Vercel:**
```bash
# Via CLI
vercel env add POSTHOG_PERSONAL_API_KEY
vercel env add POSTHOG_WEBHOOK_SECRET

# Or via dashboard:
# https://vercel.com/your-team/backend-vercel/settings/environment-variables
```

---

### 3. Database Migration (3 min)

**Run Analytics Schema:**
```bash
# Connect to Supabase SQL Editor:
# https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

# Copy and paste contents of:
# backend-vercel/migrations/analytics-schema.sql

# Click "Run"
```

**Verify Tables Created:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'analytics_%'
ORDER BY table_name;

-- Expected output:
-- analytics_events
-- analytics_sessions
-- analytics_users
-- experiment_assignments
-- feature_flag_exposures
-- message_generation_events
```

---

### 4. Deploy Webhook (2 min)

**Backend is already deployed, just redeploy:**
```bash
cd backend-vercel

# Add new files
git add .

# Commit
git commit -m "Add PostHog webhook and analytics infrastructure"

# Deploy
git push origin feat/backend-vercel-only-clean
```

**Verify Webhook Works:**
```bash
# Health check
curl https://ever-reach-be.vercel.app/api/posthog-webhook

# Expected response:
# {"status":"ok","service":"posthog-webhook","timestamp":"..."}
```

---

### 5. Mobile App Integration (10 min)

**Install SDK:**
```bash
cd ../  # Root of PersonalCRM
npx expo install posthog-react-native
```

**Initialize in App Layout:**

Create/update `lib/posthog.ts`:
```typescript
import PostHog from 'posthog-react-native';
import * as Crypto from 'expo-crypto';

let initialized = false;

export const initializePostHog = async () => {
  if (initialized || !process.env.EXPO_PUBLIC_POSTHOG_KEY) return;
  
  await PostHog.init(process.env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: 'https://app.posthog.com',
    captureApplicationLifecycleEvents: true,
    captureScreenViews: true,
    flushAt: 10,
    flushInterval: 5000,
  });
  
  initialized = true;
  console.log('[PostHog] Initialized');
};

export const identifyUser = async (userId: string, traits?: Record<string, any>) => {
  // Hash user ID for privacy
  const anonId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    userId
  );
  
  PostHog.identify(anonId, traits);
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  PostHog.capture(eventName, properties);
};

export const resetUser = () => {
  PostHog.reset();
};
```

**Add to `app/_layout.tsx`:**
```typescript
import { initializePostHog } from '@/lib/posthog';

export default function RootLayout() {
  useEffect(() => {
    initializePostHog();
  }, []);
  
  // ... rest of your layout
}
```

**Identify After Login:**

In your `providers/AuthProvider.tsx`:
```typescript
import { identifyUser } from '@/lib/posthog';

// After successful sign in:
const user = await supabase.auth.getUser();
if (user.data.user) {
  await identifyUser(user.data.user.id, {
    plan: 'free', // or actual plan
    locale: Localization.locale,
    platform: Platform.OS,
  });
}
```

---

### 6. Web App Integration (10 min)

**Install SDK:**
```bash
cd web  # or wherever your Next.js app is
npm install posthog-js
```

**Create Provider:**

`app/providers/PostHogProvider.tsx`:
```typescript
'use client';
import posthog from 'posthog-js';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: 'https://app.posthog.com',
        capture_pageview: true,
        autocapture: true,
      });
    }
  }, []);

  return <>{children}</>;
}
```

**Wrap App:**

`app/layout.tsx`:
```typescript
import { PostHogProvider } from './providers/PostHogProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
```

---

### 7. Test Event Tracking (5 min)

**Test 1: App Opened Event**
```bash
# Open your mobile app
# Check PostHog dashboard → Activity → Live Events
# Should see "App Opened" event
```

**Test 2: Feature Request Submitted**
```bash
# In your app, submit a test feature request
# Check PostHog → Live Events
# Should see "Feature Request Submitted"
```

**Test 3: Webhook Received**
```sql
-- Check Supabase
SELECT 
  name,
  anon_user_id,
  ts,
  props
FROM analytics_events
ORDER BY ts DESC
LIMIT 10;

-- Should see events from PostHog
```

**Test 4: Feature Flags**
```typescript
// In PostHog dashboard, create a flag: "test_flag"
// In your app:
const enabled = await PostHog.getFeatureFlag('test_flag');
console.log('Flag enabled:', enabled);
```

---

### 8. Set Up Cron for View Refresh (Optional)

**Add Vercel Cron:**

Update `backend-vercel/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-warmth-alerts",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/process-embeddings",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/refresh-analytics",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Create Cron Handler:**

`backend-vercel/app/api/cron/refresh-analytics/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Refresh materialized views
  await supabase.rpc('refresh_analytics_views');

  return NextResponse.json({ 
    success: true,
    refreshed_at: new Date().toISOString(),
  });
}
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] PostHog project created
- [ ] API keys added to all environments
- [ ] Webhook destination configured
- [ ] Database migration ran successfully
- [ ] Backend webhook deployed and responding
- [ ] Mobile app SDK installed and initialized
- [ ] Web app SDK installed and initialized
- [ ] Events flowing to PostHog (check Live Events)
- [ ] Events mirrored to Supabase (check `analytics_events` table)
- [ ] User identification working (hashed IDs)
- [ ] Feature flags can be evaluated
- [ ] No PII in event properties

---

## 🎯 Key Events to Test

1. **Lifecycle:**
   - App Opened
   - App Backgrounded

2. **Auth:**
   - Signed Up
   - Signed In

3. **Contacts:**
   - Contact Created
   - Contact Updated

4. **Messages:**
   - Message Generated
   - Message Sent

5. **Feature Requests:**
   - Feature Request Submitted
   - Feature Request Voted

6. **Subscriptions:**
   - Paywall Viewed
   - Trial Started

---

## 📊 Sample Dashboard Queries

**Daily Active Users:**
```sql
SELECT 
  DATE_TRUNC('day', ts) AS day,
  COUNT(DISTINCT anon_user_id) AS dau
FROM analytics_events
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

**Signup → First Contact Funnel:**
```sql
SELECT 
  signed_up,
  created_contact,
  ROUND(100.0 * created_contact / NULLIF(signed_up, 0), 2) AS conversion_pct
FROM mv_daily_core_funnel
WHERE d >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY d DESC;
```

**Feature Request Engagement:**
```sql
SELECT * 
FROM mv_feature_request_metrics
WHERE day >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY day DESC;
```

---

## 🚨 Troubleshooting

### Events not showing in PostHog
- Check API key is correct
- Check network requests in browser DevTools
- Verify SDK is initialized before tracking events

### Webhook not receiving events
- Check webhook URL is correct
- Verify `x-posthog-secret` header matches env var
- Check Vercel function logs

### Events not in Supabase
- Check webhook handler logs in Vercel
- Verify Supabase service role key is correct
- Check RLS policies aren't blocking inserts
- Verify tables exist

### User IDs not hashed
- Make sure you're using `identifyUser()` helper
- Check SHA-256 hashing is working
- Never call `PostHog.identify()` with raw user IDs

---

## 📞 Support

- **PostHog Docs:** https://posthog.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Backend Logs:** https://vercel.com/your-team/backend-vercel/logs
- **PostHog Live Events:** https://app.posthog.com/events

---

**Total Time: ~35-40 minutes** ⚡

Let's ship it! 🚀
