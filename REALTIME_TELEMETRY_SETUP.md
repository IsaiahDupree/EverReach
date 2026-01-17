# Realtime Telemetry & Activity Tracking - Complete Setup

**Date**: November 8, 2025  
**Status**: 🔴 **NEEDS FIXES**

---

## 🔴 Current Issues

### 1. PostHog is DOWN
**Error**: `Dynamic server usage: Route /api/cron/sync-posthog couldn't be rendered statically`  
**Cause**: Vercel cron path mismatch  
**Impact**: No PostHog data syncing to dashboard

### 2. Daily Activity Email Not Running
**Issue**: `/api/cron/dev-activity-digest` NOT in vercel.json cron list  
**Impact**: You're not getting daily emails about app usage

### 3. Session Tracking Not Used in Reports
**Issue**: `user_sessions` table exists but daily email only uses `event_log`  
**Impact**: Missing accurate session duration data in reports

---

## 📊 Current Tracking Architecture

### Data Sources

**1. PostHog (External)**
- Mobile app events
- User analytics
- Feature usage
- NOT syncing due to cron issue ❌

**2. Supabase `event_log` Table**
- Direct event tracking
- Used by daily email ✅
- Limited session data ⚠️

**3. Supabase `user_sessions` Table**
- Session start/end times
- Duration tracking
- NOT used in reports ❌

**4. Supabase `metrics_timeseries` Table**
- Time-series metrics storage
- Dashboard data source ✅
- Should receive PostHog data ❌

---

## 🎯 What You Want

1. ✅ **Realtime telemetry**: Who is using the app right now
2. ✅ **Session duration**: How long each user is in the app
3. ✅ **Daily email**: Summary of who was active
4. ✅ **Dashboard view**: Visual analytics
5. ✅ **Data flow**: Mobile → Supabase → Dashboard → Email

---

## 🔧 Fixes Required

### Fix #1: PostHog Cron Path

**Problem**: Cron points to wrong path

`vercel.json` line 23:
```json
"path": "/api/cron/sync-posthog-events",  ❌ Wrong
```

**Fix**:
```json
"path": "/api/cron/sync-posthog",  ✅ Correct
```

---

### Fix #2: Add Daily Activity Email to Cron

**Problem**: Daily email not scheduled

**Fix**: Add to `vercel.json`:
```json
{
  "path": "/api/cron/dev-activity-digest",
  "schedule": "0 9 * * *"
}
```

---

### Fix #3: Enhanced Activity Email with Session Data

**Problem**: Email doesn't include session duration/realtime data

**Current email shows**:
- Total events
- Unique users
- New signups
- Event counts

**Should also show**:
- ✅ Active sessions TODAY
- ✅ Total session time per user
- ✅ Average session duration
- ✅ Currently online users (last 5 min)
- ✅ Most engaged users by time spent

---

## 🚀 Complete Implementation Plan

### Phase 1: Fix PostHog & Cron (15 minutes)

1. **Update vercel.json**:
   - Fix PostHog cron path
   - Add dev-activity-digest cron

2. **Redeploy to Vercel**:
   - Push changes
   - Wait for deployment
   - PostHog will sync on next run (every 15 min)

### Phase 2: Enhanced Activity Email (30 minutes)

**Update `/api/cron/dev-activity-digest/route.ts`** to include:

```typescript
// Query user_sessions for session data
const { data: sessions } = await supabase
  .from('user_sessions')
  .select('user_id, started_at, ended_at, duration_seconds')
  .gte('started_at', yesterday.toISOString());

// Calculate session metrics
const sessionMetrics = {
  total_sessions: sessions.length,
  total_minutes: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60,
  avg_session_minutes: sessions.length > 0 
    ? (sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length / 60)
    : 0,
  currently_active: sessions.filter(s => !s.ended_at).length,
};

// Top users by time spent
const userTimeSpent = sessions.reduce((acc, s) => {
  acc[s.user_id] = (acc[s.user_id] || 0) + (s.duration_seconds || 0);
  return acc;
}, {} as Record<string, number>);

const topUsersByTime = Object.entries(userTimeSpent)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([user_id, seconds]) => ({ 
    user_id, 
    minutes: Math.round(seconds / 60) 
  }));
```

**Enhanced email template**:
```html
<h1>🎯 EverReach Daily Activity Report</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>📊 Session Metrics (Last 24h)</h2>
<ul>
  <li><strong>Total Sessions:</strong> ${sessionMetrics.total_sessions}</li>
  <li><strong>Total Time:</strong> ${Math.round(sessionMetrics.total_minutes)} minutes</li>
  <li><strong>Avg Session:</strong> ${sessionMetrics.avg_session_minutes.toFixed(1)} min</li>
  <li><strong>Currently Active:</strong> ${sessionMetrics.currently_active} users</li>
</ul>

<h2>⏱️ Top 5 Users by Time Spent</h2>
<ol>
  ${topUsersByTime.map(u => `
    <li>User ${u.user_id.substring(0, 8)}... (${u.minutes} minutes)</li>
  `).join('')}
</ol>

<h2>📈 Event Activity</h2>
<ul>
  <li><strong>Total Events:</strong> ${metrics.total_events}</li>
  <li><strong>Unique Users:</strong> ${metrics.unique_users}</li>
  <li><strong>New Signups:</strong> ${metrics.new_signups}</li>
  <li><strong>Interactions:</strong> ${metrics.interactions_logged}</li>
</ul>

<h2>🔥 Top 5 Most Active Users</h2>
<ol>
  ${topUsers.map(u => `
    <li>User ${u.user_id.substring(0, 8)}... (${u.event_count} events)</li>
  `).join('')}
</ol>

<p>
  <a href="https://reports.everreach.app/health">📊 View Dashboard</a> | 
  <a href="https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor">🗄️ View Database</a>
</p>
```

### Phase 3: Realtime Dashboard View (20 minutes)

**Create `/api/v1/analytics/realtime/route.ts`**:

```typescript
import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

// GET /api/v1/analytics/realtime
// Returns currently active users and recent activity
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Currently active (sessions started in last 5 min OR not ended)
    const { data: activeSessions } = await supabase
      .from('user_sessions')
      .select('user_id, started_at')
      .or(`ended_at.is.null,started_at.gte.${fiveMinAgo.toISOString()}`)
      .order('started_at', { ascending: false });

    // Today's sessions
    const { data: todaySessions } = await supabase
      .from('user_sessions')
      .select('user_id, duration_seconds')
      .gte('started_at', new Date().setHours(0, 0, 0, 0));

    // Last 24h sessions
    const { data: recentSessions } = await supabase
      .from('user_sessions')
      .select('user_id, duration_seconds, started_at')
      .gte('started_at', oneDayAgo.toISOString());

    // Calculate metrics
    const activeUsers = new Set((activeSessions || []).map(s => s.user_id));
    const todayUsers = new Set((todaySessions || []).map(s => s.user_id));
    
    const todayMinutes = (todaySessions || [])
      .reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;

    const recentMinutes = (recentSessions || [])
      .reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;

    return ok({
      realtime: {
        active_now: activeUsers.size,
        active_users: Array.from(activeUsers).slice(0, 10),
        as_of: now.toISOString(),
      },
      today: {
        unique_users: todayUsers.size,
        total_sessions: (todaySessions || []).length,
        total_minutes: Math.round(todayMinutes),
        avg_session_minutes: todaySessions?.length 
          ? (todayMinutes / todaySessions.length).toFixed(1)
          : 0,
      },
      last_24h: {
        unique_users: new Set((recentSessions || []).map(s => s.user_id)).size,
        total_sessions: (recentSessions || []).length,
        total_minutes: Math.round(recentMinutes),
      },
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
```

**Add to Evidence dashboard** (`evidence-app/pages/realtime.md`):

```sql realtime_users
SELECT 
  COUNT(DISTINCT user_id) as active_now,
  COUNT(*) as active_sessions
FROM user_sessions
WHERE ended_at IS NULL 
   OR started_at > NOW() - INTERVAL '5 minutes';
```

```sql today_activity
SELECT 
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_sessions,
  ROUND(SUM(duration_seconds) / 60) as total_minutes,
  ROUND(AVG(duration_seconds) / 60, 1) as avg_session_minutes
FROM user_sessions
WHERE started_at >= CURRENT_DATE;
```

---

## 📋 Step-by-Step Fix Implementation

### Step 1: Update vercel.json (NOW)

```json
{
  "crons": [
    {
      "path": "/api/cron/check-warmth-alerts",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/dev-activity-digest",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/sync-posthog",
      "schedule": "*/15 * * * *"
    },
    // ... rest of crons
  ]
}
```

### Step 2: Commit & Deploy

```bash
git add backend-vercel/vercel.json
git commit -m "fix: correct PostHog cron path and add daily activity email"
git push origin feat/dev-dashboard
```

### Step 3: Update Activity Digest (Next)

- Enhance `/api/cron/dev-activity-digest/route.ts`
- Add session duration tracking
- Improve email template

### Step 4: Add Realtime Endpoint (Optional)

- Create `/api/v1/analytics/realtime/route.ts`
- Add to Evidence dashboard
- Mobile app can call this for realtime stats

---

## 🧪 Testing

### Test PostHog Sync

```bash
# After deployment, manually trigger:
curl -X GET \
  https://ever-reach-be.vercel.app/api/cron/sync-posthog \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check dashboard:
https://reports.everreach.app/health
```

### Test Activity Email

```bash
# Manually trigger:
curl -X GET \
  https://ever-reach-be.vercel.app/api/cron/dev-activity-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check your email (isaiahdupree33@gmail.com)
```

### Test Session Tracking

**From mobile app**:
```typescript
// On app start
await fetch('/api/v1/sessions/start', { method: 'POST' });

// On app close
await fetch('/api/v1/sessions/end', { 
  method: 'POST',
  body: JSON.stringify({ session_id })
});
```

---

## 📊 Expected Results

### After Fixes:

**Dashboard (https://reports.everreach.app/health)**:
- ✅ PostHog: UP (syncs every 15 min)
- ✅ All services show current status

**Daily Email (9 AM every day)**:
- ✅ Session metrics (time spent, active users)
- ✅ Event activity (actions taken)
- ✅ Top users by time AND by activity
- ✅ Currently active count

**Realtime Data** (if implemented):
- ✅ `/api/v1/analytics/realtime` shows live user count
- ✅ Dashboard shows realtime activity
- ✅ Know who's in the app RIGHT NOW

---

## 🎯 Priority Order

**1. FIX NOW** (5 minutes):
- ✅ Update vercel.json cron paths
- ✅ Deploy to Vercel
- ✅ Wait 15 minutes, check PostHog status

**2. TOMORROW MORNING** (check at 9 AM):
- ✅ Daily email should arrive
- ✅ Verify it has session data

**3. THIS WEEK** (when you have time):
- ✅ Enhance activity email with session tracking
- ✅ Add realtime endpoint
- ✅ Update Evidence dashboard

---

## 🔍 Troubleshooting

### PostHog still DOWN after fix?

1. Check env vars:
   - `POSTHOG_API_KEY` set?
   - `POSTHOG_PROJECT_ID` set?

2. Check cron logs in Vercel dashboard

3. Manually trigger sync endpoint

### Daily email not arriving?

1. Check `FROM_EMAIL` env var
2. Check Resend API key
3. Check spam folder
4. Manually trigger endpoint to test

### Session data not tracking?

1. Check if mobile app calls `/api/v1/sessions/start`
2. Verify `user_sessions` table has data:
   ```sql
   SELECT * FROM user_sessions 
   ORDER BY started_at DESC 
   LIMIT 10;
   ```

---

## ✅ Success Criteria

- [ ] PostHog shows UP in dashboard
- [ ] Daily email arrives at 9 AM with activity data
- [ ] Email includes session duration metrics
- [ ] Dashboard shows realtime user count
- [ ] Can see who's currently active in the app

---

**Next Action**: Fix vercel.json and deploy! 🚀
