# Frontend API Guide

**Base URL:** `https://ever-reach-be.vercel.app`  
**Auth:** JWT Bearer token from Supabase Auth in `Authorization` header

---

## Quick Reference

| Category | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| **Contacts** | `/api/v1/contacts` | GET | List/search contacts |
| | `/api/v1/contacts` | POST | Create contact |
| | `/api/v1/contacts/:id` | GET | Get contact details |
| | `/api/v1/contacts/:id` | PATCH | Update contact |
| | `/api/v1/contacts/:id/tags` | POST | Add/remove tags |
| **Interactions** | `/api/v1/interactions` | GET | List interactions |
| | `/api/v1/interactions` | POST | Log interaction |
| **Warmth** | `/api/v1/contacts/:id/warmth/current` | GET | Current warmth score |
| | `/api/v1/contacts/:id/warmth/history` | GET | Daily warmth data |
| | `/api/v1/contacts/:id/warmth/windowed-history` | GET | Weekly/monthly aggregates |
| | `/api/v1/contacts/:id/warmth/recompute` | POST | Recalculate warmth |
| **AI** | `/api/v1/agent/compose/smart` | POST | Generate AI message |
| | `/api/v1/agent/voice-note/process` | POST | Process voice note |
| **Files** | `/api/v1/files` | POST | Get upload URL |
| | `/api/files/commit` | POST | Create attachment |
| | `/api/v1/files/:id/transcribe` | POST | Transcribe audio |
| **Notes** | `/api/v1/me/persona-notes` | GET | List notes |
| | `/api/v1/me/persona-notes` | POST | Create note |
| **Billing** | `/api/billing/checkout` | POST | Stripe checkout |
| | `/api/billing/portal` | POST | Billing portal |

---

## Authentication

```javascript
const token = (await supabase.auth.getSession()).data.session?.access_token;

const response = await fetch(`${API_BASE}/api/v1/contacts`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

---

## Contacts

### List Contacts

```javascript
GET /api/v1/contacts?warmth_band=hot&limit=50&sort=warmth.desc

// Query params
{
  q: 'search',
  tag: 'vip',
  warmth_band: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold',
  warmth_gte: 70,
  limit: 50,
  cursor: 'pagination_token'
}
```

### Create Contact

```javascript
POST /api/v1/contacts

{
  "display_name": "Jane Smith",
  "emails": ["jane@example.com"],
  "company": "TechCorp",
  "tags": ["prospect"]
}
```

### Update Tags

```javascript
POST /api/v1/contacts/:id/tags

{
  "add": ["vip", "priority"],
  "remove": ["prospect"]
}
```

---

## Warmth Tracking

### Current Score

```javascript
GET /api/v1/contacts/:id/warmth/current

// Response
{
  "warmth": 72,
  "warmth_band": "hot",
  "days_since_last_interaction": 4,
  "interaction_count": 15
}
```

### Daily History

```javascript
GET /api/v1/contacts/:id/warmth/history?limit=30

// Response
{
  "history": [
    { "date": "2025-10-29", "warmth": 72, "interaction_count": 1 },
    { "date": "2025-10-28", "warmth": 68, "interaction_count": 0 }
  ]
}
```

### Weekly/Monthly Aggregates

```javascript
GET /api/v1/contacts/:id/warmth/windowed-history?window_size=week&limit=12

// Response
{
  "windows": [
    {
      "window_start": "2025-10-21",
      "avg_warmth": 70.5,
      "interaction_count": 3
    }
  ]
}
```

### Recompute (Force Refresh)

```javascript
POST /api/v1/contacts/:id/warmth/recompute

// Use after adding interactions to get fresh score
```

---

## AI Features

### Compose Smart Message

```javascript
POST /api/v1/agent/compose/smart

{
  "contact_id": "uuid",
  "goal": "networking",
  "channel": "email",
  "tone": "warm",
  "include_context": true
}

// Response
{
  "draft": {
    "email": {
      "subject": "Great Catching Up!",
      "body": "Hi John,\n\nIt was wonderful..."
    }
  },
  "context_used": ["interactions", "voice_notes"],
  "usage": { "total_tokens": 570 }
}
```

---

## File Uploads

### 3-Step Flow

```javascript
// 1. Get presigned URL
POST /api/v1/files
{ "path": "uploads/file.wav", "contentType": "audio/wav" }
→ { "url": "presigned_url", "path": "uploads/file.wav" }

// 2. Upload to storage
PUT <presigned_url>
Body: file blob

// 3. Commit metadata
POST /api/files/commit
{ "path": "uploads/file.wav", "mime_type": "audio/wav", "size_bytes": 12345 }
→ { "attachment": { "id": "uuid" } }
```

### Transcribe Audio

```javascript
POST /api/v1/files/:id/transcribe
{ "language": "en" }

// Response
{
  "transcript": "Transcribed text...",
  "metadata": {
    "was_chunked": true,
    "chunks_processed": 2
  }
}
```

---

## Interactions

### Log Interaction

```javascript
POST /api/v1/interactions

{
  "contact_id": "uuid",
  "kind": "email",
  "content": "Discussed Q4 timeline",
  "metadata": {
    "direction": "outgoing",
    "sentiment": "positive"
  }
}
```

---

## Error Handling

```javascript
async function apiCall(url, options) {
  const token = await getAuthToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 401) {
      // Refresh token and retry
      await refreshToken();
      return apiCall(url, options);
    }
    
    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = response.headers.get('Retry-After');
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return apiCall(url, options);
    }
    
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}
```

---

## Complete Examples

See [`docs/API_EXAMPLES.md`](./API_EXAMPLES.md) for:
- React hooks
- Error handling
- Caching strategies
- TypeScript types
- Real-world workflows
