# 🥶 Cold Contact Notification System - Implementation Plan

## Overview
Multi-channel notification system to alert users when relationships are cooling down and need attention.

---

## 🔍 Current State

### ✅ What Exists
- **Warmth Tracking System**: 0-100 score based on recency, frequency, channel diversity
- **Warmth Bands**: `hot`, `warm`, `neutral`, `cool`, `cold`
- **API Endpoint**: `/v1/contacts/:id/warmth/recompute`
- **AI Agent**: Suggests actions for cold contacts via `/v1/agent/suggest/actions`

### ❌ What's Missing
- No notification system
- No alerts when contacts drop to cold
- No email/push notifications
- No in-app notification center

---

## 💡 5-Channel Notification Strategy

### 1. In-App Notification Center 📱
- Badge count on home screen
- Notification feed with actionable items
- Swipe to dismiss or take action
- Filter by type (cold contacts, missed follow-ups, etc.)

### 2. Push Notifications 🔔
- Mobile push alerts (Expo Notifications)
- Configurable frequency (daily digest, weekly, immediate)
- Smart timing (don't spam during quiet hours)
- Rich notifications with quick actions

### 3. Email Notifications 📧
- Daily/weekly digest of cold contacts
- Personalized with context and suggestions
- One-click actions to draft messages
- Unsubscribe/preference management

### 4. Dashboard Warnings ⚠️
- Visual indicators on contact cards
- "Relationships at risk" section on home
- Warmth trend graphs
- Priority sorting by coldness

### 5. AI Agent Proactive Alerts 🤖
- Agent chat notifications
- Context-aware reminders in conversations
- Suggested message drafts
- Proactive relationship maintenance tips

---

## 🏗️ Technical Architecture

### Database Schema

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'contact_cold', 'contact_cooling', 'missed_followup'
  severity TEXT NOT NULL, -- 'info', 'warning', 'urgent'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  
  -- Actions
  action_url TEXT,
  action_label TEXT,
  
  -- Status
  read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  actioned BOOLEAN DEFAULT false,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channels
  in_app_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Frequency
  frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
  digest_time TIME DEFAULT '09:00:00',
  digest_day INT DEFAULT 1, -- Monday for weekly
  
  -- Thresholds
  notify_warmth_threshold INT DEFAULT 20, -- Notify when < 20 (cold)
  notify_on_drop BOOLEAN DEFAULT true, -- Alert on warmth band drops
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  -- Contact filters
  exclude_low_priority BOOLEAN DEFAULT true,
  min_relationship_age_days INT DEFAULT 7, -- Don't notify for brand new contacts
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification triggers (rules engine)
CREATE TABLE notification_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  -- Trigger conditions
  trigger_type TEXT NOT NULL, -- 'warmth_drop', 'warmth_threshold', 'days_since_contact'
  conditions JSONB NOT NULL,
  
  -- Notification template
  notification_type TEXT NOT NULL,
  notification_severity TEXT NOT NULL,
  notification_template JSONB NOT NULL,
  
  -- Frequency limits
  max_per_day INT DEFAULT 10,
  cooldown_hours INT DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification history (for analytics)
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  channel TEXT NOT NULL, -- 'in_app', 'push', 'email'
  status TEXT NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend Services

```typescript
// lib/notifications.ts
- createNotification()
- dismissNotification()
- markAsRead()
- markAsActioned()
- getNotifications()
- getUnreadCount()

// lib/notification-dispatcher.ts
- dispatchInApp()
- dispatchPush()
- dispatchEmail()
- batchDispatch()

// lib/notification-triggers.ts
- checkWarmthChanges()
- evaluateTriggers()
- generateNotifications()
- scheduleDigest()

// lib/warmth-monitor.ts
- monitorContactWarmth()
- detectWarmthDrops()
- identifyColdContacts()
- calculateRisk()
```

### API Endpoints

```typescript
// GET /v1/notifications
// GET /v1/notifications/unread-count
// POST /v1/notifications/:id/read
// POST /v1/notifications/:id/dismiss
// POST /v1/notifications/:id/action
// DELETE /v1/notifications/:id

// GET /v1/notifications/preferences
// PUT /v1/notifications/preferences
// POST /v1/notifications/test

// GET /v1/notifications/triggers
// POST /v1/notifications/triggers
// PUT /v1/notifications/triggers/:id
// DELETE /v1/notifications/triggers/:id
```

### Cron Jobs

```typescript
// Daily: Check for cold contacts
// cron: "0 9 * * *" (9am daily)
async function dailyWarmthCheck() {
  - Query contacts where warmth < threshold
  - Group by user
  - Generate notifications
  - Dispatch via preferred channels
}

// Hourly: Process scheduled notifications
// cron: "0 * * * *"
async function processScheduledNotifications() {
  - Get pending notifications
  - Check quiet hours
  - Dispatch via channels
  - Update status
}

// Weekly: Digest compilation
// cron: "0 9 * * 1" (Monday 9am)
async function weeklyDigest() {
  - Compile cold contacts
  - Generate insights
  - Send comprehensive email
}
```

---

## 🎯 Implementation Phases

### Phase 1: Database & Core Logic (2-3 hours)
- [ ] Create notifications table schema
- [ ] Create notification_preferences table
- [ ] Add RLS policies
- [ ] Create notification library functions
- [ ] Build warmth monitoring service

### Phase 2: In-App Notifications (3-4 hours)
- [ ] API endpoints for notifications
- [ ] Notification center component
- [ ] Badge indicators
- [ ] Toast notifications
- [ ] Mark as read/dismissed
- [ ] Settings page

### Phase 3: Push Notifications (2-3 hours)
- [ ] Expo push notification setup
- [ ] Device token registration
- [ ] Push dispatcher service
- [ ] Test push notifications
- [ ] Handle notification taps

### Phase 4: Email Notifications (2-3 hours)
- [ ] Email service integration (SendGrid/Resend)
- [ ] Email templates (daily/weekly digest)
- [ ] Unsubscribe mechanism
- [ ] Preference management
- [ ] Test email delivery

### Phase 5: Cron Jobs & Automation (2-3 hours)
- [ ] Vercel cron setup
- [ ] Daily warmth check job
- [ ] Weekly digest job
- [ ] Notification queue processing
- [ ] Monitoring & logging

### Phase 6: Advanced Features (3-4 hours)
- [ ] Custom trigger rules
- [ ] AI-generated notification content
- [ ] Smart batching (don't spam)
- [ ] Notification analytics
- [ ] A/B testing notification copy

---

## 📱 UI/UX Mockups

### Notification Center
```
┌─────────────────────────────────────┐
│ Notifications               [3] 🔔  │
├─────────────────────────────────────┤
│ 🥶 3 contacts getting cold          │
│ John Smith, Sarah Johnson, Mike...  │
│ 2 hours ago                    [→] │
├─────────────────────────────────────┤
│ 📆 Follow-up reminder               │
│ Promised to check in with Alex      │
│ Yesterday                      [→] │
├─────────────────────────────────────┤
│ ✨ Relationship milestone           │
│ You've known Emma for 1 year!       │
│ 3 days ago                     [✓] │
└─────────────────────────────────────┘
```

### Settings Page
```
┌─────────────────────────────────────┐
│ Notification Settings               │
├─────────────────────────────────────┤
│ Channels                            │
│ ✓ In-app notifications              │
│ ✓ Push notifications                │
│ □ Email notifications               │
├─────────────────────────────────────┤
│ Frequency                           │
│ ○ Real-time (as it happens)         │
│ ● Daily digest (9:00 AM)            │
│ ○ Weekly digest (Monday 9 AM)       │
├─────────────────────────────────────┤
│ Thresholds                          │
│ Notify when warmth drops below:     │
│ [●────────────] 20 (Cold)           │
│                                     │
│ ✓ Alert on warmth band changes      │
├─────────────────────────────────────┤
│ Quiet Hours                         │
│ ✓ Enable quiet hours                │
│ From: 9:00 PM  To: 8:00 AM          │
└─────────────────────────────────────┘
```

### Contact Card Indicator
```
┌─────────────────────────────────────┐
│ John Smith                 🥶 Cold  │
│ Software Engineer                   │
│                                     │
│ Last contact: 21 days ago           │
│ Warmth: 15/100 ────────────────     │
│                                     │
│ ⚠️ Relationship cooling down        │
│ [Send Check-in] [Snooze 7 days]    │
└─────────────────────────────────────┘
```

---

## 🔧 Notification Rules Examples

### Pre-configured Triggers

```typescript
const defaultTriggers = [
  {
    name: "Contact turning cold",
    trigger_type: "warmth_threshold",
    conditions: {
      warmth_lte: 20,
      was_warmer: true, // Only if previously warmer
    },
    severity: "warning",
    template: {
      title: "{{contact_name}} is getting cold",
      message: "You haven't connected in {{days_since}} days. Time to reach out?",
      action: "Draft message"
    }
  },
  {
    name: "Warmth dropped significantly",
    trigger_type: "warmth_drop",
    conditions: {
      drop_amount: 20, // Dropped 20+ points
      timeframe_days: 7,
    },
    severity: "urgent",
    template: {
      title: "Relationship cooling rapidly",
      message: "{{contact_name}}'s warmth dropped {{drop_amount}} points this week",
      action: "Take action"
    }
  },
  {
    name: "No contact in 30 days",
    trigger_type: "days_since_contact",
    conditions: {
      days_gte: 30,
      previous_warmth_gte: 40, // Was at least neutral
    },
    severity: "warning",
    template: {
      title: "It's been a month since you talked to {{contact_name}}",
      message: "Last topic: {{last_topic}}. Want to follow up?",
      action: "View conversation"
    }
  }
];
```

---

## 📊 Success Metrics

### User Engagement
- % of notifications clicked
- % of notifications that lead to actions
- % of cold contacts re-engaged within 7 days
- Average time to action after notification

### System Health
- Notification delivery rate
- Push notification success rate
- Email open rate
- Unsubscribe rate

### Relationship Outcomes
- Reduction in cold contacts over time
- Increase in average warmth score
- More consistent interaction patterns
- User retention

---

## 🚀 MVP Scope (3-4 hours)

For quick implementation, focus on:

1. ✅ **Database**: notifications + preferences tables
2. ✅ **Backend**: Basic notification CRUD APIs
3. ✅ **Daily Cron**: Check for cold contacts once per day
4. ✅ **In-App Only**: Notification feed component
5. ✅ **Settings**: Simple enable/disable + threshold
6. ✅ **AI Integration**: Use existing agent for suggestions

**Skip for MVP:**
- Push notifications (Phase 2)
- Email notifications (Phase 2)
- Custom trigger rules (Phase 3)
- Advanced analytics (Phase 3)

---

## 🔐 Security & Privacy

### Data Protection
- RLS policies on all notification tables
- User can only access their own notifications
- Soft delete for notification history
- GDPR compliance (export/delete all notifications)

### Opt-out Mechanisms
- Easy unsubscribe from emails
- Granular channel preferences
- Snooze individual contacts
- Disable specific notification types

### Rate Limiting
- Max notifications per day per user
- Cooldown between similar notifications
- Batch similar notifications together
- Respect quiet hours

---

## 📚 Related Documentation

- **Warmth System**: See `/v1/contacts/:id/warmth/recompute` endpoint
- **AI Agent**: See `AGENT_SYSTEM_DOCUMENTATION.md` for context integration
- **Frontend**: See `AGENT_FRONTEND_INTEGRATION.md` for UI patterns
- **Push Notifications**: [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- **Email Service**: Choose between SendGrid, Resend, or AWS SES

---

## 💭 Future Enhancements

### Smart Notifications
- ML-based optimal notification timing
- Personalized notification copy using AI
- Predictive alerts (before contacts turn cold)
- Context-aware suggestions

### Gamification
- Streaks for maintaining warm relationships
- Achievements for engagement
- Weekly/monthly relationship health reports
- Leaderboards (if team features added)

### Integration
- Calendar integration (schedule follow-ups)
- CRM sync (sync with Salesforce, HubSpot)
- Slack/Discord webhooks
- SMS notifications (Twilio)

### Advanced Analytics
- Notification effectiveness dashboard
- A/B testing different notification copy
- User segment analysis
- ROI tracking (cold → warm conversions)

---

**Status**: Design phase complete, ready for implementation
**Priority**: High - Core relationship maintenance feature
**Estimated Effort**: 3-4 hours MVP, 12-15 hours full system
**Dependencies**: Expo push tokens, email service account
