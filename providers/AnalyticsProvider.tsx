import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { AnalyticsRepo, AnalyticsSummary, TrendingTopic, SearchResult } from '@/repos/AnalyticsRepo';

interface AnalyticsContextType {
  summary: AnalyticsSummary | null;
  trending: TrendingTopic[];
  loadingSummary: boolean;
  loadingTrending: boolean;
  trackEvent: (event: string, properties?: Record<string, any>) => Promise<void>;
  loadSummary: (params?: { start_date?: string; end_date?: string }) => Promise<void>;
  loadTrending: (params?: { limit?: number; period?: '7d' | '30d' | '90d' }) => Promise<void>;
  search: (query: string, types?: Array<'contact' | 'message' | 'interaction' | 'note'>) => Promise<SearchResult[]>;
  reportPerformance: (screen: string, loadTimeMs: number) => Promise<void>;
}

export const [AnalyticsProvider, useAnalytics] = createContextHook<AnalyticsContextType>(() => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [loadingTrending, setLoadingTrending] = useState<boolean>(false);

  const trackEvent = useCallback(async (
    event: string,
    properties?: Record<string, any>
  ): Promise<void> => {
    try {
      await AnalyticsRepo.trackEvent({ event, properties });
    } catch (error) {
      // Don't throw - analytics shouldn't break the app
      console.warn('[AnalyticsProvider] Failed to track event:', error);
    }
  }, []);

  const loadSummary = useCallback(async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      setLoadingSummary(true);
      console.log('[AnalyticsProvider] Loading summary');
      const data = await AnalyticsRepo.getSummary(params);
      setSummary(data);
      console.log('[AnalyticsProvider] Summary loaded');
    } catch (error) {
      console.error('[AnalyticsProvider] Failed to load summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadTrending = useCallback(async (params?: {
    limit?: number;
    period?: '7d' | '30d' | '90d';
  }) => {
    try {
      setLoadingTrending(true);
      console.log('[AnalyticsProvider] Loading trending topics');
      const data = await AnalyticsRepo.getTrending(params);
      setTrending(data);
      console.log('[AnalyticsProvider] Loaded', data.length, 'trending topics');
    } catch (error) {
      console.error('[AnalyticsProvider] Failed to load trending:', error);
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  const search = useCallback(async (
    query: string,
    types?: Array<'contact' | 'message' | 'interaction' | 'note'>
  ): Promise<SearchResult[]> => {
    try {
      console.log('[AnalyticsProvider] Searching:', query);
      const results = await AnalyticsRepo.search({
        query,
        types,
        limit: 50,
      });
      console.log('[AnalyticsProvider] Found', results.length, 'results');
      return results;
    } catch (error) {
      console.error('[AnalyticsProvider] Search failed:', error);
      return [];
    }
  }, []);

  const reportPerformance = useCallback(async (
    screen: string,
    loadTimeMs: number
  ): Promise<void> => {
    try {
      await AnalyticsRepo.reportPerformance({
        screen,
        load_time_ms: loadTimeMs,
      });
    } catch (error) {
      console.warn('[AnalyticsProvider] Failed to report performance:', error);
    }
  }, []);

  // Load summary on mount
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return useMemo(() => ({
    summary,
    trending,
    loadingSummary,
    loadingTrending,
    trackEvent,
    loadSummary,
    loadTrending,
    search,
    reportPerformance,
  }), [
    summary,
    trending,
    loadingSummary,
    loadingTrending,
    trackEvent,
    loadSummary,
    loadTrending,
    search,
    reportPerformance,
  ]);
});
