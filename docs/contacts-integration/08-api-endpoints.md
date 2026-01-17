# Contact API Endpoints Reference

## 🌐 Base Configuration

### Backend URL
```typescript
// Production
const BACKEND_URL = 'https://ever-reach-be.vercel.app';

// From lib/api.ts
import { backendBase } from '@/lib/api';
const base = backendBase(); // Returns correct URL
```

### Authentication
All endpoints require authentication header:
```typescript
Authorization: Bearer <supabase_access_token>
```

## 📋 Contact Endpoints

### GET `/api/v1/contacts`
List all contacts for authenticated user.

**Query Parameters:**
```typescript
{
  limit?: number;        // Default: 20, Max: 1000
  cursor?: string;       // ISO timestamp for pagination
  tag?: string;         // Filter by tag
  pipeline_id?: string; // Filter by pipeline
  stage_id?: string;    // Filter by stage
  query?: string;       // Search query
  sort?: string;        // Sort field (default: updated_at)
  order?: 'asc'|'desc'; // Sort order (default: desc)
}
```

**Usage:**
```typescript
import { apiFetch } from '@/lib/api';

const response = await apiFetch('/api/v1/contacts?limit=50');
const data = await response.json();

// Response: { items: Contact[], limit: number, nextCursor?: string }
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "emails": [{"email": "john@example.com"}],
      "phones": [{"phone": "+1234567890"}],
      "company": "Acme Inc",
      "tags": ["client", "vip"],
      "warmth": 75,
      "warmth_band": "warm",
      "last_interaction_at": "2025-10-04T12:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z"
    }
  ],
  "limit": 50,
  "nextCursor": "2025-10-03T12:00:00Z"
}
```

---

### POST `/api/v1/contacts`
Create a new contact.

**Headers:**
```typescript
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: <unique-key> // Optional, prevents duplicates
```

**Request Body:**
```typescript
{
  display_name: string;              // Required
  emails?: Array<{email: string, type?: string}>;
  phones?: Array<{phone: string, type?: string}>;
  company?: string;
  title?: string;
  tags?: string[];
  notes?: string;
  warmth?: number;                   // 0-100
  metadata?: Record<string, any>;
}
```

**Usage:**
```typescript
const newContact = await apiFetch('/api/v1/contacts', {
  method: 'POST',
  body: JSON.stringify({
    display_name: 'Jane Smith',
    emails: [{ email: 'jane@example.com', type: 'work' }],
    phones: [{ phone: '+1234567890', type: 'mobile' }],
    company: 'Tech Corp',
    tags: ['prospect']
  })
});

const result = await newContact.json();
// Returns: { contact: Contact }
```

**Response:**
```json
{
  "contact": {
    "id": "new-uuid",
    "display_name": "Jane Smith",
    "emails": [{"email": "jane@example.com", "type": "work"}],
    "created_at": "2025-10-04T12:37:00Z"
  }
}
```

---

### GET `/api/v1/contacts/:id`
Get single contact by ID.

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}`);
const data = await response.json();
// Returns: { contact: Contact }
```

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "display_name": "John Doe",
    "emails": [{"email": "john@example.com"}],
    "phones": [{"phone": "+1234567890"}],
    "company": "Acme Inc",
    "tags": ["client"],
    "warmth": 75,
    "notes": "Important client",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

---

### PUT `/api/v1/contacts/:id`
Update existing contact.

**Request Body:**
```typescript
{
  display_name?: string;
  emails?: Array<{email: string, type?: string}>;
  phones?: Array<{phone: string, type?: string}>;
  company?: string;
  title?: string;
  tags?: string[];
  notes?: string;
  warmth?: number;
}
```

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}`, {
  method: 'PUT',
  body: JSON.stringify({
    tags: ['vip', 'client'],
    warmth: 90
  })
});

const result = await response.json();
// Returns: { contact: Contact }
```

---

### DELETE `/api/v1/contacts/:id`
Delete contact (soft delete).

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}`, {
  method: 'DELETE'
});

// Returns: { success: true }
```

**Note**: Backend performs soft delete by setting `deleted_at` timestamp.

---

### GET `/api/v1/contacts/search`
Search contacts by query.

**Query Parameters:**
```typescript
{
  q: string;  // Required - search query
}
```

**Usage:**
```typescript
const query = encodeURIComponent('john');
const response = await apiFetch(`/api/v1/contacts/search?q=${query}`);
const data = await response.json();
// Returns: { contacts: Contact[] }
```

Searches across:
- Display name
- Company name
- Email addresses
- Phone numbers

---

### GET `/api/v1/contacts/:id/notes`
Get notes/interactions for a contact.

**Query Parameters:**
```typescript
{
  limit?: number;      // Default: 20
  cursor?: string;     // ISO timestamp
}
```

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}/notes?limit=50`);
const data = await response.json();
// Returns: { items: Interaction[], nextCursor?: string }
```

---

### POST `/api/v1/contacts/:id/notes`
Create note for contact.

**Request Body:**
```typescript
{
  content: string;                 // Required
  metadata?: Record<string, any>;
}
```

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}/notes`, {
  method: 'POST',
  body: JSON.stringify({
    content: 'Had coffee meeting today. Discussed new partnership.'
  })
});
```

---

### GET `/api/v1/contacts/:id/files`
List files attached to contact.

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}/files`);
const data = await response.json();
// Returns: { attachments: Attachment[] }
```

---

### POST `/api/v1/contacts/:id/files`
Upload file for contact.

**Usage:**
```typescript
const formData = new FormData();
formData.append('file', fileBlob);

const response = await apiFetch(`/api/v1/contacts/${contactId}/files`, {
  method: 'POST',
  body: formData,
  // Don't set Content-Type, let browser set it with boundary
});
```

---

### GET `/api/v1/contacts/:id/context-summary`
Get AI-generated context summary for contact.

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}/context-summary`);
const data = await response.json();
// Returns: { summary: string, context: {...} }
```

---

### POST `/api/v1/contacts/:id/goal-suggestions`
Get AI goal suggestions for contact.

**Request Body:**
```typescript
{
  current_context?: string;
}
```

**Usage:**
```typescript
const response = await apiFetch(`/api/v1/contacts/${contactId}/goal-suggestions`, {
  method: 'POST',
  body: JSON.stringify({
    current_context: 'Want to deepen business relationship'
  })
});
```

## 🔄 Helper Functions

### Using apiFetch (Recommended)

The `apiFetch` helper from `lib/api.ts` handles authentication automatically:

```typescript
import { apiFetch } from '@/lib/api';

// GET request
const contacts = await apiFetch('/api/v1/contacts');

// POST request
const newContact = await apiFetch('/api/v1/contacts', {
  method: 'POST',
  body: JSON.stringify(data)
});

// PUT request
const updated = await apiFetch(`/api/v1/contacts/${id}`, {
  method: 'PUT',
  body: JSON.stringify(updates)
});

// DELETE request
const deleted = await apiFetch(`/api/v1/contacts/${id}`, {
  method: 'DELETE'
});
```

### Manual Fetch (Not Recommended)

If you need to call directly without apiFetch:

```typescript
import { backendBase, authHeader } from '@/lib/api';

const base = backendBase();
const auth = await authHeader();

const response = await fetch(`${base}/api/v1/contacts`, {
  headers: {
    'Content-Type': 'application/json',
    ...auth
  }
});
```

## 🔐 Authentication Flow

1. User logs in via Supabase Auth
2. Supabase returns JWT access token
3. Token stored in secure storage
4. `apiFetch` automatically attaches token to requests
5. Backend validates token via Supabase
6. Backend extracts `user_id` from JWT
7. All queries scoped to authenticated user

## ⚠️ Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**404 Not Found**
```json
{
  "error": "not_found",
  "message": "Contact not found"
}
```

**400 Bad Request**
```json
{
  "error": "validation_error",
  "message": "display_name is required"
}
```

**500 Server Error**
```json
{
  "error": "internal_error",
  "message": "An error occurred"
}
```

### Error Handling Pattern

```typescript
try {
  const response = await apiFetch('/api/v1/contacts');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  Alert.alert('Error', error.message);
}
```

## 📊 Rate Limits

- **Per User**: No strict limits
- **Bulk Operations**: Recommended batch size: 50 items
- **File Uploads**: Max 10MB per file

## 🎯 Best Practices

1. **Always handle errors** - Network can fail
2. **Use pagination** - Don't load all contacts at once
3. **Cache locally** - PeopleProvider does this
4. **Debounce search** - Wait 300ms after typing
5. **Optimistic updates** - Update UI immediately
6. **Use Idempotency-Key** - For create operations
7. **Batch operations** - Use Promise.all for multiple updates

## Next Steps

- **Repository implementation**: [02-contact-repositories.md](./02-contact-repositories.md)
- **CRUD operations**: [03-contact-operations.md](./03-contact-operations.md)
- **Full API reference**: [../api-database-reference/06-vercel-endpoints.md](../api-database-reference/06-vercel-endpoints.md)
