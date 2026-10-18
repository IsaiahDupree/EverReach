# Contacts API

Manage your contact database with full CRUD operations, search, filtering, and warmth tracking.

**Base Endpoint**: `/v1/contacts`

---

## List Contacts

Get a paginated list of contacts with optional filters.

```http
GET /v1/contacts
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query (name, email, phone) | `?q=john` |
| `tag` | string | Filter by tag | `?tag=vip` |
| `warmth_band` | string | Filter by warmth level | `?warmth_band=warm` |
| `warmth_gte` | integer | Minimum warmth score (0-100) | `?warmth_gte=50` |
| `warmth_lte` | integer | Maximum warmth score (0-100) | `?warmth_lte=90` |
| `pipeline` | string | Filter by pipeline | `?pipeline=sales` |
| `stage` | string | Filter by stage | `?stage=qualified` |
| `sort` | string | Sort order | `?sort=warmth.desc` |
| `limit` | integer | Results per page (max: 1000) | `?limit=50` |
| `cursor` | string | Pagination cursor | `?cursor=2025-01-15T...` |

### Sort Options
- `created_at.desc` (default)
- `created_at.asc`
- `warmth.desc`
- `warmth.asc`

### Warmth Bands
- `hot` - Warmth 80-100
- `warm` - Warmth 60-79
- `neutral` - Warmth 40-59
- `cool` - Warmth 20-39
- `cold` - Warmth 0-19

### Example Request

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/contacts?tag=customer&warmth_gte=60&limit=50',
  {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    }
  }
);

const { contacts, nextCursor } = await response.json();
```

### Response

```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "display_name": "John Doe",
      "emails": ["john@example.com"],
      "phones": ["+1234567890"],
      "company": "Acme Inc",
      "tags": ["vip", "customer"],
      "warmth": 75,
      "warmth_band": "warm",
      "warmth_override": false,
      "last_interaction_at": "2025-01-10T14:30:00Z",
      "created_at": "2024-06-15T10:00:00Z",
      "updated_at": "2025-01-10T14:35:00Z"
    }
  ],
  "limit": 50,
  "nextCursor": "2025-01-10T14:00:00Z"
}
```

---

## Get Contact

Retrieve a single contact by ID.

```http
GET /v1/contacts/:id
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}`,
  {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { contact } = await response.json();
```

### Response

```json
{
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "emails": ["john@example.com", "j.doe@work.com"],
    "phones": ["+1234567890"],
    "company": "Acme Inc",
    "notes": "Met at conference. Interested in enterprise plan.",
    "tags": ["vip", "customer", "enterprise"],
    "avatar_url": "https://storage.supabase.co/...",
    "warmth": 75,
    "warmth_band": "warm",
    "warmth_override": false,
    "metadata": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "timezone": "America/New_York"
    },
    "created_at": "2024-06-15T10:00:00Z",
    "updated_at": "2025-01-10T14:35:00Z"
  }
}
```

---

## Create Contact

Add a new contact to your database.

```http
POST /v1/contacts
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | ✅ Yes | Contact's name (max: 120 chars) |
| `emails` | string[] | No | Email addresses (max: 10) |
| `phones` | string[] | No | Phone numbers (max: 10) |
| `company` | string | No | Company name (max: 120 chars) |
| `notes` | string | No | Free-form notes (max: 5000 chars) |
| `tags` | string[] | No | Tags (max: 50, each max 40 chars) |
| `avatar_url` | string | No | Profile picture URL |
| `metadata` | object | No | Custom key-value data |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/contacts',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      display_name: 'Jane Smith',
      emails: ['jane@techcorp.com'],
      phones: ['+1987654321'],
      company: 'Tech Corp',
      tags: ['prospect', 'lead'],
      metadata: {
        source: 'website_form',
        interest: 'enterprise'
      }
    })
  }
);

const { contact } = await response.json();
```

### Response (201 Created)

```json
{
  "contact": {
    "id": "660e9500-f39c-52e5-b827-557766550111",
    "display_name": "Jane Smith",
    "emails": ["jane@techcorp.com"],
    "phones": ["+1987654321"],
    "company": "Tech Corp",
    "tags": ["prospect", "lead"],
    "warmth": 30,
    "warmth_band": "cool",
    "created_at": "2025-10-12T15:45:00Z"
  }
}
```

---

## Update Contact

Modify an existing contact. Only include fields you want to update.

```http
PATCH /v1/contacts/:id
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      tags: ['customer', 'vip'], // Replaces existing tags
      warmth: 85,
      warmth_override: true,
      warmth_override_reason: 'Major deal closed'
    })
  }
);

const { contact } = await response.json();
```

---

## Delete Contact

Permanently remove a contact and all associated data.

```http
DELETE /v1/contacts/:id
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Origin': 'https://everreach.app'
    }
  }
);

// 200 OK or 204 No Content
```

---

## Modify Tags

Add or remove tags without replacing the entire tags array.

```http
POST /v1/contacts/:id/tags
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}/tags`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      add: ['vip', 'priority'],
      remove: ['prospect']
    })
  }
);

const { contact } = await response.json();
```

---

## Common Patterns

### Find Contact by Email

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts?q=${encodeURIComponent(email)}`,
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { contacts } = await response.json();
const contact = contacts.find(c => c.emails.includes(email));
```

### Get All VIP Customers

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/contacts?tag=vip&warmth_gte=80',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { contacts } = await response.json();
```

### Paginate Through All Contacts

```typescript
let cursor = null;
let allContacts = [];

do {
  const url = cursor 
    ? `https://ever-reach-be.vercel.app/api/v1/contacts?cursor=${cursor}&limit=100`
    : 'https://ever-reach-be.vercel.app/api/v1/contacts?limit=100';
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
  
  const { contacts, nextCursor } = await response.json();
  allContacts = [...allContacts, ...contacts];
  cursor = nextCursor;
} while (cursor);

console.log(`Total contacts: ${allContacts.length}`);
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "display_name is required",
  "request_id": "req_abc123"
}
```

### 404 Not Found
```json
{
  "error": "Contact not found",
  "request_id": "req_abc123"
}
```

---

## Next Steps

- [Interactions](./03-interactions.md) - Log communications with contacts
- [Warmth & Scoring](./05-warmth-scoring.md) - Track relationship health
- [Search](./10-search.md) - Advanced search capabilities
