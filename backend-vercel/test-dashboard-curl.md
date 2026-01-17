# Dashboard Endpoints Test - Manual Curl Commands

## Prerequisites

Get a valid JWT token from your Supabase auth session:
1. Sign in to your app
2. Get the access token from session
3. Export it: `export TOKEN="your-jwt-token"`

Or use this PowerShell command:
```powershell
$TOKEN = "your-jwt-token-here"
```

---

## Test 1: Warmth Summary

```bash
curl -X GET "https://ever-reach-be.vercel.app/v1/warmth/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**PowerShell:**
```powershell
curl.exe -X GET "https://ever-reach-be.vercel.app/v1/warmth/summary" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "total_contacts": 150,
  "by_band": {
    "hot": 25,
    "warm": 60,
    "cooling": 40,
    "cold": 25
  },
  "average_score": 58.5,
  "contacts_needing_attention": 65,
  "last_updated_at": "2025-10-12T19:30:00Z"
}
```

---

## Test 2: Recent Interactions (Default Sort)

```bash
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?limit=10&sort=created_at:desc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**PowerShell:**
```powershell
curl.exe -X GET "https://ever-reach-be.vercel.app/v1/interactions?limit=10&sort=created_at:desc" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "contact_id": "uuid",
      "contact_name": "John Doe",
      "kind": "email",
      "content": "Follow-up email sent",
      "metadata": {},
      "created_at": "2025-10-12T18:00:00Z",
      "updated_at": "2025-10-12T18:00:00Z"
    }
  ],
  "limit": 10,
  "nextCursor": "2025-10-12T17:45:00Z",
  "sort": "created_at:desc"
}
```

---

## Test 3: Interactions with Date Filter

Get interactions from the last 7 days:

```bash
SEVEN_DAYS_AGO=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?start=$SEVEN_DAYS_AGO&limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**PowerShell:**
```powershell
$sevenDaysAgo = (Get-Date).AddDays(-7).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
curl.exe -X GET "https://ever-reach-be.vercel.app/v1/interactions?start=$sevenDaysAgo&limit=20" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

---

## Test 4: Interactions for Specific Contact

```bash
CONTACT_ID="your-contact-uuid"
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?contact_id=$CONTACT_ID&limit=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**PowerShell:**
```powershell
$contactId = "your-contact-uuid"
curl.exe -X GET "https://ever-reach-be.vercel.app/v1/interactions?contact_id=$contactId&limit=50" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

---

## Test 5: Different Sort Orders

### Oldest First
```bash
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?limit=10&sort=created_at:asc" \
  -H "Authorization: Bearer $TOKEN"
```

### By Updated Date
```bash
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?limit=10&sort=updated_at:desc" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### 401 Unauthorized
- Token expired: Get a fresh token
- Invalid token: Check token format
- Missing Bearer prefix: Ensure `Bearer $TOKEN` format

### 429 Rate Limited
- Wait for the retry-after period
- Check `X-RateLimit-*` headers in response

### Empty Results
- Database may be empty
- Check filters (date range, contact_id)
- Verify user has contacts/interactions

---

## Integration Testing (Frontend)

### React Query Hook Test

```typescript
import { useQuery } from '@tanstack/react-query';

function TestDashboard() {
  // Test warmth summary
  const { data: summary } = useQuery({
    queryKey: ['warmth-summary'],
    queryFn: () => fetch('/v1/warmth/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  });

  // Test interactions
  const { data: interactions } = useQuery({
    queryKey: ['interactions'],
    queryFn: () => fetch('/v1/interactions?limit=10&sort=created_at:desc', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  });

  return (
    <div>
      <h2>Warmth Summary</h2>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
      
      <h2>Recent Interactions</h2>
      <pre>{JSON.stringify(interactions, null, 2)}</pre>
    </div>
  );
}
```

---

## Success Criteria

✅ **Warmth Summary**
- Returns `total_contacts`, `by_band`, `average_score`
- All band counts are numbers
- Average score is between 0-100
- Response time < 500ms

✅ **Interactions**
- Returns `items` array
- Each item has `contact_name` field
- Response includes `sort` and `nextCursor`
- Sorting works correctly (newest/oldest)
- Response time < 300ms

---

## Deployment Verification

```bash
# Check production endpoint
curl -X GET "https://ever-reach-be.vercel.app/v1/warmth/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -o /dev/null -s -w "%{http_code}\n"

# Should return: 200
```

If you get `404`, the endpoint is not deployed yet.
If you get `401`, your token is invalid or expired.
If you get `429`, you've hit the rate limit.
