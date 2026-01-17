# API Rate Limits - Enhanced Protection ✅

**Status**: ✅ Complete  
**Date**: 2025-10-10  
**Impact**: Immediate (all public API endpoints)

---

## 🎯 What Changed

Implemented **much stricter** rate limits across the entire public API to prevent abuse and protect infrastructure.

### Core Limit Reductions

| Layer | Before | After | Change |
|-------|--------|-------|--------|
| **API Key** | 600/min | **100/min** | ⬇️ 83% stricter |
| **Organization** | 10,000/hour | **3,000/hour** | ⬇️ 70% stricter |
| **IP (unauthenticated)** | 60/min | **10/min** | ⬇️ 83% stricter |

---

## 📋 New Endpoint-Specific Limits

Added **30+ granular limits** for different operation types:

### 🔥 Expensive Operations (Very Strict)

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `POST /v1/messages/generate` | **30/hour** | High OpenAI costs |
| `POST /v1/warmth/recompute` | **20/hour** | Complex aggregation |
| `GET /v1/contacts/:id/context-bundle` | **60/hour** | Multi-table joins |
| `POST /v1/outbox` | **50/hour** | External service calls |

### ✏️ Write Operations (Strict)

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `POST /v1/contacts` | **50/min** | Contact creation |
| `PATCH /v1/contacts/:id` | **50/min** | Contact updates |
| `DELETE /v1/contacts/:id` | **20/min** | Destructive |
| `POST /v1/interactions` | **100/min** | High-frequency operation |
| `POST /v1/policies/autopilot` | **10/hour** | Sensitive settings |

### 📖 Read Operations (Moderate)

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `GET /v1/contacts` | **200/hour** | List operations |
| `GET /v1/contacts/:id` | **300/hour** | Individual fetch |
| `GET /v1/contacts/:id/effective-channel` | **150/hour** | AI-heavy usage |

### 🚨 Burst Protection (New!)

| Type | Limit | Window | Purpose |
|------|-------|--------|---------|
| `bulk_writes` | **5** | **10 seconds** | Prevent rapid bulk imports |
| `search` | **20** | **30 seconds** | Prevent scraping |

---

## 🛡️ Multi-Layer Protection

Every request is checked against **up to 4 limits**:

```
Request → [API Key: 100/min]
       → [Organization: 3000/hour]
       → [Endpoint: varies]
       → [Burst: varies]
       
If ANY limit exceeded → 429 Too Many Requests
```

---

## 📊 Response Headers

Every response includes quota information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1696896000
```

When rate limited:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42

{
  "type": "https://docs.everreach.app/errors/rate-limit",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Too many requests",
  "retryAfter": 42
}
```

---

## 🎯 Design Principles

1. **Operation-Based Pricing**
   - Expensive AI operations: Very strict (30/hour)
   - Write operations: Strict (50/min)
   - Read operations: Moderate (200-300/hour)

2. **Fair Usage**
   - Prevent single user from hogging resources
   - Organization-wide caps enforce team limits

3. **Burst Protection**
   - Short-window limits (10-30 seconds)
   - Catch automated scripts/bots
   - Prevent database overload

4. **Destructive Caution**
   - DELETE operations have lowest limits (20/min)
   - Sensitive settings changes restricted (10/hour)

5. **Fail Open**
   - If rate limit DB is down → allow request
   - Log failure for investigation
   - Graceful degradation

---

## 📈 Expected Impact

### ✅ Legitimate Users (No Impact)

**Typical usage patterns:**
- AI agent checking 10-20 contacts/hour → Well under limits
- Dashboard fetching 50 contacts → No issue
- Syncing 100 interactions/day → Easily supported

**All normal use cases remain fully functional!**

### ⚠️ High-Volume Integrations

**Affected scenarios:**
- Bulk importing 500+ contacts → Must throttle (50/min = 600/hr)
- Generating 100 messages immediately → Must spread over ~4 hours
- Real-time channel lookup on every message → Must cache

**Solutions:**
- Implement client-side throttling/queuing
- Use caching (5-10 minute TTL)
- Batch operations where possible
- Consider premium tier (coming soon)

---

## 🔧 Files Modified

### 1. Rate Limit Configuration
**`backend-vercel/lib/api/rate-limit.ts`**
- Updated `RATE_LIMIT_CONFIGS` with stricter limits
- Added 30+ endpoint-specific configurations
- Added burst protection configs
- All existing endpoints automatically protected

### 2. Documentation
**`backend-vercel/docs/API_RATE_LIMITS.md`** (NEW - 800 lines)
- Complete rate limit reference
- Best practices for API clients
- Example scenarios with solutions
- Testing guidelines
- Monitoring recommendations

---

## 🧪 Testing

### Manual Verification

```bash
# Test API key limit (should block at 101)
for i in {1..105}; do
  curl -H "Authorization: Bearer $API_KEY" \
       https://api.everreach.app/v1/contacts/123
done

# Test expensive endpoint (should block at 31)
for i in {1..35}; do
  curl -X POST \
       -H "Authorization: Bearer $API_KEY" \
       https://api.everreach.app/v1/messages/generate
done
```

### Automated Tests

```typescript
// Existing tests at:
backend-vercel/__tests__/api/public-api-rate-limit.test.ts

// Test scenarios:
✅ Block after exceeding API key limit
✅ Block after exceeding org limit  
✅ Block after exceeding endpoint-specific limit
✅ Return correct headers
✅ Reset after window expires
✅ Allow requests after Retry-After duration
```

---

## 📊 Monitoring Recommendations

### Metrics to Track

1. **429 Rate** - % of requests receiving 429 errors
   - **Alert if**: > 10% (possible abuse or overly strict)

2. **Top Consumers** - Which orgs/keys use most quota
   - **Alert if**: Single org uses > 80% of total

3. **Endpoint Distribution** - Which endpoints hit limits most
   - **Action**: May need to adjust specific limits

4. **Rate Limit DB Performance**
   - **Alert if**: Query latency > 50ms
   - **Alert if**: Any errors (fails open)

### Dashboards

Create views showing:
- Real-time rate limit usage per org
- Historical 429 error trends
- Top rate-limited endpoints
- Peak usage hours

---

## 🔮 Future Enhancements

### 1. Premium Tiers (Planned)

| Tier | API Key | Org | Price |
|------|---------|-----|-------|
| Free | 100/min | 3k/hour | $0 |
| Pro | 300/min | 10k/hour | $49/mo |
| Enterprise | 1,000/min | 50k/hour | Custom |

### 2. Dynamic Rate Limiting (Future)

- Increase limits for trusted users (based on behavior)
- Decrease limits for suspicious activity
- Per-user reputation scores

### 3. Rate Limit Webhooks (Future)

Notify developers when approaching limits:
```json
{
  "event": "rate_limit.warning",
  "usage_percent": 80,
  "limit": 100,
  "remaining": 20,
  "window_reset": "2025-10-10T01:30:00Z"
}
```

---

## ✅ Summary

**What We Built:**

✅ Multi-layer rate limiting (API key + Org + IP + Endpoint + Burst)  
✅ 30+ endpoint-specific limits based on operation cost  
✅ Granular controls for read/write/compute operations  
✅ Burst protection for rapid-fire attacks  
✅ Comprehensive documentation with best practices  
✅ Database-backed distributed rate limiting  
✅ Informative response headers and error messages  

**Benefits:**

🛡️ **Security** - Prevents API abuse and DoS attacks  
💰 **Cost Control** - Limits expensive AI/compute operations  
⚡ **Performance** - Protects database from overload  
🤝 **Fair Usage** - Ensures reliable service for all users  
📊 **Visibility** - Rate limit headers show remaining quota  

**Impact:**

✅ **Legitimate users**: No disruption (well under limits)  
✅ **High-volume integrations**: Simple throttling/caching solutions  
✅ **Infrastructure**: Protected from abuse and overload  
✅ **Future-ready**: Foundation for premium tier pricing  

---

## 📚 Documentation

- **Full reference**: `backend-vercel/docs/API_RATE_LIMITS.md`
- **Implementation**: `backend-vercel/lib/api/rate-limit.ts`
- **Tests**: `backend-vercel/__tests__/api/public-api-rate-limit.test.ts`

---

**Status**: ✅ **Complete and Active**

All public API endpoints are now protected with these stricter rate limits!
