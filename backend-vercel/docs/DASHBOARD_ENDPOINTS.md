# Dashboard API Endpoints

Documentation for the dashboard-specific endpoints that power the mobile and web app home screens.

---

## Warmth Summary

### `GET /v1/warmth/summary`

Returns an overview of relationship health across all contacts for the authenticated user's organization.

#### Authentication
Requires valid JWT token in `Authorization` header.

#### Rate Limiting
- 60 requests per minute per user

#### Request

```http
GET /v1/warmth/summary HTTP/1.1
Host: ever-reach-be.vercel.app
Authorization: Bearer <jwt_token>
```

#### Response

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

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_contacts` | number | Total number of active contacts (non-deleted) |
| `by_band.hot` | number | Contacts with warmth score 81-100 |
| `by_band.warm` | number | Contacts with warmth score 61-80 |
| `by_band.cooling` | number | Contacts with warmth score 41-60 |
| `by_band.cold` | number | Contacts with warmth score 0-40 |
| `average_score` | number | Average warmth score across all contacts (rounded to 1 decimal) |
| `contacts_needing_attention` | number | Sum of cooling + cold contacts |
| `last_updated_at` | string | ISO 8601 timestamp of when summary was generated |

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**429 Rate Limited**
```json
{
  "error": "rate_limited",
  "retryAfter": 30
}
```

**500 Server Error**
```json
{
  "error": "db_select_failed: <error_message>"
}
```

#### Example Usage

**JavaScript/TypeScript**
```typescript
const response = await fetch('https://ever-reach-be.vercel.app/v1/warmth/summary', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const summary = await response.json();
console.log(`You have ${summary.contacts_needing_attention} contacts that need attention`);
```

**React Query**
```typescript
import { useQuery } from '@tanstack/react-query';

function useDashboardSummary() {
  return useQuery({
    queryKey: ['warmth-summary'],
    queryFn: () => apiCall('/v1/warmth/summary'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

function DashboardScreen() {
  const { data: summary, isLoading } = useDashboardSummary();
  
  if (isLoading) return <Skeleton />;
  
  return (
    <WarmthCard
      hot={summary.by_band.hot}
      warm={summary.by_band.warm}
      cooling={summary.by_band.cooling}
      cold={summary.by_band.cold}
    />
  );
}
```

---

## Recent Interactions

### `GET /v1/interactions`

Retrieves interactions with enhanced sorting and contact name joins.

#### Authentication
Requires valid JWT token in `Authorization` header.

#### Rate Limiting
- 60 requests per minute per user

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contact_id` | UUID | - | Filter by specific contact |
| `type` | string | - | Filter by interaction type (e.g., `note`, `call`, `email`) |
| `start` | ISO 8601 | - | Filter interactions after this date |
| `end` | ISO 8601 | - | Filter interactions before this date |
| `limit` | number | 20 | Number of results (1-100) |
| `cursor` | ISO 8601 | - | Pagination cursor (timestamp from previous response) |
| `sort` | string | `created_at:desc` | Sort field and order (see below) |

#### Sort Options

Format: `<field>:<order>`

**Fields:**
- `created_at` - When interaction was created in system
- `occurred_at` - When interaction actually happened (future support)
- `updated_at` - When interaction was last modified

**Orders:**
- `asc` - Ascending (oldest first)
- `desc` - Descending (newest first)

**Examples:**
- `created_at:desc` - Newest first (default)
- `occurred_at:asc` - Chronological order
- `updated_at:desc` - Recently modified first

#### Request

```http
GET /v1/interactions?limit=10&sort=created_at:desc HTTP/1.1
Host: ever-reach-be.vercel.app
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "contact_id": "660e8400-e29b-41d4-a716-446655440001",
      "contact_name": "John Doe",
      "kind": "email",
      "content": "Sent follow-up email about project proposal",
      "metadata": {
        "subject": "Re: Project Discussion",
        "sentiment": "positive"
      },
      "created_at": "2025-10-12T18:00:00Z",
      "updated_at": "2025-10-12T18:00:00Z"
    }
  ],
  "limit": 10,
  "nextCursor": "2025-10-12T17:45:00Z",
  "sort": "created_at:desc"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | Array of interaction objects |
| `items[].id` | UUID | Interaction ID |
| `items[].contact_id` | UUID | Contact ID |
| `items[].contact_name` | string \| undefined | Contact's name (from join) |
| `items[].kind` | string | Interaction type |
| `items[].content` | string \| null | Interaction content/notes |
| `items[].metadata` | object | Additional metadata |
| `items[].created_at` | string | ISO 8601 creation timestamp |
| `items[].updated_at` | string | ISO 8601 update timestamp |
| `limit` | number | Requested limit |
| `nextCursor` | string \| null | Cursor for next page (null if no more) |
| `sort` | string | Applied sort (field:order) |

#### Pagination

Use the `nextCursor` value from the response to fetch the next page:

```typescript
// First page
const page1 = await fetch('/v1/interactions?limit=20&sort=created_at:desc');
const data1 = await page1.json();

// Second page
if (data1.nextCursor) {
  const page2 = await fetch(
    `/v1/interactions?limit=20&sort=created_at:desc&cursor=${data1.nextCursor}`
  );
}
```

#### Example Usage

**Get Recent Interactions for Dashboard**
```typescript
const response = await apiCall('/v1/interactions?limit=10&sort=created_at:desc');

response.items.forEach(interaction => {
  console.log(`${interaction.contact_name}: ${interaction.content}`);
});
```

**Get All Interactions for a Contact**
```typescript
async function getAllContactInteractions(contactId: string) {
  const allInteractions = [];
  let cursor = null;
  
  do {
    const url = `/v1/interactions?contact_id=${contactId}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await apiCall(url);
    
    allInteractions.push(...response.items);
    cursor = response.nextCursor;
  } while (cursor);
  
  return allInteractions;
}
```

**React Query with Pagination**
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useRecentInteractions() {
  return useInfiniteQuery({
    queryKey: ['interactions', 'recent'],
    queryFn: ({ pageParam }) => {
      const url = `/v1/interactions?limit=20&sort=created_at:desc${
        pageParam ? `&cursor=${pageParam}` : ''
      }`;
      return apiCall(url);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

function RecentInteractionsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
  } = useRecentInteractions();
  
  return (
    <FlatList
      data={data?.pages.flatMap(page => page.items) || []}
      renderItem={({ item }) => <InteractionRow interaction={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
    />
  );
}
```

---

## Dashboard Integration Example

Complete example for building a dashboard screen:

```typescript
// hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';

export function useDashboardData() {
  const warmthSummary = useQuery({
    queryKey: ['warmth-summary'],
    queryFn: () => apiCall('/v1/warmth/summary'),
    staleTime: 5 * 60 * 1000,
  });

  const recentInteractions = useQuery({
    queryKey: ['interactions', 'recent'],
    queryFn: () => apiCall('/v1/interactions?limit=10&sort=created_at:desc'),
    staleTime: 2 * 60 * 1000,
  });

  return {
    warmthSummary: warmthSummary.data,
    recentInteractions: recentInteractions.data,
    isLoading: warmthSummary.isLoading || recentInteractions.isLoading,
    error: warmthSummary.error || recentInteractions.error,
    refetch: async () => {
      await Promise.all([
        warmthSummary.refetch(),
        recentInteractions.refetch(),
      ]);
    },
  };
}

// screens/DashboardScreen.tsx
export default function DashboardScreen() {
  const { warmthSummary, recentInteractions, isLoading, refetch } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <WarmthHealthCard data={warmthSummary} />
      <RecentInteractionsCard data={recentInteractions} />
    </ScrollView>
  );
}
```

---

## Performance Considerations

### Caching Strategy

**Warmth Summary:**
- Cache for 5 minutes
- Invalidate on:
  - New interaction created
  - Warmth recompute triggered
  - Contact deleted

**Recent Interactions:**
- Cache for 2 minutes
- Invalidate on:
  - New interaction created
  - Interaction updated
  - Contact name changed

### Optimization Tips

1. **Use appropriate limits**
   - Dashboard: 10-20 interactions
   - Detail view: 50-100 interactions

2. **Implement pull-to-refresh**
   - Users expect fresh data on pull
   - Clear cache on manual refresh

3. **Prefetch on navigation**
   - Load dashboard data in background after login
   - Start fetching before user navigates

4. **Skeleton loaders**
   - Show UI structure immediately
   - Reduce perceived loading time

---

## Testing

### Manual Testing

```bash
# Get warmth summary
curl -X GET https://ever-reach-be.vercel.app/v1/warmth/summary \
  -H "Authorization: Bearer $TOKEN"

# Get recent interactions
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?limit=10&sort=created_at:desc" \
  -H "Authorization: Bearer $TOKEN"

# Get interactions for specific contact
curl -X GET "https://ever-reach-be.vercel.app/v1/interactions?contact_id=YOUR_CONTACT_ID&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Expected Response Times

- **Warmth Summary**: < 500ms (< 200ms typical)
- **Recent Interactions**: < 300ms (< 150ms typical)

---

## Related Documentation

- [Warmth & Scoring API](../docs/api/05-warmth-scoring.md)
- [Interactions API](../docs/api/03-interactions.md)
- [Frontend Integration Guide](../docs/api/14-frontend-integration.md)

---

**Last Updated**: October 12, 2025  
**Version**: 1.0  
**Branch**: feat/backend-vercel-only-clean
