# Waitlist & Funnel Tracking Implementation Guide

## Overview
This document outlines the changes needed to implement the waitlist signup flow with intent-qualifying questions and funnel tracking for EverReach.

**Target Branch**: `main` (backend deploys from main)

---

## Frontend Changes (app/)

### 1. Create `/app/waitlist.tsx`
Signup form with 3 intent-qualifying questions.

```tsx
// Key features:
// - 4-step flow: Pain → Network Size → Urgency → Email
// - Auto-advance on selection
// - High-intent detection based on answers
// - Meta Pixel Lead event on submit
// - Redirect to /thank-you (or /thank-you?qi=1 for high intent)
```

**Intent Qualifying Questions:**

| Question | Options | High Intent |
|----------|---------|-------------|
| Pain Point | Forget follow-up, Don't know who, Don't know what to say, Scattered contacts, Just curious | All except "Just curious" |
| Network Size | 0-50, 50-200, 200-1000, 1000+ | 200+ contacts |
| Urgency | This week, This month, Eventually | This week/month |

**High Intent Rule**: Real pain + 200+ contacts + urgency = high intent

### 2. Create `/app/thank-you.tsx`
Conversion page with tracking.

```tsx
// Key features:
// - Track CompleteRegistration event
// - If ?qi=1, also fire Lead event with value
// - "Get Warmth Score Playbook" CTA (ViewContent event)
// - Share button
```

### 3. Update `/app/landing.tsx`
Change hero CTA from `/auth` to `/waitlist`.

```tsx
// Line ~87: Change router.push('/auth') to router.push('/waitlist')
// Line ~89: Change "Start Free Trial →" to "Get Early Access →"
```

---

## Backend Changes (backend-vercel/)

### 1. Create `/app/api/v1/funnel/session/route.ts`

```typescript
// POST /api/v1/funnel/session
// - Creates/updates tracking session
// - Captures UTM params, fbp, fbc, IP, user agent
// - No auth required (public endpoint)

// GET /api/v1/funnel/session?session_id=xxx
// - Retrieves session details
```

### 2. Create `/app/api/v1/funnel/event/route.ts`

```typescript
// POST /api/v1/funnel/event
// - Stores funnel events (Lead, CompleteRegistration, etc.)
// - Links to session_id
// - Includes event properties as JSON
```

### 3. Create `/app/api/v1/funnel/waitlist/route.ts`

```typescript
// POST /api/v1/funnel/waitlist
// - Stores waitlist signup with all form data
// - Fields: email, pain_point, network_size, urgency, intent_score, is_high_intent
// - Links to session_id
```

**Important**: All routes need:
- `export const runtime = 'nodejs';`
- `export function OPTIONS(req) { return options(req); }` for CORS
- Import `{ options } from '@/lib/cors'`

---

## Database Migration

Create table in Supabase:

```sql
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  idea_id TEXT DEFAULT 'everreach_waitlist',
  funnel_id TEXT DEFAULT 'everreach_waitlist_v01',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbp TEXT,
  fbc TEXT,
  meta_ad_id TEXT,
  meta_adset_id TEXT,
  meta_campaign_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  landing_url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funnel events table
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(session_id),
  event_name TEXT NOT NULL,
  event_properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(session_id),
  email TEXT NOT NULL,
  pain_point TEXT,
  network_size TEXT,
  urgency TEXT,
  intent_score INTEGER DEFAULT 0,
  is_high_intent BOOLEAN DEFAULT FALSE,
  event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Client Library

### Create `/lib/funnelTracking.ts`

```typescript
// Functions:
// - initializeSession(options) - Create session on page load
// - trackFunnelEvent(eventName, properties) - Track events
// - storeWaitlistSignup(data) - Store signup
// - getSessionId() - Get current session ID

// Uses BACKEND_URL from environment
// Generates session_id using crypto.randomUUID()
// Stores session_id in localStorage
```

---

## Meta Pixel Updates

### Update `/lib/metaPixel.ts`

Add event deduplication support:

```typescript
// trackEvent now returns event_id for deduplication
// event_id is sent to both Pixel and CAPI
// Prevents double-counting when using both

export async function trackEvent(
  eventName: string,
  params?: {
    event_id?: string; // For deduplication
    // ... other params
  }
): Promise<string | null> {
  // Generate event_id if not provided
  const eventId = params?.event_id || crypto.randomUUID();
  
  // Send to Pixel with eventID
  fbq('track', eventName, { ...params, eventID: eventId });
  
  // Also send to CAPI with same event_id
  sendServerEvent(eventName, { event_id: eventId, ... });
  
  return eventId;
}
```

---

## Meta Ads Custom Conversions

Set up in Meta Business Suite → Events Manager → Custom Conversions:

| Conversion Name | URL Rule | Standard Event |
|-----------------|----------|----------------|
| `waitlist_complete` | URL contains `thank-you` | CompleteRegistration |
| `waitlist_high_intent` | URL contains `thank-you?qi=1` | Lead |

---

## Signup Flow URLs

| Step | URL |
|------|-----|
| Landing | `https://www.everreach.app/landing` |
| Waitlist Form | `https://www.everreach.app/waitlist` |
| Thank You (standard) | `https://www.everreach.app/thank-you` |
| Thank You (high intent) | `https://www.everreach.app/thank-you?qi=1` |

---

## Test Commands

After deployment:

```bash
# Test session creation
curl -X POST https://ever-reach-be.vercel.app/api/v1/funnel/session \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test123", "idea_id": "everreach_waitlist"}'

# Test event tracking
curl -X POST https://ever-reach-be.vercel.app/api/v1/funnel/event \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test123", "event_name": "Lead", "event_properties": {}}'

# Test waitlist signup
curl -X POST https://ever-reach-be.vercel.app/api/v1/funnel/waitlist \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test123", "email": "test@example.com", "pain_point": "forget_followup"}'
```

---

## Files to Create/Modify

### New Files
- `app/waitlist.tsx`
- `app/thank-you.tsx`
- `lib/funnelTracking.ts`
- `backend-vercel/app/api/v1/funnel/session/route.ts`
- `backend-vercel/app/api/v1/funnel/event/route.ts`
- `backend-vercel/app/api/v1/funnel/waitlist/route.ts`

### Modified Files
- `app/landing.tsx` (CTA button)
- `lib/metaPixel.ts` (deduplication support)

---

## Deployment Notes

1. Apply database migration first
2. Deploy backend (main branch) with funnel routes
3. Deploy frontend with waitlist/thank-you pages
4. Set up custom conversions in Meta
5. Test end-to-end flow
