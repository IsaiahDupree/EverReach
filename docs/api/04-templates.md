# Templates API

Create reusable message templates for email, SMS, and direct messages with variable placeholders.

**Base Endpoint**: `/v1/templates`

---

## Overview

Templates help you:
- **Save time** with pre-written messages
- **Maintain consistency** across communications
- **Personalize at scale** with variable substitution
- **Test variations** for different scenarios

---

## List Templates

Get all templates, optionally filtered by channel.

```http
GET /v1/templates?channel=email
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel` | string | Filter by channel (email, sms, dm) |
| `limit` | integer | Results per page (1-100, default: 20) |
| `cursor` | string | Pagination cursor |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/templates?channel=email&limit=50',
  {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { templates } = await response.json();
```

### Response

```json
{
  "templates": [
    {
      "id": "880g0622-h51e-64g7-d049-779988772333",
      "channel": "email",
      "name": "Welcome Email",
      "description": "First contact welcome message",
      "subject_tmpl": "Welcome to {{company}}!",
      "body_tmpl": "Hi {{name}},\n\nThanks for connecting...",
      "closing_tmpl": "Best regards,\n{{sender_name}}",
      "variables": ["name", "company", "sender_name"],
      "visibility": "private",
      "is_default": false,
      "created_at": "2025-01-10T10:00:00Z"
    }
  ],
  "limit": 50,
  "nextCursor": null
}
```

---

## Get Template

Retrieve a single template by ID.

```http
GET /v1/templates/:id
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/templates/${templateId}`,
  {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { template } = await response.json();
```

---

## Create Template

Create a new message template.

```http
POST /v1/templates
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel` | string | ✅ Yes | email, sms, or dm |
| `name` | string | ✅ Yes | Template name (max: 120 chars) |
| `body_tmpl` | string | ✅ Yes | Message body with {{variables}} |
| `subject_tmpl` | string | No | Subject line (email only) |
| `closing_tmpl` | string | No | Signature/closing |
| `description` | string | No | Template description |
| `variables` | string[] | No | List of variable names |
| `visibility` | string | No | private, team, or org (default: private) |

### Example - Email Template

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/templates',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      channel: 'email',
      name: 'Re-engagement Email',
      description: 'For contacts we haven\'t spoken to in 30+ days',
      subject_tmpl: 'Long time no talk, {{name}}!',
      body_tmpl: `Hi {{name}},

I hope this email finds you well! It's been a while since we last connected.

I wanted to reach out because {{reason}}.

Would you have 15 minutes this week for a quick catch-up call?`,
      closing_tmpl: 'Best regards,\n{{sender_name}}\n{{sender_title}}',
      variables: ['name', 'reason', 'sender_name', 'sender_title'],
      visibility: 'private'
    })
  }
);

const { template } = await response.json();
```

### Example - SMS Template

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/templates',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: 'sms',
      name: 'Quick Check-in',
      body_tmpl: 'Hi {{name}}! Just checking in. How are things going with {{topic}}? - {{sender_name}}',
      variables: ['name', 'topic', 'sender_name']
    })
  }
);
```

---

## Update Template

Modify an existing template.

```http
PATCH /v1/templates/:id
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/templates/${templateId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Updated Re-engagement Email',
      body_tmpl: 'New improved body text...',
      is_default: true
    })
  }
);
```

---

## Delete Template

Remove a template permanently.

```http
DELETE /v1/templates/:id
```

### Example

```typescript
await fetch(
  `https://ever-reach-be.vercel.app/api/v1/templates/${templateId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  }
);
```

---

## Variable Substitution

Use `{{variable_name}}` syntax in your templates. Variables are case-sensitive.

### Common Variables

```typescript
// Personal
{{name}}          // Contact's name
{{first_name}}    // First name only
{{company}}       // Company name

// Sender
{{sender_name}}   // Your name
{{sender_title}}  // Your job title
{{sender_email}}  // Your email

// Context
{{reason}}        // Why you're reaching out
{{topic}}         // Discussion topic
{{meeting_link}}  // Calendar link
{{date}}          // Current date
```

### Example Usage

**Template**:
```
Hi {{name}},

I hope you're doing well at {{company}}!

I wanted to reach out about {{topic}}. Based on our last conversation, I thought this might be relevant.

Would {{date}} work for a quick call?

Best,
{{sender_name}}
```

**With Variables**:
```typescript
const variables = {
  name: 'John',
  company: 'Acme Inc',
  topic: 'Q1 partnership opportunities',
  date: 'next Tuesday',
  sender_name: 'Jane Smith'
};

// Render template
const message = renderTemplate(template.body_tmpl, variables);
```

**Result**:
```
Hi John,

I hope you're doing well at Acme Inc!

I wanted to reach out about Q1 partnership opportunities. Based on our last conversation, I thought this might be relevant.

Would next Tuesday work for a quick call?

Best,
Jane Smith
```

---

## Template Categories

### Welcome/Introduction
```json
{
  "name": "New Connection Welcome",
  "subject_tmpl": "Great to connect, {{name}}!",
  "body_tmpl": "Hi {{name}},\n\nIt was great meeting you at {{event}}..."
}
```

### Follow-up
```json
{
  "name": "Post-Meeting Follow-up",
  "subject_tmpl": "Following up on our conversation",
  "body_tmpl": "Hi {{name}},\n\nThanks for taking the time to meet today..."
}
```

### Re-engagement
```json
{
  "name": "30-Day Re-engagement",
  "subject_tmpl": "Checking in, {{name}}",
  "body_tmpl": "Hi {{name}},\n\nIt's been about a month since we last connected..."
}
```

### Value-add
```json
{
  "name": "Share Resource",
  "subject_tmpl": "Thought you might find this useful",
  "body_tmpl": "Hi {{name}},\n\nI came across {{resource}} and thought of you..."
}
```

---

## Best Practices

### 1. Keep it Personal
```typescript
// ❌ Generic
"Dear Customer, We wanted to reach out..."

// ✅ Personal
"Hi {{name}}, I hope you're doing well at {{company}}..."
```

### 2. Clear Call-to-Action
```typescript
// ❌ Vague
"Let me know if you want to chat sometime."

// ✅ Specific
"Are you free for a 15-minute call on {{date}}?"
```

### 3. Mobile-Friendly (SMS)
```typescript
// ✅ SMS Template (under 160 chars)
"Hi {{name}}! Quick question about {{topic}}. Got 5 min today? - {{sender}}"
```

### 4. Test Your Variables
```typescript
// Always provide fallbacks
const name = contact.display_name || 'there';
const company = contact.company || 'your company';
```

---

## Common Patterns

### Get Default Template for Channel

```typescript
const response = await fetch(
  '/v1/templates?channel=email',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { templates } = await response.json();
const defaultTemplate = templates.find(t => t.is_default);
```

### Render Template with Contact Data

```typescript
function renderTemplate(template, contact) {
  let message = template.body_tmpl;
  
  const variables = {
    name: contact.display_name,
    first_name: contact.display_name.split(' ')[0],
    company: contact.company || '',
    ...template.metadata
  };
  
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(`{{${key}}}`, value);
  });
  
  return message;
}
```

---

## Next Steps

- [AI Compose](./07-ai-compose.md) - Generate personalized messages with AI
- [Interactions](./03-interactions.md) - Log sent messages as interactions
- [Contacts](./02-contacts.md) - Get contact data for personalization
