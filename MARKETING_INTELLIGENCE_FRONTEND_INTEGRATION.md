# 📱 Marketing Intelligence - Frontend Integration Guide

**Date**: October 22, 2025  
**Target**: Mobile (React Native) + Web (Next.js)  
**Status**: Implementation Guide

---

## 🎯 Overview

This guide shows exactly which events to track and which API endpoints to integrate for the marketing intelligence system.

---

## 📊 Events to Track (22 Required Events)

### **A) Lifecycle & Identity** (5 events)

| Event | Properties | When | Platform |
|-------|-----------|------|----------|
| `app_open` | `launch_type: cold\|warm` | App launched | Mobile |
| `screen_view` | `screen: Home\|People\|Settings` | Navigation | Both |
| `signup_started` | `method: email\|google\|apple` | Signup flow begins | Both |
| `signup_completed` | `method: ...` | Account created | Both |
| `email_submitted` | `email_hash, source: landing\|quiz` | Email captured (lead) | Web |

### **B) Core CRM Actions** (8 events)

| Event | Properties | When | Platform |
|-------|-----------|------|----------|
| `contact_added` | `source: manual\|import, contact_id` | New contact | Both |
| `contact_import_completed` | `source: phonebook\|csv, imported_count` | Import finished | Both |
| `outreach_sent` | `contact_id, channel: sms\|email, template_id` | Message sent | Both |
| `reply_marked` | `contact_id, channel` | Reply received | Both |
| `followup_created` | `contact_id, due_in_days` | Follow-up scheduled | Both |
| `followup_completed` | `contact_id` | Follow-up done | Both |
| `warmth_updated` | `contact_id, warmth_score, warmth_band` | Warmth recalculated | Backend |
| `ha_moment_reached` | `contacts_count, outreach_count` | Activation milestone | Both |

### **C) Monetization** (6 events)

| Event | Properties | When | Platform |
|-------|-----------|------|----------|
| `paywall_view` | `context: threshold\|locked, plan_shown` | Paywall displayed | Both |
| `paywall_dismissed` | `plan_shown, time_viewed_sec` | Paywall closed | Both |
| `trial_started` | `plan: pro, term: monthly\|annual` | Trial activated | Both |
| `trial_completed` | `plan, converted: bool` | Trial ended | Backend |
| `purchase_completed` | `plan, term, price_cents` | Subscription purchased | Both |
| `purchase_canceled` | `reason: price\|value\|other` | Subscription canceled | Both |

### **C) Engagement & Reactivation** (3 events)

| Event | Properties | When | Platform |
|-------|-----------|------|----------|
| `push_permission_granted` | - | Push enabled | Mobile |
| `notif_opened` | `topic: contacts\|warmth\|followups` | Notification tapped | Mobile |
| `email_opened` | `campaign_id, template_id` | Marketing email opened | Backend |
| `email_clicked` | `campaign_id, link_url` | Email link clicked | Backend |

---

## 🔌 API Endpoints to Integrate (10 New Endpoints)

### **1. Marketing Enrichment** (2 endpoints)

#### **POST /api/v1/marketing/enrich**
Trigger enrichment after email capture

```typescript
// When: After signup_completed event
const response = await fetch(`${API_URL}/v1/marketing/enrich`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    email: user.email,
    user_id: user.id,
    trigger: 'email_submitted'
  })
});
// Returns: { success: true, status: 'processing' }
```

#### **GET /api/v1/marketing/enrich?user_id=X**
Check enrichment status

```typescript
// When: To check if enrichment completed
const response = await fetch(`${API_URL}/v1/marketing/enrich?user_id=${userId}`, {
  headers: authHeaders
});
// Returns: { status: 'completed', enriched_at: '...', cost_cents: 4 }
```

---

### **2. Persona Management** (2 endpoints)

#### **POST /api/v1/marketing/persona**
Manually assign persona (admin only)

```typescript
const response = await fetch(`${API_URL}/v1/marketing/persona`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    user_id: userId,
    persona_slug: 'automation_pro',
    confidence_score: 0.85,
    source: 'manual'
  })
});
```

#### **GET /api/v1/marketing/persona?user_id=X**
Get user's persona

```typescript
const response = await fetch(`${API_URL}/v1/marketing/persona?user_id=${userId}`, {
  headers: authHeaders
});
// Returns: { persona_bucket_id, slug, label, confidence_score }
```

---

### **3. Magnetism Tracking** (2 endpoints)

#### **GET /api/v1/marketing/magnetism/:userId?window=7d**
Get magnetism score

```typescript
const response = await fetch(`${API_URL}/v1/marketing/magnetism/${userId}?window=7d`, {
  headers: authHeaders
});
// Returns: { index: 67, band: 'warm', risk_level: 'good', recommendations: [...] }
```

#### **POST /api/v1/marketing/magnetism/:userId**
Force recalculation

```typescript
const response = await fetch(`${API_URL}/v1/marketing/magnetism/${userId}`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ window: '7d' })
});
```

---

### **4. Attribution Analysis** (1 endpoint)

#### **GET /api/v1/marketing/attribution/:userId**
Get complete user journey

```typescript
const response = await fetch(`${API_URL}/v1/marketing/attribution/${userId}`, {
  headers: authHeaders
});
// Returns complete journey with timings, attribution, intent scores
```

---

### **5. Dashboard Data** (3 endpoints)

These may already exist or need enhancement:

#### **GET /api/v1/analytics/funnel?days=30**
Daily funnel metrics

```typescript
const response = await fetch(`${API_URL}/v1/analytics/funnel?days=30`, {
  headers: authHeaders
});
// Returns: Daily signups → trials → purchases
```

#### **GET /api/v1/analytics/personas**
Persona distribution

```typescript
const response = await fetch(`${API_URL}/v1/analytics/personas`, {
  headers: authHeaders
});
// Returns: Persona counts, conversion rates
```

#### **GET /api/v1/analytics/magnetism-summary**
Magnetism distribution

```typescript
const response = await fetch(`${API_URL}/v1/analytics/magnetism-summary`, {
  headers: authHeaders
});
// Returns: Count by band (cold/cooling/warm/hot)
```

---

## 📱 Mobile App Integration (React Native)

### **Step 1: Update Event Tracking**

**File**: `services/analytics.ts`

```typescript
// Add new marketing events
export const trackEmailSubmitted = (email: string, source: string) => {
  PostHog.capture('email_submitted', {
    email_hash: hashEmail(email),
    source,
    platform: Platform.OS
  });
};

export const trackHaMomentReached = (contacts: number, outreach: number) => {
  PostHog.capture('ha_moment_reached', {
    contacts_count: contacts,
    outreach_count: outreach
  });
};

export const trackPaywallView = (context: string, planShown: string) => {
  PostHog.capture('paywall_view', {
    context,
    plan_shown: planShown,
    screen: getCurrentScreen()
  });
};

export const trackTrialStarted = (plan: string, term: string) => {
  PostHog.capture('trial_started', {
    plan,
    term
  });
};

export const trackPurchaseCompleted = (plan: string, term: string, priceCents: number) => {
  PostHog.capture('purchase_completed', {
    plan,
    term,
    price_cents: priceCents
  });
};
```

### **Step 2: Add API Hooks**

**File**: `hooks/useMarketing.ts`

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export const useEnrichment = (userId: string) => {
  return useQuery({
    queryKey: ['enrichment', userId],
    queryFn: async () => {
      const res = await apiFetch(`/v1/marketing/enrich?user_id=${userId}`);
      return res.json();
    }
  });
};

export const useTriggerEnrichment = () => {
  return useMutation({
    mutationFn: async ({ email, userId }: { email: string; userId: string }) => {
      const res = await apiFetch('/v1/marketing/enrich', {
        method: 'POST',
        body: JSON.stringify({ email, user_id: userId, trigger: 'manual' })
      });
      return res.json();
    }
  });
};

export const useMagnetism = (userId: string, window: '7d' | '30d' = '7d') => {
  return useQuery({
    queryKey: ['magnetism', userId, window],
    queryFn: async () => {
      const res = await apiFetch(`/v1/marketing/magnetism/${userId}?window=${window}`);
      return res.json();
    }
  });
};

export const usePersona = (userId: string) => {
  return useQuery({
    queryKey: ['persona', userId],
    queryFn: async () => {
      const res = await apiFetch(`/v1/marketing/persona?user_id=${userId}`);
      return res.json();
    }
  });
};
```

### **Step 3: Trigger Events at Key Moments**

**Signup Flow** (`app/auth/signup.tsx`):
```typescript
const handleSignup = async (email: string) => {
  // Track signup started
  trackEvent('signup_started', { method: 'email' });
  
  // Create account
  const user = await signUp(email);
  
  // Track signup completed
  trackEvent('signup_completed', { method: 'email' });
  
  // Trigger enrichment
  await triggerEnrichment({ email, userId: user.id });
};
```

**Activation Tracking** (`app/(tabs)/people.tsx`):
```typescript
useEffect(() => {
  // Check activation milestone
  if (contacts.length >= 10 && totalOutreach >= 5 && !hasReachedHaMoment) {
    trackHaMomentReached(contacts.length, totalOutreach);
    setHasReachedHaMoment(true);
  }
}, [contacts.length, totalOutreach]);
```

**Paywall Display** (`app/plans.tsx`):
```typescript
useEffect(() => {
  trackPaywallView('threshold_hit', 'pro_monthly');
}, []);

const handleSubscribe = async (plan: string) => {
  trackTrialStarted(plan, 'monthly');
  // Process subscription
};
```

---

## 🌐 Web App Integration (Next.js)

### **Step 1: Add Event Tracking**

**File**: `lib/analytics.ts`

```typescript
import posthog from 'posthog-js';

export const trackEmailSubmitted = (email: string, source: string) => {
  posthog.capture('email_submitted', {
    email_hash: hashEmail(email),
    source
  });
};

// ... same events as mobile
```

### **Step 2: Landing Page Integration**

**File**: `app/(marketing)/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { trackEmailSubmitted } from '@/lib/analytics';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track event
    trackEmailSubmitted(email, 'landing_hero');
    
    // Trigger enrichment
    const res = await fetch('/api/v1/marketing/enrich', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        user_id: 'lead_' + Date.now(),
        trigger: 'email_submitted' 
      })
    });
    
    // Show thank you message
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button type="submit">Get Started</button>
    </form>
  );
}
```

### **Step 3: Marketing Dashboard**

**File**: `app/(app)/marketing/dashboard.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export default function MarketingDashboard() {
  const { data: funnel } = useQuery({
    queryKey: ['funnel'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/funnel?days=30');
      return res.json();
    }
  });
  
  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/personas');
      return res.json();
    }
  });
  
  const { data: magnetism } = useQuery({
    queryKey: ['magnetism-summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/magnetism-summary');
      return res.json();
    }
  });
  
  return (
    <div>
      <FunnelChart data={funnel} />
      <PersonaDistribution data={personas} />
      <MagnetismBands data={magnetism} />
    </div>
  );
}
```

---

## ✅ Implementation Checklist

### **Phase 1: Event Tracking** (Week 1)

**Mobile App**:
- [ ] Add 22 marketing events to `services/analytics.ts`
- [ ] Track `email_submitted` (if applicable)
- [ ] Track `signup_started` / `signup_completed`
- [ ] Track `contact_added` / `outreach_sent`
- [ ] Track `ha_moment_reached` (activation)
- [ ] Track `paywall_view` / `trial_started` / `purchase_completed`
- [ ] Track `notif_opened`
- [ ] Verify events in PostHog Live Events

**Web App**:
- [ ] Add marketing events to `lib/analytics.ts`
- [ ] Track `email_submitted` on landing page
- [ ] Track signup flow
- [ ] Track paywall events
- [ ] Verify events in PostHog

---

### **Phase 2: API Integration** (Week 2)

**Mobile App**:
- [ ] Create `hooks/useMarketing.ts`
- [ ] Add `useEnrichment()` hook
- [ ] Add `useMagnetism()` hook
- [ ] Add `usePersona()` hook
- [ ] Add `useAttribution()` hook
- [ ] Call enrichment after signup
- [ ] Display magnetism score in settings
- [ ] Show persona badge on profile

**Web App**:
- [ ] Create API hooks for marketing endpoints
- [ ] Build marketing dashboard page
- [ ] Display funnel metrics
- [ ] Display persona distribution
- [ ] Display magnetism summary
- [ ] Add user journey view (attribution)

---

### **Phase 3: UI Components** (Week 3)

**Mobile Components**:
- [ ] `PersonaBadge.tsx` - Show user's persona
- [ ] `MagnetismScore.tsx` - Display magnetism with color coding
- [ ] `ActivationProgress.tsx` - Progress to "Aha moment"
- [ ] `EnrichmentStatus.tsx` - Show enrichment progress

**Web Components**:
- [ ] `FunnelChart.tsx` - Conversion funnel visualization
- [ ] `PersonaDistribution.tsx` - Persona pie chart
- [ ] `MagnetismBands.tsx` - Band distribution bar chart
- [ ] `UserJourneyTimeline.tsx` - Attribution timeline

---

### **Phase 4: Testing** (Week 4)

- [ ] Test enrichment flow end-to-end
- [ ] Verify all 22 events firing correctly
- [ ] Check PostHog → Supabase mirroring
- [ ] Verify persona assignment
- [ ] Check magnetism calculation
- [ ] Test attribution tracking
- [ ] Load test with 1000+ test users
- [ ] Verify cron jobs running

---

## 📊 Event Tracking Verification

### **PostHog Live Events Check**

After implementing, verify these events appear:

```bash
# Go to PostHog → Live Events
# Filter by last 1 hour
# Should see:

✅ app_open
✅ screen_view
✅ signup_completed
✅ contact_added
✅ outreach_sent
✅ ha_moment_reached
✅ paywall_view
✅ trial_started
✅ purchase_completed
```

### **Supabase Verification**

```sql
-- Check events mirrored to Supabase
SELECT event_name, COUNT(*) as count
FROM analytics_events
WHERE ingest_time > NOW() - INTERVAL '1 hour'
GROUP BY event_name
ORDER BY count DESC;

-- Check user_event table
SELECT etype, COUNT(*) as count
FROM user_event
WHERE occurred_at > NOW() - INTERVAL '1 hour'
GROUP BY etype
ORDER BY count DESC;
```

---

## 🎯 Success Criteria

After full implementation:

✅ **Events**: All 22 events tracked and appearing in PostHog  
✅ **Mirroring**: Events flowing to Supabase within 1 minute  
✅ **Enrichment**: New signups enriched within 5 minutes  
✅ **Personas**: Users assigned to persona buckets  
✅ **Magnetism**: Scores calculated and displayed  
✅ **Attribution**: Complete journey visible for users  
✅ **Dashboards**: Marketing metrics visible in admin dashboard  
✅ **Mobile UI**: Persona badge and magnetism score displayed  
✅ **Web Dashboard**: Funnel, personas, magnetism charts live  

---

## 📚 Related Documentation

- **EVENT_TAXONOMY_COMPLETE.md** - Full 100+ event catalog
- **ANALYTICS_BEST_PRACTICES.md** - Event tracking best practices
- **MARKETING_INTELLIGENCE_BACKEND_DEPLOYMENT.md** - Backend setup
- **MARKETING_INTELLIGENCE_IMPLEMENTATION_PLAN.md** - 12-week roadmap

---

**Ready to integrate marketing intelligence into your frontend!** 🚀
