# 🚀 API Quick Reference

**Backend:** `https://ever-reach-be.vercel.app`  
**Updated:** October 5, 2025

Complete list of frontend → backend API calls with usage examples.

---

## 📋 Table of Contents

1. [Health & Status](#health--status)
2. [User & Auth](#user--auth)
3. [Contacts](#contacts)
4. [AI Agent Features](#ai-agent-features)
   - [Screenshot Analysis (with tier limits)](#screenshot-analysis)
   - [Chat & Conversations](#chat)
   - [Voice Notes](#voice-notes)
   - [Contact Analysis](#contact-analysis)
   - [Smart Compose](#smart-compose)
   - [Proactive Suggestions](#proactive-suggestions)
5. [Templates & Pipelines](#templates--pipelines)
6. [Billing & Usage](#billing--usage)

---

## 🏥 Health & Status

```typescript
// Check backend health
GET /api/health

// Check version
GET /api/version

// Configuration status
GET /api/v1/ops/config-status
```

---

## 👤 User & Auth

```typescript
// Get current user
GET /api/v1/me

// Get subscription & limits
GET /api/v1/me/entitlements
Response: {
  subscription_tier: "core",
  limits: {
    screenshots_per_month: 100,
    screenshots_used: 45,
    screenshots_remaining: 55
  }
}
```

---

## 👥 Contacts

```typescript
// List contacts
GET /api/v1/contacts?limit=20&warmth_band=cold

// Search
GET /api/v1/contacts?q=john+smith

// Get one
GET /api/v1/contacts/:id

// Create
POST /api/v1/contacts
Body: { display_name, email, phone, tags, ... }

// Update
PUT /api/v1/contacts/:id

// Delete
DELETE /api/v1/contacts/:id

// Recompute warmth
POST /api/v1/contacts/:id/warmth/recompute
```

---

## 🤖 AI Agent Features

### Screenshot Analysis
**⚡ WITH TIER LIMITS: Core=100, Pro=300, Enterprise=Unlimited**

```typescript
POST /v1/agent/analyze/screenshot

Request: {
  image_url: string,              // REQUIRED
  channel: "sms"|"email"|"linkedin",
  contact_id?: string,
  save_to_database?: boolean
}

Success Response: {
  ocr_text: "...",
  inferred_goal: {...},
  variables: {...},
  sentiment: "positive"|"neutral"|"negative",
  urgency: "high"|"medium"|"low",
  
  // 🆕 Usage tracking
  usage: {
    current: 46,
    limit: 100,
    remaining: 54,
    resets_at: "2025-11-01T00:00:00Z",
    tier: "core"
  }
}

Limit Exceeded (429): {
  error: {
    code: "usage_limit_exceeded",
    details: {
      current_usage: 100,
      limit: 100,
      resets_at: "2025-11-01T00:00:00Z"
    }
  }
}
```

### Chat
```typescript
// Send message
POST /v1/agent/chat
Body: { message, conversation_id?, context? }

// Stream (SSE)
POST /v1/agent/chat/stream

// List conversations
GET /v1/agent/conversation

// Get conversation
GET /v1/agent/conversation/:id

// Delete conversation
DELETE /v1/agent/conversation/:id
```

### Voice Notes
```typescript
POST /v1/agent/voice-note/process

Body: {
  audio_url: string,
  transcription?: string,
  duration_seconds?: number
}

Response: {
  transcription: "...",
  mentioned_contacts: [...],
  action_items: [...],
  sentiment: "positive",
  categories: ["meeting", "business"],
  suggested_tags: ["follow-up", "q4"]
}
```

### Contact Analysis
```typescript
POST /v1/agent/analyze/contact

Body: {
  contact_id: string,
  analysis_type: "relationship_health" | 
                 "engagement_suggestions" | 
                 "context_summary" | 
                 "full_analysis"
}
```

### Smart Compose
```typescript
POST /v1/agent/compose/smart

Body: {
  contact_id: string,
  channel: "sms"|"email"|"linkedin",
  goal_id?: string,
  tone?: "professional"|"casual"|"friendly",
  context?: string
}

Response: {
  message: {
    subject?: "...",
    body: "...",
    channel: "email"
  },
  context_used: {...},
  alternative_messages: [...]
}
```

### Proactive Suggestions
```typescript
GET /v1/agent/suggest/actions

Response: {
  cold_contacts: [...],          // Needs attention
  upcoming_followups: [...],     // Scheduled items
  relationship_opportunities: [...],
  recommended_actions: [...]     // Prioritized
}
```

---

## 📋 Templates & Pipelines

```typescript
// Templates
GET /api/v1/templates?category=follow_up
GET /api/v1/templates/:id

// Pipelines
GET /api/v1/pipelines
GET /api/v1/pipelines/:key/stages
```

---

## 💳 Billing & Usage

```typescript
// Usage stats
GET /api/me/usage-summary?window=30d

// Impact metrics
GET /api/me/impact-summary?window=90d

// Plan recommendation
GET /api/me/plan-recommendation

// Stripe checkout
POST /api/billing/checkout
Body: { tier: "pro"|"enterprise" }
Response: { checkout_url, session_id }
```

---

## 🔑 Authentication

All calls use `apiFetch()` which automatically adds Supabase JWT:

```typescript
import { apiFetch } from '@/lib/api';

// Automatically authenticated
const user = await apiFetch('/api/v1/me');

// Explicit auth required
const contacts = await apiFetch('/api/v1/contacts', {
  requireAuth: true
});
```

---

## ⚠️ Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `unauthorized` | 401 | Missing/invalid token |
| `forbidden` | 403 | No permission |
| `not_found` | 404 | Resource doesn't exist |
| `usage_limit_exceeded` | 429 | Hit tier limit |
| `server_error` | 500 | Backend error |

---

## 🎯 Common Flows

### 1. App Startup
```typescript
1. GET /api/health
2. GET /api/v1/me
3. GET /api/v1/me/entitlements
4. GET /api/v1/contacts?limit=20
```

### 2. Screenshot Analysis
```typescript
1. POST /v1/agent/analyze/screenshot
2. Check usage.remaining
3. If < 10, show upgrade prompt
4. If 429, show "limit reached" modal
```

### 3. AI Chat
```typescript
1. POST /v1/agent/chat
2. Agent calls tools (search_contacts, get_interactions)
3. Returns response with context
```

---

## 📊 Tier Limits

| Feature | Core (Free) | Pro ($29.99) | Enterprise ($99.99) |
|---------|-------------|--------------|---------------------|
| Screenshots | 100/month | 300/month | Unlimited |
| Voice Notes | Unlimited | Unlimited | Unlimited |
| AI Chat | Unlimited | Unlimited | Unlimited |
| Smart Compose | Unlimited | Unlimited | Unlimited |

**Limits reset:** 1st of each month at 00:00 UTC

---

## 🔗 Links

- **Backend Repo:** [feat/backend-vercel-only-clean](https://github.com/IsaiahDupree/rork-ai-enhanced-personal-crm/tree/feat/backend-vercel-only-clean)
- **Vercel Dashboard:** https://vercel.com/isaiahduprees-projects/backend-vercel
- **Full Documentation:** See `FRONTEND_API_GUIDE.md` (coming soon)

---

**Need help?** Check `lib/api.ts` and `constants/endpoints.ts` for implementation details.
