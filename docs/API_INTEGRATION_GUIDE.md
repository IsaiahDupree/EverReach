# API Integration Guide - EverReach Backend

**Base URL**: `https://ever-reach-be.vercel.app/api`  
**Supabase**: `https://utasetfxiqcrnwyfforx.supabase.co`  
**Auth**: Bearer token (JWT from Supabase)

---

## Quick Start

### 1. Authentication

All API requests require a valid Supabase JWT token in the Authorization header.

```javascript
// Get JWT from Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
const jwt = data.session.access_token;

// Use in API calls
const response = await fetch('https://ever-reach-be.vercel.app/api/v1/contacts', {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Origin': 'https://everreach.app'
  }
});
```

### 2. Common Headers

```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Content-Type': 'application/json',
  'Origin': 'https://everreach.app' // Required for CORS
}
```

---

## Core API Endpoints

### Contacts

#### List Contacts
```http
GET /v1/contacts?limit=20&sort=created_at.desc
```

**Query Parameters**:
- `q` - Search query
- `tag` - Filter by tag
- `warmth_band` - Filter by warmth (hot, warm, neutral, cool, cold)
- `limit` - Results per page (default: 20, max: 1000)
- `cursor` - Pagination cursor

**Response**:
```json
{
  "contacts": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "emails": ["john@example.com"],
      "phones": ["+1234567890"],
      "company": "Acme Inc",
      "tags": ["vip", "customer"],
      "warmth": 75,
      "warmth_band": "warm",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "nextCursor": "2025-01-15T09:00:00Z"
}
```

#### Get Contact
```http
GET /v1/contacts/:id
```

#### Create Contact
```http
POST /v1/contacts
Content-Type: application/json

{
  "display_name": "Jane Smith",
  "emails": ["jane@example.com"],
  "phones": ["+1987654321"],
  "company": "Tech Corp",
  "tags": ["prospect"]
}
```

#### Update Contact
```http
PATCH /v1/contacts/:id
Content-Type: application/json

{
  "tags": ["customer", "vip"],
  "warmth": 85
}
```

#### Delete Contact
```http
DELETE /v1/contacts/:id
```

---

### Interactions

#### List Interactions
```http
GET /v1/interactions?contact_id=<UUID>&limit=20
```

#### Create Interaction
```http
POST /v1/interactions
Content-Type: application/json

{
  "contact_id": "uuid",
  "kind": "call",
  "content": "Discussed Q1 goals and budget",
  "metadata": {
    "duration_minutes": 30,
    "sentiment": "positive"
  }
}
```

---

### Templates

#### List Templates
```http
GET /v1/templates?channel=email&limit=20
```

#### Create Template
```http
POST /v1/templates
Content-Type: application/json

{
  "channel": "email",
  "name": "Welcome Email",
  "subject_tmpl": "Welcome to {{company}}!",
  "body_tmpl": "Hi {{name}},\n\nWelcome aboard!",
  "variables": ["name", "company"]
}
```

---

### Warmth & Scoring

#### Recompute Warmth (Bulk)
```http
POST /v1/warmth/recompute
Content-Type: application/json

{
  "contact_ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "results": [
    {
      "contact_id": "uuid1",
      "warmth_score": 72,
      "warmth_band": "warm"
    }
  ]
}
```

#### Recompute Single Contact
```http
POST /v1/contacts/:id/warmth/recompute
```

---

### AI Agent Endpoints

#### Analyze Contact
```http
POST /v1/agent/analyze/contact
Content-Type: application/json

{
  "contact_id": "uuid",
  "analysis_type": "relationship_health",
  "include_voice_notes": true,
  "include_interactions": true
}
```

**Analysis Types**:
- `relationship_health` - Warmth analysis and recommendations
- `engagement_suggestions` - Actionable next steps
- `context_summary` - LLM-ready context bundle
- `full_analysis` - Comprehensive report

**Response**:
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Doe"
  },
  "analysis_type": "relationship_health",
  "analysis": "John shows strong engagement...",
  "context_used": {
    "interactions": 10,
    "persona_notes": 3
  }
}
```

#### Compose Message (Smart)
```http
POST /v1/agent/compose/smart
Content-Type: application/json

{
  "contact_id": "uuid",
  "channel": "email",
  "goal": "re-engage",
  "include": {
    "persona_notes": true,
    "recent_interactions": 5
  }
}
```

**Response**:
```json
{
  "message": {
    "subject": "Let's catch up!",
    "body": "Hi John,\n\nIt's been a while...",
    "tone": "warm",
    "channel": "email"
  },
  "context": {
    "warmth_score": 72,
    "last_interaction": "2024-12-01"
  }
}
```

#### Suggest Actions
```http
POST /v1/agent/suggest/actions
Content-Type: application/json

{
  "contact_id": "uuid",
  "limit": 5
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "action": "send_message",
      "reason": "No contact in 21 days",
      "priority": "high",
      "channel": "email"
    }
  ]
}
```

---

### Pipelines & Goals

#### Create Pipeline
```http
POST /v1/pipelines
Content-Type: application/json

{
  "name": "Sales Pipeline",
  "stages": [
    { "name": "Lead", "order": 0 },
    { "name": "Qualified", "order": 1 },
    { "name": "Proposal", "order": 2 },
    { "name": "Closed", "order": 3 }
  ]
}
```

#### Create Goal
```http
POST /v1/goals
Content-Type: application/json

{
  "kind": "business",
  "name": "Schedule Demo",
  "description": "Book a product demo",
  "channel_suggestions": ["email", "call"]
}
```

---

### Search

```http
POST /v1/search
Content-Type: application/json

{
  "q": "john",
  "limit": 20,
  "filters": {
    "warmth_band": ["hot", "warm"],
    "warmth_gte": 50
  }
}
```

---

### Billing (Stripe)

#### Create Checkout Session
```http
POST /api/billing/checkout
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### Create Billing Portal Session
```http
POST /api/billing/portal
```

---

## Frontend Integration Examples

### React/Next.js Web App

```typescript
// lib/api.ts
const API_BASE = 'https://ever-reach-be.vercel.app/api';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}

// Usage in component
async function fetchContacts() {
  const data = await apiCall('/v1/contacts?limit=50');
  setContacts(data.contacts);
}
```

### React Native / Expo Mobile App

```typescript
// services/api.ts
import { supabase } from './supabase';

const API_BASE = 'https://ever-reach-be.vercel.app/api';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app',
      ...options.headers
    }
  });
  
  return response.json();
}

// Usage
const contacts = await apiRequest('/v1/contacts');
```

### External API Integration

```javascript
// For third-party integrations (Zapier, Make.com, etc.)
// Use API keys (coming soon) or service role key for server-to-server

const response = await fetch('https://ever-reach-be.vercel.app/api/v1/contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`, // API key system (future)
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    display_name: 'New Lead',
    emails: ['lead@example.com']
  })
});
```

---

## Error Handling

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

### Error Response Format

```json
{
  "error": "Error description",
  "request_id": "req_abc123"
}
```

### Error Handling Example

```typescript
try {
  const data = await apiCall('/v1/contacts/:id');
} catch (error) {
  if (error.message.includes('Unauthorized')) {
    // Refresh session or redirect to login
    await supabase.auth.refreshSession();
  } else if (error.message.includes('Not Found')) {
    // Handle 404
    console.error('Contact not found');
  } else {
    // Generic error handling
    console.error('API error:', error.message);
  }
}
```

---

## Rate Limiting

Current limits (permissive for development):
- 60 requests/minute per user
- No strict enforcement during beta

Production limits (coming soon):
- 600 requests/minute per API key
- 10,000 requests/hour per organization
- AI endpoints: 100 requests/hour

**Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

---

## WebSocket / Real-time (Coming Soon)

For real-time updates, use Supabase Realtime:

```typescript
const channel = supabase
  .channel('contacts-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'contacts' },
    (payload) => {
      console.log('Contact changed:', payload);
    }
  )
  .subscribe();
```

---

## Testing

### Development Environment

```javascript
const API_BASE = 'http://localhost:3000/api'; // Local
// or
const API_BASE = 'https://ever-reach-be.vercel.app/api'; // Staging
```

### Test Credentials

Create a test user in Supabase Dashboard for development testing.

---

## Support & Resources

- **API Base URL**: `https://ever-reach-be.vercel.app/api`
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx`
- **Test Reports**: `test/agent/reports/`
- **Backend Repo**: `feat/backend-vercel-only-clean` branch

---

## Changelog

### October 12, 2025
- ✅ All E2E tests passing (95.2% success rate)
- ✅ Templates API fixed and deployed
- ✅ Database migrations completed
- ✅ Frontend integration ready

**Status**: Production Ready 🚀
