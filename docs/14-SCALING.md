# Scaling Guide

## Grow From 0 to 100,000+ Users

This guide covers how to scale your app as you grow.

---

## Growth Stages

| Stage | Users | Focus |
|-------|-------|-------|
| **MVP** | 0-100 | Get it working |
| **Early** | 100-1,000 | Find product-market fit |
| **Growth** | 1K-10K | Optimize performance |
| **Scale** | 10K-100K | Infrastructure scaling |
| **Enterprise** | 100K+ | Advanced architecture |

---

## Stage 1: MVP (0-100 Users)

### What to Focus On

- ✅ Core features working
- ✅ Basic error handling
- ✅ Simple deployment
- ❌ Don't over-engineer
- ❌ Don't optimize prematurely

### Stack

```
Supabase Free Tier
├── 500MB database
├── 1GB file storage
├── 50MB bandwidth/day
└── Good for ~100 active users

Vercel Hobby (Free)
├── 100GB bandwidth/month
├── Serverless functions
└── Good for light traffic
```

---

## Stage 2: Early Growth (100-1,000 Users)

### Upgrade Checklist

- [ ] Upgrade to Supabase Pro ($25/month)
- [ ] Add error monitoring (Sentry)
- [ ] Set up basic analytics
- [ ] Enable database backups

### Performance Quick Wins

```sql
-- Add indexes for common queries
CREATE INDEX idx_items_user_id ON public.items(user_id);
CREATE INDEX idx_items_created ON public.items(created_at DESC);

-- Composite index for filtered queries
CREATE INDEX idx_items_user_status 
ON public.items(user_id, status) 
WHERE status != 'deleted';
```

### Caching Strategy

```typescript
// Use React Query with smart caching
const { data } = useQuery({
  queryKey: ['items', userId],
  queryFn: fetchItems,
  staleTime: 1000 * 60 * 5,  // 5 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes
});
```

---

## Stage 3: Growth (1,000-10,000 Users)

### Database Optimization

```sql
-- Analyze slow queries
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_items_search 
ON public.items USING gin(to_tsvector('english', name || ' ' || description));
```

### Connection Pooling

```typescript
// Use Supabase connection pooler for high traffic
// In production, use the pooler URL:
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key',
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-connection-pool': 'true' },
    },
  }
);
```

### CDN for Assets

```typescript
// Use Supabase Storage CDN
const imageUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(path, {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',
    },
  });
```

---

## Stage 4: Scale (10,000-100,000 Users)

### Infrastructure Upgrades

| Component | Upgrade To | Cost |
|-----------|------------|------|
| Supabase | Pro/Team | $25-599/mo |
| Vercel | Pro | $20/mo |
| CDN | Cloudflare | Free-$20/mo |
| Monitoring | Sentry Team | $26/mo |

### Database Scaling

```sql
-- Partition large tables by date
CREATE TABLE items_2024 PARTITION OF items
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Archive old data
CREATE TABLE items_archive AS
SELECT * FROM items
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM items
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Read Replicas

For heavy read workloads, use Supabase read replicas:

```typescript
// Route reads to replica
const readClient = createClient(
  process.env.SUPABASE_READ_REPLICA_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Use for list views, reports
const { data } = await readClient.from('items').select('*');
```

### Background Jobs

Move heavy work to background:

```typescript
// Instead of processing in request
// Add to queue and process async

// Using Supabase Edge Functions + pg_cron
// Or external: Inngest, Trigger.dev, BullMQ
```

---

## Stage 5: Enterprise (100,000+ Users)

### Advanced Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                         │
│                    (Cloudflare)                          │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Vercel  │  │ Vercel  │  │ Vercel  │
    │  Edge   │  │  Edge   │  │  Edge   │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │
         └────────────┼────────────┘
                      ▼
    ┌─────────────────────────────────────┐
    │          SUPABASE CLUSTER           │
    │  ┌─────────┐  ┌─────────────────┐   │
    │  │ Primary │  │ Read Replicas   │   │
    │  │   DB    │  │ (3 regions)     │   │
    │  └─────────┘  └─────────────────┘   │
    └─────────────────────────────────────┘
```

### Considerations

- **Multi-region**: Deploy to multiple regions
- **Database sharding**: Split by tenant/user
- **Microservices**: Break out heavy features
- **Dedicated support**: Enterprise Supabase plan
- **Custom infrastructure**: Self-hosted options

---

## Performance Monitoring

### Key Metrics

```typescript
// Track these
const PERFORMANCE_METRICS = {
  // Response times
  api_latency_p50: 'median API response time',
  api_latency_p99: '99th percentile response time',
  
  // Database
  db_query_time: 'average query execution time',
  db_connections: 'active database connections',
  
  // Frontend
  ttfb: 'time to first byte',
  lcp: 'largest contentful paint',
  fid: 'first input delay',
  
  // Business
  error_rate: 'percentage of failed requests',
  uptime: 'availability percentage',
};
```

### Alerts

Set up alerts for:
- Error rate > 1%
- Response time p99 > 2s
- Database connections > 80%
- Disk usage > 80%

---

## Cost Optimization

### Database

```sql
-- Identify unused indexes (drop them)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';

-- Vacuum to reclaim space
VACUUM FULL items;
```

### API

```typescript
// Reduce payload sizes
const { data } = await supabase
  .from('items')
  .select('id, name, status')  // Only needed fields
  .limit(20);                   // Paginate

// Cache aggressively
const response = new Response(JSON.stringify(data), {
  headers: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  },
});
```

### Storage

```typescript
// Compress images before upload
import * as ImageManipulator from 'expo-image-manipulator';

const compressed = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1200 } }],
  { compress: 0.7, format: 'jpeg' }
);
```

---

## Scaling Checklist

### Before You Need It

- [ ] Add database indexes for common queries
- [ ] Implement pagination everywhere
- [ ] Use React Query caching
- [ ] Set up error monitoring
- [ ] Enable database backups

### When Growing

- [ ] Upgrade Supabase plan
- [ ] Enable connection pooling
- [ ] Add read replicas if read-heavy
- [ ] Implement background jobs
- [ ] Set up CDN for assets

### At Scale

- [ ] Multi-region deployment
- [ ] Database optimization/sharding
- [ ] Advanced caching (Redis)
- [ ] Load testing
- [ ] 24/7 monitoring

---

## Next Steps

- [Security →](10-SECURITY.md)
- [Deployment →](07-DEPLOYMENT.md)
