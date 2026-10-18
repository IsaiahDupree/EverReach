// MetaCoach Status Widget for Everreach
// Place this in: components/meta/MetaStatusWidget.tsx

'use client';

import { useEffect, useState } from 'react';
import type { MetaHealthResponse } from './types';

export function MetaStatusWidget() {
  const [health, setHealth] = useState<MetaHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setError(null);
      const response = await fetch('/api/meta/health');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHealth(data);
    } catch (err: any) {
      console.error('Failed to fetch Meta health:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <h3 className="font-semibold text-red-900">Instagram API - Error</h3>
        </div>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchHealth}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const statusConfig = {
    UP: {
      color: 'bg-green-500',
      textColor: 'text-green-900',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Operational'
    },
    DEGRADED: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-900',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Degraded'
    },
    DOWN: {
      color: 'bg-red-500',
      textColor: 'text-red-900',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Down'
    }
  };

  const config = statusConfig[health.status];
  const rateLimitPercentage = health.details.rate_limit
    ? (health.details.rate_limit.calls_used / health.details.rate_limit.total_calls) * 100
    : 0;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-6 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${config.color}`}></div>
          <h3 className={`font-semibold ${config.textColor}`}>Instagram API</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${config.color} text-white`}>
          {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Latency */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Response Time</span>
          <span className={`text-sm font-medium ${config.textColor}`}>
            {health.latency_ms}ms
          </span>
        </div>

        {/* Rate Limit */}
        {health.details.rate_limit && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">API Calls</span>
              <span className={`text-sm font-medium ${config.textColor}`}>
                {health.details.rate_limit.calls_remaining} / {health.details.rate_limit.total_calls}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  rateLimitPercentage > 80 ? 'bg-red-500' :
                  rateLimitPercentage > 60 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${100 - rateLimitPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {rateLimitPercentage.toFixed(0)}% used
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchHealth}
          className="w-full text-sm py-2 px-4 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
