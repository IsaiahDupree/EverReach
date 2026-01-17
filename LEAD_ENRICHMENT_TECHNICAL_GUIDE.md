# Lead Enrichment — Technical Implementation Guide

**Date**: October 22, 2025  
**Status**: Production-Ready Architecture  
**Context**: Rate limiting, queue management, billing integration

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  API Layer (Next.js)                                    │
│  - POST /api/v1/enrichment                             │
│  - GET /api/v1/enrichment/usage                        │
│  - Rate limit middleware                                │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Queue System (Redis + p-queue)                         │
│  - Weighted round-robin (Elite:3, Pro:2, Core:1)       │
│  - Token bucket rate limiting                           │
│  - Idempotency (workspace + email + template + day)     │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Worker Layer                                           │
│  - Perplexity API (80% of limit)                       │
│  - Social Links API (80% of limit)                     │
│  - Exponential backoff on 429/5xx                      │
│  - Dead letter queue on final failure                   │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Storage (Supabase)                                     │
│  - enrichment_usage (metering)                          │
│  - enrichment_results (cache)                           │
│  - enrichment_jobs (queue status)                       │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Billing (Stripe)                                       │
│  - Usage-based metering                                 │
│  - Overage reporting (nightly)                          │
│  - Invoice generation                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Rate Limiting Strategy — The 80% Rule

### Why 80%?

**Always configure at 80% of your API limit** to prevent hitting the ceiling and getting rate-limited.

- **PRO tier** (5 req/sec) → Configure for **4 req/sec**
- **ULTRA tier** (10 req/sec) → Configure for **8 req/sec**
- **MEGA tier** (20 req/sec) → Configure for **16 req/sec**

### Tier Configuration

| Tier | RPS | RPM | Max Tokens | Max Searches | Weight | Included/Month | Overage |
|------|-----|-----|------------|--------------|--------|----------------|---------|
| **Core** | 0.5 | 30 | 1,500 | 2 | 1 | 250 | $0.12 |
| **Pro** | 1.0 | 90 | 2,500 | 4 | 2 | 2,500 | $0.08 |
| **Elite** | 3.0 | 200 | 3,500 | 6 | 3 | 12,000 | $0.05 |
| **Starter** | 1.0 | 60 | - | - | 1 | 1,000 | $0.09 |
| **Growth** | 2.0 | 120 | - | - | 2 | 5,000 | $0.06 |
| **Scale** | 5.0 | 300 | - | - | 3 | 20,000 | $0.04 |

---

## 🔄 Core Components

### 1. Token Bucket Rate Limiter

**Algorithm**: Redis-based atomic token bucket

**Features**:
- Automatic token refill based on time elapsed
- Burst capacity handling
- Per-workspace isolation
- Atomic operations via Lua script

**Implementation**: `backend-vercel/lib/enrichment/rateLimiter.ts`

### 2. Weighted Priority Queue

**Algorithm**: Round-robin with priority weights

**Features**:
- Elite (weight 3) → 3x priority
- Pro (weight 2) → 2x priority  
- Core (weight 1) → 1x priority
- Automatic retry with exponential backoff
- Dead letter queue for final failures

**Implementation**: `backend-vercel/lib/enrichment/queue.ts`

### 3. Idempotency System

**Key Generation**: SHA-256 hash of `workspace|identifier|template|date`

**Features**:
- Prevent duplicate enrichments
- 7-day cache TTL
- Automatic expiration
- Fast lookup via unique index

**Implementation**: `backend-vercel/lib/enrichment/idempotency.ts`

### 4. Hard Caps

**Enforcement**:
- Token limits per tier (1,500 - 3,500)
- Search query limits (2 - 6)
- Monthly usage limits (250 - 20,000)
- 50% overage maximum

**Implementation**: `backend-vercel/lib/enrichment/caps.ts`

### 5. Usage Metering

**Tracking**:
- Units used (enrichments)
- Tokens consumed
- Social requests
- Perplexity searches
- Cost estimates

**Billing**: Nightly Stripe usage reporting

**Implementation**: `backend-vercel/lib/enrichment/billing.ts`

---

## 📊 Database Schema

### Tables

**enrichment_usage**
- Tracks all enrichment jobs
- Metering data for billing
- Cost estimates
- Status tracking

**enrichment_results**
- Cached enrichment results
- Idempotency storage
- 7-day TTL
- JSONB result data

**enrichment_jobs**
- Queue status
- Retry tracking
- Error logging
- Request/response storage

### Indexes

```sql
CREATE INDEX idx_enrichment_usage_workspace ON enrichment_usage(workspace_id, created_at DESC);
CREATE INDEX idx_enrichment_results_idem ON enrichment_results(idempotency_key);
CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status) WHERE status IN ('queued', 'processing');
```

---

## 🔐 Compliance & Privacy

### GDPR/CCPA Features

1. **Data Minimization**
   - Store only derived summaries
   - No sensitive personal data
   - Citation links only

2. **Data Retention**
   - 90-day raw data retention
   - 365-day summary retention
   - Automatic deletion

3. **User Rights**
   - Data export API
   - Right to be forgotten
   - Consent tracking

4. **Regional Controls**
   - EU: Disable person-level enrichment
   - US: Full features enabled
   - Per-workspace configuration

---

## 📈 PostHog Event Tracking

### Key Events

- `enrichment_requested` — Job initiated
- `enrichment_succeeded` — Completed successfully
- `enrichment_throttled` — Rate limited
- `enrichment_overage_billed` — Usage exceeded included
- `enrichment_quality_issue` — Data validation failed
- `credit_pack_purchased` — Additional credits bought
- `api_error` — Provider error

---

## 🚀 Implementation Steps

### Phase 1: Infrastructure (Week 1)

1. [ ] Deploy database migration
2. [ ] Set up Redis instance
3. [ ] Configure environment variables
4. [ ] Implement rate limiter
5. [ ] Test token bucket algorithm

### Phase 2: Queue System (Week 2)

1. [ ] Implement priority queue
2. [ ] Add retry logic with backoff
3. [ ] Set up dead letter queue
4. [ ] Test concurrent requests
5. [ ] Monitor queue depth

### Phase 3: Billing (Week 3)

1. [ ] Implement usage tracking
2. [ ] Set up Stripe products
3. [ ] Configure overage pricing
4. [ ] Test billing calculations
5. [ ] Nightly usage reporting

### Phase 4: API Endpoints (Week 4)

1. [ ] Create enrichment endpoint
2. [ ] Add usage endpoint
3. [ ] Implement idempotency
4. [ ] Add rate limit headers
5. [ ] API documentation

---

## 📊 Monitoring & Alerts

### Critical Metrics

1. **Rate Limiting**
   - Target: < 1% rejection rate
   - Alert: > 5% rejection rate

2. **Queue Performance**
   - Target: < 5s average wait
   - Alert: > 30s wait time

3. **API Success Rate**
   - Target: > 95% success
   - Alert: < 90% success

4. **Billing Accuracy**
   - Target: 100% accurate
   - Alert: Any discrepancies

5. **Data Quality**
   - Target: > 90% complete
   - Alert: < 80% complete

---

## 🔧 Configuration Examples

### Production Settings (ULTRA tier)

```typescript
const config = {
  perplexity: {
    rps: 1.6,  // 80% of 2 req/sec
    maxTokens: 4096,
    enableRateLimiting: true
  },
  socialLinks: {
    rps: 8,  // 80% of 10 req/sec
    enableRateLimiting: true
  }
};
```

### Queue Settings

```typescript
const queueConfig = {
  concurrency: 1,  // Process one at a time per workspace
  timeout: 30000,  // 30 second timeout
  throwOnTimeout: true
};
```

---

## 📚 Related Documentation

- **Business Model**: `LEAD_ENRICHMENT_BUSINESS_MODEL.md`
- **Code Examples**: `LEAD_ENRICHMENT_CODE_EXAMPLES.md`
- **Unified Enrichment**: `docs/UNIFIED_ENRICHMENT_SYSTEM.md`
- **Marketing Intelligence**: `MARKETING_INTELLIGENCE_COMPLETE_SUMMARY.md`

---

**Complete technical implementation guide for production-ready lead enrichment system with rate limiting, queue management, and billing integration.**
