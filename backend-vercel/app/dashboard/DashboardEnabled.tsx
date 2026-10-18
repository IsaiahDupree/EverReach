'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import { RefreshControl } from '@/components/dashboard/RefreshControl';
import type { Dashboard, GridLayout as LayoutItem } from '@/lib/dashboard/types';
import { getSupabaseToken } from '@/lib/dashboard/auth';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Load react-grid-layout only on the client
const GridLayout: any = dynamic(
  () => import('react-grid-layout').then((m) => (m as any).default || (m as any)),
  { ssr: false }
);

export default function DashboardEnabled() {
  const [autoRefresh, setAutoRefresh] = useState<number>(60); // seconds
  const [timeRange, setTimeRange] = useState({ from: 'now-24h', to: 'now' });
  const queryClient = useQueryClient();

  // Fetch dashboard
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${getSupabaseToken()}` },
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
        Authorization: `Bearer ${getSupabaseToken()}`,
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
