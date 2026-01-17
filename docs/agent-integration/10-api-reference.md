# Complete API Reference

## 🔌 All Agent API Endpoints

### OpenAI Testing

#### GET /v1/openai/test
Check if OpenAI is configured.

**Response:**
```json
{
  "configured": true,
  "model": "gpt-4o-mini",
  "message": "OpenAI is configured and ready"
}
```

#### POST /v1/openai/test
Test OpenAI with a custom prompt.

**Request:**
```json
{
  "prompt": "Say hello",
  "model": "gpt-4o-mini",
  "max_tokens": 150,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "status": "success",
  "model": "gpt-4o-mini",
  "response": "Hello! How can I assist you today?",
  "usage": { "prompt_tokens": 5, "completion_tokens": 10, "total_tokens": 15 },
  "latency_ms": 450,
  "timestamp": "2025-10-04T09:00:00Z"
}
```

---

### Agent Chat

#### POST /v1/agent/chat
Single-turn chat with function calling.

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
  "message": "I found 3 contacts you should follow up with...",
  "tool_calls_made": 2,
  "tools_used": ["search_contacts", "get_contact_interactions"],
  "usage": { "prompt_tokens": 120, "completion_tokens": 85, "total_tokens": 205 }
}
```

#### POST /v1/agent/chat/stream
Streaming chat with SSE.

**Request:** Same as `/v1/agent/chat`

**Response:** Server-Sent Events stream
```
data: {"content":"I","done":false}
data: {"content":" found","done":false}
data: {"content":" 3","done":false}
...
data: {"content":"","done":true,"conversation_id":"uuid"}
```

---

### Conversations

#### GET /v1/agent/conversation?limit=20
List user's conversations.

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "created_at": "2025-10-04T09:00:00Z",
      "updated_at": "2025-10-04T09:05:00Z",
      "context": { "contact_id": "uuid" }
    }
  ]
}
```

#### GET /v1/agent/conversation/:id
Get conversation details.

**Response:**
```json
{
  "conversation_id": "uuid",
  "messages": [
    { "role": "user", "content": "Hello", "timestamp": "..." },
    { "role": "assistant", "content": "Hi there!", "timestamp": "..." }
  ],
  "context": {},
  "created_at": "2025-10-04T09:00:00Z",
  "updated_at": "2025-10-04T09:05:00Z"
}
```

#### DELETE /v1/agent/conversation/:id
Delete a conversation.

**Response:**
```json
{
  "deleted": true
}
```

---

### Voice Note Processing

#### POST /v1/agent/voice-note/process
Process a voice note with AI.

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
    "contacts": ["John Doe", "Jane Smith"],
    "actions": ["Follow up on proposal", "Schedule meeting"],
    "category": "business",
    "tags": ["sales", "partnership", "follow-up"],
    "sentiment": "positive",
    "topics": ["collaboration", "proposal"]
  },
  "contact_matches": [
    {
      "mentioned": "John Doe",
      "possible_matches": [
        { "id": "uuid", "display_name": "John Doe" }
      ]
    }
  ],
  "tags_added": ["sales", "partnership"]
}
```

---

### Contact Analysis

#### POST /v1/agent/analyze/contact
Analyze a contact's relationship.

**Request:**
```json
{
  "contact_id": "uuid",
  "analysis_type": "full_analysis",
  "include_voice_notes": true,
  "include_interactions": true
}
```

**Analysis Types:**
- `relationship_health` - Health score (1-10) + recommendations
- `engagement_suggestions` - 3-5 specific action items
- `context_summary` - Comprehensive overview
- `full_analysis` - Complete intelligence report

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Doe"
  },
  "analysis_type": "full_analysis",
  "analysis": "**Relationship Health Assessment**\n\nScore: 8/10\n\nJohn Doe is a warm contact...",
  "context_used": {
    "interactions": 12,
    "persona_notes": 3
  }
}
```

---

### Smart Message Composition

#### POST /v1/agent/compose/smart
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

**Goal Types:** `personal`, `networking`, `business`  
**Channels:** `email`, `sms`, `dm`  
**Tones:** `concise`, `warm`, `professional`, `playful`

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Doe"
  },
  "message": {
    "channel": "email",
    "subject": "Long Overdue Catch-Up!",
    "body": "Hi John,\n\nIt's been too long since we last connected...",
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

### Action Suggestions

#### POST /v1/agent/suggest/actions
Get proactive action suggestions.

**Request:**
```json
{
  "context": "dashboard",
  "contact_id": "uuid-optional",
  "focus": "engagement",
  "limit": 5
}
```

**Context Types:** `dashboard`, `contact_view`, `goals`  
**Focus Types:** `engagement`, `networking`, `follow_ups`, `all`

**Response:**
```json
{
  "context": "dashboard",
  "focus": "engagement",
  "suggestions": [
    {
      "title": "Reconnect with Sarah Johnson",
      "description": "It's been 3 months since your last interaction. A quick check-in would strengthen the relationship.",
      "priority": "high",
      "contacts": ["Sarah Johnson"],
      "estimated_time": "10 minutes"
    }
  ],
  "generated_at": "2025-10-04T09:00:00Z"
}
```

---

### Agent Tools

#### GET /v1/agent/tools
List available agent tools/functions.

**Response:**
```json
{
  "tools": [
    {
      "name": "get_contact",
      "description": "Retrieve detailed information about a specific contact",
      "parameters": { "type": "object", "properties": {...} }
    }
  ],
  "count": 9,
  "categories": {
    "contacts": ["get_contact", "search_contacts", "update_contact"],
    "interactions": ["get_contact_interactions"],
    "persona": ["get_persona_notes", "process_voice_note"],
    "composition": ["compose_message", "get_message_goals"],
    "analysis": ["analyze_contact"]
  }
}
```

---

## 🔐 Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <supabase_access_token>
```

Your `lib/api.ts` handles this automatically via `authHeader()`.

---

## ⚠️ Error Responses

All endpoints return standard error format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

Common error codes:
- `401` - Unauthorized (missing/invalid token)
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `422` - Validation Error (invalid data format)
- `500` - Server Error
- `503` - Service Unavailable (OpenAI not configured)

---

## 🚀 Rate Limits

No explicit rate limits currently, but be mindful:
- OpenAI API has usage limits
- Streaming connections should be closed properly
- Batch operations should be throttled client-side

---

## 📊 Token Usage

All responses that use OpenAI include usage info:

```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

Track this for cost monitoring.
