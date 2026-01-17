# Agent Chat API

Multi-turn conversational AI assistant with context awareness and tool calling.

**Base Endpoint**: `/v1/agent`

---

## Overview

The Agent Chat system provides:
- **Multi-turn conversations** - Maintains context across messages
- **Tool calling** - Agent can search contacts, fetch data, compose messages
- **Streaming responses** - Real-time SSE for better UX
- **Conversation persistence** - Save and resume conversations
- **Context awareness** - Knows about your contacts, interactions, and goals

---

## Send Chat Message

Send a message to the AI agent and get a response.

```http
POST /v1/agent/chat
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ Yes | User message |
| `conversation_id` | UUID | No | Continue existing conversation |
| `stream` | boolean | No | Stream response via SSE (default: false) |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/chat',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Who are my VIP contacts that need attention?',
      conversation_id: null // Start new conversation
    })
  }
);

const { reply, conversation_id, tools_used } = await response.json();
```

### Response

```json
{
  "reply": "You have 3 VIP contacts that need attention:\n\n1. Sarah Chen (Warmth: 22/100) - No contact in 45 days\n2. Mike Johnson (Warmth: 35/100) - Last email 21 days ago\n3. Alex Kim (Warmth: 38/100) - Cooling down from 68\n\nWould you like me to draft re-engagement messages for any of them?",
  "conversation_id": "conv_abc123",
  "tools_used": [
    {
      "name": "search_contacts",
      "arguments": {
        "filters": { "tags": ["vip"], "warmth_lte": 39 }
      }
    }
  ],
  "usage": {
    "prompt_tokens": 850,
    "completion_tokens": 120,
    "total_tokens": 970
  }
}
```

---

## Stream Chat (SSE)

Get real-time streaming responses via Server-Sent Events.

```http
POST /v1/agent/chat/stream
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/chat/stream',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Draft an email to Sarah Chen'
    })
  }
);

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'content') {
        console.log('Content:', data.content);
      } else if (data.type === 'tool_call') {
        console.log('Using tool:', data.tool_name);
      } else if (data.type === 'done') {
        console.log('Conversation ID:', data.conversation_id);
      }
    }
  }
}
```

### SSE Events

```
data: {"type":"content","content":"Let me"}
data: {"type":"content","content":" draft"}
data: {"type":"content","content":" an email"}
data: {"type":"tool_call","tool_name":"get_contact","arguments":{"contact_id":"..."}}
data: {"type":"content","content":"Subject: Long time..."}
data: {"type":"done","conversation_id":"conv_abc123"}
```

---

## Available Tools

The agent can call these tools autonomously:

### 1. get_contact
Fetch single contact details.

### 2. search_contacts
Search contacts with filters.

### 3. get_interactions
Get interaction history for a contact.

### 4. get_persona_notes
Fetch user's voice notes about a contact.

### 5. compose_message
Generate personalized message.

### 6. analyze_contact
Get AI analysis of relationship health.

### 7. update_contact
Modify contact details.

### 8. get_message_goals
List available messaging goals.

### 9. process_voice_note
Extract contacts and actions from voice note.

---

## Conversation Management

### List Conversations

```http
GET /v1/agent/conversation
```

**Response**:
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "created_at": "2025-01-15T10:00:00Z",
      "last_message_at": "2025-01-15T10:05:00Z",
      "message_count": 8,
      "title": "VIP contact management"
    }
  ]
}
```

### Get Conversation

```http
GET /v1/agent/conversation/:id
```

**Response**:
```json
{
  "conversation": {
    "id": "conv_abc123",
    "messages": [
      {
        "role": "user",
        "content": "Who needs attention?",
        "timestamp": "2025-01-15T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "You have 3 VIP contacts...",
        "timestamp": "2025-01-15T10:00:05Z",
        "tools_used": ["search_contacts"]
      }
    ]
  }
}
```

### Delete Conversation

```http
DELETE /v1/agent/conversation/:id
```

---

## Use Cases

### 1. Daily Briefing

```typescript
const { reply } = await fetch('/v1/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Give me a daily briefing: who needs attention, any upcoming follow-ups, and relationship health summary'
  })
}).then(r => r.json());

console.log(reply);
```

### 2. Smart Contact Search

```typescript
const { reply } = await fetch('/v1/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Find all customers in Austin who I haven\'t contacted in 30+ days'
  })
}).then(r => r.json());
```

### 3. Bulk Message Drafting

```typescript
const { reply, conversation_id } = await fetch('/v1/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Draft re-engagement emails for all my cold VIP contacts'
  })
}).then(r => r.json());

// Continue conversation
const { reply: followUp } = await fetch('/v1/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Make them more casual and add a personal touch',
    conversation_id
  })
}).then(r => r.json());
```

---

## React Component Example

```typescript
import { useState } from 'react';

export function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async () => {
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const { reply, conversation_id } = await fetch('/v1/agent/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input,
          conversation_id: conversationId
        })
      }).then(r => r.json());
      
      setConversationId(conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
        placeholder="Ask me anything about your contacts..."
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Maintain Conversation Context
```typescript
// Keep conversation_id for multi-turn conversations
let currentConversationId = null;

async function chat(message) {
  const { reply, conversation_id } = await apiCall('/v1/agent/chat', {
    message,
    conversation_id: currentConversationId
  });
  
  currentConversationId = conversation_id;
  return reply;
}
```

### 2. Use Streaming for Better UX
```typescript
// Stream responses for real-time feedback
async function chatStream(message, onChunk) {
  const response = await fetch('/v1/agent/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  
  // Process SSE stream
  for await (const chunk of parseSSE(response)) {
    if (chunk.type === 'content') {
      onChunk(chunk.content);
    }
  }
}
```

### 3. Handle Tool Calls Gracefully
```typescript
// Show user what tools the agent is using
if (tools_used?.length > 0) {
  console.log('Agent actions:', tools_used.map(t => t.name).join(', '));
}
```

---

## Performance

- **Average latency**: 2-5 seconds (non-streaming)
- **Streaming latency**: 200-500ms to first token
- **Context window**: 12,000 tokens (auto-trimmed)
- **Token usage**: ~800-2000 tokens per turn

---

## Next Steps

- [Voice Notes](./16-voice-notes.md) - Process voice notes with AI
- [AI Compose](./07-ai-compose.md) - Generate messages
- [AI Suggestions](./08-ai-suggestions.md) - Get action recommendations
