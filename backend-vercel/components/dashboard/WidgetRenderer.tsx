'use client';

import { useQuery } from '@tanstack/react-query';
import { KPICard } from './widgets/KPICard';
import { TimeseriesChart } from './widgets/TimeseriesChart';
import { ServiceHealthGrid } from './widgets/ServiceHealthGrid';
import type { WidgetConfig } from '@/lib/dashboard/types';
import { getSupabaseToken } from '@/lib/dashboard/auth';

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
          headers: { Authorization: `Bearer ${getSupabaseToken()}` },
        });
        if (!res.ok) throw new Error('Failed to fetch health');
        return res.json();
      }

      // Fetch metrics
      const res = await fetch('/api/metrics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getSupabaseToken()}`,
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
      const chartType = (widget.renderer === 'line' || widget.renderer === 'area' || widget.renderer === 'bar') 
        ? widget.renderer 
        : 'line';
      return <TimeseriesChart data={data} renderer={chartType} />;
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

