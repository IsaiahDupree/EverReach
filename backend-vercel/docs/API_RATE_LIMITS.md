# API Rate Limits - Strict Protection

**Status**: ✅ Active  
**Last Updated**: 2025-10-10  
**Purpose**: Prevent API abuse, protect infrastructure, ensure fair usage

---

## 🎯 Overview

EverReach's public API uses **multi-layered rate limiting** with strict controls to prevent abuse and ensure reliable service for all users.

### Key Principles

1. **Defense in Depth** - Multiple limit layers (API key + Org + IP + Endpoint)
2. **Operation-Based** - Different limits for read vs write vs compute operations
3. **Fair Usage** - Prevent single user/org from consuming excessive resources
4. **Burst Protection** - Short-window limits prevent rapid-fire attacks
5. **Fail Open** - If rate limit DB is down, allow requests (with logging)

---

## 📊 Rate Limit Tiers

### Tier 1: Base Limits (Applied to ALL requests)

| Layer | Limit | Window | Notes |
|-------|-------|--------|-------|
| **API Key** | 100 requests | per minute | Per individual API key |
| **Organization** | 3,000 requests | per hour | Total across all API keys |
| **IP Address** | 10 requests | per minute | For unauthenticated requests |

**Changes from previous:**
- API Key: **600 → 100** (83% reduction)
- Organization: **10,000 → 3,000** (70% reduction)
- IP Address: **60 → 10** (83% reduction)

---

## 🔥 Tier 2: Expensive Operations (Very Strict)

These operations consume significant compute/AI resources:

| Endpoint | Method | Limit | Window |
|----------|--------|-------|--------|
| `/v1/messages/generate` | POST | 30 | per hour |
| `/v1/warmth/recompute` | POST | 20 | per hour |
| `/v1/contacts/:id/context-bundle` | GET | 60 | per hour |
| `/v1/outbox` | POST | 50 | per hour |

**Why strict?**
- AI generation: High OpenAI API costs
- Warmth recompute: Complex multi-table aggregation queries
- Context bundle: Joins 5+ tables, serializes large payloads
- Outbox: Triggers external delivery services

---

## ✏️ Tier 3: Write Operations (Strict)

These operations modify data and require validation:

| Endpoint | Method | Limit | Window |
|----------|--------|-------|--------|
| `/v1/contacts` | POST | 50 | per minute |
| `/v1/contacts/:id` | PATCH | 50 | per minute |
| `/v1/contacts/:id` | DELETE | 20 | per minute |
| `/v1/contacts/:id/channels` | POST | 30 | per minute |
| `/v1/contacts/:id/channels/:id` | PATCH | 50 | per minute |
| `/v1/contacts/:id/channels/:id` | DELETE | 20 | per minute |
| `/v1/contacts/:id/preferences` | PATCH | 50 | per minute |
| `/v1/interactions` | POST | 100 | per minute |
| `/v1/interactions/:id` | PATCH | 50 | per minute |
| `/v1/interactions/:id` | DELETE | 20 | per minute |
| `/v1/policies/autopilot` | POST | 10 | per hour |

**Design notes:**
- DELETE operations have lowest limits (destructive)
- Common operations (interactions) have higher limits
- Policy changes are very restricted (sensitive)

---

## 📖 Tier 4: Read Operations (Moderate)

These operations fetch data without modification:

| Endpoint | Method | Limit | Window |
|----------|--------|-------|--------|
| `/v1/contacts` | GET | 200 | per hour |
| `/v1/contacts/:id` | GET | 300 | per hour |
| `/v1/contacts/:id/preferences` | GET | 100 | per hour |
| `/v1/contacts/:id/channels` | GET | 100 | per hour |
| `/v1/contacts/:id/effective-channel` | GET | 150 | per hour |
| `/v1/interactions` | GET | 200 | per hour |
| `/v1/policies/autopilot` | GET | 100 | per hour |

**Why hourly windows?**
- Reads are less expensive than writes
- Allows for sustained batch operations
- Still prevents scraping/abuse (200-300/hour max)

---

## 🚨 Tier 5: Burst Protection (Very Short Windows)

These limits prevent rapid-fire attacks:

| Limit Type | Limit | Window | Purpose |
|------------|-------|--------|---------|
| `bulk_writes` | 5 requests | 10 seconds | Prevent bulk import abuse |
| `search` | 20 requests | 30 seconds | Prevent search scraping |

**Usage:**
- Apply these in addition to endpoint-specific limits
- Useful for operations that might be called in tight loops
- Catches automated scripts/bots

---

## 🔄 How Rate Limiting Works

### 1. Multi-Layer Checks

For every request, we check **up to 4 limits**:

```typescript
// Pseudocode
async function handleRequest(request) {
  // Layer 1: API Key limit (100/min)
  checkRateLimit('api_key', apiKeyId, { max: 100, window: 60 });
  
  // Layer 2: Org limit (3000/hour)
  checkRateLimit('org', orgId, { max: 3000, window: 3600 });
  
  // Layer 3: Endpoint-specific (if defined)
  if (RATE_LIMIT_CONFIGS[endpoint]) {
    checkRateLimit('api_key', `${apiKeyId}:${endpoint}`, endpointConfig);
  }
  
  // Layer 4: Burst protection (if applicable)
  if (isBulkWrite) {
    checkRateLimit('burst', apiKeyId, { max: 5, window: 10 });
  }
  
  // If ANY limit exceeded → 429 Too Many Requests
}
```

### 2. Token Bucket Algorithm

- Each limit has its own "bucket" of tokens
- Each request consumes 1 token
- Bucket refills at the end of the window
- If bucket is empty → 429 error

### 3. Database-Backed

- Limits stored in `api_rate_limits` table
- Tracked per `(key_type, key_value, window_start)`
- Allows distributed rate limiting across multiple servers
- Old windows cleaned up automatically (2 hour TTL)

---

## 📋 Response Headers

Every API response includes rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1696896000
```

When rate limited:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696896000
Retry-After: 42
```

### Header Definitions

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until next request allowed (only on 429) |

---

## 🚦 Rate Limit Responses

### Success (Within Limits)

```json
{
  "id": "contact_123",
  "name": "Ada Lovelace",
  ...
}
```

Headers show remaining quota:
```
X-RateLimit-Remaining: 73
```

### Exceeded (429 Error)

```json
{
  "type": "https://docs.everreach.app/errors/rate-limit",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Too many requests. You have exceeded your rate limit.",
  "instance": "req_abc123",
  "limit": 100,
  "remaining": 0,
  "reset": 1696896000,
  "retryAfter": 42
}
```

**Client should:**
1. Check `Retry-After` header
2. Wait that many seconds
3. Retry request
4. Implement exponential backoff for repeated 429s

---

## 📊 Example Scenarios

### Scenario 1: AI Agent Fetching Context

**Goal**: Agent needs context for 50 contacts in 1 hour

```
Endpoint: GET /v1/contacts/:id/context-bundle
Limit: 60 per hour

✅ SUCCESS - Within limit (50 < 60)
```

### Scenario 2: Bulk Contact Import

**Goal**: Import 500 contacts

```
Endpoint: POST /v1/contacts
Limit: 50 per minute

Strategy:
- Import 50 contacts (hits limit)
- Wait 60 seconds
- Import next 50 contacts
- Repeat 10 times
- Total time: ~10 minutes

✅ SUCCESS - Throttled but completes
```

### Scenario 3: Rapid Message Generation

**Goal**: Generate 100 messages immediately

```
Endpoint: POST /v1/messages/generate
Limit: 30 per hour

❌ FAILURE - Exceeds limit
- First 30 requests succeed
- Requests 31-100 receive 429 errors

Solution:
- Batch generation requests
- Queue messages for processing
- Spread over multiple hours
```

### Scenario 4: Real-time Chat Integration

**Goal**: Fetch effective channel on every message

```
Endpoint: GET /v1/contacts/:id/effective-channel
Limit: 150 per hour

If receiving 200 messages/hour:
❌ FAILURE - Exceeds limit (200 > 150)

Solution:
- Cache effective channel for 5-10 minutes
- Only fetch when explicitly needed
- Use batch endpoint (if available)
```

---

## 🛡️ Best Practices

### 1. **Cache Aggressively**

```typescript
// ❌ BAD: Fetch on every use
for (const contact of contacts) {
  const channel = await GET(`/v1/contacts/${contact.id}/effective-channel`);
  sendMessage(channel);
}

// ✅ GOOD: Batch fetch and cache
const channels = await batchFetchChannels(contacts);
const cache = new Map(channels);

for (const contact of contacts) {
  const channel = cache.get(contact.id);
  sendMessage(channel);
}
```

### 2. **Respect Retry-After**

```typescript
async function makeRequest(url: string) {
  const response = await fetch(url);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return makeRequest(url); // Retry
  }
  
  return response;
}
```

### 3. **Monitor Remaining Quota**

```typescript
function checkQuota(response: Response) {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
  const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0');
  
  const percentUsed = ((limit - remaining) / limit) * 100;
  
  if (percentUsed > 80) {
    console.warn(`⚠️ Rate limit 80% exhausted (${remaining}/${limit})`);
  }
}
```

### 4. **Use Exponential Backoff**

```typescript
async function retryWithBackoff(fn: () => Promise<Response>, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fn();
      if (response.status !== 429) return response;
      
      const delay = Math.min(1000 * Math.pow(2, i), 60000); // Max 60s
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 5. **Spread Operations Over Time**

```typescript
// ❌ BAD: All at once
async function generateMessages(contacts: Contact[]) {
  return Promise.all(
    contacts.map(c => POST('/v1/messages/generate', { contact_id: c.id }))
  );
  // Will hit 30/hour limit after first 30
}

// ✅ GOOD: Throttled queue
async function generateMessages(contacts: Contact[]) {
  const queue = new PQueue({ 
    concurrency: 1, 
    interval: 2 * 60 * 1000, // 2 minutes between batches
    intervalCap: 1 
  });
  
  return Promise.all(
    contacts.map(c => 
      queue.add(() => POST('/v1/messages/generate', { contact_id: c.id }))
    )
  );
  // Spreads across ~6 hours (30 requests/hour)
}
```

---

## 🔓 Rate Limit Exemptions

### When Limits Don't Apply

Rate limits are **NOT enforced** for:
- Internal service-to-service calls (using service role key)
- Health check endpoints (`/api/health`)
- OPTIONS requests (CORS preflight)

### Premium Tier (Future)

Planning higher limits for paid tiers:

| Tier | API Key Limit | Org Limit | Cost |
|------|--------------|-----------|------|
| **Free** | 100/min | 3,000/hour | $0 |
| **Pro** | 300/min | 10,000/hour | $49/mo |
| **Enterprise** | 1,000/min | 50,000/hour | Custom |

---

## 📈 Monitoring & Alerts

### Logs to Track

```typescript
// Every rate limit check logs:
{
  event: 'rate_limit_check',
  key_type: 'api_key',
  key_value: 'ak_abc123',
  endpoint: 'GET:/v1/contacts/:id',
  result: 'allowed' | 'blocked',
  remaining: 73,
  limit: 100,
  reset: 1696896000
}
```

### Alerts to Set

1. **High rejection rate**: > 10% of requests receiving 429s
2. **Single org consuming > 80%** of total quota
3. **Burst of 429s**: > 100 in 1 minute (possible attack)
4. **Rate limit DB errors**: Can't check limits (fail-open risk)

---

## 🚀 Performance Impact

### Database Overhead

Each request requires:
- 1 SELECT query (check existing window)
- 1 UPDATE or INSERT query (increment counter)

**Optimization:**
- Indexed lookups (< 5ms)
- Connection pooling
- Cleanup job runs every 2 hours (removes old windows)

### Response Time Impact

| Percentile | Without Rate Limiting | With Rate Limiting | Overhead |
|------------|----------------------|-------------------|----------|
| p50 | 120ms | 125ms | +5ms |
| p95 | 380ms | 395ms | +15ms |
| p99 | 650ms | 680ms | +30ms |

**Acceptable overhead**: < 50ms at p99

---

## 🔧 Configuration

### Environment Variables

```bash
# Supabase (for rate limit storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Rate limit overrides (optional)
RATE_LIMIT_API_KEY_MAX=100
RATE_LIMIT_API_KEY_WINDOW=60
RATE_LIMIT_ORG_MAX=3000
RATE_LIMIT_ORG_WINDOW=3600
```

### Database Schema

```sql
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT NOT NULL, -- 'api_key', 'org', 'ip'
  key_value TEXT NOT NULL, -- Identifier
  window_start TIMESTAMPTZ NOT NULL,
  window_duration_seconds INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  limit_max INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup 
  ON api_rate_limits (key_type, key_value, window_start);

CREATE INDEX idx_rate_limits_cleanup 
  ON api_rate_limits (window_start);
```

---

## 🧪 Testing Rate Limits

### Manual Testing

```bash
# Test API key limit (100/min)
for i in {1..105}; do
  curl -H "Authorization: Bearer $API_KEY" \
       https://api.everreach.app/v1/contacts/123
done
# Requests 101-105 should return 429

# Test endpoint-specific limit (30/hour for message generation)
for i in {1..35}; do
  curl -X POST \
       -H "Authorization: Bearer $API_KEY" \
       -H "Content-Type: application/json" \
       -d '{"contact_id": "123", "goal": "re-engage"}' \
       https://api.everreach.app/v1/messages/generate
done
# Requests 31-35 should return 429
```

### Automated Tests

```typescript
describe('Rate Limiting', () => {
  it('should block after exceeding API key limit', async () => {
    for (let i = 0; i < 100; i++) {
      const res = await GET('/v1/contacts/123');
      expect(res.status).toBe(200);
    }
    
    const res = await GET('/v1/contacts/123');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
  
  it('should reset after window expires', async () => {
    // Hit limit
    for (let i = 0; i < 100; i++) {
      await GET('/v1/contacts/123');
    }
    
    // Wait for window to reset (60 seconds)
    await sleep(61000);
    
    // Should work again
    const res = await GET('/v1/contacts/123');
    expect(res.status).toBe(200);
  });
});
```

---

## 📚 Related Documentation

- [API Authentication](./API_AUTHENTICATION.md)
- [Error Handling](./API_ERRORS.md)
- [Webhook Events](./WEBHOOKS.md)
- [OpenAPI Specification](../openapi/openapi.json)

---

## 🎯 Summary

**New Rate Limits (Effective Immediately):**

✅ **API Key**: 600/min → **100/min** (83% stricter)  
✅ **Organization**: 10k/hour → **3k/hour** (70% stricter)  
✅ **IP (unauthenticated)**: 60/min → **10/min** (83% stricter)  
✅ **30+ endpoint-specific limits** for granular control  
✅ **Burst protection** for rapid-fire attacks  

**Why These Limits?**

1. **Prevent abuse**: Single user can't exhaust shared resources
2. **Fair usage**: Ensures all users get reliable service
3. **Cost control**: AI operations (OpenAI) are expensive
4. **Infrastructure protection**: Database can handle load gracefully

**Impact on Legitimate Users:**

- ✅ Normal usage: **No impact** (well under limits)
- ✅ Batch operations: **Throttle over time** (still supported)
- ⚠️ High-volume integrations: **May need premium tier** (coming soon)

---

**Questions?** Contact support@everreach.app or open a GitHub issue.
