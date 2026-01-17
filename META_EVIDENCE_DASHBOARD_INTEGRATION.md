# Meta Integration for Evidence Dashboard (reports.everreach.app)

**Status**: Ready to integrate  
**Dashboard**: https://reports.everreach.app  
**Deployment**: Vercel (everreach-dashboard)

---

## 🎯 Integration Architecture

### Current Setup

**Evidence Dashboard** (Static Site Generator):
- Deployed at: reports.everreach.app
- Queries: Supabase database via SQL
- Branch: `feat/evidence-reports`
- Tech: SvelteKit + Evidence

**Backend** (Metrics Collection):
- Deployed at: backend-vercel-git-feat-dev-dashboard
- Has Meta adapter in: `lib/dashboard/adapters/meta-adapter.ts`
- Writes to: `metrics_timeseries` & `service_status` tables

**everreach-integration/** (React Components):
- For Next.js apps (not Evidence)
- We'll adapt these for Evidence

---

## 📊 Integration Flow

```
Meta Graph API
       ↓
Backend Cron Job (every 15 min)
       ↓
Supabase Tables
  - metrics_timeseries
  - service_status
       ↓
Evidence Dashboard (SQL queries)
       ↓
User sees charts at reports.everreach.app/meta
```

---

## 🚀 Step-by-Step Integration

### Step 1: Deploy Backend Adapter ✅

Already done! You have:
- `backend-vercel/lib/dashboard/adapters/meta-adapter.ts`
- Registered in `adapter-registry.ts`

Push backend:
```bash
cd backend-vercel
git push origin feat/dev-dashboard
```

### Step 2: Set Environment Variables

In Vercel (everreach backend project):

```bash
# Meta API credentials
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_long_lived_token

# Or use proxy
METACOACH_API_URL=https://www.matrixloop.app
```

**Get Meta token**:
1. Go to https://www.matrixloop.app/connect
2. Complete OAuth
3. DevTools → Application → Cookies → copy `meta_access_token`

### Step 3: Insert Integration Account

Connect to Supabase and run:

```sql
-- Get workspace_id
SELECT id, name FROM workspaces LIMIT 5;

-- Insert Meta integration (replace {workspace-id})
INSERT INTO integration_accounts (
  workspace_id,
  service,
  auth_json,
  scopes,
  is_active
) VALUES (
  '{workspace-id}',
  'meta',
  '{"access_token":"YOUR_TOKEN_HERE"}'::jsonb,
  ARRAY['ads_read', 'pages_read_engagement'],
  true
);
```

### Step 4: Create Backend Cron Job

Add to `backend-vercel/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-meta-metrics",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Create `app/api/cron/sync-meta-metrics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { MetaAdapter } from '@/lib/dashboard/adapters/meta-adapter';

export const runtime = 'edge';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  
  // Get active Meta integrations
  const { data: integrations } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('service', 'meta')
    .eq('is_active', true);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ message: 'No active Meta integrations' });
  }

  const results = [];
  
  for (const integration of integrations) {
    try {
      const adapter = new MetaAdapter(integration);
      
      // Get health status
      const health = await adapter.checkHealth();
      await supabase.from('service_status').upsert({
        workspace_id: integration.workspace_id,
        service: 'meta',
        status: health.status,
        latency_ms: health.latency_ms,
        checked_at: new Date().toISOString(),
      });
      
      // Get metrics
      const metrics = await adapter.fetchMetrics();
      
      // Write metrics to timeseries
      const metricsToInsert = [];
      
      if (metrics.ads) {
        metricsToInsert.push(
          {
            workspace_id: integration.workspace_id,
            metric_name: 'meta_ad_spend',
            value: metrics.ads.spend || 0,
            labels: { currency: 'USD' },
            ts: new Date().toISOString(),
          },
          {
            workspace_id: integration.workspace_id,
            metric_name: 'meta_ad_impressions',
            value: metrics.ads.impressions || 0,
            labels: {},
            ts: new Date().toISOString(),
          },
          {
            workspace_id: integration.workspace_id,
            metric_name: 'meta_ad_clicks',
            value: metrics.ads.clicks || 0,
            labels: {},
            ts: new Date().toISOString(),
          },
          {
            workspace_id: integration.workspace_id,
            metric_name: 'meta_ad_conversions',
            value: metrics.ads.conversions || 0,
            labels: {},
            ts: new Date().toISOString(),
          },
          {
            workspace_id: integration.workspace_id,
            metric_name: 'meta_ad_roas',
            value: metrics.ads.roas || 0,
            labels: {},
            ts: new Date().toISOString(),
          }
        );
      }
      
      if (metricsToInsert.length > 0) {
        await supabase.from('metrics_timeseries').insert(metricsToInsert);
      }
      
      results.push({ integration_id: integration.id, status: 'success' });
    } catch (error) {
      results.push({ 
        integration_id: integration.id, 
        status: 'error', 
        error: error.message 
      });
    }
  }
  
  return NextResponse.json({ results, synced_at: new Date().toISOString() });
}
```

### Step 5: Create Evidence Dashboard Page

In your Evidence dashboard repo (wherever `feat/evidence-reports` branch is):

Create `pages/meta.md`:

```markdown
---
title: Meta (Instagram/Facebook) Performance
---

# 📱 Meta Platform Performance

<LastRefreshed />

## Service Status

```sql service_status
SELECT 
  service,
  status,
  latency_ms,
  checked_at
FROM service_status
WHERE service = 'meta'
ORDER BY checked_at DESC
LIMIT 1
```

<StatusBadge 
  status={service_status[0].status} 
  latency={service_status[0].latency_ms}
/>

---

## Ad Performance (Last 30 Days)

```sql ad_metrics
SELECT 
  date_trunc('day', ts) as date,
  metric_name,
  AVG(value) as avg_value,
  MAX(value) as max_value
FROM metrics_timeseries
WHERE metric_name IN (
  'meta_ad_spend',
  'meta_ad_impressions',
  'meta_ad_clicks',
  'meta_ad_conversions',
  'meta_ad_roas'
)
AND ts >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', ts), metric_name
ORDER BY date DESC
```

### Ad Spend Trend

<LineChart 
  data={ad_metrics.filter(d => d.metric_name === 'meta_ad_spend')}
  x=date
  y=avg_value
  yAxisTitle="Spend ($)"
/>

### ROAS Trend

<LineChart 
  data={ad_metrics.filter(d => d.metric_name === 'meta_ad_roas')}
  x=date
  y=avg_value
  yAxisTitle="ROAS (x)"
/>

### Key Metrics Summary

```sql summary
SELECT 
  metric_name,
  ROUND(AVG(value), 2) as avg_value,
  ROUND(SUM(value), 2) as total_value
FROM metrics_timeseries
WHERE metric_name IN (
  'meta_ad_spend',
  'meta_ad_impressions',
  'meta_ad_clicks',
  'meta_ad_conversions'
)
AND ts >= NOW() - INTERVAL '7 days'
GROUP BY metric_name
```

<DataTable data={summary} />

---

## Performance Insights

```sql performance
WITH daily_metrics AS (
  SELECT 
    date_trunc('day', ts) as date,
    MAX(CASE WHEN metric_name = 'meta_ad_spend' THEN value END) as spend,
    MAX(CASE WHEN metric_name = 'meta_ad_clicks' THEN value END) as clicks,
    MAX(CASE WHEN metric_name = 'meta_ad_conversions' THEN value END) as conversions,
    MAX(CASE WHEN metric_name = 'meta_ad_roas' THEN value END) as roas
  FROM metrics_timeseries
  WHERE metric_name LIKE 'meta_ad_%'
  AND ts >= NOW() - INTERVAL '30 days'
  GROUP BY date
)
SELECT 
  date,
  spend,
  clicks,
  conversions,
  roas,
  CASE 
    WHEN spend > 0 THEN ROUND((spend / clicks), 2)
    ELSE 0
  END as cpc,
  CASE
    WHEN clicks > 0 THEN ROUND((conversions::numeric / clicks * 100), 2)
    ELSE 0
  END as cvr
FROM daily_metrics
ORDER BY date DESC
LIMIT 30
```

<DataTable data={performance} />
```

### Step 6: Add Navigation Link

In Evidence dashboard `sources/sources.yml` or navigation config:

```yaml
pages:
  - name: Health
    path: /health
  - name: Revenue
    path: /revenue
  - name: Usage
    path: /usage
  - name: Email
    path: /email
  - name: Meta/Instagram
    path: /meta
```

### Step 7: Deploy Evidence Dashboard

```bash
# In Evidence dashboard repo
git add .
git commit -m "feat: add Meta/Instagram performance page"
git push origin feat/evidence-reports

# Vercel will auto-deploy
```

---

## 🧪 Testing

### 1. Test Backend Cron

```bash
# Manually trigger cron
curl -X GET "https://backend-vercel-git-feat-dev-dashboard-isaiahduprees-projects.vercel.app/api/cron/sync-meta-metrics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. Verify Data in Supabase

```sql
-- Check service status
SELECT * FROM service_status WHERE service = 'meta' ORDER BY checked_at DESC LIMIT 5;

-- Check metrics
SELECT * FROM metrics_timeseries 
WHERE metric_name LIKE 'meta_%' 
ORDER BY ts DESC 
LIMIT 20;
```

### 3. View Dashboard

Navigate to: https://reports.everreach.app/meta

You should see:
- ✅ Service status badge
- ✅ Ad spend chart
- ✅ ROAS trend
- ✅ Performance table

---

## 📊 Available Metrics

Backend will write these to `metrics_timeseries`:

| Metric Name | Description | Type |
|-------------|-------------|------|
| `meta_ad_spend` | Total ad spend | Currency |
| `meta_ad_impressions` | Ad impressions | Count |
| `meta_ad_clicks` | Ad clicks | Count |
| `meta_ad_conversions` | Conversions | Count |
| `meta_ad_roas` | Return on ad spend | Ratio |
| `meta_ad_cpm` | Cost per 1000 impressions | Currency |
| `meta_ad_cpc` | Cost per click | Currency |
| `meta_ad_ctr` | Click-through rate | Percentage |

---

## 🔧 Customization

### Add More Metrics

In the cron job, add:

```typescript
{
  workspace_id: integration.workspace_id,
  metric_name: 'meta_page_engagement',
  value: metrics.engagement || 0,
  labels: { page_id: 'your_page_id' },
  ts: new Date().toISOString(),
}
```

### Change Sync Frequency

In `vercel.json`:

```json
{
  "schedule": "*/5 * * * *"  // Every 5 minutes instead of 15
}
```

### Add Alerts

In Evidence dashboard:

```markdown
{#if ad_metrics[0].avg_value < 2.0}
  <Alert status="warning">
    ⚠️ ROAS dropped below 2.0x. Review ad performance.
  </Alert>
{/if}
```

---

## 🐛 Troubleshooting

### No data showing

**Check**:
1. Backend cron is running: Check Vercel logs
2. Integration account exists: Query Supabase
3. Metrics are being written: Query `metrics_timeseries`
4. Evidence is querying correctly: Check SQL in Evidence

### "Service DOWN"

**Cause**: Meta API unreachable or token expired

**Fix**:
1. Get fresh token from MatrixLoop
2. Update `integration_accounts.auth_json`
3. Wait for next cron run

### Missing charts

**Cause**: Not enough data points yet

**Solution**: Wait 30-60 minutes for cron to collect data

---

## ✅ Deployment Checklist

- [ ] Backend adapter code pushed to `feat/dev-dashboard`
- [ ] Environment variables set in Vercel (backend)
- [ ] Integration account inserted in Supabase
- [ ] Cron job created and deployed
- [ ] Evidence page created (`pages/meta.md`)
- [ ] Navigation link added
- [ ] Evidence dashboard deployed
- [ ] Tested cron manually
- [ ] Verified data in Supabase
- [ ] Dashboard shows metrics

---

## 📞 Next Steps

After basic integration works:

1. **Add organic metrics** - Posts, reach, engagement
2. **Add AI analysis** - Hook scores, thumbnail scores
3. **Set up alerts** - Email when ROAS drops
4. **Add export** - CSV download for reports
5. **Compare periods** - Week-over-week, month-over-month

---

**Ready to integrate!** Start with Step 1 (backend deploy) and work through the checklist.

**Support**:
- Backend: `backend-vercel/lib/dashboard/adapters/meta-adapter.ts`
- Components: `everreach-integration/` (for Next.js reference)
- This guide: `META_EVIDENCE_DASHBOARD_INTEGRATION.md`
