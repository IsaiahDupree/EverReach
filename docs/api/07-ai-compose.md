# AI Compose API

Generate personalized, context-aware messages using AI that combines interaction history, voice notes, and contact details.

**Base Endpoint**: `/v1/agent/compose`

---

## Overview

The AI Compose endpoint creates messages that are:
- **Personalized** - Uses contact's history and preferences
- **Context-aware** - Incorporates recent interactions and voice notes
- **Goal-oriented** - Tailored to specific outcomes (re-engage, nurture, convert)
- **Multi-channel** - Optimized for email, SMS, or DM

---

## Compose Smart Message

Generate an AI-powered message with full context.

```http
POST /v1/agent/compose/smart
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_id` | UUID | ✅ Yes | Contact to compose message for |
| `channel` | string | ✅ Yes | email, sms, or dm |
| `goal` | string | ✅ Yes | Message objective (see below) |
| `template_id` | UUID | No | Base template to use |
| `variables` | object | No | Additional context variables |
| `include` | object | No | What context to include |

### Goals

| Goal | Description | Use Case |
|------|-------------|----------|
| `re-engage` | Win back inactive contact | Warmth < 40, no contact 30+ days |
| `nurture` | Build relationship | Regular touchpoint, value-add |
| `convert` | Move to next stage | Sales opportunity, proposal |
| `thank` | Express gratitude | After referral, purchase, meeting |
| `follow-up` | Continue conversation | After meeting, demo, event |
| `introduction` | First contact | New lead, cold outreach |

### Include Options

```typescript
{
  "persona_notes": true,          // Include your voice notes about them
  "recent_interactions": 5,       // Last N interactions (0-50)
  "screenshots": false,           // Include screenshot context
  "voice_tone": true              // Match your communication style
}
```

### Example - Re-engagement Email

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/compose/smart',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      channel: 'email',
      goal: 're-engage',
      include: {
        persona_notes: true,
        recent_interactions: 10,
        voice_tone: true
      }
    })
  }
);

const { message } = await response.json();
```

### Response

```json
{
  "message": {
    "subject": "Long time no talk, John!",
    "body": "Hi John,\n\nI hope this email finds you well! It's been about 6 weeks since we last connected, and I wanted to reach out.\n\nI remember you mentioned you were exploring AI automation for your engineering team. I recently came across a case study from a similar company that achieved 40% time savings – thought you might find it relevant.\n\nWould you have 15 minutes this week for a quick catch-up? I'd love to hear how things are progressing with the Q1 roadmap you mentioned.\n\nBest regards,\nJane",
    "tone": "warm",
    "channel": "email",
    "estimated_read_time": "45 seconds"
  },
  "context": {
    "warmth_score": 35,
    "warmth_band": "cool",
    "last_interaction": "2024-11-28T10:30:00Z",
    "days_since_contact": 42,
    "key_topics": ["AI automation", "Q1 roadmap", "engineering team"],
    "recommended_channel": "email"
  },
  "metadata": {
    "tokens_used": 850,
    "generation_time_ms": 2100,
    "model": "gpt-4o"
  }
}
```

---

## Example Use Cases

### 1. Follow-up After Meeting

```typescript
await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    goal: 'follow-up',
    variables: {
      meeting_date: '2025-01-15',
      next_steps: 'Send pricing proposal'
    },
    include: {
      recent_interactions: 3,
      persona_notes: true
    }
  })
});
```

**Generated Email**:
```
Subject: Great meeting today!

Hi Sarah,

Thanks for taking the time to meet this morning. I really appreciated 
learning more about your team's challenges with lead management.

As discussed, I'll send over the pricing proposal by end of week. 
I've included the custom integration options we talked about.

Looking forward to our next conversation!
```

---

### 2. SMS Check-in

```typescript
await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'sms',
    goal: 'nurture',
    include: {
      recent_interactions: 2
    }
  })
});
```

**Generated SMS**:
```
Hey Mike! Saw your LinkedIn post about the product launch. 
Congrats! 🎉 How did it go? - Alex
```

---

### 3. Cold Introduction Email

```typescript
await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    goal: 'introduction',
    variables: {
      referral_source: 'LinkedIn mutual connection',
      value_prop: 'Help scale engineering teams faster'
    }
  })
});
```

---

## Channel-Specific Optimization

### Email
- Professional subject lines
- Proper greeting and signature
- Multiple paragraphs
- Call-to-action included
- Typical length: 100-200 words

### SMS
- Conversational tone
- Under 160 characters when possible
- Emoji support
- Direct and casual
- Clear sender identity

### DM (Direct Message)
- Platform-appropriate tone
- Brief and engaging
- Question-based engagement
- Typical length: 50-100 words

---

## Advanced Features

### Using Templates

```typescript
// Start with a template and personalize it
await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    goal: 're-engage',
    template_id: 'your-template-uuid', // Use existing template
    variables: {
      custom_field: 'value'
    }
  })
});
```

### Voice Tone Matching

The AI analyzes your past messages and voice notes to match your communication style:

```typescript
{
  "include": {
    "voice_tone": true  // Analyzes your writing patterns
  }
}
```

**Example**: If you typically use casual language and emojis, the AI will match that style.

---

## Best Practices

### 1. Provide Context via Persona Notes

```typescript
// Before composing, add a voice note with context
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'text',
    title: 'Context for John',
    body_text: 'John is technical, prefers data-driven discussions. Mentioned interest in AI/ML last call.',
    tags: ['John Doe']
  })
});

// Then compose will use this context
await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: johnId,
    channel: 'email',
    goal: 'follow-up',
    include: { persona_notes: true }
  })
});
```

### 2. Review Before Sending

```typescript
// Get the composition
const { message } = await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ })
}).then(r => r.json());

// Review and edit
console.log('AI Draft:', message.body);

// User can edit before sending
const finalMessage = editInUI(message.body);

// Then send or log as interaction
await fetch('/v1/interactions', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'email',
    content: finalMessage
  })
});
```

### 3. A/B Test Different Goals

```typescript
// Generate multiple variations
const goals = ['nurture', 'follow-up', 'convert'];
const variations = await Promise.all(
  goals.map(goal =>
    fetch('/v1/agent/compose/smart', {
      method: 'POST',
      body: JSON.stringify({
        contact_id,
        channel: 'email',
        goal
      })
    }).then(r => r.json())
  )
);

// Pick the best one
console.log('Variations:', variations.map(v => v.message));
```

---

## Performance

- **Average latency**: 2-4 seconds
- **Token usage**: 600-1200 tokens per composition
- **Cost per message**: ~$0.003-0.006

### Optimization Tips

1. **Cache similar requests** (same contact + goal within 1 hour)
2. **Limit recent_interactions** to 5-10 for faster generation
3. **Use templates** when possible to reduce generation time

---

## Error Handling

### 400 Bad Request
```json
{
  "error": "Invalid goal: must be one of re-engage, nurture, convert, thank, follow-up, introduction"
}
```

### 404 Not Found
```json
{
  "error": "Contact not found"
}
```

### 500 Server Error
```json
{
  "error": "OpenAI API error: rate limit exceeded"
}
```

---

## Next Steps

- [AI Suggestions](./08-ai-suggestions.md) - Get proactive engagement recommendations
- [Templates](./04-templates.md) - Create reusable message templates
- [Interactions](./03-interactions.md) - Log sent messages
