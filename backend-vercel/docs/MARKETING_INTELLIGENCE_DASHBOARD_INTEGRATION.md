# Marketing Intelligence → Developer Dashboard Integration

This guide shows how to expose the Marketing Intelligence (MI) suite as first‑class metrics in the Developer Dashboard with minimal, type‑safe changes.

---

## Goals
- Add MI metrics (magnetism, intent, email CTR, core funnel) as KPI and time‑series widgets.
- Use fast SQL views/materialized views for aggregation.
- Keep a single metrics endpoint that dispatches `mi.*` queries.

---

## Architecture Overview
- Metric registry: extend `MetricNames` with `mi.*` keys.
- SQL layer: create reusable MI views:
  - `mi_timeseries_daily(metric_name, ts, value, labels jsonb)`
  - `mi_kpis_current(metric_name, value, labels)`
  - `mi_funnel_daily(ts, stage, count, labels)`
- API: `POST /api/metrics/query` accepts `MetricQuery[]` and routes `mi.*` to a marketing adapter.
- Dashboard: add default widgets (KPI, timeseries, funnel).
- Optional: cron to refresh materialized views.

---

## 1) Add MI metric keys
Update `lib/dashboard/types.ts` and add:

```ts
export const MetricNames = {
  // ...existing
  
  // Marketing Intelligence (MI)
  MI_MAGNETISM_AVG: 'mi.magnetism.avg',
  MI_INTENT_AVG: 'mi.intent.avg',
  MI_EMAIL_OPEN_RATE: 'mi.email.open_rate',
  MI_EMAIL_CLICK_RATE: 'mi.email.click_rate',
  MI_EMAIL_CTR: 'mi.email.ctr',
  MI_CORE_FUNNEL_SIGNUP: 'mi.core_funnel.signup',
  MI_CORE_FUNNEL_FIRST_CONTACT: 'mi.core_funnel.first_contact',
  MI_CORE_FUNNEL_FIRST_MESSAGE: 'mi.core_funnel.first_message',
  MI_CORE_FUNNEL_SENT: 'mi.core_funnel.sent',
  MI_CORE_FUNNEL_CR: 'mi.core_funnel.cr',
  MI_PERSONA_BUCKET_COUNTS: 'mi.persona.bucket_counts',
} as const;
```

---

## 2) Create SQL views (Supabase)
Create 3 views that normalize MI metrics for the dashboard.

```sql
-- Daily time series store (could be a view or a MATERIALIZED VIEW)
CREATE VIEW mi_timeseries_daily AS
SELECT 'mi.magnetism.avg'::text AS metric_name,
       date_trunc('day', umi.calculated_at) AS ts,
       AVG(umi.score) AS value,
       '{}'::jsonb AS labels
FROM user_magnetism_index umi
GROUP BY 1, 2
UNION ALL
SELECT 'mi.intent.avg', date_trunc('day', uis.calculated_at), AVG(uis.score), '{}'::jsonb
FROM user_intent_score uis
GROUP BY 1, 2
UNION ALL
SELECT 'mi.email.open_rate', date_trunc('day', es.sent_at), 
       NULLIF(SUM(es.opens),0)::float / NULLIF(COUNT(*),0), '{}'::jsonb
FROM email_send es GROUP BY 1, 2
UNION ALL
SELECT 'mi.email.click_rate', date_trunc('day', es.sent_at), 
       NULLIF(SUM(es.clicks),0)::float / NULLIF(COUNT(*),0), '{}'::jsonb
FROM email_send es GROUP BY 1, 2
UNION ALL
SELECT 'mi.email.ctr', date_trunc('day', es.sent_at), 
       NULLIF(SUM(es.clicks),0)::float / NULLIF(SUM(es.opens),0), '{}'::jsonb
FROM email_send es GROUP BY 1, 2;
```

```sql
-- Current KPIs snapshot
CREATE VIEW mi_kpis_current AS
SELECT 'mi.magnetism.avg'::text AS metric_name,
       (SELECT AVG(score) FROM user_magnetism_index
        WHERE calculated_at > now() - interval '7 days') AS value,
       jsonb_build_object('window','7d') AS labels
UNION ALL
SELECT 'mi.intent.avg',
       (SELECT AVG(score) FROM user_intent_score
        WHERE calculated_at > now() - interval '7 days'),
       jsonb_build_object('window','7d');
```

```sql
-- Core funnel per day (signup -> first_contact -> first_message -> sent)
CREATE VIEW mi_funnel_daily AS
WITH daily AS (
  SELECT date_trunc('day', created_at) AS ts,
         COUNT(*) FILTER (WHERE event = 'signup') AS signup,
         COUNT(*) FILTER (WHERE event = 'first_contact') AS first_contact,
         COUNT(*) FILTER (WHERE event = 'first_message') AS first_message,
         COUNT(*) FILTER (WHERE event = 'sent') AS sent
  FROM analytics_events  -- or your canonical event table
  GROUP BY 1
)
SELECT ts, 'signup' AS stage, signup AS count, '{}'::jsonb AS labels FROM daily
UNION ALL
SELECT ts, 'first_contact', first_contact, '{}'::jsonb FROM daily
UNION ALL
SELECT ts, 'first_message', first_message, '{}'::jsonb FROM daily
UNION ALL
SELECT ts, 'sent', sent, '{}'::jsonb FROM daily;
```

> Tip: Convert to `MATERIALIZED VIEW` + nightly `REFRESH MATERIALIZED VIEW` for speed if these sources are large.

---

## 3) Metrics API: `POST /api/metrics/query`
Create `app/api/metrics/query/route.ts` to accept `MetricQuery[]` and dispatch to the marketing adapter when `metric_name` starts with `mi.`.

```ts
import { NextResponse } from 'next/server';
import type { MetricsQueryRequest, MetricsQueryResponse, MetricQuery } from '@/lib/dashboard/types';
import { queryMarketingMetric } from '@/lib/dashboard/adapters/marketing';

export async function POST(req: Request) {
  const { queries } = (await req.json()) as MetricsQueryRequest;

  const results = await Promise.all(queries.map(async (q) => {
    if (q.metric_name.startsWith('mi.')) {
      return queryMarketingMetric(q);
    }
    // TODO: route other services (stripe, posthog, etc.)
    return { metric_name: q.metric_name, points: [], labels: {} };
  }));

  const body: MetricsQueryResponse = { results };
  return NextResponse.json(body, { headers: { 'Cache-Control': 's-maxage=60' } });
}
```

---

## 4) Marketing adapter
Create `lib/dashboard/adapters/marketing.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { MetricQuery, MetricResult } from '@/lib/dashboard/types';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

export async function queryMarketingMetric(q: MetricQuery): Promise<MetricResult> {
  const from = toISO(q.from);
  const to = toISO(q.to);

  if (q.metric_name === 'mi.core_funnel.cr') {
    // Derive CR from funnel stages per day
    const { data } = await supabase.from('mi_funnel_daily')
      .select('ts, stage, count')
      .gte('ts', from).lte('ts', to);
    const byDay = aggregateFunnelCR(data ?? []);
    return { metric_name: q.metric_name, points: byDay, labels: {} };
  }

  // Timeseries from normalized store
  const { data } = await supabase.from('mi_timeseries_daily')
    .select('ts, value, labels')
    .eq('metric_name', q.metric_name)
    .gte('ts', from).lte('ts', to)
    .order('ts', { ascending: true });

  return {
    metric_name: q.metric_name,
    points: (data ?? []).map((r) => ({ ts: r.ts, value: Number(r.value || 0) })),
    labels: {},
  };
}

function toISO(v: string) { return v.startsWith('now') ? new Date().toISOString() : v; }

function aggregateFunnelCR(rows: Array<{ ts: string; stage: string; count: number }>) {
  const byTs: Record<string, any> = {};
  for (const r of rows) {
    byTs[r.ts] ||= { signup: 0, sent: 0 };
    byTs[r.ts][r.stage] = r.count;
  }
  return Object.entries(byTs)
    .sort(([a],[b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([ts, v]: any) => ({ ts, value: v.signup ? (v.sent / v.signup) * 100 : 0 }));
}
```

---

## 5) Default dashboard widgets
Add presets to your default dashboard config (KPI + charts + funnel):

```ts
const widgets = [
  { id: 'mi-kpi-magnetism', title: 'Magnetism (avg 7d)', kind: 'kpi', renderer: 'stat', query: { metric_name: 'mi.magnetism.avg', from: 'now-7d', to: 'now' } },
  { id: 'mi-ctr-30d', title: 'Email CTR (30d)', kind: 'timeseries', renderer: 'line', query: { metric_name: 'mi.email.ctr', from: 'now-30d', to: 'now', interval: '1d' } },
  { id: 'mi-intent-30d', title: 'Intent (avg 30d)', kind: 'timeseries', renderer: 'area', query: { metric_name: 'mi.intent.avg', from: 'now-30d', to: 'now', interval: '1d' } },
  { id: 'mi-funnel-7d', title: 'Core Funnel CR (7d)', kind: 'timeseries', renderer: 'line', query: { metric_name: 'mi.core_funnel.cr', from: 'now-7d', to: 'now', interval: '1d' } },
];
```

---

## 6) (Optional) Cron to refresh materialized views
If you switch views to materialized views:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mi_timeseries_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mi_funnel_daily;
```

Add a Vercel cron to call an API route that runs the above SQL with service role.

---

## 7) Security & performance
- Use the Supabase service role only on server routes.
- Add `s-maxage=60` to metrics responses for short CDN caching.
- Keep dashboard auth in place; MI data may be sensitive.

---

## 8) Testing
```bash
curl -X POST "$BASE/api/metrics/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "queries": [
          {"metric_name":"mi.magnetism.avg","from":"now-7d","to":"now"},
          {"metric_name":"mi.email.ctr","from":"now-30d","to":"now","interval":"1d"}
        ]
      }'
```

This returns `results[]` with `{ metric_name, points:[{ts,value}] }` ready for the existing widget renderer.
