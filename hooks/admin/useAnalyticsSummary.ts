/**
 * Analytics Summary Hook
 * Fetches user's analytics summary
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';

interface AnalyticsSummary {
  period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  contacts: {
    total: number;
    created_this_period: number;
    avg_warmth: number;
    warmth_distribution: {
      hot: number;
      warm: number;
      cooling: number;
      cold: number;
    };
  };
  interactions: {
    total: number;
    logged_this_period: number;
    messages_sent: number;
  };
  ai_usage: {
    messages_generated: number;
    contacts_analyzed: number;
    screenshots_analyzed: number;
  };
}

export function useAnalyticsSummary(days: number = 30) {
  const { session } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    fetchAnalytics();
  }, [session, days]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/analytics/summary?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
