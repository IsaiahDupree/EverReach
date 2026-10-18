# Dev Dashboard Guide

Real-time event monitoring for frontend & mobile apps.

---

## 🚀 Quick Start

### Access Dashboard

```
https://ever-reach-be.vercel.app/dev/dashboard
```

---

## 📊 Features

### Real-Time Monitoring
- Auto-refresh every 3 seconds
- Manual refresh on demand
- Filter by event type
- Expand events for full details

### Event Statistics
- Total events (last 100)
- Unique event types
- 24-hour event count
- Most frequent event

### Event Details
- Event name with color coding
- Timestamp (relative time)
- User vs anonymous tracking
- Properties & context JSON
- Event ID for debugging

---

## 🔌 Integration

### From Frontend (React/Next.js)

```typescript
// lib/analytics.ts
const API_BASE = 'https://ever-reach-be.vercel.app';

export async function trackEvent(
  eventName: string,
  properties: Record<string, any> = {},
  context: Record<string, any> = {}
) {
  try {
    const userId = await getCurrentUserId(); // Your auth logic
    
    await fetch(`${API_BASE}/api/dev/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        user_id: userId || null,
        anonymous_id: userId ? null : getAnonymousId(),
        properties,
        context: {
          ...context,
          page: window.location.pathname,
          referrer: document.referrer,
          user_agent: navigator.userAgent
        }
      })
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Usage
trackEvent('page_view', {
  page: '/dashboard',
  section: 'contacts'
});

trackEvent('button_click', {
  button_id: 'compose-message',
  contact_id: 'uuid'
});

trackEvent('api_call', {
  endpoint: '/api/v1/contacts',
  method: 'GET',
  response_time: 234
});
```

### From Mobile (React Native / Expo)

```typescript
// services/analytics.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://ever-reach-be.vercel.app';

async function getAnonymousId() {
  let id = await AsyncStorage.getItem('anonymous_id');
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem('anonymous_id', id);
  }
  return id;
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, any> = {}
) {
  try {
    const userId = await getCurrentUserId(); // Your auth logic
    const anonymousId = await getAnonymousId();
    
    await fetch(`${API_BASE}/api/dev/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        user_id: userId || null,
        anonymous_id: userId ? null : anonymousId,
        properties,
        context: {
          platform: Platform.OS,
          app_version: '1.0.0'
        }
      })
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Usage
trackEvent('screen_view', {
  screen: 'ContactDetail',
  contact_id: 'uuid'
});

trackEvent('interaction_logged', {
  contact_id: 'uuid',
  type: 'email'
});
```

---

## 📝 Common Events to Track

### Page/Screen Views
```typescript
trackEvent('page_view', {
  page: '/contacts',
  previous_page: '/dashboard'
});

trackEvent('screen_view', {
  screen: 'ContactList',
  filter: 'hot'
});
```

### User Actions
```typescript
trackEvent('button_click', {
  button_id: 'compose-message',
  location: 'contact_detail'
});

trackEvent('search_query', {
  query: 'john',
  results_count: 5
});

trackEvent('filter_applied', {
  filter_type: 'warmth_band',
  filter_value: 'hot'
});
```

### API Calls
```typescript
trackEvent('api_call', {
  endpoint: '/api/v1/contacts',
  method: 'GET',
  status: 200,
  response_time: 234
});

trackEvent('api_error', {
  endpoint: '/api/v1/compose/smart',
  method: 'POST',
  status: 500,
  error: 'Rate limit exceeded'
});
```

### Feature Usage
```typescript
trackEvent('warmth_recomputed', {
  contact_id: 'uuid',
  old_score: 65,
  new_score: 72
});

trackEvent('message_composed', {
  contact_id: 'uuid',
  channel: 'email',
  tone: 'warm',
  ai_tokens: 570
});

trackEvent('voice_note_uploaded', {
  file_size: 12345,
  duration: 120,
  transcription_time: 5.2
});
```

### Errors
```typescript
trackEvent('error', {
  error_type: 'network',
  error_message: 'Failed to fetch contacts',
  stack_trace: error.stack,
  user_action: 'refresh_contacts_list'
});
```

---

## 🎨 Event Color Coding

Dashboard automatically color-codes events:

| Pattern | Color | Example Events |
|---------|-------|----------------|
| `page_view` | Blue | page_view, screen_view |
| `button_click` | Green | button_click, tap, press |
| `api_call` | Purple | api_call, api_request, fetch |
| `error` | Red | error, api_error, crash |
| `user_action` | Yellow | search, filter, scroll |
| Other | Gray | Custom events |

---

## 🔍 Dashboard Filters

### Filter by Event Type
Use dropdown to see only specific events

### Filter by User
Query param: `?user_id=uuid`

### Filter by Time Range
Query param: `?limit=100` (default)

---

## 🛠️ API Reference

### POST /api/dev/events

Track a new event

**Request:**
```json
{
  "event_name": "page_view",
  "user_id": "uuid",
  "anonymous_id": "anon_123",
  "properties": {
    "page": "/contacts",
    "filter": "hot"
  },
  "context": {
    "platform": "web",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": 12345,
    "event_name": "page_view",
    "occurred_at": "2025-10-30T23:00:00Z"
  }
}
```

---

### GET /api/dev/events

Fetch events for dashboard

**Query Parameters:**
- `limit` - Number of events (default: 100)
- `event_name` - Filter by event name
- `user_id` - Filter by user ID

**Response:**
```json
{
  "events": [
    {
      "id": 12345,
      "event_name": "page_view",
      "user_id": "uuid",
      "anonymous_id": null,
      "occurred_at": "2025-10-30T23:00:00Z",
      "properties": {},
      "context": {}
    }
  ],
  "meta": {
    "total": 100,
    "uniqueEventNames": ["page_view", "button_click"],
    "eventCounts": {
      "page_view": 45,
      "button_click": 23
    },
    "filters": {
      "event_name": null,
      "user_id": null,
      "limit": 100
    }
  }
}
```

---

## 🚦 Best Practices

### 1. Use Consistent Naming
```typescript
// ✅ Good
trackEvent('page_view', { page: '/contacts' });
trackEvent('button_click', { button_id: 'compose' });

// ❌ Bad
trackEvent('PageView', { page: '/contacts' });
trackEvent('clicked_button', { id: 'compose' });
```

### 2. Include Context
```typescript
trackEvent('error', {
  error_message: error.message,
  context: {
    page: window.location.pathname,
    user_action: 'submit_form',
    timestamp: Date.now()
  }
});
```

### 3. Don't Track PII
```typescript
// ❌ Bad - Contains email
trackEvent('form_submitted', {
  email: 'user@example.com'
});

// ✅ Good - No PII
trackEvent('form_submitted', {
  form_id: 'contact_form',
  field_count: 5
});
```

### 4. Track User Flow
```typescript
// Track the complete user journey
trackEvent('page_view', { page: '/contacts' });
trackEvent('filter_applied', { filter: 'hot' });
trackEvent('contact_clicked', { contact_id: 'uuid' });
trackEvent('button_click', { button_id: 'compose-message' });
trackEvent('message_composed', { channel: 'email' });
```

---

## 📊 Analytics Queries

Events are stored in `app_events` table with helper functions:

### Get Event Counts
```sql
SELECT get_event_counts(
  'user-uuid',
  ARRAY['page_view', 'button_click']
);
```

### Get Last Event
```sql
SELECT get_last_event('user-uuid', 'page_view');
```

### Get Event Timeline
```sql
SELECT * FROM get_event_timeline(
  'user-uuid',
  NOW() - INTERVAL '7 days',
  NOW(),
  100
);
```

### Custom Queries
```sql
-- Most popular pages (last 7 days)
SELECT
  properties->>'page' as page,
  COUNT(*) as views
FROM app_events
WHERE event_name = 'page_view'
  AND occurred_at >= NOW() - INTERVAL '7 days'
GROUP BY properties->>'page'
ORDER BY views DESC
LIMIT 10;

-- User funnel analysis
SELECT
  event_name,
  COUNT(DISTINCT user_id) as unique_users
FROM app_events
WHERE event_name IN ('page_view', 'contact_clicked', 'message_composed')
  AND occurred_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_name;
```

---

## 🔐 Security Notes

1. **Service Role Only:** Event insertion requires service role key
2. **RLS Enabled:** Users can only see their own events
3. **No PII:** Don't track sensitive user data
4. **Rate Limiting:** Consider rate limiting for production

---

## 🚀 Deployment

Dashboard is deployed at: `https://ever-reach-be.vercel.app/dev/dashboard`

To update:
```bash
git add .
git commit -m "feat: update dev dashboard"
git push origin feat/backend-vercel-only-clean
```

Vercel auto-deploys on push.

---

## 🐛 Troubleshooting

### Events not showing up?
1. Check `app_events` table exists (run migration)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check network tab for API errors
4. Verify event payload format

### Dashboard not loading?
1. Check Vercel deployment logs
2. Verify environment variables
3. Check browser console for errors

### Auto-refresh not working?
1. Click "Auto-refresh ON" toggle
2. Check for JavaScript errors
3. Refresh the page

---

**Dashboard URL:** https://ever-reach-be.vercel.app/dev/dashboard  
**Migration:** Run `migrations/00XX_app_events.sql` if not already run
