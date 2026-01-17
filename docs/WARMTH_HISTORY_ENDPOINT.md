# Warmth History Endpoint Specification

## Overview
Endpoint to retrieve historical warmth scores for a contact over time, enabling trend visualization and relationship health tracking.

## Endpoint Details

### Primary Endpoint (Recommended)
```http
GET /api/v1/contacts/{id}/warmth-history?window={window}
```

**Path Parameters:**
- `id` (required): Contact UUID

**Query Parameters:**
- `window` (optional): Time window for history
  - Accepted values: `7d`, `30d`, `90d`
  - Default: `30d`

**Authentication:**
- Required: Yes (Bearer token)

**Response Format:**
```json
{
  "contact_id": "uuid",
  "window": "30d",
  "items": [
    {
      "date": "2025-10-01T00:00:00Z",
      "score": 62,
      "band": "warm"
    },
    {
      "date": "2025-10-02T00:00:00Z",
      "score": 64,
      "band": "warm"
    }
  ],
  "current": {
    "score": 65,
    "band": "hot",
    "last_updated": "2025-10-27T12:00:00Z"
  }
}
```

**Response Fields:**
- `contact_id`: UUID of the contact
- `window`: Time window requested
- `items`: Array of historical data points
  - `date`: ISO 8601 timestamp (UTC)
  - `score`: Warmth score (0-100)
  - `band`: Warmth band (`hot`, `warm`, `neutral`, `cool`, `cold`)
- `current`: Current warmth state
  - `score`: Current warmth score
  - `band`: Current warmth band
  - `last_updated`: Last calculation timestamp

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Contact not found
- `500`: Server error

### Legacy Endpoint (Fallback)
```http
GET /api/v1/contacts/{id}/warmth/history?limit={limit}
```

**Query Parameters:**
- `limit` (optional): Number of historical points to return
  - Default: `30`
  - Max: `90`

**Response Format:**
```json
{
  "history": [
    { "timestamp": "2025-10-01T00:00:00Z", "warmth": 62 },
    { "timestamp": "2025-10-02T00:00:00Z", "warmth": 64 }
  ]
}
```

### Current Warmth Endpoint (Final Fallback)
```http
GET /api/v1/contacts/{id}/warmth
```

Returns only the current warmth score without history.

## Data Collection Strategy

### Option 1: Point-in-Time Snapshots (Recommended)
- Store warmth score snapshots in a `warmth_history` table
- Trigger: Daily cron job + on interaction events
- Schema:
  ```sql
  CREATE TABLE warmth_history (
    id UUID PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    score INTEGER NOT NULL,
    band VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_warmth_history_contact_date 
    ON warmth_history(contact_id, recorded_at DESC);
  ```

### Option 2: Derived from Interactions
- Calculate warmth retroactively based on interaction timestamps
- Pros: No additional storage, always consistent with current formula
- Cons: Slower queries, can't show formula changes over time

### Option 3: Hybrid Approach
- Store daily snapshots for last 90 days
- Derive older history from interactions if needed
- Best balance of performance and storage

## Implementation Notes

### Calculation Frequency
- **Daily snapshots**: Cron job at midnight UTC
- **Event-triggered**: After each interaction or manual recompute
- **Deduplication**: One score per day (use latest if multiple)

### Query Optimization
- Index on `(contact_id, recorded_at DESC)`
- Limit response to requested window
- Cache recent queries (Redis/memory)

### Data Retention
- Keep 90 days of granular daily history
- Aggregate to weekly for 91-365 days
- Monthly aggregates for 1+ years

## Client-Side Integration

### Current Implementation
The mobile app tries endpoints in this order:
1. `GET /api/v1/contacts/{id}/warmth-history?window=7d|30d|90d`
2. `GET /api/v1/contacts/{id}/warmth/history?limit={7|30|90}`
3. `GET /api/v1/contacts/{id}/warmth` (current only)

**Code Reference:**
- File: `app/contact-context/[id].tsx`
- Function: `loadWarmthHistory`
- Lines: 257-296

### Expected Response Handling
```typescript
interface WarmthHistoryPoint {
  date: string;  // ISO 8601
  score: number; // 0-100
  band?: string; // optional band label
}

interface WarmthHistoryResponse {
  items: WarmthHistoryPoint[];
  current?: {
    score: number;
    band: string;
    last_updated: string;
  };
}
```

### Fallback Behavior
- If primary endpoint returns 404/500: try legacy
- If legacy fails: try current warmth only
- If all fail: show "No warmth history yet"
- Graceful degradation: never block UI on history fetch

## Related Endpoints

### Warmth Recompute
```http
POST /api/v1/contacts/{id}/warmth/recompute
```
Triggers recalculation and creates new history point.

### Bulk Warmth Recompute
```http
POST /api/v1/warmth/recompute
```
Body: `{ "contact_ids": ["uuid1", "uuid2"] }`

## Testing Checklist

- [ ] Endpoint returns 200 for valid contact with history
- [ ] Endpoint returns empty array for new contact
- [ ] Endpoint returns 404 for non-existent contact
- [ ] Window parameter filters correctly (7d, 30d, 90d)
- [ ] Items sorted ascending by date
- [ ] Scores are 0-100 range
- [ ] Timestamps are valid ISO 8601 UTC
- [ ] Response time < 200ms for 90 days of data
- [ ] Handles missing/null scores gracefully
- [ ] Auth required and enforced
- [ ] Rate limiting applied

## Security Considerations

- **Authorization**: User must own/have access to contact
- **Rate Limiting**: Max 60 requests/minute per user
- **Data Privacy**: PII not exposed in warmth history
- **Caching**: Cache-Control headers for client caching
  - `Cache-Control: private, max-age=300` (5 minutes)

## Performance Targets

- **Response Time**: < 200ms (p95)
- **Database Query**: < 50ms
- **Cache Hit Rate**: > 80% for recent queries
- **Throughput**: 1000 req/sec per instance

## Migration Path

1. **Phase 1**: Implement legacy endpoint with limit parameter
2. **Phase 2**: Start collecting daily snapshots via cron
3. **Phase 3**: Launch primary endpoint with window parameter
4. **Phase 4**: Backfill historical data from interactions (optional)
5. **Phase 5**: Deprecate legacy endpoint (6 months notice)

## Example Requests

### Get last 7 days
```bash
curl -X GET \
  'https://ever-reach-be.vercel.app/api/v1/contacts/abc-123/warmth-history?window=7d' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Get last 30 days (default)
```bash
curl -X GET \
  'https://ever-reach-be.vercel.app/api/v1/contacts/abc-123/warmth-history' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Get last 90 days
```bash
curl -X GET \
  'https://ever-reach-be.vercel.app/api/v1/contacts/abc-123/warmth-history?window=90d' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## References

- **OpenAPI Spec**: `backend-vercel/openapi/openapi.json`
- **Warmth Calculation**: `WARMTH_SCORE_REFRESH_FIX.md`
- **Master Endpoints**: `docs/ALL_ENDPOINTS_MASTER_LIST.md`
- **Frontend Integration**: `app/contact-context/[id].tsx` lines 257-296
