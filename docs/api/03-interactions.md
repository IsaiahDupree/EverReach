# Interactions API

Track all communications and activities with your contacts - calls, emails, meetings, notes, and more.

**Base Endpoint**: `/v1/interactions`

---

## Overview

Interactions represent any touchpoint with a contact:
- **Calls** - Phone conversations
- **Emails** - Email exchanges
- **Meetings** - In-person or virtual meetings
- **Messages** - SMS, DM, chat messages
- **Notes** - Manual observations or reminders

Each interaction automatically updates the contact's warmth score.

---

## List Interactions

Get interactions with flexible filtering and sorting.

```http
GET /v1/interactions
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `contact_id` | UUID | Filter by specific contact |
| `type` | string | Filter by interaction type (`call`, `email`, `meeting`, etc.) |
| `start` | ISO 8601 | Filter interactions after this date |
| `end` | ISO 8601 | Filter interactions before this date |
| `limit` | integer | Results per page (1-100, default: 20) |
| `cursor` | string | Pagination cursor (ISO timestamp) |
| `sort` | string | Sort field and order (default: `created_at:desc`) |

### Sort Options

Format: `<field>:<order>`

**Fields:**
- `created_at` - When interaction was created in system
- `occurred_at` - When interaction actually happened
- `updated_at` - When interaction was last modified

**Orders:**
- `asc` - Ascending (oldest first)
- `desc` - Descending (newest first)

**Examples:**
- `sort=created_at:desc` - Newest first (default)
- `sort=occurred_at:asc` - Chronological order
- `sort=updated_at:desc` - Recently modified first

### Example

```typescript
const contactId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/interactions?contact_id=${contactId}&limit=50`,
  {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { interactions, nextCursor } = await response.json();
```

### Response

```json
{
  "items": [
    {
      "id": "770f9511-g40d-53f6-c938-668877661222",
      "contact_id": "550e8400-e29b-41d4-a716-446655440000",
      "contact_name": "John Doe",
      "kind": "call",
      "content": "Discussed Q1 goals and budget approval process",
      "metadata": {
        "duration_minutes": 30,
        "sentiment": "positive",
        "outcome": "follow_up_scheduled"
      },
      "created_at": "2025-01-15T14:30:00Z",
      "updated_at": "2025-01-15T14:30:00Z"
    }
  ],
  "limit": 50,
  "nextCursor": "2025-01-15T14:00:00Z",
  "sort": "created_at:desc"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | Array of interaction objects |
| `items[].contact_name` | string | Contact's name (automatically included) |
| `limit` | number | Requested limit |
| `nextCursor` | string \| null | Cursor for next page (null if no more) |
| `sort` | string | Applied sort (field:order) |

---

## Create Interaction

Log a new communication or activity.

```http
POST /v1/interactions
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_id` | UUID | ✅ Yes | Contact this interaction is with |
| `kind` | string | ✅ Yes | Type of interaction (see below) |
| `content` | string | No | Details or notes (max: 10,000 chars) |
| `metadata` | object | No | Additional structured data |

### Interaction Types (`kind`)
- `call` - Phone conversation
- `email` - Email exchange
- `meeting` - In-person or virtual meeting
- `message` - SMS, DM, or chat
- `note` - Manual note or observation
- `video_call` - Video conference

### Example - Log a Phone Call

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/interactions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      kind: 'call',
      content: 'Discussed enterprise pricing. Very interested in Q1 kickoff.',
      metadata: {
        duration_minutes: 25,
        sentiment: 'positive',
        next_action: 'send_proposal',
        outcome: 'interested'
      }
    })
  }
);

const { interaction } = await response.json();
```

### Example - Log an Email

```typescript
await fetch('https://ever-reach-be.vercel.app/api/v1/interactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'email',
    content: 'Sent proposal for enterprise plan with Q1 discount',
    metadata: {
      subject: 'Enterprise Proposal - Q1 Special',
      direction: 'outbound',
      attachments: ['proposal.pdf', 'pricing.xlsx']
    }
  })
});
```

### Example - Log a Meeting

```typescript
await fetch('https://ever-reach-be.vercel.app/api/v1/interactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'meeting',
    content: 'Product demo at their office. Team of 5 attended.',
    metadata: {
      duration_minutes: 60,
      location: 'Client Office, NYC',
      attendees: 5,
      sentiment: 'very_positive',
      next_steps: ['Technical review', 'Security audit']
    }
  })
});
```

---

## Update Interaction

Modify an existing interaction.

```http
PATCH /v1/interactions/:id
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/interactions/${interactionId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Updated notes: Deal closed! Signed enterprise contract.',
      metadata: {
        outcome: 'closed_won',
        deal_value: 50000
      }
    })
  }
);
```

---

## Delete Interaction

Remove an interaction.

```http
DELETE /v1/interactions/:id
```

### Example

```typescript
await fetch(
  `https://ever-reach-be.vercel.app/api/v1/interactions/${interactionId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  }
);
```

---

## Common Metadata Fields

### For Calls
```json
{
  "duration_minutes": 30,
  "sentiment": "positive",
  "outcome": "follow_up_scheduled",
  "voicemail": false
}
```

### For Emails
```json
{
  "subject": "Re: Enterprise Proposal",
  "direction": "inbound",
  "attachments": ["contract.pdf"],
  "read": true
}
```

### For Meetings
```json
{
  "duration_minutes": 60,
  "location": "Zoom",
  "attendees": 3,
  "agenda": "Q1 Planning",
  "next_meeting": "2025-02-01T10:00:00Z"
}
```

---

## Impact on Warmth Score

Each interaction automatically triggers a warmth score recalculation:

- **Recent interactions** (< 7 days): +5 to +10 points
- **Quality matters**: Meetings > Calls > Emails > Notes
- **Frequency**: Regular contact maintains warmth
- **Recency**: Warmth decays over time without interaction

---

## Common Patterns

### Log Interaction and Get Updated Warmth

```typescript
// 1. Log the interaction
const interactionResponse = await fetch('/v1/interactions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'call',
    content: 'Great conversation about partnership opportunities'
  })
});

// 2. Get updated contact (warmth will be recalculated)
const contactResponse = await fetch(`/v1/contacts/${contactId}`, {
  headers: { 'Authorization': `Bearer ${jwt}` }
});

const { contact } = await contactResponse.json();
console.log('New warmth:', contact.warmth); // e.g., 75 → 82
```

### Get Last 30 Days of Activity

```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const response = await fetch(
  `/v1/interactions?contact_id=${contactId}&limit=100`,
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { interactions } = await response.json();

const recentActivity = interactions.filter(i => 
  new Date(i.created_at) >= thirtyDaysAgo
);

console.log(`${recentActivity.length} interactions in last 30 days`);
```

### Activity Timeline

```typescript
const interactions = await fetch(
  `/v1/interactions?contact_id=${contactId}&limit=100`,
  { headers: { 'Authorization': `Bearer ${jwt}` } }
).then(r => r.json());

// Group by type
const timeline = interactions.interactions.reduce((acc, int) => {
  acc[int.kind] = (acc[int.kind] || 0) + 1;
  return acc;
}, {});

console.log(timeline);
// { call: 5, email: 12, meeting: 2, note: 3 }
```

---

## Next Steps

- [Warmth & Scoring](./05-warmth-scoring.md) - Understand relationship health tracking
- [AI Analysis](./06-ai-analysis.md) - Get AI insights from interaction history
- [Contacts](./02-contacts.md) - Manage contact records
