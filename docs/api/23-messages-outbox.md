# Messages & Outbox API

Safe message queue system with approval workflows and multi-channel sending.

**Base Endpoint**: `/v1/messages`

---

## Overview

The message system provides:
- **Human-in-the-loop** - Optional approval before sending
- **Multi-channel** - Email, SMS, DM, push notifications
- **Scheduled sending** - Send at optimal times
- **Template support** - Use reusable templates
- **Goal tracking** - Track message objectives
- **Expiration** - Auto-expire old messages

---

## Message Workflow

```
1. Compose → 2. Queue → 3. Approve (optional) → 4. Send → 5. Log Interaction
```

---

## Prepare Message

Prepare a message for sending (with optional approval).

```http
POST /v1/messages
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_id` | UUID | ✅ Yes | Recipient contact |
| `channel` | string | ✅ Yes | email, sms, dm, push |
| `subject` | string | Conditional | Required for email |
| `body` | string | ✅ Yes | Message content |
| `goal` | string | No | re-engage, nurture, convert, thank |
| `template_id` | UUID | No | Use template |
| `requires_approval` | boolean | No | Require manual approval (default: false) |
| `send_after` | string | No | Schedule for later (ISO 8601) |
| `expires_at` | string | No | Auto-expire if not sent |

### Example - Email with Approval

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/messages',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      channel: 'email',
      subject: 'Following up on our conversation',
      body: 'Hi Sarah,\n\nI wanted to follow up...',
      goal: 'follow-up',
      requires_approval: true
    })
  }
);

const { message } = await response.json();
```

### Response

```json
{
  "message": {
    "id": "msg_abc123",
    "contact_id": "550e8400-e29b-41d4-a716-446655440000",
    "channel": "email",
    "subject": "Following up on our conversation",
    "body": "Hi Sarah...",
    "status": "awaiting_approval",
    "requires_approval": true,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

---

## Approve Message

Approve a message for sending.

```http
POST /v1/messages/:id/approve
```

### Example

```typescript
await fetch(`/v1/messages/${messageId}/approve`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}` }
});
```

### Response

```json
{
  "message": {
    "id": "msg_abc123",
    "status": "approved",
    "approved_by": "user_xyz",
    "approved_at": "2025-01-15T10:05:00Z"
  }
}
```

---

## Reject Message

Reject a message with reason.

```http
POST /v1/messages/:id/reject
Content-Type: application/json
```

### Example

```typescript
await fetch(`/v1/messages/${messageId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Tone is too formal for this contact'
  })
});
```

---

## Send Immediately

Send a message without approval workflow.

```http
POST /v1/messages
Content-Type: application/json
```

### Example

```typescript
await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'sms',
    body: 'Hey Mike! Hope you're doing well. 👋',
    requires_approval: false  // Send immediately
  })
});
```

---

## List Outbox

Get pending, approved, and sent messages.

```http
GET /v1/messages
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | pending, awaiting_approval, approved, sent, failed, rejected |
| `channel` | string | Filter by channel |
| `contact_id` | UUID | Filter by contact |
| `limit` | integer | Max results (default: 50) |

### Example

```typescript
// Get all messages awaiting approval
const { messages } = await fetch(
  '/v1/messages?status=awaiting_approval',
  {
    headers: { 'Authorization': `Bearer ${jwt}` }
  }
).then(r => r.json());
```

### Response

```json
{
  "messages": [
    {
      "id": "msg_abc123",
      "contact": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "Sarah Chen"
      },
      "channel": "email",
      "subject": "Following up on our conversation",
      "body": "Hi Sarah...",
      "status": "awaiting_approval",
      "created_at": "2025-01-15T10:00:00Z",
      "send_after": null,
      "expires_at": "2025-01-22T10:00:00Z"
    }
  ]
}
```

---

## Status Flow

```
pending → awaiting_approval → approved → sent
                           ↘ rejected
                           ↘ expired
                           ↘ failed
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| `pending` | Queued, no approval needed |
| `awaiting_approval` | Waiting for manual approval |
| `approved` | Approved, ready to send |
| `sent` | Successfully sent |
| `failed` | Send failed (check error) |
| `rejected` | User rejected |
| `expired` | Passed expiration date |

---

## Scheduled Sending

```typescript
// Schedule email for 9 AM tomorrow
const tomorrow9AM = new Date();
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
tomorrow9AM.setHours(9, 0, 0);

await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    subject: 'Weekly check-in',
    body: '...',
    send_after: tomorrow9AM.toISOString()
  })
});
```

---

## Template Integration

```typescript
// Use existing template
await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    template_id: templateId,
    variables: {
      first_name: 'Sarah',
      company: 'Acme Inc',
      meeting_date: '2025-01-20'
    }
  })
});
```

---

## Common Patterns

### 1. Approval Queue Dashboard

```typescript
function ApprovalQueue() {
  const { data } = useQuery(['messages', 'awaiting_approval'], () =>
    fetch('/v1/messages?status=awaiting_approval').then(r => r.json())
  );
  
  const approve = useMutation({
    mutationFn: (id: string) =>
      fetch(`/v1/messages/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    }
  });
  
  return (
    <div>
      <h2>Pending Approval ({data?.messages.length})</h2>
      {data?.messages.map(msg => (
        <MessageCard
          key={msg.id}
          message={msg}
          onApprove={() => approve.mutate(msg.id)}
          onReject={() => reject.mutate(msg.id)}
        />
      ))}
    </div>
  );
}
```

### 2. AI-Generated with Review

```typescript
// Generate message with AI
const { message: draft } = await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    goal: 're-engage'
  })
}).then(r => r.json());

// Queue for approval
const { message } = await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    subject: draft.subject,
    body: draft.body,
    requires_approval: true
  })
});

console.log('Message queued for review:', message.id);
```

### 3. Bulk Re-engagement

```typescript
// Find cooling contacts
const cooling = await fetch('/v1/contacts?warmth_lte=39').then(r => r.json());

// Generate and queue messages
for (const contact of cooling.contacts) {
  const { message: draft } = await fetch('/v1/agent/compose/smart', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contact.id,
      channel: 'email',
      goal: 're-engage'
    })
  }).then(r => r.json());
  
  await fetch('/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contact.id,
      channel: 'email',
      subject: draft.subject,
      body: draft.body,
      requires_approval: true  // Review before sending
    })
  });
}

console.log('Generated drafts for review');
```

---

## Error Handling

### Failed Send

```json
{
  "message": {
    "id": "msg_abc",
    "status": "failed",
    "error": "Email bounce: Recipient address rejected",
    "failed_at": "2025-01-15T10:00:00Z"
  }
}
```

### Retry Failed Message

```typescript
await fetch(`/v1/messages/${messageId}/retry`, {
  method: 'POST'
});
```

---

## Best Practices

### 1. Use Approval for Important Messages

```typescript
// Require approval for:
// - VIP contacts
// - High-value opportunities
// - Sensitive communications

const isImportant = contact.tags.includes('vip') || contact.deal_size > 50000;

await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contact.id,
    channel: 'email',
    body: message,
    requires_approval: isImportant
  })
});
```

### 2. Set Expiration for Time-Sensitive Messages

```typescript
// Event invitation expires after event date
await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    subject: 'Join us for webinar on Jan 20',
    body: '...',
    expires_at: '2025-01-20T00:00:00Z'  // Expires day of event
  })
});
```

### 3. Log Interactions After Sending

```typescript
// Message system automatically creates interaction
// But you can add additional context

await fetch('/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    body: message,
    metadata: {
      campaign: 'Q1-reengagement',
      ab_test_variant: 'A'
    }
  })
});
```

---

## Next Steps

- [Templates](./04-templates.md) - Create reusable templates
- [AI Compose](./07-ai-compose.md) - Generate messages
- [Interactions](./03-interactions.md) - Track sent messages
