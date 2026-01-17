/**
 * Trending Queries Hook
 * 
 * Automatically switches from mock data to real user data once threshold is met.
 * Tracks query usage and provides analytics.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import analytics from '@/lib/analytics';

export interface TrendingQuery {
  id: string;
  query: string;
  category: 'contacts' | 'notes' | 'insights' | 'actions';
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: 'today' | 'week' | 'month';
  isRealData?: boolean;
}

export interface TrendingStats {
  totalQueries: number;
  uniqueUsers: number;
  isUsingRealData: boolean;
  thresholdMet: boolean;
  queriesUntilReal: number;
}

const MOCK_QUERIES: TrendingQuery[] = [
  {
    id: 'mock-1',
    query: 'Who should I follow up with this week?',
    category: 'insights',
    frequency: 45,
    trend: 'up',
    timeframe: 'week',
  },
  {
    id: 'mock-2',
    query: 'Show me contacts I haven\'t talked to in 30 days',
    category: 'contacts',
    frequency: 38,
    trend: 'up',
    timeframe: 'week',
  },
  {
    id: 'mock-3',
    query: 'Add a note about my meeting today',
    category: 'actions',
    frequency: 32,
    trend: 'stable',
    timeframe: 'today',
  },
  {
    id: 'mock-4',
    query: 'Search my notes for "client"',
    category: 'notes',
    frequency: 28,
    trend: 'up',
    timeframe: 'week',
  },
  {
    id: 'mock-5',
    query: 'Get warmth insights for my network',
    category: 'insights',
    frequency: 25,
    trend: 'up',
    timeframe: 'month',
  },
  {
    id: 'mock-6',
    query: 'Summarize my recent conversations',
    category: 'notes',
    frequency: 22,
    trend: 'stable',
    timeframe: 'week',
  },
];

const THRESHOLD_MIN_QUERIES = 50;
const THRESHOLD_MIN_UNIQUE_USERS = 5;

/**
 * Hook to fetch and manage trending queries with automatic mock → real data switchover
 */
export function useTrendingQueries(timeframe: 'today' | 'week' | 'month' = 'week') {
  const [queries, setQueries] = useState<TrendingQuery[]>(MOCK_QUERIES);
  const [stats, setStats] = useState<TrendingStats>({
    totalQueries: 0,
    uniqueUsers: 1,
    isUsingRealData: false,
    thresholdMet: false,
    queriesUntilReal: THRESHOLD_MIN_QUERIES,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch trending queries from backend
   */
  const fetchTrendingQueries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trending queries
      const response = await apiFetch(`/api/v1/queries/trending?timeframe=${timeframe}`, {
        requireAuth: true,
      });

      const data = await response.json();

      // Check if we have enough data to use real queries
      const totalQueries = data.stats?.total_queries || 0;
      const uniqueUsers = data.stats?.unique_users || 1;
      const thresholdMet = totalQueries >= THRESHOLD_MIN_QUERIES && uniqueUsers >= THRESHOLD_MIN_UNIQUE_USERS;

      setStats({
        totalQueries,
        uniqueUsers,
        isUsingRealData: thresholdMet,
        thresholdMet,
        queriesUntilReal: Math.max(0, THRESHOLD_MIN_QUERIES - totalQueries),
      });

      if (thresholdMet && data.queries && data.queries.length > 0) {
        // Use real data
        console.log('[TrendingQueries] ✅ Threshold met - using real data');
        
        const realQueries: TrendingQuery[] = data.queries.map((q: any) => ({
          id: q.id,
          query: q.query_text,
          category: mapEntityTypeToCategory(q.entity_type),
          frequency: q.frequency,
          trend: q.trend || 'stable',
          timeframe,
          isRealData: true,
        }));

        setQueries(realQueries);

        // Track switchover event (only once)
        if (!stats.isUsingRealData) {
          analytics.track('trending_queries_switched_to_real', {
            total_queries: totalQueries,
            unique_users: uniqueUsers,
            timeframe,
          });
        }
      } else {
        // Use mock data
        console.log('[TrendingQueries] 📊 Using mock data (queries:', totalQueries, '/', THRESHOLD_MIN_QUERIES, ')');
        setQueries(MOCK_QUERIES.filter(q => q.timeframe === timeframe || timeframe === 'month'));
      }
    } catch (err) {
      console.error('[TrendingQueries] Failed to fetch trending queries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trending queries');
      
      // Fallback to mock data on error
      setQueries(MOCK_QUERIES.filter(q => q.timeframe === timeframe || timeframe === 'month'));
    } finally {
      setLoading(false);
    }
  }, [timeframe, stats.isUsingRealData]);

  /**
   * Track query usage
   */
  const trackQueryUsage = useCallback(async (query: string, category: string) => {
    try {
      await apiFetch('/api/v1/queries', {
        method: 'POST',
        body: JSON.stringify({
          query_text: query,
          entity_type: category,
          intent: 'user_selected_trending',
        }),
        requireAuth: true,
      });

      analytics.track('trending_query_selected', {
        query,
        category,
        is_real_data: stats.isUsingRealData,
      });

      // Refresh queries after tracking
      fetchTrendingQueries();
    } catch (err) {
      console.error('[TrendingQueries] Failed to track query usage:', err);
    }
  }, [fetchTrendingQueries, stats.isUsingRealData]);

  /**
   * Fetch queries on mount and when timeframe changes
   */
  useEffect(() => {
    fetchTrendingQueries();
  }, [fetchTrendingQueries]);

  return {
    queries,
    stats,
    loading,
    error,
    refetch: fetchTrendingQueries,
    trackQueryUsage,
  };
}

/**
 * Map entity type from backend to UI category
 */
function mapEntityTypeToCategory(entityType: string): 'contacts' | 'notes' | 'insights' | 'actions' {
  switch (entityType) {
    case 'contact':
      return 'contacts';
    case 'note':
    case 'interaction':
      return 'notes';
    case 'warmth':
    case 'analysis':
      return 'insights';
    case 'goal':
    case 'message':
      return 'actions';
    default:
      return 'contacts';
  }
}

/**
 * Get mock queries for development/testing
 */
export function getMockQueries(timeframe: 'today' | 'week' | 'month' = 'week'): TrendingQuery[] {
  return MOCK_QUERIES.filter(q => q.timeframe === timeframe || timeframe === 'month');
}
