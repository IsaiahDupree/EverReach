# Pipelines & Goals API

Manage sales pipelines and track messaging goals for structured relationship progression.

**Base Endpoints**: `/v1/pipelines`, `/v1/goals`

---

## Pipelines

### Overview

Pipelines organize contacts through stages (Lead → Qualified → Proposal → Closed).

### List Pipelines

```http
GET /v1/pipelines
```

### Create Pipeline

```http
POST /v1/pipelines
Content-Type: application/json
```

**Example**:
```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/pipelines',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Sales Pipeline',
      stages: [
        { name: 'Lead', order: 0 },
        { name: 'Qualified', order: 1 },
        { name: 'Proposal', order: 2 },
        { name: 'Closed Won', order: 3 }
      ]
    })
  }
);
```

### Update Pipeline

```http
PATCH /v1/pipelines/:id
```

### Delete Pipeline

```http
DELETE /v1/pipelines/:id
```

### Move Contact to Stage

```http
PATCH /v1/contacts/:id/pipeline
Content-Type: application/json
```

**Example**:
```typescript
await fetch(`/v1/contacts/${contactId}/pipeline`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pipeline_id: 'pipeline-uuid',
    stage_id: 'stage-uuid'
  })
});
```

---

## Goals

### Overview

Goals define message objectives (re-engage, nurture, convert) for tracking effectiveness.

### List Goals

```http
GET /v1/goals?kind=business
```

**Query Parameters**:
- `kind` - business, network, or personal

### Create Goal

```http
POST /v1/goals
Content-Type: application/json
```

**Example**:
```typescript
await fetch('/v1/goals', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    kind: 'business',
    name: 'Schedule Demo',
    description: 'Book product demonstration call',
    channel_suggestions: ['email', 'call']
  })
});
```

### Update Goal

```http
PATCH /v1/goals/:id
```

### Delete Goal

```http
DELETE /v1/goals/:id
```

---

## Common Patterns

### Pipeline Progress Tracking

```typescript
// Get all contacts in pipeline
const contacts = await fetch('/v1/contacts?pipeline=sales', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

// Group by stage
const byStage = contacts.contacts.reduce((acc, c) => {
  const stage = c.pipeline_stage || 'none';
  acc[stage] = (acc[stage] || 0) + 1;
  return acc;
}, {});

console.log('Pipeline distribution:', byStage);
```

### Goal-Based Messaging

```typescript
// Compose message for specific goal
const { message } = await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',
    goal: 'convert', // Uses goal context
    variables: {
      goal_name: 'Schedule Demo'
    }
  })
}).then(r => r.json());
```

---

## Next Steps

- [Contacts](./02-contacts.md) - Assign contacts to pipelines
- [AI Compose](./07-ai-compose.md) - Goal-based message generation
