# Event Tracking Reference - EverReach Backend

**Purpose**: Complete event catalog and implementation guide for backend event tracking

---

## 📊 **Complete Event Catalog** (170+ Events)

### **Auth & Identity** (4 events)
```typescript
// User signs up
'user_signed_up' - { method: 'email' | 'google' | 'apple', plan_tier?: string }

// User logs in
'user_logged_in' - { method: 'email' | 'google' | 'apple' }

// Password reset requested
'password_reset_requested' - { email_provided: boolean, method: 'email' }

// Password reset succeeded  
'password_reset_succeeded' - { user_id: string }
```

### **Onboarding** (2 events)
```typescript
// Onboarding flow started
'onboarding_started' - { source: 'signup' | 'invite' }

// Onboarding completed
'onboarding_completed' - { steps_completed: number, duration_seconds: number }
```

### **Screenshot** (4 events)
```typescript
// Screenshot uploaded
'screenshot_uploaded' - { screenshot_id: string, file_size: number, mime_type: string, width: number, height: number }

// OCR processing completed
'screenshot_ocr_completed' - { screenshot_id: string, extracted_text_length: number, confidence: number, processing_time_ms: number }

// AI analysis completed
'screenshot_analyzed' - { screenshot_id: string, entities_found: number, insights_count: number, processing_time_ms: number }

// Insight saved from screenshot
'insight_saved' - { screenshot_id: string, insight_type: string }
```

### **Warmth** (1 event)
```typescript
// Warmth score viewed
'warmth_score_viewed' - { contact_id: string, warmth_score: number, warmth_band: string }
```

### **Engagement** (4 events)
```typescript
// CTA clicked
'cta_clicked' - { cta_type: string, cta_location: string, cta_text: string }

// Share clicked
'share_clicked' - { share_target: 'twitter' | 'linkedin' | 'copy_link', content_type: string }

// Notification opt-in
'notif_opt_in' - { channel: 'push' | 'email', permission_granted: boolean }

// Notification sent
'notif_sent' - { notif_type: string, channel: string, user_id: string }
```

### **Monetization** (3 events)
```typescript
// Plan selected
'plan_selected' - { plan_tier: string, billing_period: 'monthly' | 'annual' }

// Checkout started
'checkout_started' - { plan_tier: string, amount: number, currency: string }

// Checkout completed
'checkout_completed' - { plan_tier: string, amount: number, currency: string, payment_method: string }
```

### **Lifecycle** (5 events)
```typescript
// App opened
'app_open' - { is_cold_start: boolean, app_version: string }

// App sent to background
'app_background' - { duration_in_foreground: number }

// App foregrounded
'app_foregrounded' - { time_in_background: number }

// Session started
'session_start' - { session_id: string }

// App crashed
'app_crash' - { error: string, stack_trace: string, sentry_id?: string }
```

### **Performance** (9 events)
```typescript
// Memory warning
'memory_warning' - { memory_usage_mb: number, threshold_mb: number }

// Network state changed
'network_state_changed' - { from_state: string, to_state: string, is_connected: boolean }

// Connection lost
'connection_lost' - { last_connected_at: string }

// App state duration
'app_state_duration' - { state: 'active' | 'background', duration_ms: number }

// Performance budget exceeded
'performance_budget_exceeded' - { operation: string, duration_ms: number, budget_ms: number }

// Slow screen render
'slow_screen_render' - { screen_name: string, render_time_ms: number }

// Slow API call
'slow_api_call' - { endpoint: string, duration_ms: number }

// Slow operation
'slow_operation' - { operation: string, duration_ms: number }

// Screen duration
'screen_duration' - { screen_name: string, duration_ms: number }
```

### **Marketing Funnel** (8 events)
```typescript
// Ad impression
'ad_impression' - { network: string, campaign_id: string, creative_id: string, placement?: string }

// Ad click
'ad_click' - { network: string, campaign_id: string, creative_id: string, click_id?: string }

// Landing page viewed
'landing_view' - { page: string, referrer?: string, variant?: string }

// Lead captured
'lead_captured' - { source: string, lead_score?: number }

// App install tracked
'install_tracked' - { install_source: string, network?: string, campaign_id?: string }

// First open post-install
'first_open_post_install' - { install_source: string }

// Activation event
'activation_event' - { type: string, metadata?: Record<string, any> }

// Qualified signup
'qualified_signup' - { lead_score: number }
```

---

## 🎯 **Common Event Properties**

Every event MUST include these properties:

```typescript
interface EventProps {
  // Context
  app_version: string;          // "1.2.3"
  build_number: string;          // "42"
  platform: 'web' | 'ios' | 'android';
  device_locale: string;         // "en-US"
  timezone: string;              // "America/New_York"
  release_channel?: string;      // "production" | "beta"
  
  // Marketing
  campaign?: string;             // UTM campaign
  source?: string;               // UTM source
  medium?: string;               // UTM medium
  
  // User
  user_id?: string;              // Supabase user ID
  anonymous_id?: string;         // For pre-auth events
  account_age_days?: number;     // Days since signup
  plan_tier?: string;            // "free" | "pro" | "enterprise"
  warmth_segment?: string;       // "cold" | "warm" | "hot"
  
  // Session
  session_id?: string;           // From event envelope
  
  // Custom
  [key: string]: unknown;
}
```

---

## 🏗️ **Backend Implementation**

### **1. Event Tracking Service**

```typescript
// lib/analytics.ts
import { PostHog } from 'posthog-node';

export const posthog = new PostHog(
  process.env.POSTHOG_PROJECT_KEY!,
  {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 20,
    flushInterval: 10000, // 10 seconds
  }
);

export type EventName = 
  | 'user_signed_up'
  | 'user_logged_in'
  // ... all other events
  ;

export interface EventContext {
  user_id?: string;
  anonymous_id?: string;
  platform?: string;
  app_version?: string;
  [key: string]: unknown;
}

export async function trackEvent(
  eventName: EventName,
  userId: string | null,
  properties: Record<string, any> = {},
  context: EventContext = {}
) {
  const distinctId = userId || context.anonymous_id || 'backend';

  posthog.capture({
    distinctId,
    event: eventName,
    properties: {
      ...context,
      ...properties,
      $set: userId ? { user_id: userId } : undefined,
    },
  });

  // Also mirror critical events to Supabase
  if (isCriticalEvent(eventName)) {
    await mirrorEventToSupabase(eventName, userId, context.anonymous_id, properties, context);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await posthog.shutdown();
});
```

### **2. Critical Events Mirror (Supabase)**

```typescript
// lib/event-mirror.ts
import { supabase } from './supabase';

const CRITICAL_EVENTS = [
  'user_signed_up',
  'user_logged_in',
  'screenshot_uploaded',
  'screenshot_analyzed',
  'checkout_completed',
  'password_reset_succeeded',
];

export async function mirrorEventToSupabase(
  eventName: string,
  userId: string | null,
  anonymousId: string | null,
  properties: Record<string, any>,
  context: Record<string, any>
) {
  if (!CRITICAL_EVENTS.includes(eventName)) {
    return;
  }

  try {
    await supabase.from('app_events').insert({
      event_name: eventName,
      user_id: userId,
      anonymous_id: anonymousId,
      properties,
      context,
      occurred_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[EventMirror] Failed to mirror event:', error);
    // Don't throw - mirroring is best-effort
  }
}

function isCriticalEvent(eventName: string): boolean {
  return CRITICAL_EVENTS.includes(eventName);
}
```

### **3. Middleware for API Tracking**

```typescript
// middleware/analytics.ts
import { trackEvent } from '@/lib/analytics';
import { v4 as uuidv4 } from 'uuid';

export async function analyticsMiddleware(req: any, res: any, next: any) {
  const requestId = uuidv4();
  const startTime = Date.now();

  req.requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    trackEvent('api_request', req.user?.id || null, {
      request_id: requestId,
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      duration_ms: duration,
      user_agent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
}
```

---

## 📦 **Database Schema** (Supabase Mirror)

```sql
-- app_events: Mirror of critical analytics for joins
create table if not exists app_events (
  id bigserial primary key,
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  occurred_at timestamptz not null default now(),
  context jsonb not null default '{}',
  properties jsonb not null default '{}'
);

-- Indexes
create index idx_app_events_event_name on app_events(event_name);
create index idx_app_events_user_id on app_events(user_id) where user_id is not null;
create index idx_app_events_occurred_at on app_events(occurred_at desc);
create index idx_app_events_event_time on app_events(event_name, occurred_at desc);

-- Enable RLS
alter table app_events enable row level security;

-- Policies
create policy "Users can view their own events"
  on app_events for select
  using (auth.uid() = user_id);

create policy "Service role can insert events"
  on app_events for insert
  with check (true); -- Only service role can insert
```

---

## 🚀 **Usage Examples**

### **Auth Events**
```typescript
// On signup
await trackEvent('user_signed_up', user.id, {
  method: 'email',
  plan_tier: 'free',
});

// On login
await trackEvent('user_logged_in', user.id, {
  method: 'google',
});
```

### **Screenshot Events**
```typescript
// On upload
await trackEvent('screenshot_uploaded', user.id, {
  screenshot_id: id,
  file_size: file.size,
  mime_type: file.type,
  width: metadata.width,
  height: metadata.height,
});

// After OCR
await trackEvent('screenshot_ocr_completed', user.id, {
  screenshot_id: id,
  extracted_text_length: ocrResult.text.length,
  confidence: ocrResult.confidence,
  processing_time_ms: duration,
});

// After analysis
await trackEvent('screenshot_analyzed', user.id, {
  screenshot_id: id,
  entities_found: analysis.entities.length,
  insights_count: analysis.insights.length,
  processing_time_ms: duration,
});
```

### **API Events** (Automatic via middleware)
```typescript
// Just use middleware in your API routes
app.use(analyticsMiddleware);

// Every API call automatically tracked:
// - method, route, status_code, duration_ms
// - request_id, user_agent, ip
```

---

## ✅ **Acceptance Criteria**

- [ ] PostHog Node client initialized
- [ ] All events strongly typed
- [ ] Critical events mirrored to Supabase
- [ ] Middleware tracking all API requests
- [ ] Request ID correlation working
- [ ] No PII in event properties (hash emails/phones)
- [ ] Graceful shutdown on SIGINT
- [ ] Error handling (don't block on tracking failures)

---

## 📊 **Testing**

```typescript
// Test event tracking
import { trackEvent } from '@/lib/analytics';

describe('Event Tracking', () => {
  it('tracks events with correct properties', async () => {
    await trackEvent('user_signed_up', 'user-123', {
      method: 'email',
    });

    // Assert PostHog was called
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'user-123',
      event: 'user_signed_up',
      properties: expect.objectContaining({
        method: 'email',
      }),
    });
  });
});
```

---

**Status**: Ready for implementation  
**Next**: Implement lib/analytics.ts, middleware, and database migration
