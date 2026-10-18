# AI Suggestions API

Get proactive, personalized action recommendations for relationship management.

**Base Endpoint**: `/v1/agent/suggest`

---

## Overview

AI Suggestions help you:
- **Stay proactive** - Don't let relationships go cold
- **Prioritize** - Focus on high-impact actions
- **Scale** - Manage many relationships effectively
- **Never miss** - Important touchpoints and follow-ups

Suggestions are based on:
- Warmth scores and trends
- Interaction patterns
- Time since last contact
- Contact importance (tags, pipeline stage)
- Your personal notes and context

---

## Suggest Actions

Get AI-generated action recommendations for a contact.

```http
POST /v1/agent/suggest/actions
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_id` | UUID | No | Specific contact (if omitted, returns across all) |
| `limit` | integer | No | Max suggestions (1-20, default: 5) |
| `priority` | string | No | Filter by priority (high, medium, low) |

### Example - Contact-Specific

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/suggest/actions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: 5
    })
  }
);

const { suggestions } = await response.json();
```

### Response

```json
{
  "suggestions": [
    {
      "id": "sug_abc123",
      "contact": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "warmth": 35,
        "warmth_band": "cool"
      },
      "action": "send_message",
      "priority": "high",
      "reason": "No contact in 42 days. Warmth dropped from 68 to 35.",
      "channel": "email",
      "suggested_approach": "Re-engagement with value-add content",
      "timing": "within_2_days",
      "context": {
        "last_interaction": "2024-11-28T10:30:00Z",
        "days_since_contact": 42,
        "warmth_decline": 33,
        "tags": ["customer", "vip"],
        "key_topics": ["Q1 planning", "budget", "roadmap"]
      },
      "draft_available": true
    },
    {
      "id": "sug_def456",
      "contact": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe"
      },
      "action": "schedule_call",
      "priority": "medium",
      "reason": "Follow-up on pricing proposal sent 5 days ago",
      "channel": "phone",
      "suggested_approach": "Check if they have questions",
      "timing": "this_week",
      "context": {
        "related_interaction": "2025-01-10T14:00:00Z"
      }
    }
  ],
  "meta": {
    "total_contacts_analyzed": 1,
    "generation_time_ms": 450
  }
}
```

---

## Example - All Contacts

Get daily action recommendations across your entire network:

```typescript
const response = await fetch(
  '/v1/agent/suggest/actions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      limit: 10,
      priority: 'high'
    })
  }
);

const { suggestions } = await response.json();
```

### Response - Multi-Contact

```json
{
  "suggestions": [
    {
      "id": "sug_001",
      "contact": {
        "id": "uuid1",
        "name": "Sarah Chen",
        "warmth": 22,
        "warmth_band": "cool"
      },
      "action": "send_message",
      "priority": "high",
      "reason": "VIP customer, warmth at risk (22/100)",
      "channel": "email",
      "timing": "today"
    },
    {
      "id": "sug_002",
      "contact": {
        "id": "uuid2",
        "name": "Mike Johnson",
        "warmth": 45
      },
      "action": "share_content",
      "priority": "medium",
      "reason": "Mentioned interest in AI tools in last call",
      "channel": "linkedin",
      "timing": "this_week"
    }
  ],
  "meta": {
    "total_contacts_analyzed": 234,
    "high_priority_count": 12,
    "medium_priority_count": 28
  }
}
```

---

## Action Types

### send_message
**When**: Contact is cooling, follow-up needed
**Channels**: email, sms, dm
**Example**: "Send re-engagement email"

### schedule_call
**When**: Complex discussion needed, high-value contact
**Channels**: phone, video
**Example**: "Schedule quarterly check-in"

### share_content
**When**: Value-add opportunity, nurture relationship
**Channels**: email, linkedin, slack
**Example**: "Share relevant case study"

### schedule_meeting
**When**: In-person needed, relationship milestone
**Channels**: calendar
**Example**: "Schedule coffee meeting"

### send_thank_you
**When**: After referral, purchase, positive outcome
**Channels**: email, handwritten note
**Example**: "Thank for introduction to CTO"

### update_notes
**When**: Missing context, need to document
**Channels**: internal
**Example**: "Add notes from last conversation"

### remove_from_pipeline
**When**: Unresponsive, no longer relevant
**Channels**: internal
**Example**: "Archive contact after 3 failed attempts"

---

## Priority Levels

### High Priority
- VIP/customer contacts at risk (warmth < 30)
- Overdue follow-ups (> 5 days)
- Hot leads going cold
- Time-sensitive opportunities

### Medium Priority
- Regular touchpoints needed
- Relationship maintenance
- Value-add opportunities
- General follow-ups

### Low Priority
- Nice-to-have actions
- Long-term nurture
- Opportunistic engagement
- Archive/cleanup tasks

---

## Timing Recommendations

| Timing | Description | Urgency |
|--------|-------------|---------|
| `today` | Within 24 hours | Critical |
| `within_2_days` | 1-2 days | High |
| `this_week` | Within 7 days | Medium |
| `this_month` | Within 30 days | Low |
| `opportunistic` | When convenient | Very Low |

---

## Common Patterns

### Daily Action List

```typescript
// Get your daily to-dos every morning
async function getDailyActions() {
  const { suggestions } = await fetch(
    '/v1/agent/suggest/actions',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({
        limit: 10,
        priority: 'high'
      })
    }
  ).then(r => r.json());
  
  // Group by action type
  const byAction = suggestions.reduce((acc, s) => {
    acc[s.action] = acc[s.action] || [];
    acc[s.action].push(s);
    return acc;
  }, {});
  
  return byAction;
}

// Run daily at 9 AM
const actions = await getDailyActions();
console.log('Today: Send', actions.send_message?.length, 'messages');
```

### VIP Monitoring

```typescript
// Get suggestions for VIP contacts only
const vips = await fetch('/v1/contacts?tag=vip', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

const vipSuggestions = await Promise.all(
  vips.contacts.map(c =>
    fetch('/v1/agent/suggest/actions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({ contact_id: c.id, limit: 3 })
    }).then(r => r.json())
  )
);

console.log('VIP actions needed:', vipSuggestions.flat().length);
```

### Act on Suggestions

```typescript
// Get suggestion
const { suggestions } = await fetch('/v1/agent/suggest/actions', {
  method: 'POST',
  body: JSON.stringify({ contact_id: contactId })
}).then(r => r.json());

const topSuggestion = suggestions[0];

if (topSuggestion.action === 'send_message') {
  // Use AI Compose to draft the message
  const { message } = await fetch('/v1/agent/compose/smart', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: topSuggestion.contact.id,
      channel: topSuggestion.channel,
      goal: 're-engage'
    })
  }).then(r => r.json());
  
  console.log('Draft ready:', message.subject);
}
```

---

## Integration with Workflow

### Morning Routine
```typescript
async function morningRoutine() {
  // 1. Get high-priority suggestions
  const { suggestions } = await fetch('/v1/agent/suggest/actions', {
    method: 'POST',
    body: JSON.stringify({ limit: 5, priority: 'high' })
  }).then(r => r.json());
  
  // 2. Generate drafts for all send_message actions
  const drafts = await Promise.all(
    suggestions
      .filter(s => s.action === 'send_message')
      .map(s =>
        fetch('/v1/agent/compose/smart', {
          method: 'POST',
          body: JSON.stringify({
            contact_id: s.contact.id,
            channel: s.channel,
            goal: 're-engage'
          })
        }).then(r => r.json())
      )
  );
  
  // 3. Review and send
  console.log(`${drafts.length} drafts ready for review`);
}
```

---

## Best Practices

### 1. Act Quickly on High Priority
```typescript
const { suggestions } = await fetch('/v1/agent/suggest/actions', {
  method: 'POST',
  body: JSON.stringify({ priority: 'high' })
}).then(r => r.json());

// High priority = act within 24 hours
suggestions.forEach(s => {
  if (s.priority === 'high' && s.timing === 'today') {
    console.log(`⚠️ URGENT: ${s.contact.name} - ${s.reason}`);
  }
});
```

### 2. Batch Similar Actions
```typescript
// Group by action type for efficiency
const messageActions = suggestions.filter(s => s.action === 'send_message');
const callActions = suggestions.filter(s => s.action === 'schedule_call');

// Handle each batch
await batchSendMessages(messageActions);
await batchScheduleCalls(callActions);
```

### 3. Set Reminders
```typescript
suggestions.forEach(s => {
  if (s.timing === 'this_week') {
    // Add to calendar or task manager
    createReminder({
      title: `${s.action} - ${s.contact.name}`,
      description: s.reason,
      dueDate: addDays(new Date(), 3)
    });
  }
});
```

---

## Performance

- **Average latency**: 300-500ms
- **Contacts analyzed**: Up to 1000 per request
- **Refresh frequency**: Real-time (call anytime)

---

## Next Steps

- [AI Compose](./07-ai-compose.md) - Generate messages for suggested actions
- [AI Analysis](./06-ai-analysis.md) - Deep dive into relationship health
- [Warmth Scoring](./05-warmth-scoring.md) - Understand the scoring system
