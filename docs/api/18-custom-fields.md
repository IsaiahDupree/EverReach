# Custom Fields API

Create and manage custom fields for flexible contact data with AI integration.

**Base Endpoint**: `/v1/custom-fields`

---

## Overview

Custom fields allow you to:
- **Extend contact schema** - Add unlimited fields without migrations
- **Type-safe validation** - Enforce data types and constraints
- **AI-accessible** - Fields can be read/written by AI agents
- **Privacy controls** - Mark fields as PII-sensitive
- **Dynamic forms** - Auto-generate UI from field definitions

### Field Types

`text`, `textarea`, `number`, `integer`, `boolean`, `date`, `datetime`, `select`, `multiselect`, `email`, `phone`, `url`, `currency`, `rating`, `json`

---

## Create Field Definition

Define a new custom field for contacts.

```http
POST /v1/custom-fields
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | ✅ Yes | Entity type (contact, interaction, org) |
| `slug` | string | ✅ Yes | Unique identifier (snake_case) |
| `label` | string | ✅ Yes | Display name |
| `type` | string | ✅ Yes | Data type |
| `required` | boolean | No | Field is required |
| `ai_can_read` | boolean | No | AI can read this field |
| `ai_can_write` | boolean | No | AI can modify this field |
| `pii_level` | string | No | none, light, sensitive |

### Example - VIP Flag

```typescript
await fetch('/v1/custom-fields', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entity: 'contact',
    slug: 'is_vip',
    label: 'VIP Customer',
    type: 'boolean',
    required: false,
    ai_can_read: true,
    ai_can_write: true,
    pii_level: 'none',
    synonyms: ['vip', 'important', 'priority']
  })
});
```

### Example - Deal Size

```typescript
await fetch('/v1/custom-fields', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'contact',
    slug: 'deal_size',
    label: 'Deal Size',
    type: 'currency',
    required: false,
    validation: {
      min: 0,
      max: 1000000
    },
    ai_can_read: true,
    ai_can_write: false // AI can read but not modify
  })
});
```

### Example - Industry

```typescript
await fetch('/v1/custom-fields', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'contact',
    slug: 'industry',
    label: 'Industry',
    type: 'select',
    required: false,
    validation: {
      options: ['SaaS', 'E-commerce', 'Healthcare', 'Finance', 'Other']
    },
    ai_can_read: true,
    ai_can_write: true
  })
});
```

---

## List Field Definitions

```http
GET /v1/custom-fields?entity=contact
```

### Response

```json
{
  "fields": [
    {
      "id": "field_abc123",
      "entity": "contact",
      "slug": "is_vip",
      "label": "VIP Customer",
      "type": "boolean",
      "required": false,
      "ai_can_read": true,
      "ai_can_write": true,
      "pii_level": "none",
      "synonyms": ["vip", "important"],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## Set Custom Field Values

Update custom fields on a contact.

```http
PATCH /v1/contacts/:id/custom
Content-Type: application/json
```

### Example

```typescript
await fetch(`/v1/contacts/${contactId}/custom`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    is_vip: true,
    deal_size: 50000,
    industry: 'SaaS',
    last_purchase_date: '2025-01-10'
  })
});
```

### Response

```json
{
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "custom_fields": {
    "is_vip": true,
    "deal_size": 50000,
    "industry": "SaaS",
    "last_purchase_date": "2025-01-10"
  }
}
```

---

## Get Custom Field Values

```http
GET /v1/contacts/:id/custom
```

### Response

```json
{
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "custom_fields": {
    "is_vip": true,
    "deal_size": 50000,
    "industry": "SaaS"
  }
}
```

---

## AI Integration

### Natural Language Updates

```typescript
// User: "Mark John as a VIP customer"
// AI automatically:
// 1. Resolves "VIP" → "is_vip" field using synonyms
// 2. Calls set_contact_custom_fields()

const response = await fetch('/v1/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Mark John as a VIP customer'
  })
});

// AI will update custom field: { is_vip: true }
```

### AI Tool Auto-Generation

Custom fields automatically generate OpenAI function schemas:

```typescript
// Generated AI tools:
{
  "name": "set_contact_custom_fields",
  "description": "Update custom fields on a contact",
  "parameters": {
    "properties": {
      "contact_id": { "type": "string" },
      "is_vip": { "type": "boolean", "description": "VIP Customer" },
      "deal_size": { "type": "number", "description": "Deal Size" },
      "industry": {
        "type": "string",
        "enum": ["SaaS", "E-commerce", "Healthcare", "Finance", "Other"]
      }
    }
  }
}
```

---

## Validation

### Type Coercion

```typescript
// String → Number
{ "deal_size": "50000" } → { "deal_size": 50000 }

// String → Boolean
{ "is_vip": "true" } → { "is_vip": true }
{ "is_vip": "yes" } → { "is_vip": true }
```

### Validation Rules

```typescript
{
  "validation": {
    "min": 0,                    // Minimum value (number)
    "max": 100,                  // Maximum value (number)
    "minLength": 2,              // Minimum length (string)
    "maxLength": 50,             // Maximum length (string)
    "pattern": "^[A-Z]{2}$",    // Regex pattern (string)
    "options": ["A", "B", "C"],  // Valid options (select)
    "unique": true               // Must be unique across contacts
  }
}
```

---

## Common Patterns

### 1. CRM-Specific Fields

```typescript
// Create standard CRM fields
const fields = [
  { slug: 'lead_source', label: 'Lead Source', type: 'select',
    validation: { options: ['Website', 'Referral', 'Event', 'Cold Outreach'] }
  },
  { slug: 'deal_stage', label: 'Deal Stage', type: 'select',
    validation: { options: ['Qualified', 'Demo', 'Proposal', 'Negotiation'] }
  },
  { slug: 'annual_revenue', label: 'Annual Revenue', type: 'currency' },
  { slug: 'employee_count', label: 'Employee Count', type: 'integer' }
];

for (const field of fields) {
  await createCustomField({ entity: 'contact', ...field });
}
```

### 2. Search by Custom Fields

```typescript
// Find all VIP customers in SaaS industry
const contacts = await fetch('/v1/contacts', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

const vipSaas = contacts.contacts.filter(c =>
  c.custom?.is_vip === true &&
  c.custom?.industry === 'SaaS'
);
```

### 3. Dynamic Forms

```typescript
// Generate form from field definitions
function CustomFieldsForm({ contactId }) {
  const { data: fields } = useQuery(['custom-fields'], () =>
    fetch('/v1/custom-fields?entity=contact').then(r => r.json())
  );
  
  return (
    <form>
      {fields?.fields.map(field => (
        <div key={field.slug}>
          <label>{field.label}</label>
          {field.type === 'boolean' && <input type="checkbox" />}
          {field.type === 'select' && (
            <select>
              {field.validation.options.map(opt => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          )}
          {field.type === 'text' && <input type="text" />}
        </div>
      ))}
    </form>
  );
}
```

---

## Privacy & PII Levels

### PII Levels

| Level | Description | AI Access | Examples |
|-------|-------------|-----------|----------|
| `none` | Not PII | Full | is_vip, industry, deal_size |
| `light` | Low sensitivity | Read-only | birthday, city, company_size |
| `sensitive` | High sensitivity | Denied | ssn, passport, medical_info |

### Example

```typescript
await createCustomField({
  slug: 'birth_date',
  type: 'date',
  pii_level: 'light',      // AI can read but not write
  ai_can_read: true,
  ai_can_write: false
});
```

---

## Audit Trail

All custom field changes are logged:

```typescript
// Query audit trail
const changes = await fetch('/v1/contacts/${contactId}/custom/audit', {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

// Response
{
  "changes": [
    {
      "field": "is_vip",
      "old_value": false,
      "new_value": true,
      "changed_by": "user_id",
      "changed_at": "2025-01-15T10:00:00Z",
      "source": "ai_agent"  // ui, api, ai_agent
    }
  ]
}
```

---

## Best Practices

### 1. Use Meaningful Slugs

```typescript
// ✅ Good
{ slug: 'annual_contract_value' }

// ❌ Bad
{ slug: 'acv' }  // Not clear
```

### 2. Provide Synonyms for AI

```typescript
{
  slug: 'is_vip',
  synonyms: ['vip', 'important', 'priority', 'key account']
}
```

### 3. Set Appropriate AI Permissions

```typescript
// Financial data - AI can read but not modify
{
  slug: 'deal_size',
  ai_can_read: true,
  ai_can_write: false
}

// Flags - AI can update
{
  slug: 'is_qualified',
  ai_can_read: true,
  ai_can_write: true
}
```

---

## Performance

Custom fields use JSONB with GIN indexing:

```typescript
// Fast queries on indexed fields
await createCustomField({
  slug: 'industry',
  is_indexed: true  // Creates GIN expression index
});
```

---

## Next Steps

- [Contacts](./02-contacts.md) - Use custom fields in contacts
- [Agent Chat](./15-agent-chat.md) - AI updates custom fields
- [Search](./10-search.md) - Filter by custom fields
