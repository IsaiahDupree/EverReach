# Search API

Full-text search across contacts with advanced filtering.

**Base Endpoint**: `/v1/search`

---

## Search Contacts

```http
POST /v1/search
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | Search query (name, email, company) |
| `limit` | integer | No | Results (1-50, default: 20) |
| `filters` | object | No | Advanced filters |

### Filters

```typescript
{
  "warmth_band": ["hot", "warm"],        // Array of bands
  "warmth_gte": 60,                       // Minimum warmth
  "warmth_lte": 90                        // Maximum warmth
}
```

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/search',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: 'john',
      limit: 20,
      filters: {
        warmth_band: ['hot', 'warm'],
        warmth_gte: 50
      }
    })
  }
);

const { items } = await response.json();
```

### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "emails": ["john@example.com"],
      "company": "Acme Inc",
      "warmth": 75,
      "warmth_band": "warm",
      "match_score": 0.95
    }
  ],
  "total": 1,
  "query": "john"
}
```

---

## Search Examples

### Find VIP Customers

```typescript
const { items } = await fetch('/v1/search', {
  method: 'POST',
  body: JSON.stringify({
    q: '',
    filters: {
      warmth_band: ['hot'],
      warmth_gte: 80
    }
  })
}).then(r => r.json());
```

### Search by Company

```typescript
const { items } = await fetch('/v1/search', {
  method: 'POST',
  body: JSON.stringify({
    q: 'acme',
    limit: 50
  })
}).then(r => r.json());
```

### Find Cooling Contacts

```typescript
const { items } = await fetch('/v1/search', {
  method: 'POST',
  body: JSON.stringify({
    filters: {
      warmth_band: ['cool', 'cold'],
      warmth_lte: 39
    }
  })
}).then(r => r.json());
```

---

## Next Steps

- [Contacts](./02-contacts.md) - Alternative list/filter methods
- [Warmth Scoring](./05-warmth-scoring.md) - Understanding warmth bands
