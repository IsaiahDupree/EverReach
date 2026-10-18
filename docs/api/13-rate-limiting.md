# Rate Limiting

Understanding API rate limits, quotas, and how to handle them.

---

## Rate Limit Tiers

### Current Limits (Development - Permissive)

| Tier | Limit | Window |
|------|-------|--------|
| Per User | 60 requests | 1 minute |
| Per Organization | Unlimited | - |
| AI Endpoints | 100 requests | 1 hour |

### Production Limits (Coming Soon)

| Tier | Limit | Window |
|------|-------|--------|
| Per API Key | 600 requests | 1 minute |
| Per Organization | 10,000 requests | 1 hour |
| Per IP | 60 requests | 1 minute |
| AI Generation | 100 requests | 1 hour |
| Warmth Recompute | 50 requests | 1 hour |

---

## Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705075200
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests in window |
| `X-RateLimit-Remaining` | Requests left in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

---

## When Rate Limited

### Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705075200

{
  "error": "rate_limited",
  "retryAfter": 42,
  "request_id": "req_abc123"
}
```

### Handling

```typescript
async function apiCall(endpoint: string) {
  const response = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
  
  // Check rate limit headers
  const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0');
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
  
  console.log(`Rate limit: ${remaining}/${limit} remaining`);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    throw new Error(`Rate limited. Retry after ${retryAfter}s`);
  }
  
  return response.json();
}
```

---

## Best Practices

### 1. Monitor Remaining Requests

```typescript
let rateLimitRemaining = Infinity;

async function apiCallWithMonitoring(endpoint: string) {
  const response = await fetch(endpoint);
  
  rateLimitRemaining = parseInt(
    response.headers.get('X-RateLimit-Remaining') || '999'
  );
  
  if (rateLimitRemaining < 10) {
    console.warn('⚠️ Rate limit nearly exhausted:', rateLimitRemaining);
  }
  
  return response.json();
}
```

### 2. Implement Exponential Backoff

```typescript
async function apiCallWithBackoff(
  endpoint: string,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(endpoint);
    
    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') || String(Math.pow(2, i))
      );
      
      console.log(`Retry ${i + 1}/${maxRetries} after ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    return response.json();
  }
  
  throw new Error('Max retries exceeded');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3. Batch Requests

```typescript
// ❌ Bad - 100 individual requests
for (const contact of contacts) {
  await fetch(`/v1/contacts/${contact.id}/warmth/recompute`, {
    method: 'POST'
  });
}

// ✅ Good - 1 batch request
await fetch('/v1/warmth/recompute', {
  method: 'POST',
  body: JSON.stringify({
    contact_ids: contacts.map(c => c.id)
  })
});
```

### 4. Cache Responses

```typescript
const cache = new Map();

async function getCachedContact(id: string) {
  if (cache.has(id)) {
    const { data, timestamp } = cache.get(id);
    
    // Cache for 5 minutes
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      return data;
    }
  }
  
  const data = await fetch(`/v1/contacts/${id}`).then(r => r.json());
  cache.set(id, { data, timestamp: Date.now() });
  return data;
}
```

### 5. Implement Request Queue

```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 50; // Safety margin
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.process();
      }
    });
  }
  
  private async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();
        
        // Wait to respect rate limit
        await sleep(60000 / this.requestsPerMinute);
      }
    }
    
    this.processing = false;
  }
}

// Usage
const queue = new RequestQueue();

for (const contact of contacts) {
  queue.add(() =>
    fetch(`/v1/contacts/${contact.id}`).then(r => r.json())
  );
}
```

---

## Rate Limit by Endpoint

### Standard Endpoints
- Most CRUD operations: 60/min per user
- List endpoints: 60/min per user

### AI-Heavy Endpoints
- `/v1/agent/compose/smart`: 100/hour
- `/v1/agent/analyze/contact`: 100/hour
- `/v1/agent/suggest/actions`: 100/hour

### Bulk Operations
- `/v1/warmth/recompute`: 50/hour
- `/v1/search`: 60/min

---

## Monitoring

### Track Usage

```typescript
interface RateLimitStats {
  endpoint: string;
  limit: number;
  remaining: number;
  resetAt: number;
  timestamp: number;
}

const stats: RateLimitStats[] = [];

async function trackRateLimit(endpoint: string, response: Response) {
  stats.push({
    endpoint,
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    resetAt: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
    timestamp: Date.now()
  });
  
  // Alert if getting close to limit
  const recent = stats.slice(-10);
  const avgRemaining = recent.reduce((sum, s) => sum + s.remaining, 0) / recent.length;
  
  if (avgRemaining < 10) {
    console.warn('⚠️ Approaching rate limit!');
  }
}
```

---

## Increasing Limits

For production use with higher limits:

1. **Use API Keys** (coming soon)
   - Create API key in dashboard
   - Get 600 requests/min
   - Org-wide quota of 10k/hour

2. **Contact Support**
   - For enterprise limits
   - Custom rate limits available
   - Dedicated infrastructure

3. **Optimize Usage**
   - Batch requests when possible
   - Cache frequently accessed data
   - Use webhooks for real-time updates

---

## Next Steps

- [Error Handling](./12-error-handling.md) - Handle 429 errors
- [Frontend Integration](./14-frontend-integration.md) - Complete client examples
- [Authentication](./01-authentication.md) - JWT token management
