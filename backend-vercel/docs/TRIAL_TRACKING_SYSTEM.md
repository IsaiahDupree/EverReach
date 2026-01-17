# Trial Tracking & Session System

**Comprehensive trial tracking with session capture and unified entitlement logic**

**Date**: November 7, 2025  
**Status**: ✅ Ready for Deployment

---

## 📋 Overview

This system provides a **single source of truth** for:
- Trial window tracking (start, end, days used/left)
- Session capture (start/end with duration)
- Usage analytics (total + during trial)
- Entitlement determination (active, trial, grace, none)
- Subscription tracking across platforms (Stripe, App Store, Play)

**Key Benefit**: Frontend only needs `/v1/me/trial-stats` to know exactly what to show (paywall, countdown, hard-stop).

---

## 🎯 What the Frontend Gets

### Single Payload from `/v1/me/trial-stats`

```typescript
{
  "entitled": true,
  "entitlement_reason": "active",     // active | trial | grace | none
  "subscription_date": "2025-11-01T12:34:56Z",
  "trial": {
    "origin": "stripe",               // stripe | app_store | play | manual
    "started_at": "2025-11-01T12:34:56Z",
    "ends_at": "2025-11-08T12:34:56Z",
    "days_total": 7,
    "days_used": 3,
    "days_left": 4,
    "usage_seconds_total": 12450,     // all time
    "usage_seconds_during_trial": 8450
  },
  "period": {
    "current_period_end": "2025-12-01T12:34:56Z",
    "cancel_at_period_end": false,
    "grace_ends_at": null
  },
  "activity": {
    "first_seen_at": "2025-11-01T12:35:30Z",
    "last_active_at": "2025-11-07T15:10:12Z",
    "sessions_count": 22
  }
}
```

---

## 🗄️ Database Schema

### New Tables & Columns

**1. `user_sessions` (new table)**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT GENERATED -- auto-computed
);
```

**2. `user_subscriptions` (augmented)**
```sql
ALTER TABLE user_subscriptions ADD COLUMN
  origin TEXT,                  -- 'stripe' | 'app_store' | 'play' | 'manual'
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,    -- canonical "member since"
  cancel_at_period_end BOOLEAN;
```

**3. `profiles` (augmented)**
```sql
ALTER TABLE profiles ADD COLUMN
  first_seen_at TIMESTAMPTZ,    -- first app launch
  last_active_at TIMESTAMPTZ;   -- most recent activity
```

---

## 📡 API Endpoints

### Session Tracking

**POST /api/v1/sessions/start**

Start a new session (call on app launch/login)

```typescript
// Request
POST /api/v1/sessions/start
Authorization: Bearer {token}

// Response
{
  "session_id": "uuid",
  "started_at": "2025-11-07T15:00:00Z"
}
```

**POST /api/v1/sessions/end**

End a session (call on app background/logout)

```typescript
// Request
POST /api/v1/sessions/end
Authorization: Bearer {token}
Content-Type: application/json

{
  "session_id": "uuid-from-start"
}

// Response
{
  "ok": true
}
```

### Profile with Subscription

**GET /api/v1/me** (updated)

Now includes subscription info:

```typescript
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "...",
    "bio": "...",
    "preferences": {},
    "first_seen_at": "2025-11-01T12:00:00Z",
    "last_active_at": "2025-11-07T15:00:00Z"
  },
  "subscription": {
    "subscription_date": "2025-11-01T12:34:56Z",  // NEW!
    "status": "active",
    "current_period_end": "2025-12-01T00:00:00Z",
    "origin": "stripe",
    "trial_started_at": null,
    "trial_ends_at": null
  },
  "org": null,
  "billing": { ... }
}
```

### Trial Statistics

**GET /api/v1/me/trial-stats** (completely rewritten)

Returns comprehensive trial data (see payload above).

---

## 🔌 Client Instrumentation

### React/Next.js Example

```typescript
// Start session on mount
useEffect(() => {
  let sessionId: string;

  const startSession = async () => {
    const res = await fetch('/api/v1/sessions/start', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    sessionId = data.session_id;
  };

  startSession();

  // End session on page unload
  const endSession = () => {
    if (sessionId) {
      navigator.sendBeacon(
        '/api/v1/sessions/end',
        JSON.stringify({ session_id: sessionId })
      );
    }
  };

  window.addEventListener('beforeunload', endSession);
  
  return () => {
    endSession();
    window.removeEventListener('beforeunload', endSession);
  };
}, [token]);
```

### React Native Example

```typescript
import { AppState } from 'react-native';

// Start session on app open
const startSession = async () => {
  const res = await fetch(`${API_URL}/api/v1/sessions/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.session_id;
};

// End session on app background
const appStateListener = AppState.addEventListener('change', async (state) => {
  if (state === 'background' && currentSessionId) {
    await fetch(`${API_URL}/api/v1/sessions/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: currentSessionId })
    });
  } else if (state === 'active') {
    currentSessionId = await startSession();
  }
});
```

---

## 🎨 Frontend Entitlement Gating

### Simple Gate Function

```typescript
import type { TrialStats } from '@/types';

interface EntitlementGate {
  allow: boolean;
  showPaywall: boolean;
  banner?: string;
  hardStopAt?: string | null;
}

export function resolveEntitlement(stats: TrialStats): EntitlementGate {
  // Active paid subscriber
  if (stats.entitled && stats.entitlement_reason === 'active') {
    return { allow: true, showPaywall: false };
  }

  // In trial
  if (stats.entitled && stats.entitlement_reason === 'trial') {
    return {
      allow: true,
      showPaywall: false,
      banner: `Trial: ${stats.trial.days_left} day(s) left`,
      hardStopAt: stats.trial.ends_at
    };
  }

  // Grace period
  if (stats.entitled && stats.entitlement_reason === 'grace') {
    return {
      allow: true,
      showPaywall: true,
      banner: 'Grace period active'
    };
  }

  // No entitlement
  return { allow: false, showPaywall: true };
}
```

### React Component Example

```typescript
'use client';

import useSWR from 'swr';
import { resolveEntitlement } from '@/lib/entitlement';

export function AppGate({ children }: { children: React.ReactNode }) {
  const { data: stats, error } = useSWR('/api/v1/me/trial-stats', fetcher);

  if (error) return <ErrorPage />;
  if (!stats) return <LoadingSpinner />;

  const gate = resolveEntitlement(stats);

  if (!gate.allow) {
    return <Paywall stats={stats} />;
  }

  return (
    <>
      {gate.banner && <TrialBanner message={gate.banner} />}
      {children}
    </>
  );
}
```

---

## 🔧 Helper Functions

### Usage Calculation

**`usage_seconds_between(user_id, from_ts, to_ts)`**

Calculate total usage seconds within a time window:

```sql
SELECT usage_seconds_between(
  'user-uuid',
  '2025-11-01T00:00:00Z',
  '2025-11-08T00:00:00Z'
); -- Returns integer seconds
```

### Session Management

**`end_session_secure(session_id, user_id)`**

Safely end a session (idempotent, user-scoped):

```sql
SELECT end_session_secure('session-uuid', 'user-uuid');
```

### Session Counts

**`get_total_sessions_count(user_id)`**  
**`get_active_sessions_count(user_id)`**

```sql
SELECT get_total_sessions_count('user-uuid');
SELECT get_active_sessions_count('user-uuid');
```

---

## 🔗 Webhook Unification

### Stripe Example

All providers write to the same columns:

```typescript
// POST /api/webhooks/stripe
export async function POST(req: Request) {
  const event = verifyStripe(req);
  
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      
      await supabase.from('user_subscriptions').upsert({
        user_id: lookupUser(sub.customer),
        origin: 'stripe',
        status: sub.status,
        subscribed_at: new Date(sub.start_date * 1000).toISOString(),
        trial_started_at: sub.trial_start 
          ? new Date(sub.trial_start * 1000).toISOString() 
          : null,
        trial_ends_at: sub.trial_end 
          ? new Date(sub.trial_end * 1000).toISOString() 
          : null,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: !!sub.cancel_at_period_end
      }, { onConflict: 'user_id' });
      break;
    }
  }
  
  return new Response('ok');
}
```

### App Store / Play

Same fields, different webhook format:

```typescript
// POST /api/webhooks/app-store
// POST /api/webhooks/play

// Map to common fields then upsert to user_subscriptions
await supabase.from('user_subscriptions').upsert({
  user_id: userId,
  origin: 'app_store', // or 'play'
  status: normalizedStatus,
  subscribed_at: purchaseDate,
  trial_started_at: trialStart,
  trial_ends_at: trialEnd,
  current_period_end: expiresDate,
  cancel_at_period_end: willAutoRenew === false
});
```

---

## 🚀 Deployment Steps

### 1. Apply Migration

```bash
# Copy contents of migrations/trial_tracking_system.sql
# Paste into Supabase SQL Editor and execute
```

### 2. Deploy Backend Code

Already included in current deployment:
- ✅ `lib/trial-stats.ts` - Core logic
- ✅ `app/api/v1/sessions/start/route.ts` - Start session
- ✅ `app/api/v1/sessions/end/route.ts` - End session
- ✅ `app/api/v1/me/route.ts` - Updated with subscription_date
- ✅ `app/api/v1/me/trial-stats/route.ts` - Comprehensive stats

### 3. Update Webhooks

Update Stripe/App Store/Play webhooks to populate new fields:
- `origin`
- `trial_started_at`
- `trial_ends_at`
- `subscribed_at`
- `cancel_at_period_end`

### 4. Instrument Clients

Add session start/end calls to web and mobile apps (see examples above).

---

## 🧪 Testing

### Test Session Tracking

```bash
# Start session
curl -X POST http://localhost:3000/api/v1/sessions/start \
  -H "Authorization: Bearer $TOKEN"

# Response: {"session_id":"uuid","started_at":"..."}

# End session
curl -X POST http://localhost:3000/api/v1/sessions/end \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"uuid-from-start"}'
```

### Test Trial Stats

```bash
# Get comprehensive stats
curl http://localhost:3000/api/v1/me/trial-stats \
  -H "Authorization: Bearer $TOKEN" | jq

# Should return entitled, trial window, usage, activity
```

### Test Subscription Date in /v1/me

```bash
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer $TOKEN" | jq '.subscription.subscription_date'
```

---

## 📊 Database Queries

### Check Sessions for User

```sql
SELECT 
  id, 
  started_at, 
  ended_at, 
  duration_seconds
FROM user_sessions
WHERE user_id = 'user-uuid'
ORDER BY started_at DESC
LIMIT 10;
```

### Check Trial Window

```sql
SELECT 
  origin,
  trial_started_at,
  trial_ends_at,
  subscribed_at,
  status
FROM user_subscriptions
WHERE user_id = 'user-uuid';
```

### Calculate Usage During Trial

```sql
SELECT usage_seconds_between(
  'user-uuid',
  (SELECT trial_started_at FROM user_subscriptions WHERE user_id = 'user-uuid'),
  (SELECT trial_ends_at FROM user_subscriptions WHERE user_id = 'user-uuid')
) as trial_usage_seconds;
```

---

## 💡 Key Design Decisions

**1. Why Sessions?**
- Accurate usage tracking (not just page views)
- Trial limits based on actual time spent
- Better analytics for feature usage

**2. Why Single Source of Truth?**
- No frontend logic duplication
- Consistent entitlement across platforms
- Easier to test and debug

**3. Why Idempotent End Session?**
- Network failures won't break tracking
- Safe to call multiple times (page unload, app background)
- User-scoped for security

**4. Why Separate `subscribed_at` from `created_at`?**
- `created_at` = when DB record created
- `subscribed_at` = canonical "member since" date
- Handles backfills and data migrations correctly

---

## 🔒 Security Considerations

- ✅ RLS policies on `user_sessions` (user can only see own)
- ✅ `end_session_secure` RPC enforces user ownership
- ✅ Service role can manage all sessions (for cron/admin)
- ✅ Session IDs are UUIDs (not guessable)
- ✅ Trial stats computed server-side (client can't manipulate)

---

## 📈 Future Enhancements

**Heartbeat Endpoint** (optional)
```typescript
// POST /api/v1/sessions/heartbeat
// Call every 60s to track long sessions more accurately
```

**Grace Period Logic**
```typescript
// Compute grace_ends_at
// Allow X days after trial_ends_at before hard-stop
```

**Usage Limits**
```typescript
// Enforce max hours during trial
if (stats.trial.usage_seconds_during_trial > MAX_TRIAL_HOURS * 3600) {
  return <TrialExhausted />;
}
```

---

## 📚 Related Documentation

- [User Bio Feature](./USER_BIO_FEATURE.md)
- [RevenueCat Integration](../../REVENUECAT_INTEGRATION_SUMMARY.md)
- [Stripe Billing](../../STRIPE_TESTS_100_PERCENT.md)
- [API Quick Reference](../../API_QUICK_REFERENCE.md)

---

**Last Updated**: November 7, 2025  
**Status**: ✅ Production Ready
