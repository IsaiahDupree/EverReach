'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  data: {
    value: number;
    previous_value?: number;
    formatted?: string;
  };
}

export function KPICard({ data }: Props) {
  const value = data.formatted || formatNumber(data.value);
  const trend = calculateTrend(data.value, data.previous_value);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl font-bold text-gray-900">{value}</div>
      
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(trend)}`}>
          {getTrendIcon(trend)}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function calculateTrend(current: number, previous?: number): number | null {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function getTrendColor(trend: number): string {
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-600';
}

function getTrendIcon(trend: number) {
  if (trend > 0) return <TrendingUp className="w-4 h-4" />;
  if (trend < 0) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
