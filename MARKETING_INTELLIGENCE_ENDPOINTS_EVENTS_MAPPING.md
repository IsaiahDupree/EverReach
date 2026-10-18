# 📋 Marketing Intelligence - Complete Endpoints & Events Mapping

**Date**: October 22, 2025  
**Purpose**: Master reference for all backend endpoints and frontend events  
**Status**: Implementation ready

---

## 🎯 Quick Summary

**Total Backend Endpoints**: 10 new + 3 analytics  
**Total Frontend Events**: 22 required  
**Integration Points**: Mobile (7) + Web (6)  

---

## 🔌 Backend Endpoints (13 Total)

### **Marketing Intelligence** (10 endpoints)

| # | Endpoint | Method | Purpose | Status |
|---|----------|--------|---------|--------|
| 1 | `/api/v1/marketing/enrich` | POST | Trigger enrichment | ✅ Built |
| 2 | `/api/v1/marketing/enrich?user_id=X` | GET | Check status | ✅ Built |
| 3 | `/api/v1/marketing/persona` | POST | Assign persona | ✅ Built |
| 4 | `/api/v1/marketing/persona?user_id=X` | GET | Get persona | ✅ Built |
| 5 | `/api/v1/marketing/magnetism/:userId` | GET | Get magnetism | ✅ Built |
| 6 | `/api/v1/marketing/magnetism/:userId` | POST | Recalculate | ✅ Built |
| 7 | `/api/v1/marketing/attribution/:userId` | GET | Get journey | ✅ Built |
| 8 | `/api/webhooks/posthog-events` | POST | Event mirror | ✅ Built |
| 9 | `/api/cron/refresh-marketing-views` | GET | Refresh MVs | ✅ Built |
| 10 | `/api/cron/process-enrichment-queue` | GET | Process queue | ✅ Built |

### **Analytics Dashboards** (3 endpoints - TO BUILD)

| # | Endpoint | Method | Purpose | Status |
|---|----------|--------|---------|--------|
| 11 | `/api/v1/analytics/funnel?days=30` | GET | Daily funnel | ⏳ Need |
| 12 | `/api/v1/analytics/personas` | GET | Persona stats | ⏳ Need |
| 13 | `/api/v1/analytics/magnetism-summary` | GET | Magnetism bands | ⏳ Need |

---

## 📊 Frontend Events (22 Required)

### **Lifecycle & Identity** (5 events) ✅ Likely Exist

| Event | Properties | Platform | PostHog? |
|-------|-----------|----------|----------|
| `app_open` | `launch_type` | Mobile | ✅ |
| `screen_view` | `screen` | Both | ✅ |
| `signup_started` | `method` | Both | ✅ |
| `signup_completed` | `method` | Both | ✅ |
| `email_submitted` | `email_hash, source` | Web | ⏳ Add |

### **CRM Actions** (8 events) ✅ Likely Exist

| Event | Properties | Platform | PostHog? |
|-------|-----------|----------|----------|
| `contact_added` | `source, contact_id` | Both | ✅ |
| `contact_import_completed` | `source, imported_count` | Both | ✅ |
| `outreach_sent` | `contact_id, channel, template_id` | Both | ✅ |
| `reply_marked` | `contact_id, channel` | Both | ⏳ Add |
| `followup_created` | `contact_id, due_in_days` | Both | ⏳ Add |
| `followup_completed` | `contact_id` | Both | ⏳ Add |
| `warmth_updated` | `contact_id, warmth_score` | Backend | ✅ |
| `ha_moment_reached` | `contacts_count, outreach_count` | Both | ⏳ Add |

### **Monetization** (6 events) ✅ Likely Exist

| Event | Properties | Platform | PostHog? |
|-------|-----------|----------|----------|
| `paywall_view` | `context, plan_shown` | Both | ✅ |
| `paywall_dismissed` | `plan_shown, time_viewed_sec` | Both | ⏳ Add |
| `trial_started` | `plan, term` | Both | ✅ |
| `trial_completed` | `plan, converted` | Backend | ⏳ Add |
| `purchase_completed` | `plan, term, price_cents` | Both | ✅ |
| `purchase_canceled` | `reason` | Both | ⏳ Add |

### **Engagement** (3 events) ⏳ Need to Add

| Event | Properties | Platform | PostHog? |
|-------|-----------|----------|----------|
| `push_permission_granted` | - | Mobile | ✅ |
| `notif_opened` | `topic` | Mobile | ✅ |
| `email_opened` | `campaign_id, template_id` | Backend | ⏳ Add |

---

## 🔄 Data Flow Mapping

### **Flow 1: User Signup → Enrichment**

```
Frontend (Mobile/Web)
  ↓ Track: signup_completed
PostHog
  ↓ Webhook
Backend: /api/webhooks/posthog-events
  ↓ Insert into user_event
Frontend: Call /api/v1/marketing/enrich
  ↓ Create user_identity (status=pending)
Cron: /api/cron/process-enrichment-queue (5 min)
  ↓ RapidAPI + Perplexity + OpenAI
Backend: Update user_identity (status=completed)
  ↓ Assign persona
Backend: Insert into user_persona
```

### **Flow 2: Event Tracking → Magnetism**

```
Frontend
  ↓ Track: app_open, outreach_sent, etc.
PostHog
  ↓ Webhook
Backend: /api/webhooks/posthog-events
  ↓ Insert into analytics_events + user_event
Cron: /api/cron/refresh-marketing-views (hourly)
  ↓ Refresh mv_user_magnetism_7d
Frontend: Call /api/v1/marketing/magnetism/:userId
  ↓ Calculate from events + intent + engagement
Backend: Return magnetism score
```

### **Flow 3: Journey Tracking → Attribution**

```
User Journey:
  ad_click → landing_view → email_submitted
    → signup_completed → trial_started → purchase_completed

Each Event:
  ↓ PostHog → Backend webhook
  ↓ Insert into user_event
  
Frontend: Call /api/v1/marketing/attribution/:userId
  ↓ Query all user_event records
  ↓ Calculate timings and attribution
Backend: Return complete journey
```

---

## 📱 Mobile Integration Points (7)

### **1. Signup Flow** (`app/auth/signup.tsx`)

**Events**:
- ✅ `signup_started` (existing)
- ✅ `signup_completed` (existing)

**API Calls**:
- ⏳ POST `/api/v1/marketing/enrich` (after signup)

```typescript
const handleSignup = async (email: string) => {
  trackEvent('signup_started', { method: 'email' });
  const user = await signUp(email);
  trackEvent('signup_completed', { method: 'email' });
  
  // NEW: Trigger enrichment
  await fetch(`${API_URL}/v1/marketing/enrich`, {
    method: 'POST',
    body: JSON.stringify({ email, user_id: user.id, trigger: 'email_submitted' })
  });
};
```

---

### **2. Contact Actions** (`app/(tabs)/people.tsx`, `app/contact/[id].tsx`)

**Events**:
- ✅ `contact_added` (existing)
- ⏳ `followup_created` (add)
- ⏳ `followup_completed` (add)

---

### **3. Messaging** (`app/message-results.tsx`)

**Events**:
- ✅ `outreach_sent` (existing)
- ⏳ `reply_marked` (add)

---

### **4. Activation Milestone** (`app/(tabs)/index.tsx` - Dashboard)

**Events**:
- ⏳ `ha_moment_reached` (add when 10 contacts + 5 outreach)

```typescript
useEffect(() => {
  if (contacts.length >= 10 && totalOutreach >= 5 && !hasReachedHaMoment) {
    trackEvent('ha_moment_reached', {
      contacts_count: contacts.length,
      outreach_count: totalOutreach
    });
    setHasReachedHaMoment(true);
  }
}, [contacts.length, totalOutreach]);
```

---

### **5. Paywall** (`app/plans.tsx`)

**Events**:
- ✅ `paywall_view` (existing)
- ⏳ `paywall_dismissed` (add)
- ✅ `trial_started` (existing)
- ✅ `purchase_completed` (existing)

---

### **6. Settings/Profile** (`app/settings.tsx`)

**API Calls**:
- ⏳ GET `/api/v1/marketing/persona?user_id=X` (display persona badge)
- ⏳ GET `/api/v1/marketing/magnetism/:userId` (display score)

```typescript
// NEW: Display persona & magnetism
const PersonaSection = () => {
  const { data: persona } = usePersona(userId);
  const { data: magnetism } = useMagnetism(userId);
  
  return (
    <View>
      <Text>Your Persona: {persona?.label}</Text>
      <Text>Magnetism: {magnetism?.index}/100 ({magnetism?.band})</Text>
    </View>
  );
};
```

---

### **7. Notifications** (`app/alerts.tsx`)

**Events**:
- ✅ `push_permission_granted` (existing)
- ✅ `notif_opened` (existing)

---

## 🌐 Web Integration Points (6)

### **1. Landing Page** (`app/(marketing)/page.tsx`)

**Events**:
- ⏳ `email_submitted` (add for lead capture)

**API Calls**:
- ⏳ POST `/api/v1/marketing/enrich` (after email capture)

```typescript
const handleEmailSubmit = async (email: string) => {
  trackEvent('email_submitted', { email_hash: hashEmail(email), source: 'landing_hero' });
  
  await fetch('/api/v1/marketing/enrich', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      user_id: `lead_${Date.now()}`,
      trigger: 'email_submitted' 
    })
  });
};
```

---

### **2. Signup Flow** (`app/(auth)/signup/page.tsx`)

**Events**:
- ✅ `signup_started` (existing)
- ✅ `signup_completed` (existing)

**API Calls**:
- ⏳ POST `/api/v1/marketing/enrich` (after signup)

---

### **3. Marketing Dashboard** (`app/(app)/marketing/dashboard.tsx`)

**NEW PAGE TO BUILD**

**API Calls**:
- ⏳ GET `/api/v1/analytics/funnel?days=30`
- ⏳ GET `/api/v1/analytics/personas`
- ⏳ GET `/api/v1/analytics/magnetism-summary`

```typescript
const MarketingDashboard = () => {
  const { data: funnel } = useQuery(['funnel'], async () => {
    const res = await fetch('/api/v1/analytics/funnel?days=30');
    return res.json();
  });
  
  return (
    <div>
      <FunnelChart data={funnel} />
      <PersonaDistribution data={personas} />
      <MagnetismBands data={magnetism} />
    </div>
  );
};
```

---

### **4. User Profile/Settings** (`app/(app)/settings/page.tsx`)

**API Calls**:
- ⏳ GET `/api/v1/marketing/persona?user_id=X`
- ⏳ GET `/api/v1/marketing/magnetism/:userId`

---

### **5. User Detail (Admin)** (`app/(app)/admin/users/[id]/page.tsx`)

**NEW PAGE TO BUILD**

**API Calls**:
- ⏳ GET `/api/v1/marketing/attribution/:userId` (complete journey)
- ⏳ POST `/api/v1/marketing/persona` (manual assignment)

```typescript
const UserDetailAdmin = ({ userId }: { userId: string }) => {
  const { data: attribution } = useQuery(['attribution', userId], async () => {
    const res = await fetch(`/api/v1/marketing/attribution/${userId}`);
    return res.json();
  });
  
  return (
    <div>
      <UserJourneyTimeline journey={attribution?.journey} />
      <AttributionBreakdown attribution={attribution?.attribution} />
    </div>
  );
};
```

---

### **6. Subscription Management** (`app/(app)/billing/page.tsx`)

**Events**:
- ✅ `paywall_view` (existing)
- ✅ `trial_started` (existing)
- ✅ `purchase_completed` (existing)
- ⏳ `purchase_canceled` (add)

---

## 🛠️ Missing Endpoints to Build (3)

### **1. Funnel Analytics**

**File**: `backend-vercel/app/api/v1/analytics/funnel/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') || '30';
  
  const { data } = await supabase
    .from('mv_daily_funnel')
    .select('*')
    .gte('event_date', `NOW() - INTERVAL '${days} days'`)
    .order('event_date', { ascending: false });
  
  return NextResponse.json(data);
}
```

---

### **2. Persona Analytics**

**File**: `backend-vercel/app/api/v1/analytics/personas/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { data } = await supabase
    .from('mv_persona_performance')
    .select('*')
    .order('user_count', { ascending: false });
  
  return NextResponse.json(data);
}
```

---

### **3. Magnetism Summary**

**File**: `backend-vercel/app/api/v1/analytics/magnetism-summary/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { data } = await supabase.rpc('get_magnetism_distribution');
  
  return NextResponse.json({
    cold: data.filter(d => d.band === 'cold')[0]?.count || 0,
    cooling: data.filter(d => d.band === 'cooling')[0]?.count || 0,
    warm: data.filter(d => d.band === 'warm')[0]?.count || 0,
    hot: data.filter(d => d.band === 'hot')[0]?.count || 0
  });
}
```

---

## ✅ Implementation Priority

### **Phase 1: Critical** (Week 1)
1. ⏳ Add 8 missing events to mobile/web
2. ⏳ Build 3 analytics endpoints
3. ⏳ Integrate enrichment trigger after signup
4. ⏳ Display persona & magnetism in settings

### **Phase 2: Important** (Week 2)
5. ⏳ Build marketing dashboard (web)
6. ⏳ Build user journey view (admin)
7. ⏳ Add activation milestone tracking
8. ⏳ Test full flow end-to-end

### **Phase 3: Nice-to-Have** (Week 3)
9. ⏳ Build magnetism trend charts
10. ⏳ Build persona comparison views
11. ⏳ Add churn risk alerts
12. ⏳ Build email campaign analytics

---

## 📊 Testing Checklist

### **Events Verification**
- [ ] All 22 events tracked in PostHog Live Events
- [ ] Events mirrored to `analytics_events` table
- [ ] Events inserted into `user_event` table
- [ ] Property whitelist enforced (no PII)
- [ ] User IDs hashed with SHA-256

### **API Verification**
- [ ] Enrichment triggered after signup
- [ ] Persona assigned within 5 minutes
- [ ] Magnetism calculated correctly
- [ ] Attribution shows complete journey
- [ ] Funnel data accurate
- [ ] Dashboard queries performant (< 1s)

### **UI Verification**
- [ ] Persona badge displayed in mobile settings
- [ ] Magnetism score shown with color coding
- [ ] Marketing dashboard rendering charts
- [ ] User journey timeline working
- [ ] Attribution breakdown clear

---

## 🎯 Success Criteria

✅ **Backend**: 13 endpoints operational  
✅ **Events**: 22 events tracked reliably  
✅ **Mobile**: 7 integration points complete  
✅ **Web**: 6 integration points complete  
✅ **Dashboards**: Marketing analytics visible  
✅ **Performance**: < 1s for all queries  
✅ **Accuracy**: > 95% event delivery rate  

---

**Complete mapping of all endpoints and events needed for marketing intelligence!** 🚀
