# Warmth Alerts Feature Documentation

**Push notifications when VIP/watched contacts go cold**

---

## Overview

The Warmth Alerts system proactively notifies users when important contacts haven't been contacted recently and their relationship warmth is declining. This transforms the CRM from reactive to proactive relationship management.

## Architecture

### Database Tables (3 new)

1. **`contacts` (modified)**
   - `watch_status` - none, watch, important, vip
   - `warmth_alert_threshold` - Warmth score below which to alert (default 30)
   - `last_warmth_alert_sent_at` - Prevents duplicate alerts

2. **`warmth_alerts`**
   - Logs all warmth alerts sent to users
   - Tracks notification status, user actions (dismiss/snooze/reached_out)
   - Supports multiple alert types

3. **`user_push_tokens`**
   - Stores Expo push notification tokens
   - Per-device notification preferences
   - Quiet hours support

### Backend API Endpoints (5 new)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/contacts/:id/watch` | GET | Get watch status for contact |
| `/v1/contacts/:id/watch` | PATCH | Update watch status (none/watch/important/vip) |
| `/v1/alerts` | GET | List user's warmth alerts |
| `/v1/alerts/:id` | PATCH | Dismiss/snooze/mark as acted on |
| `/v1/push-tokens` | POST | Register Expo push token |
| `/api/cron/check-warmth-alerts` | GET | Daily cron job (9 AM) |

---

## How It Works

### 1. User Marks Contact for Watching

```typescript
// User sets watch status on contact
PATCH /v1/contacts/{contactId}/watch
{
  "watch_status": "vip",          // none, watch, important, vip
  "warmth_alert_threshold": 30    // Alert when warmth < 30
}
```

### 2. Daily Cron Job Checks All Watched Contacts

```
Schedule: Every day at 9 AM (Vercel Cron)
Path: /api/cron/check-warmth-alerts

Process:
1. Query all contacts with watch_status != 'none'
2. For each contact:
   - Skip if alerted within last 7 days
   - Check if warmth < threshold
   - Calculate days since last interaction
   - Create alert record
3. Send push notifications
4. Update last_alert_sent_at timestamp
```

### 3. Push Notification Sent

```json
{
  "title": "⭐ Sarah Johnson is getting cold",
  "body": "Warmth: 25/100 • 42 days since last contact",
  "data": {
    "type": "warmth_alert",
    "contact_id": "uuid",
    "screen": "/contact/uuid",
    "action": "compose"
  }
}
```

### 4. User Takes Action

**Option A: Tap notification → Opens compose screen**

```typescript
// Notification handler routes to compose
router.push({
  pathname: '/compose/[contactId]',
  params: { 
    contactId,
    goalId: 'check_in',
    source: 'warmth_alert'
  }
});
```

**Option B: View in Alerts Screen**

```typescript
GET /v1/alerts
// Returns list of pending alerts with contact details
```

**Option C: Dismiss/Snooze**

```typescript
PATCH /v1/alerts/{alertId}
{
  "action": "snooze",
  "snooze_days": 7  // Snooze for 7 days
}
```

---

## Alert Types

### 1. Dropped Below (Current Implementation)
```
Trigger: warmth < warmth_alert_threshold
Example: "Warmth dropped to 25 (threshold: 30)"
```

### 2. Rapid Decline (Future)
```
Trigger: Warmth dropped >30 points in 14 days
Example: "Warmth dropped from 75 to 40 in 2 weeks"
```

### 3. Extended Silence (Future)
```
Trigger: No interaction in X days (based on watch_status)
Example: "No contact with VIP in 60 days"
```

---

## Watch Status Levels

| Level | Default Threshold | Alert Priority | Badge |
|-------|------------------|----------------|-------|
| **none** | - | No alerts | - |
| **watch** | 25 | Default | 📉 |
| **important** | 30 | Default | 🔥 |
| **vip** | 40 | High | ⭐ |

---

## Setup Instructions

### 1. Run Database Migration

```bash
# In Supabase SQL Editor
# https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

# Run migration file:
backend-vercel/migrations/warmth-alerts.sql
```

### 2. Configure Environment Variables

```bash
# Vercel Dashboard → ever-reach-be → Settings → Environment Variables

# Required:
CRON_SECRET=<random-string>    # For cron job authentication

# Already configured:
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
```

### 3. Deploy to Vercel

```bash
git add .
git commit -m "feat: Add warmth alerts system"
git push origin feat/backend-vercel-only-clean

# Vercel will auto-deploy and enable the cron job
```

### 4. Verify Cron Job

```
Vercel Dashboard → Deployments → Latest → Functions → Crons
Should see: /api/cron/check-warmth-alerts (0 9 * * *)
```

---

## Frontend Implementation

### Phase 1: Watch Toggle (Contact Detail Screen)

```typescript
// app/contact/[id].tsx

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

const [watchStatus, setWatchStatus] = useState<'none' | 'watch' | 'important' | 'vip'>('none');

const handleWatchToggle = async (status: 'none' | 'watch' | 'important' | 'vip') => {
  await apiFetch(`/v1/contacts/${contactId}/watch`, {
    method: 'PATCH',
    requireAuth: true,
    body: JSON.stringify({ watch_status: status })
  });
  setWatchStatus(status);
};

// UI Component
<View style={styles.watchSection}>
  <Text>Get alerts when cold?</Text>
  <SegmentedControl
    values={['None', 'Watch', 'Important', 'VIP']}
    selectedIndex={['none', 'watch', 'important', 'vip'].indexOf(watchStatus)}
    onChange={(e) => {
      const statuses = ['none', 'watch', 'important', 'vip'];
      handleWatchToggle(statuses[e.nativeEvent.selectedSegmentIndex]);
    }}
  />
</View>
```

### Phase 2: Push Notification Registration

```typescript
// app/_layout.tsx

import * as Notifications from 'expo-notifications';
import { apiFetch } from '@/lib/api';

useEffect(() => {
  async function registerPushNotifications() {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync();
    
    // Register with backend
    await apiFetch('/v1/push-tokens', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        push_token: token.data,
        platform: Platform.OS,
        device_name: `${Platform.OS} Device`
      })
    });
  }
  
  registerPushNotifications();
}, []);

// Handle notification taps
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  if (data.type === 'warmth_alert') {
    router.push({
      pathname: '/compose/[contactId]',
      params: { 
        contactId: data.contact_id,
        goalId: 'check_in'
      }
    });
  }
});
```

### Phase 3: Alerts Screen

```typescript
// app/(tabs)/alerts.tsx

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    loadAlerts();
  }, []);
  
  async function loadAlerts() {
    const response = await apiFetch('/v1/alerts', { requireAuth: true });
    setAlerts(response.items);
  }
  
  async function handleDismiss(alertId: string) {
    await apiFetch(`/v1/alerts/${alertId}`, {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify({ action: 'dismiss' })
    });
    loadAlerts();
  }
  
  async function handleSnooze(alertId: string) {
    await apiFetch(`/v1/alerts/${alertId}`, {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify({ 
        action: 'snooze',
        snooze_days: 7
      })
    });
    loadAlerts();
  }
  
  return (
    <ScrollView>
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          contact={alert.contact}
          warmth={alert.warmth_at_alert}
          daysSince={alert.days_since_interaction}
          onReachOut={() => router.push(`/compose/${alert.contact.id}`)}
          onSnooze={() => handleSnooze(alert.id)}
          onDismiss={() => handleDismiss(alert.id)}
        />
      ))}
    </ScrollView>
  );
}
```

---

## Testing

### 1. Manual Cron Trigger (Development)

```bash
# Call cron endpoint directly with secret
curl -X GET "https://ever-reach-be.vercel.app/api/cron/check-warmth-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. Test Alert Flow

```sql
-- In Supabase SQL Editor

-- 1. Set a contact to watch
UPDATE contacts 
SET 
  watch_status = 'vip',
  warmth = 20,  -- Below threshold
  warmth_alert_threshold = 30
WHERE id = 'your-contact-id';

-- 2. Trigger cron manually (see above)

-- 3. Check alert created
SELECT * FROM warmth_alerts 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check push notification sent
SELECT 
  notification_sent,
  notification_sent_at,
  notification_error
FROM warmth_alerts 
WHERE id = 'alert-id';
```

### 3. Test Push Notifications

```typescript
// In Expo app, test notification handler
import * as Notifications from 'expo-notifications';

// Send test notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: '⭐ Test Contact is getting cold',
    body: 'Warmth: 25/100 • 42 days',
    data: {
      type: 'warmth_alert',
      contact_id: 'test-id',
      screen: '/contact/test-id'
    }
  },
  trigger: null  // Immediate
});
```

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Analytics events
analytics.track('warmth_alert_sent', {
  contact_id,
  watch_status,
  warmth_at_alert,
  days_since_interaction
});

analytics.track('warmth_alert_action', {
  alert_id,
  action: 'reached_out' | 'snoozed' | 'dismissed',
  time_to_action_hours
});

// Success metrics
- Alert engagement rate (% acted on vs dismissed)
- Time to action (hours from alert to reach out)
- Contacts saved (warmth increased after alert)
- False positive rate (alerted but shouldn't have)
```

### Cron Job Logs

```
Vercel Dashboard → Functions → check-warmth-alerts → Logs

Look for:
✅ "X alerts created"
✅ "Y notifications sent"
❌ "Failed to send to token..."
```

---

## Future Enhancements

### 1. Smart Scheduling
```
"Best time to reach Sarah: Weekday afternoons"
Based on past interaction patterns
```

### 2. Batch Digests
```
Weekly email: "3 VIPs need attention this week"
Reduces notification fatigue
```

### 3. Predictive Alerts
```
"Sarah's warmth trending down. 
 Predicted to go cold in 12 days."
```

### 4. Success Tracking
```
"You've saved 12 relationships this month! 🎉"
Positive reinforcement
```

### 5. Quiet Hours
```
User preferences:
- Don't send alerts between 10 PM - 8 AM
- Weekend mode (no alerts)
```

---

## Files Created

### Backend
```
backend-vercel/
├── migrations/
│   └── warmth-alerts.sql (265 lines)
├── app/api/
│   ├── cron/
│   │   └── check-warmth-alerts/
│   │       └── route.ts (363 lines)
│   └── v1/
│       ├── contacts/[id]/watch/
│       │   └── route.ts (116 lines)
│       ├── alerts/
│       │   ├── route.ts (110 lines)
│       │   └── [id]/
│       │       └── route.ts (115 lines)
│       └── push-tokens/
│           └── route.ts (150 lines)
└── vercel.json (updated with cron config)
```

### Frontend (To Be Created)
```
app/
├── (tabs)/
│   └── alerts.tsx (new)
├── contact/
│   └── [id].tsx (add watch toggle)
└── _layout.tsx (add push notification setup)

components/
└── AlertCard.tsx (new)

hooks/
└── usePushNotifications.ts (new)
```

---

## Summary

✅ **Database:** 3 tables (contacts modified, warmth_alerts, user_push_tokens)  
✅ **Backend:** 5 API endpoints + 1 cron job  
✅ **Notifications:** Expo Push integration  
✅ **Cron:** Daily check at 9 AM  
⏳ **Frontend:** Watch toggle, alerts screen, push handler (next phase)

**Total Backend Code:** ~1,100 lines  
**Deployment:** Ready for feat/backend-vercel-only-clean branch  
**Documentation:** Complete with testing guides

---

**Created:** 2025-10-05  
**Version:** 1.0.0  
**Status:** Backend Complete, Frontend In Progress
