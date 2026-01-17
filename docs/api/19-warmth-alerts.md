# Warmth Alerts API

Proactive notifications when important contacts' warmth scores drop below thresholds.

**Base Endpoint**: `/v1/alerts`

---

## Overview

Warmth alerts help you:
- **Never miss cooling relationships** - Automatic detection
- **Prioritize contacts** - VIP contacts get higher thresholds
- **Multi-device notifications** - Push to all registered devices
- **Action tracking** - Mark alerts as dismissed, snoozed, or reached out

### Watch Levels

| Level | Default Threshold | Use Case |
|-------|------------------|----------|
| `none` | No alerts | Don't monitor |
| `watch` | 25 | Casual contacts |
| `important` | 30 | Regular business contacts |
| `vip` | 40 | Key customers, partners |

---

## Set Watch Status

Enable warmth monitoring for a contact.

```http
POST /v1/contacts/:id/watch
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `watch_status` | string | ✅ Yes | none, watch, important, vip |
| `warmth_threshold` | number | No | Custom threshold (overrides default) |

### Example

```typescript
await fetch(`/v1/contacts/${contactId}/watch`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    watch_status: 'vip',
    warmth_threshold: 50  // Alert when warmth drops below 50
  })
});
```

### Response

```json
{
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "watch_status": "vip",
  "warmth_threshold": 50,
  "current_warmth": 72
}
```

---

## List Alerts

Get all active warmth alerts.

```http
GET /v1/alerts
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | active, dismissed, snoozed |
| `limit` | integer | Max results (default: 50) |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/alerts?status=active',
  {
    headers: { 'Authorization': `Bearer ${jwt}` }
  }
);

const { alerts } = await response.json();
```

### Response

```json
{
  "alerts": [
    {
      "id": "alert_abc123",
      "contact": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "Sarah Chen",
        "warmth": 35,
        "warmth_band": "cool",
        "watch_status": "vip"
      },
      "threshold": 40,
      "triggered_at": "2025-01-15T09:00:00Z",
      "status": "active",
      "notification_sent": true,
      "notification_sent_at": "2025-01-15T09:00:05Z"
    }
  ],
  "total": 1
}
```

---

## Get Alert Details

```http
GET /v1/alerts/:id
```

### Response

```json
{
  "alert": {
    "id": "alert_abc123",
    "contact": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "Sarah Chen",
      "warmth": 35,
      "warmth_band": "cool",
      "warmth_trend": "declining",
      "last_interaction": "2024-12-01T10:00:00Z",
      "days_since_contact": 45
    },
    "threshold": 40,
    "triggered_at": "2025-01-15T09:00:00Z",
    "status": "active",
    "notification_sent": true
  }
}
```

---

## Take Action on Alert

Mark an alert as handled.

```http
PATCH /v1/alerts/:id
Content-Type: application/json
```

### Actions

| Action | Description | Effect |
|--------|-------------|--------|
| `dismiss` | Acknowledge alert | Alert dismissed permanently |
| `snooze` | Remind me later | Alert snoozed for 7 days |
| `reached_out` | I contacted them | Alert dismissed, interaction logged |

### Example - Dismiss

```typescript
await fetch(`/v1/alerts/${alertId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'dismiss'
  })
});
```

### Example - Snooze

```typescript
await fetch(`/v1/alerts/${alertId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    action: 'snooze',
    snooze_until: '2025-01-22T09:00:00Z'  // Optional, default is 7 days
  })
});
```

### Example - Reached Out

```typescript
await fetch(`/v1/alerts/${alertId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    action: 'reached_out',
    interaction: {
      kind: 'email',
      content: 'Sent re-engagement email'
    }
  })
});
```

---

## Push Notifications

### Register Device

```http
POST /v1/push-tokens
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ Yes | Expo push token |
| `device_id` | string | ✅ Yes | Unique device identifier |
| `platform` | string | ✅ Yes | ios, android, web |

### Example

```typescript
import * as Notifications from 'expo-notifications';

// Get Expo push token
const token = (await Notifications.getExpoPushTokenAsync()).data;

// Register with backend
await fetch('/v1/push-tokens', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token,
    device_id: Constants.installationId,
    platform: Platform.OS
  })
});
```

### Notification Payload

When warmth drops below threshold:

```json
{
  "title": "⚠️ VIP Contact Needs Attention",
  "body": "Sarah Chen's warmth dropped to 35/100",
  "data": {
    "type": "warmth_alert",
    "alert_id": "alert_abc123",
    "contact_id": "550e8400-e29b-41d4-a716-446655440000",
    "screen": "AlertDetails"
  }
}
```

---

## Common Patterns

### 1. VIP Contact Monitoring

```typescript
// Set all VIP contacts to high alert threshold
const vips = await fetch('/v1/contacts?tag=vip').then(r => r.json());

for (const contact of vips.contacts) {
  await fetch(`/v1/contacts/${contact.id}/watch`, {
    method: 'POST',
    body: JSON.stringify({
      watch_status: 'vip',
      warmth_threshold: 50
    })
  });
}
```

### 2. Daily Alert Check

```typescript
// Check for new alerts daily
async function checkDailyAlerts() {
  const { alerts } = await fetch('/v1/alerts?status=active', {
    headers: { 'Authorization': `Bearer ${jwt}` }
  }).then(r => r.json());
  
  if (alerts.length > 0) {
    console.log(`You have ${alerts.length} contacts that need attention`);
    
    // Group by priority
    const vipAlerts = alerts.filter(a => a.contact.watch_status === 'vip');
    console.log(`${vipAlerts.length} VIP contacts at risk`);
  }
}
```

### 3. Alert Dashboard

```typescript
function AlertsDashboard() {
  const { data } = useQuery(['alerts'], () =>
    fetch('/v1/alerts?status=active').then(r => r.json())
  );
  
  const handleReachOut = async (alertId: string, contactId: string) => {
    // Compose message
    const { message } = await fetch('/v1/agent/compose/smart', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: contactId,
        channel: 'email',
        goal: 're-engage'
      })
    }).then(r => r.json());
    
    // Show draft to user
    showDraftModal(message);
    
    // Mark alert as reached out
    await fetch(`/v1/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reached_out' })
    });
  };
  
  return (
    <div>
      {data?.alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onReachOut={() => handleReachOut(alert.id, alert.contact.id)}
        />
      ))}
    </div>
  );
}
```

---

## React Native Component

```typescript
import { View, Text, Button } from 'react-native';

export function AlertCard({ alert, onDismiss, onReachOut }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{alert.contact.display_name}</Text>
      <Text>Warmth: {alert.contact.warmth}/100</Text>
      <Text>Last contact: {alert.contact.days_since_contact} days ago</Text>
      
      <View style={styles.actions}>
        <Button title="Dismiss" onPress={onDismiss} />
        <Button title="Reach Out" onPress={onReachOut} />
      </View>
    </View>
  );
}
```

---

## Alert Cooldown

Alerts won't re-trigger for the same contact within 7 days to prevent notification spam.

```typescript
// Alert cooldown period
const COOLDOWN_DAYS = 7;

// After dismissing/reaching out, no new alert for 7 days
// even if warmth drops further
```

---

## Cron Job

Alerts are checked daily at 9 AM via cron job:

```typescript
// backend-vercel/app/api/cron/check-warmth-alerts/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Find contacts with warmth below threshold
  const alerts = await db.query(`
    SELECT * FROM contacts
    WHERE watch_status != 'none'
      AND warmth < warmth_threshold
      AND (last_alert_at IS NULL OR last_alert_at < NOW() - INTERVAL '7 days')
  `);
  
  // Create alerts and send push notifications
  for (const contact of alerts) {
    await createAlert(contact);
    await sendPushNotification(contact);
  }
  
  return Response.json({ processed: alerts.length });
}
```

---

## Best Practices

### 1. Set Appropriate Thresholds

```typescript
// Don't set thresholds too high
// VIP: 40-50 (warm/neutral boundary)
// Important: 30-40 (neutral/cool boundary)
// Watch: 20-30 (cool/cold boundary)

await setWatchStatus(contactId, {
  watch_status: 'vip',
  warmth_threshold: 45  // Alert when entering neutral zone
});
```

### 2. Handle Notifications Gracefully

```typescript
// Request permission first
const { status } = await Notifications.requestPermissionsAsync();

if (status === 'granted') {
  await registerPushToken();
} else {
  // Offer email alerts instead
  await enableEmailAlerts();
}
```

### 3. Batch Actions

```typescript
// Dismiss multiple alerts at once
const alertIds = selectedAlerts.map(a => a.id);

await Promise.all(
  alertIds.map(id =>
    fetch(`/v1/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'dismiss' })
    })
  )
);
```

---

## Next Steps

- [Warmth Scoring](./05-warmth-scoring.md) - Understand warmth calculation
- [AI Compose](./07-ai-compose.md) - Generate re-engagement messages
- [Contacts](./02-contacts.md) - Set watch status on contacts
