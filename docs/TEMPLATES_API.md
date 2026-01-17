# Templates API Documentation

Complete API reference for message templates endpoints.

## Overview

Message templates allow users to create reusable message templates with variable substitution. Templates support multiple channels (email, SMS, DM) and include usage tracking.

**Base URL**: `https://ever-reach-be.vercel.app/api/v1`

---

## Endpoints

### 1. List Templates

Get all templates for the authenticated user.

**Endpoint**: `GET /v1/templates`

**Query Parameters**:
- `channel` (optional) - Filter by channel: `email`, `sms`, `dm`, `any`
- `limit` (optional) - Results per page (default: 20, max: 100)
- `cursor` (optional) - Pagination cursor (created_at timestamp)

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "uuid",
      "channel": "email",
      "name": "Follow-up Template",
      "description": "Professional follow-up after meeting",
      "subject_tmpl": "Following up on {{topic}}",
      "body_tmpl": "Hi {{first_name}},\n\nGreat meeting with you...",
      "closing_tmpl": "Best regards",
      "variables": ["first_name", "topic"],
      "visibility": "private",
      "is_default": false,
      "created_at": "2025-10-21T00:00:00Z",
      "updated_at": "2025-10-21T00:00:00Z"
    }
  ],
  "items": [...],  // Alias for templates
  "limit": 20,
  "nextCursor": "2025-10-20T12:00:00Z"
}
```

**Example**:
```bash
curl -X GET "https://ever-reach-be.vercel.app/api/v1/templates?channel=email&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Create Template

Create a new message template.

**Endpoint**: `POST /v1/templates`

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
Idempotency-Key: {unique_key}  (optional)
```

**Request Body**:
```json
{
  "channel": "email",
  "name": "Meeting Follow-up",
  "description": "Template for post-meeting follow-ups",
  "subject_tmpl": "Following up on {{topic}}",
  "body_tmpl": "Hi {{first_name}},\n\nGreat meeting today! {{message}}",
  "closing_tmpl": "Best regards,\n{{sender_name}}",
  "variables": ["first_name", "topic", "message", "sender_name"],
  "visibility": "private"
}
```

**Required Fields**:
- `channel` - Channel type: `email`, `sms`, `dm`, `any`
- `name` - Template name (max 255 chars)
- `body_tmpl` - Template body with {{variable}} placeholders

**Optional Fields**:
- `description` - Template description
- `subject_tmpl` - Email subject template
- `closing_tmpl` - Closing/signature template
- `variables` - Array of variable names (auto-extracted if not provided)
- `visibility` - `private`, `shared`, `public` (default: `private`)

**Response** (201 Created):
```json
{
  "template": {
    "id": "uuid",
    "channel": "email",
    "name": "Meeting Follow-up",
    "created_at": "2025-10-21T00:00:00Z"
  }
}
```

**Idempotency**:
If `Idempotency-Key` header is provided and a template with the same channel and name exists, returns the existing template with `idempotent: true`.

**Example**:
```bash
curl -X POST "https://ever-reach-be.vercel.app/api/v1/templates" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "name": "Quick Check-in",
    "body_tmpl": "Hey {{name}}! Just checking in..."
  }'
```

---

### 3. Get Template

Retrieve a specific template by ID.

**Endpoint**: `GET /v1/templates/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "template": {
    "id": "uuid",
    "channel": "email",
    "name": "Meeting Follow-up",
    "description": "Template for post-meeting follow-ups",
    "subject_tmpl": "Following up on {{topic}}",
    "body_tmpl": "Hi {{first_name}},\n\nGreat meeting today!",
    "closing_tmpl": "Best regards",
    "variables": ["first_name", "topic"],
    "visibility": "private",
    "is_default": false,
    "created_at": "2025-10-21T00:00:00Z",
    "updated_at": "2025-10-21T00:00:00Z"
  }
}
```

**Error** (404 Not Found):
```json
{
  "error": "not_found"
}
```

**Example**:
```bash
curl -X GET "https://ever-reach-be.vercel.app/api/v1/templates/uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Template

Update an existing template.

**Endpoint**: `PATCH /v1/templates/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "subject_tmpl": "New subject: {{topic}}",
  "body_tmpl": "Updated body with {{variables}}",
  "closing_tmpl": "Updated closing",
  "variables": ["updated", "variable", "list"],
  "visibility": "shared"
}
```

**Response** (200 OK):
```json
{
  "template": {
    "id": "uuid",
    "updated_at": "2025-10-21T01:00:00Z"
  }
}
```

**Error** (404 Not Found):
```json
{
  "error": "not_found"
}
```

**Example**:
```bash
curl -X PATCH "https://ever-reach-be.vercel.app/api/v1/templates/uuid" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "variables": ["first_name", "company", "topic"]
  }'
```

---

### 5. Delete Template

Delete a template.

**Endpoint**: `DELETE /v1/templates/:id`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "deleted": true,
  "id": "uuid"
}
```

**Error** (404 Not Found):
```json
{
  "error": "not_found"
}
```

**Example**:
```bash
curl -X DELETE "https://ever-reach-be.vercel.app/api/v1/templates/uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Variable Substitution

Templates support variable substitution using `{{variable_name}}` syntax.

### Variable Format

- **Syntax**: `{{variable_name}}`
- **Naming**: Must start with letter or underscore, can contain letters, numbers, underscores
- **Case-sensitive**: `{{First_Name}}` and `{{first_name}}` are different
- **Whitespace**: No whitespace inside braces: `{{name}}` ✅, `{{ name }}` ❌

### Common Variables

```
{{first_name}}       - Contact's first name
{{last_name}}        - Contact's last name
{{full_name}}        - Full name
{{company}}          - Company name
{{email}}            - Email address
{{phone}}            - Phone number
{{topic}}            - Topic/subject
{{date}}             - Current date
{{sender_name}}      - Your name
{{sender_email}}     - Your email
{{sender_company}}   - Your company
```

### Example Template

```
Subject: Following up on {{topic}}

Body:
Hi {{first_name}},

Great meeting with you at {{company}} yesterday! I wanted to follow up on {{topic}} as discussed.

{{custom_message}}

Best regards,
{{sender_name}}
{{sender_company}}
```

---

## Channels

Templates can be created for specific communication channels:

| Channel | Description | Use Case |
|---------|-------------|----------|
| `email` | Email messages | Formal communication, detailed content |
| `sms` | SMS/text messages | Short, urgent messages (< 160 chars) |
| `dm` | Direct messages | Social media, chat platforms |
| `any` | Multi-channel | Works across all channels |

**Channel-Specific Features**:
- `email`: Supports `subject_tmpl` and `closing_tmpl`
- `sms`: Limited to `body_tmpl` only (short form)
- `dm`: Informal tone, `body_tmpl` only
- `any`: Flexible, adapt to any channel

---

## Visibility

Control who can see and use your templates:

| Visibility | Access | Description |
|------------|--------|-------------|
| `private` | Owner only | Personal templates |
| `shared` | Team members | Shared with organization (future) |
| `public` | Everyone | Public template library (future) |

*Note: `shared` and `public` are planned features for team/org support.*

---

## Usage Tracking

Templates automatically track usage:

```json
{
  "usage_count": 42,           // Total times used
  "last_used_at": "2025-10-21T00:00:00Z"  // Last usage timestamp
}
```

**Increment Usage**:
```sql
-- When template is used, call:
SELECT increment_template_usage('template_id');
```

---

## Helper Functions

### Extract Variables

Automatically extract variable names from template content:

```sql
SELECT extract_template_variables('Hi {{name}}, welcome to {{company}}!');
-- Returns: ["name", "company"]
```

### Render Template

Replace variables with actual values:

```sql
SELECT render_template(
  'Hi {{name}}, welcome to {{company}}!',
  '{"name": "John", "company": "Acme Inc"}'::jsonb
);
-- Returns: "Hi John, welcome to Acme Inc!"
```

---

## Rate Limits

- **List**: 60 requests per minute per user
- **Create**: 30 requests per minute per user
- **Update/Delete**: No specific limit (global user limit applies)

**Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1634567890
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "invalid_json"
}
```
or
```json
{
  "error": "Validation error: body_tmpl is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "not_found"
}
```

### 429 Rate Limited
```json
{
  "error": "rate_limited",
  "retryAfter": 30
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal error"
}
```

---

## Best Practices

### 1. Variable Naming

✅ **Good**:
- `{{first_name}}`
- `{{company_name}}`
- `{{sender_email}}`

❌ **Bad**:
- `{{First Name}}` - spaces
- `{{name!}}` - special chars
- `{{123name}}` - starts with number

### 2. Template Organization

- Use descriptive names: "Post-Meeting Follow-up" not "Template 1"
- Add descriptions for context
- Tag common variables in description
- Use consistent variable names across templates

### 3. Channel Selection

- `email` for formal, detailed messages
- `sms` for urgent, short messages
- `dm` for casual, conversational messages
- `any` for flexible, multi-channel templates

### 4. Variable Defaults

Always provide fallback values when rendering:

```javascript
const values = {
  first_name: contact.first_name || 'there',
  company: contact.company || 'your organization',
  topic: context.topic || 'our discussion'
};
```

### 5. Testing Templates

Test with various variable combinations:
- All variables filled
- Some variables empty
- No variables provided
- Special characters in values

---

## Integration Examples

### JavaScript/TypeScript

```typescript
// Fetch templates
const templates = await fetch('/api/v1/templates?channel=email', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Create template
const newTemplate = await fetch('/api/v1/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'email',
    name: 'Welcome Email',
    body_tmpl: 'Welcome {{name}} to {{company}}!'
  })
});

// Render template client-side
function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] || match;
  });
}

const rendered = renderTemplate(
  'Hi {{name}}, welcome to {{company}}!',
  { name: 'John', company: 'Acme' }
);
```

### Python

```python
import requests

# List templates
response = requests.get(
    'https://ever-reach-be.vercel.app/api/v1/templates',
    headers={'Authorization': f'Bearer {token}'}
)
templates = response.json()['templates']

# Create template
template = {
    'channel': 'email',
    'name': 'Follow-up',
    'body_tmpl': 'Hi {{name}}, following up on {{topic}}...'
}
response = requests.post(
    'https://ever-reach-be.vercel.app/api/v1/templates',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json=template
)
```

### React Hook

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/v1/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });
}

function useCreateTemplate() {
  return useMutation({
    mutationFn: async (template) => {
      const res = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });
      return res.json();
    }
  });
}
```

---

## Migration

To enable templates, run the migration:

```bash
psql $DATABASE_URL -f backend-vercel/migrations/message-templates.sql
```

**Migration includes**:
- `templates` table with RLS policies
- Helper functions (`extract_template_variables`, `render_template`, `increment_template_usage`)
- Materialized view (`mv_popular_templates`)
- Indexes for performance
- Sample templates

---

## Related Endpoints

- **AI Compose**: `/v1/agent/compose/smart` - Uses templates for AI message generation
- **Messages**: `/v1/messages/prepare` - Can select template for message
- **Contacts**: `/v1/contacts` - Provides variable values for rendering

---

## Changelog

### 2025-10-21
- Initial templates API implementation
- Variable substitution support
- Multi-channel support
- Usage tracking

---

**Need Help?**
- API Support: See main API documentation
- Integration: Check integration guides
- Issues: Report via feature requests

**Status**: ✅ Production Ready (pending migration)
