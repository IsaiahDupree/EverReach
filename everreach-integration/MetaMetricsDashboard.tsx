// MetaCoach Metrics Dashboard for Everreach
// Place this in: components/meta/MetaMetricsDashboard.tsx

'use client';

import { useEffect, useState } from 'react';
import type { MetaMetricsResponse, TimeRange } from './types';

export function MetaMetricsDashboard() {
  const [metrics, setMetrics] = useState<MetaMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const fetchMetrics = async (range: TimeRange = timeRange) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const to = new Date();
      const from = new Date();
      
      switch (range) {
        case '24h':
          from.setDate(from.getDate() - 1);
          break;
        case '7d':
          from.setDate(from.getDate() - 7);
          break;
        case '30d':
          from.setDate(from.getDate() - 30);
          break;
      }

      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString()
      });

      const response = await fetch(`/api/meta/metrics?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to fetch Meta metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchMetrics(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Failed to Load Metrics</h3>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={() => fetchMetrics()}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Instagram Performance</h2>
        
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range);
                fetchMetrics(range);
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Organic Content Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Organic Content</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Posts"
            value={metrics.organic.posts}
            icon="📝"
          />
          <MetricCard
            label="Reach"
            value={formatNumber(metrics.organic.reach)}
            icon="👥"
          />
          <MetricCard
            label="Engagement"
            value={formatNumber(metrics.organic.engagement)}
            icon="❤️"
          />
          <MetricCard
            label="Eng. Rate"
            value={`${metrics.organic.engagement_rate.toFixed(1)}%`}
            icon="📊"
          />
        </div>
      </div>

      {/* AI Analysis Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Analyzed"
            value={metrics.ai_analysis.analyzed_posts}
            icon="🤖"
          />
          <MetricCard
            label="Hook Score"
            value={`${metrics.ai_analysis.avg_hook_score}/100`}
            icon="🎣"
          />
          <MetricCard
            label="Thumbnail"
            value={`${metrics.ai_analysis.avg_thumbnail_score}/100`}
            icon="🖼️"
          />
          <MetricCard
            label="Overall"
            value={`${metrics.ai_analysis.avg_overall_score}/100`}
            icon="⭐"
          />
        </div>
      </div>

      {/* Ad Performance Metrics */}
      {metrics.ads && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <MetricCard
              label="Spend"
              value={formatCurrency(metrics.ads.spend)}
              icon="💰"
            />
            <MetricCard
              label="Impressions"
              value={formatNumber(metrics.ads.impressions)}
              icon="👁️"
            />
            <MetricCard
              label="Clicks"
              value={formatNumber(metrics.ads.clicks)}
              icon="🖱️"
            />
            <MetricCard
              label="Conversions"
              value={metrics.ads.conversions}
              icon="✅"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="ROAS"
              value={`${metrics.ads.roas.toFixed(2)}x`}
              icon="📈"
              highlight={metrics.ads.roas >= 2}
            />
            <MetricCard
              label="CPM"
              value={formatCurrency(metrics.ads.cpm)}
              icon="💵"
            />
            <MetricCard
              label="CPC"
              value={formatCurrency(metrics.ads.cpc)}
              icon="💸"
            />
            <MetricCard
              label="CTR"
              value={`${metrics.ads.ctr.toFixed(2)}%`}
              icon="📊"
            />
          </div>
        </div>
      )}

      {/* Period Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Period: {new Date(metrics.period.from).toLocaleDateString()} - {new Date(metrics.period.to).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, icon, highlight = false }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-lg border ${
      highlight ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${
        highlight ? 'text-green-900' : 'text-gray-900'
      }`}>
        {value}
      </div>
    </div>
  );
}
