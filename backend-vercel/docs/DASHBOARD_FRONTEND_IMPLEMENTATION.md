# Developer Dashboard - Frontend Implementation Guide

**Complete guide for building the web dashboard UI with real-time updates**

---

## Table of Contents

1. [Setup & Dependencies](#setup--dependencies)
2. [Dashboard Page](#dashboard-page)
3. [Widget Components](#widget-components)
4. [Real-time Updates](#real-time-updates)
5. [Deployment](#deployment)

---

## Setup & Dependencies

### Install Required Packages

```bash
npm install react-grid-layout recharts @tanstack/react-query date-fns
npm install --save-dev @types/react-grid-layout
```

### Package Purposes

- `react-grid-layout` - Drag & drop grid
- `recharts` - Charts (line, area, bar)
- `@tanstack/react-query` - Data fetching & caching
- `date-fns` - Date manipulation

---

## Dashboard Page

### Create Dashboard Page
**File:** `app/dashboard/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import { RefreshControl } from '@/components/dashboard/RefreshControl';
import type { Dashboard, GridLayout as LayoutItem } from '@/lib/dashboard/types';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizable.css';

export default function DashboardPage() {
  const [autoRefresh, setAutoRefresh] = useState<number>(60); // seconds
  const [timeRange, setTimeRange] = useState({ from: 'now-24h', to: 'now' });
  const queryClient = useQueryClient();

  // Fetch dashboard
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json() as Promise<Dashboard>;
    },
  });

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    }, autoRefresh * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  // Save layout changes
  const handleLayoutChange = async (layout: LayoutItem[]) => {
    if (!dashboard) return;

    await fetch('/api/dashboard/layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        layout,
        widgets: dashboard.widgets,
      }),
    });
  };

  if (isLoading || !dashboard) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Developer Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <RefreshControl value={autoRefresh} onChange={setAutoRefresh} />
        </div>
      </div>

      {/* Grid */}
      <GridLayout
        className="layout"
        layout={dashboard.layout}
        cols={12}
        rowHeight={32}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable
        isResizable
      >
        {dashboard.widgets.map((widget) => (
          <div key={widget.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <WidgetRenderer widget={widget} timeRange={timeRange} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

function getToken(): string {
  // Get token from your auth system (Supabase, etc.)
  return localStorage.getItem('supabase.auth.token') || '';
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Widget Components

### Widget Renderer
**File:** `components/dashboard/WidgetRenderer.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { KPICard } from './widgets/KPICard';
import { TimeseriesChart } from './widgets/TimeseriesChart';
import { ServiceHealthGrid } from './widgets/ServiceHealthGrid';
import type { WidgetConfig } from '@/lib/dashboard/types';

interface Props {
  widget: WidgetConfig;
  timeRange: { from: string; to: string };
}

export function WidgetRenderer({ widget, timeRange }: Props) {
  // Fetch data for this widget
  const { data, isLoading, error } = useQuery({
    queryKey: ['widget', widget.id, timeRange],
    queryFn: async () => {
      if (widget.kind === 'status') {
        // Fetch health status
        const res = await fetch('/api/integrations/health', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error('Failed to fetch health');
        return res.json();
      }

      // Fetch metrics
      const res = await fetch('/api/metrics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          queries: [{
            ...widget.query,
            from: timeRange.from,
            to: timeRange.to,
          }],
        }),
      });
      
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const result = await res.json();
      return result.results[0];
    },
    enabled: !!widget.query || widget.kind === 'status',
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="h-full flex flex-col">
      {/* Widget Header */}
      <div className="drag-handle p-4 border-b border-gray-200 cursor-move bg-gray-50">
        <h3 className="font-semibold text-gray-900">{widget.title}</h3>
      </div>

      {/* Widget Content */}
      <div className="flex-1 p-4">
        {isLoading && <WidgetSkeleton />}
        {error && <WidgetError error={error as Error} />}
        {data && renderWidget(widget, data)}
      </div>
    </div>
  );
}

function renderWidget(widget: WidgetConfig, data: any) {
  switch (widget.kind) {
    case 'kpi':
      return <KPICard data={data} />;
    case 'timeseries':
      return <TimeseriesChart data={data} renderer={widget.renderer} />;
    case 'status':
      return <ServiceHealthGrid data={data} />;
    default:
      return <div>Unknown widget type</div>;
  }
}

function WidgetSkeleton() {
  return <div className="animate-pulse bg-gray-100 h-full rounded" />;
}

function WidgetError({ error }: { error: Error }) {
  return (
    <div className="text-red-600 text-sm">
      <p>Error loading widget:</p>
      <p className="text-xs">{error.message}</p>
    </div>
  );
}

function getToken(): string {
  return localStorage.getItem('supabase.auth.token') || '';
}
```

### KPI Card Widget
**File:** `components/dashboard/widgets/KPICard.tsx`

```typescript
'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  data: {
    points: Array<{ ts: string; value: number }>;
  };
}

export function KPICard({ data }: Props) {
  if (!data?.points || data.points.length === 0) {
    return <div className="text-gray-400 text-center">No data</div>;
  }

  const currentValue = data.points[data.points.length - 1].value;
  const previousValue = data.points[0].value;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 
    ? ((change / previousValue) * 100).toFixed(1)
    : '0';

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="text-4xl font-bold text-gray-900">
        {formatNumber(currentValue)}
      </div>
      
      <div className={`flex items-center gap-2 mt-2 text-sm ${
        trend === 'up' ? 'text-green-600' : 
        trend === 'down' ? 'text-red-600' : 
        'text-gray-500'
      }`}>
        {trend === 'up' && <ArrowUp size={16} />}
        {trend === 'down' && <ArrowDown size={16} />}
        {trend === 'neutral' && <Minus size={16} />}
        <span>{changePercent}%</span>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
```

### Timeseries Chart Widget
**File:** `components/dashboard/widgets/TimeseriesChart.tsx`

```typescript
'use client';

import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Props {
  data: {
    points: Array<{ ts: string; value: number }>;
  };
  renderer: 'line' | 'area' | 'bar';
}

export function TimeseriesChart({ data, renderer }: Props) {
  if (!data?.points || data.points.length === 0) {
    return <div className="text-gray-400 text-center">No data</div>;
  }

  const chartData = data.points.map(point => ({
    time: format(new Date(point.ts), 'MMM d'),
    value: point.value,
  }));

  const ChartComponent = renderer === 'line' ? LineChart : renderer === 'area' ? AreaChart : BarChart;
  const DataComponent = renderer === 'line' ? Line : renderer === 'area' ? Area : Bar;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          stroke="#999"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#999"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        />
        <DataComponent 
          type="monotone" 
          dataKey="value" 
          stroke="#3b82f6" 
          fill="#3b82f6"
          fillOpacity={renderer === 'area' ? 0.2 : 1}
        />
      </ChartComponent>
    </ResponsiveContainer>
  );
}
```

### Service Health Grid Widget
**File:** `components/dashboard/widgets/ServiceHealthGrid.tsx`

```typescript
'use client';

import { CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface Props {
  data: {
    results: Array<{
      service: string;
      status: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
      latency_ms: number | null;
      last_check: string;
    }>;
  };
}

export function ServiceHealthGrid({ data }: Props) {
  if (!data?.results || data.results.length === 0) {
    return <div className="text-gray-400 text-center">No services</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.results.map((service) => (
        <div 
          key={service.service}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
        >
          {getStatusIcon(service.status)}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm capitalize truncate">
              {service.service}
            </div>
            {service.latency_ms && (
              <div className="text-xs text-gray-500">
                {service.latency_ms}ms
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'UP':
      return <CheckCircle className="text-green-500" size={20} />;
    case 'DEGRADED':
      return <AlertCircle className="text-yellow-500" size={20} />;
    case 'DOWN':
      return <XCircle className="text-red-500" size={20} />;
    default:
      return <HelpCircle className="text-gray-400" size={20} />;
  }
}
```

### Time Range Selector
**File:** `components/dashboard/TimeRangeSelector.tsx`

```typescript
'use client';

interface Props {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  const ranges = [
    { label: '1 Hour', value: { from: 'now-1h', to: 'now' } },
    { label: '24 Hours', value: { from: 'now-24h', to: 'now' } },
    { label: '7 Days', value: { from: 'now-7d', to: 'now' } },
    { label: '30 Days', value: { from: 'now-30d', to: 'now' } },
  ];

  return (
    <select
      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
      value={`${value.from}|${value.to}`}
      onChange={(e) => {
        const [from, to] = e.target.value.split('|');
        onChange({ from, to });
      }}
    >
      {ranges.map((range) => (
        <option key={range.label} value={`${range.value.from}|${range.value.to}`}>
          {range.label}
        </option>
      ))}
    </select>
  );
}
```

### Refresh Control
**File:** `components/dashboard/RefreshControl.tsx`

```typescript
'use client';

import { RotateCw } from 'lucide-react';

interface Props {
  value: number; // seconds
  onChange: (value: number) => void;
}

export function RefreshControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <RotateCw size={16} className="text-gray-600" />
      <select
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={0}>Off</option>
        <option value={30}>30s</option>
        <option value={60}>1m</option>
        <option value={300}>5m</option>
      </select>
    </div>
  );
}
```

---

## Real-time Updates

### Setup Supabase Realtime

**File:** `lib/dashboard/realtime.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Subscribe to real-time metrics updates
 */
export function subscribeToMetrics(
  workspaceId: string,
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel(`metrics:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'metrics_timeseries',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to real-time service health updates
 */
export function subscribeToHealth(
  workspaceId: string,
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel(`health:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_status',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Unsubscribe from channel
 */
export async function unsubscribe(channel: RealtimeChannel) {
  await supabase.removeChannel(channel);
}
```

### Use Real-time in Dashboard

**Update:** `app/dashboard/page.tsx` (add to existing component)

```typescript
import { subscribeToMetrics, subscribeToHealth, unsubscribe } from '@/lib/dashboard/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Inside DashboardPage component:
useEffect(() => {
  if (!workspaceId) return;

  let metricsChannel: RealtimeChannel;
  let healthChannel: RealtimeChannel;

  // Subscribe to metrics
  metricsChannel = subscribeToMetrics(workspaceId, (payload) => {
    console.log('New metric:', payload);
    // Invalidate queries to refetch
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  });

  // Subscribe to health
  healthChannel = subscribeToHealth(workspaceId, (payload) => {
    console.log('Health update:', payload);
    // Invalidate queries to refetch
    queryClient.invalidateQueries({ queryKey: ['health'] });
  });

  // Cleanup
  return () => {
    if (metricsChannel) unsubscribe(metricsChannel);
    if (healthChannel) unsubscribe(healthChannel);
  };
}, [workspaceId, queryClient]);
```

---

## Deployment

### 1. Configure Vercel Cron

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/health-check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 2. Environment Variables

Add to Vercel/Railway:

```bash
# Cron secret for protection
CRON_SECRET=your-random-secret-here

# Supabase
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service API keys (for adapters)
STRIPE_SECRET_KEY=sk_...
REVENUECAT_API_KEY=...
POSTHOG_API_KEY=...
RESEND_API_KEY=re_...
```

### 3. Deploy

```bash
# Deploy to Vercel
vercel --prod

# Or commit and push (if auto-deploy enabled)
git push origin feat/dev-dashboard
```

---

## Testing

### Test Cron Job Locally

```bash
# Call cron endpoint
curl -X GET http://localhost:3000/api/cron/health-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Dashboard

1. Navigate to `/dashboard`
2. Drag widgets to rearrange
3. Change time range
4. Watch for real-time updates
5. Check auto-refresh

---

## Summary

**What You've Built:**

1. ✅ **Drag & Drop Dashboard** with react-grid-layout
2. ✅ **Widget Renderer** (KPI, Charts, Status Grid)
3. ✅ **Time Range Selector** (1h, 24h, 7d, 30d)
4. ✅ **Auto-refresh** (30s, 1m, 5m)
5. ✅ **Real-time Updates** via Supabase Realtime
6. ✅ **Automated Health Checks** via Vercel Cron

**Total Components:** 10 files (~800 lines)

**Ready for Production!** 🚀
