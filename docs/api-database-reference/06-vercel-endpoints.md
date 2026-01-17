# Complete Vercel API Endpoints Reference

## 🌐 Base URL
```
Production: https://ever-reach-be.vercel.app
Local Dev: http://localhost:3000
```

## 📋 All Endpoints (80+)

### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

### Authentication & User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/me` | Get current user profile |
| GET | `/api/v1/me/usage-summary` | Usage statistics |
| GET | `/api/v1/me/impact-summary` | Impact metrics |
| GET | `/api/v1/me/plan-recommendation` | Recommended plan upgrade |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/contacts` | List contacts |
| POST | `/api/v1/contacts` | Create contact |
| GET | `/api/v1/contacts/:id` | Get contact details |
| PUT | `/api/v1/contacts/:id` | Update contact |
| DELETE | `/api/v1/contacts/:id` | Delete contact |
| GET | `/api/v1/contacts/search` | Search contacts |
| GET | `/api/v1/contacts/:id/files` | List contact files |
| POST | `/api/v1/contacts/:id/files` | Upload contact file |
| GET | `/api/v1/contacts/:id/notes` | List contact notes |
| POST | `/api/v1/contacts/:id/notes` | Create contact note |
| GET | `/api/v1/contacts/:id/messages` | List contact messages |
| GET | `/api/v1/contacts/:id/context-summary` | AI context summary |
| POST | `/api/v1/contacts/:id/goal-suggestions` | AI goal suggestions |

### Pipeline Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/contacts/:id/pipeline` | Get pipeline state |
| POST | `/api/v1/contacts/:id/pipeline/move` | Move to different stage |
| GET | `/api/v1/contacts/:id/pipeline/history` | Pipeline transition history |

### Interactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/interactions` | List interactions |
| POST | `/api/v1/interactions` | Create interaction |
| GET | `/api/v1/interactions/:id` | Get interaction |
| PUT | `/api/v1/interactions/:id` | Update interaction |
| DELETE | `/api/v1/interactions/:id` | Delete interaction |
| POST | `/api/v1/interactions/:id/files` | Upload interaction file |

### Messages & Threads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/messages` | List messages (NEW) |
| POST | `/api/v1/messages` | Log a message |
| GET | `/api/messages/prepare` | Prepare message thread |
| POST | `/api/messages/craft` | Craft AI message |
| POST | `/api/v1/compose` | AI message composition |
| POST | `/api/v1/compose/validate` | Validate message goal |

### Voice Notes (Persona Notes)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/me/persona-notes` | List voice notes |
| POST | `/api/v1/me/persona-notes` | Create voice note |
| GET | `/api/v1/me/persona-notes/:id` | Get voice note |
| PUT | `/api/v1/me/persona-notes/:id` | Update voice note |
| DELETE | `/api/v1/me/persona-notes/:id` | Delete voice note |
| POST | `/api/v1/me/persona-notes/:id/transcribe` | Transcribe voice note |

### Agent AI System (12 Endpoints)

#### Testing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/openai/test` | Check OpenAI status |
| POST | `/api/v1/openai/test` | Test OpenAI with prompt |
| GET | `/api/v1/openai/models` | List available models |

#### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/chat` | Agent chat (single-turn) |
| POST | `/api/v1/agent/chat/stream` | Agent chat (streaming SSE) |
| GET | `/api/v1/agent/conversation` | List conversations |
| GET | `/api/v1/agent/conversation/:id` | Get conversation |
| DELETE | `/api/v1/agent/conversation/:id` | Delete conversation |

#### Voice Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/voice-note/process` | Process voice note with AI |

#### Contact Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/analyze/contact` | Analyze contact relationship |

#### Smart Composition
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/compose/smart` | AI smart message composition |

#### Proactive Suggestions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent/suggest/actions` | Get action suggestions |

#### Tools
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agent/tools` | List agent tools |

### Screenshots & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analysis/screenshot` | Analyze screenshot |
| GET | `/api/v1/analysis/screenshot/:id` | Get screenshot analysis |

### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/daily` | Get daily recommendations |

### File Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads/sign` | Get signed upload URL |
| POST | `/api/files/commit` | Commit uploaded file |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/checkout` | Create Stripe checkout |
| POST | `/api/billing/portal` | Create billing portal session |
| POST | `/api/v1/billing/restore` | Restore purchases |
| GET | `/api/v1/billing/app-store/transactions` | List App Store transactions |
| GET | `/api/v1/billing/play/transactions` | List Play Store transactions |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/v1/webhooks/app-store` | App Store webhook |
| POST | `/api/v1/webhooks/play` | Play Store webhook |

### Analytics & Telemetry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trending/prompts` | Trending prompts |
| POST | `/api/telemetry/prompt-first` | Log prompt-first usage |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit-logs` | Get audit logs (admin) |

### Cron Jobs (Internal)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/daily-recs` | Generate daily recommendations |
| GET | `/api/cron/entitlements-sanity` | Check entitlements |
| GET | `/api/cron/interaction-metrics` | Calculate metrics |
| GET | `/api/cron/paywall-rollup` | Paywall analytics |
| GET | `/api/cron/prompts-rollup` | Prompts analytics |
| GET | `/api/cron/score-leads` | Score leads |

### TRPC (Type-safe RPC)
| Method | Endpoint | Description |
|--------|----------|-------------|
| ALL | `/api/trpc/:procedure` | TRPC procedures |

## 📖 Detailed Endpoint Documentation

### GET `/api/v1/contacts`

List all contacts for authenticated user.

**Query Parameters:**
- `limit` (number, default: 20, max: 1000) - Results per page
- `cursor` (ISO timestamp) - Pagination cursor
- `tag` (string) - Filter by tag
- `pipeline_id` (UUID) - Filter by pipeline
- `stage_id` (UUID) - Filter by pipeline stage
- `query` (string) - Search query (name, email, phone)
- `sort` (string) - Sort field (default: updated_at)
- `order` (asc|desc) - Sort order (default: desc)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "emails": [{"email": "john@example.com"}],
      "phones": [{"phone": "+1234567890"}],
      "warmth": 75,
      "warmth_band": "warm",
      "tags": ["client", "vip"],
      "last_interaction_at": "2025-10-01T12:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-01T12:00:00Z"
    }
  ],
  "limit": 20,
  "nextCursor": "2025-10-01T11:00:00Z"
}
```

---

### POST `/api/v1/contacts`

Create a new contact.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: unique-key (optional)
```

**Request:**
```json
{
  "display_name": "Jane Smith",
  "emails": [{"email": "jane@example.com", "type": "work"}],
  "phones": [{"phone": "+1234567890", "type": "mobile"}],
  "company": "Acme Inc",
  "tags": ["prospect"],
  "notes": "Met at conference",
  "metadata": {}
}
```

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "display_name": "Jane Smith",
    "created_at": "2025-10-04T10:00:00Z"
  }
}
```

---

### POST `/api/v1/agent/chat`

Send message to AI agent.

**Request:**
```json
{
  "message": "Show me contacts I need to follow up with",
  "conversation_id": "uuid-optional",
  "context": {
    "contact_id": "uuid-optional",
    "goal_type": "networking",
    "use_tools": true
  },
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "conversation_id": "uuid",
  "message": "I found 3 contacts you should follow up with: John (last contact 2 weeks ago), Sarah (mentioned in voice note), and Mike (pipeline: warm lead)...",
  "tool_calls_made": 3,
  "tools_used": ["search_contacts", "get_persona_notes", "get_contact_interactions"],
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 125,
    "total_tokens": 575
  }
}
```

---

### POST `/api/v1/agent/voice-note/process`

Process voice note with AI intelligence.

**Request:**
```json
{
  "note_id": "uuid",
  "extract_contacts": true,
  "extract_actions": true,
  "categorize": true,
  "suggest_tags": true
}
```

**Response:**
```json
{
  "note_id": "uuid",
  "processed": true,
  "extracted": {
    "contacts": ["John Doe", "Sarah Smith"],
    "actions": ["Follow up on proposal", "Schedule call"],
    "category": "business",
    "tags": ["sales", "follow-up", "proposal"],
    "sentiment": "positive",
    "topics": ["partnership", "collaboration"]
  },
  "contact_matches": [
    {
      "mentioned": "John Doe",
      "possible_matches": [
        {"id": "uuid", "display_name": "John Doe"}
      ]
    }
  ],
  "tags_added": ["sales", "follow-up"]
}
```

---

### POST `/api/v1/agent/compose/smart`

Generate context-aware message.

**Request:**
```json
{
  "contact_id": "uuid",
  "goal_type": "networking",
  "goal_description": "Catch up and explore partnership",
  "channel": "email",
  "tone": "warm",
  "include_voice_context": true,
  "include_interaction_history": true,
  "max_length": 500
}
```

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Doe"
  },
  "message": {
    "channel": "email",
    "subject": "Long Time No See! Let's Catch Up",
    "body": "Hi John,\n\nI hope this finds you well! It's been a while since we last connected...",
    "tone": "warm",
    "estimated_length": 342
  },
  "context_sources": {
    "voice_notes_used": true,
    "interactions_used": true,
    "contact_warmth": 75
  }
}
```

---

## 🔐 Authentication

All endpoints (except health check and webhooks) require authentication:

```
Authorization: Bearer <supabase_access_token>
```

Get token from Supabase auth session:
```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;
```

## 📊 Common Response Patterns

### Success Response
```json
{
  "data_field": "value",
  "metadata": {}
}
```

### Error Response
```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

### Paginated Response
```json
{
  "items": [],
  "limit": 20,
  "nextCursor": "2025-10-01T12:00:00Z"
}
```

## Next Steps

See [08-vercel-integration.md](./08-vercel-integration.md) for frontend integration examples.
