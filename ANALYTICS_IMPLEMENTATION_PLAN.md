# 📊 Analytics Implementation Plan

**Created**: October 21, 2025  
**Branch**: `feat/backend-vercel-only-clean`  
**Strategy**: Cherry-pick specific features, implement missing pieces

---

## ✅ Current Status

### Mobile Analytics (services/analytics.ts)
**Status**: 90% Complete - Has 30+ methods

**Existing Methods**:
- ✅ App lifecycle (open, background, foreground)
- ✅ Authentication (signup, signin)
- ✅ Screen viewing
- ✅ Contact management (created, imported, warmth)
- ✅ Message generation & sending
- ✅ Screenshot analysis
- ✅ Voice notes (recorded, transcribed)
- ✅ Interactions logging
- ✅ Feature requests
- ✅ Subscription/monetization
- ✅ Theme changes
- ✅ Error tracking

**Missing Methods**:
- ❌ Onboarding events (started, step_completed, completed, skipped)
- ❌ Contact viewing (contact_viewed with warmth score)
- ❌ Message editing (ai_message_edited)
- ❌ Message acceptance/rejection (ai_message_accepted, ai_message_rejected)
- ❌ Warmth recompute tracking
- ❌ Template usage tracking

### Backend Analytics (backend-vercel/lib/analytics.ts)
**Status**: 95% Complete

**Has**:
- ✅ PostHog Node client (lazy initialization)
- ✅ Event tracking with Supabase mirror
- ✅ Convenience namespaces (auth, screenshot, api)
- ✅ Graceful shutdown
- ✅ 170+ event types defined

**Missing**:
- ❌ Analytics middleware for automatic API tracking
- ❌ `app_events` table migration

### Migrations
**Has**:
- ✅ Developer dashboard system
- ✅ Feature flags & A/B testing
- ✅ Event mirror (`event-mirror.ts`)

**Missing**:
- ❌ `app_events` table with indexes
- ❌ Materialized view for analytics
- ❌ Helper functions (get_event_counts, get_last_event)

---

## 📋 Implementation Tasks

### Phase 1: Enhance Mobile AnalyticsService (2-3 hours)

**File**: `services/analytics.ts`

**Add Missing Methods**:

```typescript
// Onboarding
static trackOnboardingStarted() {
  PostHog.capture('Onboarding Started', {});
}

static trackOnboardingStepCompleted(props: {
  step: number;
  stepName: string;
}) {
  PostHog.capture('Onboarding Step Completed', {
    step: props.step,
    step_name: props.stepName,
  });
}

static trackOnboardingCompleted(props: {
  completionTimeMs: number;
}) {
  PostHog.capture('Onboarding Completed', {
    completion_time_ms: props.completionTimeMs,
  });
}

static trackOnboardingSkipped(props: {
  atStep: number;
}) {
  PostHog.capture('Onboarding Skipped', {
    at_step: props.atStep,
  });
}

// Contact Viewing
static trackContactViewed(props: {
  contactId: string;
  warmthScore?: number;
  hasInteractions: boolean;
  source?: 'list' | 'search' | 'link';
}) {
  PostHog.capture('Contact Viewed', {
    contact_id: props.contactId,
    warmth_score: props.warmthScore,
    has_interactions: props.hasInteractions,
    source: props.source,
  });
}

// AI Message Actions
static trackAiMessageEdited(props: {
  messageId: string;
  contactId: string;
  editType: 'text' | 'subject' | 'tone';
  charsDelta: number;
}) {
  PostHog.capture('AI Message Edited', {
    message_id: props.messageId,
    contact_id: props.contactId,
    edit_type: props.editType,
    chars_delta: props.charsDelta,
  });
}

static trackAiMessageAccepted(props: {
  messageId: string;
  contactId: string;
  method: 'copy' | 'send';
}) {
  PostHog.capture('AI Message Accepted', {
    message_id: props.messageId,
    contact_id: props.contactId,
    method: props.method,
  });
}

static trackAiMessageRejected(props: {
  messageId: string;
  contactId: string;
  reason?: string;
}) {
  PostHog.capture('AI Message Rejected', {
    message_id: props.messageId,
    contact_id: props.contactId,
    reason: props.reason,
  });
}

// Warmth Tracking
static trackWarmthRecomputed(props: {
  contactId: string;
  fromScore?: number;
  toScore: number;
  trigger: 'manual' | 'interaction' | 'scheduled';
}) {
  PostHog.capture('Warmth Recomputed', {
    contact_id: props.contactId,
    from_score: props.fromScore,
    to_score: props.toScore,
    delta: props.fromScore ? props.toScore - props.fromScore : null,
    trigger: props.trigger,
  });
}

// Template Usage
static trackTemplateUsed(props: {
  templateId: string;
  contactId: string;
  channel: Channel;
}) {
  PostHog.capture('Template Used', {
    template_id: props.templateId,
    contact_id: props.contactId,
    channel: props.channel,
  });
}
```

---

### Phase 2: Add Tracking to All 21 Mobile Screens (4-6 hours)

**Priority Order**:

#### 1. Core Tabs (4 screens)
- [ ] `app/(tabs)/home.tsx`
  - Screen viewed
  - Warmth summary card tapped
  - Action button clicks
  
- [ ] `app/(tabs)/people.tsx`
  - Screen viewed
  - Contact search performed
  - Sort/filter changed
  - Contact tapped
  
- [ ] `app/(tabs)/chat.tsx` (if AI chat exists)
  - Screen viewed
  - Message sent to AI
  - AI response received
  
- [ ] `app/(tabs)/settings.tsx`
  - Screen viewed
  - Setting changed (theme, notifications, etc.)

#### 2. Contact Screens (5 screens)
- [x] `app/add-contact.tsx` - ✅ Already done
  
- [ ] `app/contact/[id].tsx` - **HIGH PRIORITY**
  - Contact viewed (with warmth score)
  - Interaction logged
  - Message compose initiated
  
- [ ] `app/contact-context.tsx`
  - Context bundle viewed
  - Recent interaction clicked
  
- [ ] `app/contact-history.tsx`
  - History viewed
  - Interaction detail opened
  
- [ ] `app/contact-notes.tsx`
  - Notes viewed
  - Note created/edited

#### 3. Messaging (3 screens)
- [ ] `app/goal-picker.tsx`
  - Screen viewed
  - Goal selected
  - Custom goal entered
  
- [x] `app/message-results.tsx` - ✅ Already done
  
- [ ] `app/templates.tsx`
  - Screen viewed
  - Template selected
  - Template created/edited

#### 4. Alerts & Notifications (2 screens)
- [ ] `app/alerts.tsx`
  - Screen viewed
  - Alert opened
  - Alert dismissed
  
- [ ] `app/notifications.tsx`
  - Screen viewed
  - Notification permission changed

#### 5. Notes & Voice (2 screens)
- [ ] `app/voice-note.tsx`
  - Screen viewed
  - Recording started/stopped
  - Voice note uploaded
  
- [ ] `app/personal-notes.tsx`
  - Screen viewed
  - Note created/edited

#### 6. Onboarding & Auth (2 screens)
- [x] `app/sign-in.tsx` - ✅ Already done
  
- [ ] `app/onboarding.tsx`
  - Onboarding started
  - Step completed (for each step)
  - Onboarding completed/skipped

#### 7. Subscription (2 screens)
- [ ] `app/plans.tsx`
  - Screen viewed
  - Plan selected
  - Checkout started
  
- [ ] `app/feature-request.tsx`
  - Screen viewed
  - Request submitted

#### 8. Analytics (1 screen)
- [ ] `app/warmth-settings.tsx`
  - Screen viewed
  - Settings changed

---

### Phase 3: Backend Analytics Middleware (2-3 hours)

**File**: `backend-vercel/lib/middleware/analytics.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '../analytics';
import { v4 as uuidv4 } from 'uuid';

export function withAnalytics(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Add request ID to headers for tracing
    req.headers.set('X-Request-ID', requestId);
    
    try {
      // Execute handler
      const response = await handler(req);
      
      const latencyMs = Date.now() - startTime;
      
      // Track API call completed
      await trackEvent('api_request', null, {
        request_id: requestId,
        method: req.method,
        route: req.nextUrl.pathname,
        status_code: response.status,
        duration_ms: latencyMs,
        user_agent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });
      
      // Track slow API calls (>3s)
      if (latencyMs > 3000) {
        await trackEvent('slow_api_call', null, {
          request_id: requestId,
          route: req.nextUrl.pathname,
          latency_ms: latencyMs,
        });
      }
      
      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      // Track failed API call
      await trackEvent('api_call_failed', null, {
        request_id: requestId,
        route: req.nextUrl.pathname,
        error_type: error instanceof Error ? error.name : 'Unknown',
        error_message: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };
}
```

---

### Phase 4: Database Migration (1-2 hours)

**File**: `backend-vercel/migrations/analytics-app-events.sql`

```sql
-- App events table (Supabase mirror of critical PostHog events)
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'mobile', -- 'mobile' | 'web' | 'backend'
  request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON app_events(user_id);
CREATE INDEX IF NOT EXISTS idx_app_events_event_name ON app_events(event_name);
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON app_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_properties ON app_events USING GIN (properties);
CREATE INDEX IF NOT EXISTS idx_app_events_request_id ON app_events(request_id) WHERE request_id IS NOT NULL;

-- RLS policies
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON app_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own events"
  ON app_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON app_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION get_event_counts(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  event_name TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.event_name,
    COUNT(*) as count
  FROM app_events e
  WHERE e.user_id = p_user_id
    AND e.occurred_at BETWEEN p_start_date AND p_end_date
  GROUP BY e.event_name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_last_event(
  p_user_id UUID,
  p_event_name TEXT
)
RETURNS TABLE (
  id UUID,
  properties JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.properties,
    e.occurred_at
  FROM app_events e
  WHERE e.user_id = p_user_id
    AND e.event_name = p_event_name
  ORDER BY e.occurred_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for analytics dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_analytics AS
SELECT 
  DATE(occurred_at) as event_date,
  event_name,
  source,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT CASE WHEN user_id IS NULL THEN anonymous_id END) as anonymous_users
FROM app_events
WHERE occurred_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(occurred_at), event_name, source;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_analytics_unique 
  ON mv_event_analytics (event_date, event_name, source);

-- Refresh function (call from cron job)
CREATE OR REPLACE FUNCTION refresh_event_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_analytics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE app_events IS 'Mirror of critical PostHog events for product analytics and dashboard';
COMMENT ON MATERIALIZED VIEW mv_event_analytics IS 'Daily event aggregates for analytics dashboard (refreshed daily)';
```

---

### Phase 5: Testing (3-4 hours)

**Test Files to Create**:

1. **`test/analytics/mobile-tracking.test.ts`**
   - Test all AnalyticsService methods
   - Verify event properties
   - Test PostHog integration

2. **`test/analytics/backend-middleware.test.ts`**
   - Test API request tracking
   - Test slow API call detection
   - Test error tracking

3. **`test/analytics/event-mirror.test.ts`**
   - Test Supabase mirroring
   - Test critical events filter
   - Test data integrity

4. **`test/analytics/materialized-view.test.ts`**
   - Test view refresh
   - Test aggregation accuracy
   - Test query performance

---

## 📊 Success Metrics

### Coverage Targets
- **Mobile Screens**: 21/21 screens with tracking (100%)
- **Analytics Methods**: 50+ methods covering all features
- **Backend APIs**: All routes with automatic tracking
- **Events Mirrored**: Critical events in Supabase
- **Tests**: 30+ tests covering all tracking

### Quality Metrics
- **Type Safety**: 100% (all events typed)
- **Error Handling**: Never throws on tracking failures
- **Performance**: <10ms overhead per event
- **Privacy**: No PII in properties
- **Reliability**: Events delivered >99.9%

---

## 🚀 Next Steps (Priority Order)

1. ✅ **Phase 1**: Enhance mobile AnalyticsService (TODAY)
2. ✅ **Phase 2**: Add tracking to 21 screens (THIS WEEK)
3. ✅ **Phase 3**: Backend middleware (THIS WEEK)
4. ✅ **Phase 4**: Database migration (THIS WEEK)
5. ✅ **Phase 5**: Comprehensive tests (NEXT WEEK)

---

**Status**: Ready to implement  
**Estimated Time**: 12-16 hours total  
**Target Completion**: Week of October 21-28, 2025
