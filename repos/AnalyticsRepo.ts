import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

/**
 * Analytics Summary
 */
export interface AnalyticsSummary {
  total_contacts: number;
  total_messages: number;
  total_interactions: number;
  active_last_7_days: number;
  active_last_30_days: number;
  messages_sent_last_7_days: number;
  messages_sent_last_30_days: number;
  top_contacts: Array<{
    id: string;
    name: string;
    interaction_count: number;
    last_interaction: string;
  }>;
  interaction_types: Record<string, number>;
  period_start?: string;
  period_end?: string;
}

/**
 * Trending Topic
 */
export interface TrendingTopic {
  topic: string;
  count: number;
  contacts: string[];
  trend: 'up' | 'down' | 'stable';
  change_percent?: number;
}

/**
 * Search Results
 */
export interface SearchResult {
  type: 'contact' | 'message' | 'interaction' | 'note';
  id: string;
  title: string;
  subtitle?: string;
  preview?: string;
  timestamp?: string;
  relevance_score?: number;
}

/**
 * Backend-only Analytics Repository
 * Analytics are not stored locally
 */
const ENABLE_BACKEND_GENERIC_EVENTS = process.env.EXPO_PUBLIC_ENABLE_BACKEND_ANALYTICS === 'true';

const BackendAnalyticsRepo = {
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Send to unified backend analytics endpoint: /api/v1/events/track
    // Format matches the backend expectation: event_type + metadata
    if (!ENABLE_BACKEND_GENERIC_EVENTS) {
      if (__DEV__) {
        console.warn('⚠️ [AnalyticsRepo] Backend analytics DISABLED. Set EXPO_PUBLIC_ENABLE_BACKEND_ANALYTICS=true to enable.');
        console.warn('⚠️ [AnalyticsRepo] Skipping event:', event.event);
      }
      return;
    }
    
    if (__DEV__) {
      console.log('📤 [AnalyticsRepo] Sending to backend:', event.event);
    }
    
    try {
      const payload = {
        event_type: event.event,
        timestamp: event.timestamp || new Date().toISOString(),
        metadata: {
          ...event.properties,
          platform: Platform.OS,
        },
      };
      
      const res = await apiFetch('/api/v1/events/track', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        if (__DEV__) {
          console.log('✅ [AnalyticsRepo] Event sent successfully:', event.event);
        }
      } else {
        // Silently skip 401 errors - expected after logout
        if (res.status === 401) {
          return;
        }
        
        if (__DEV__) {
          // Get error body for debugging
          const errorBody = await res.text();
          console.error('❌ [AnalyticsRepo] Backend returned error:', {
            event: event.event,
            status: res.status,
            statusText: res.statusText,
            errorBody: errorBody
          });
        }
      }
    } catch (error) {
      // Swallow errors silently in production, log in dev
      if (__DEV__) {
        console.error('❌ [AnalyticsRepo] Network error:', {
          event: event.event,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  },

  /**
   * Get analytics summary
   */
  async getSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<AnalyticsSummary> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.start_date) queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);

      const url = `/api/analytics/summary${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiFetch(url, { requireAuth: true });

      if (!response.ok) {
        console.error('[AnalyticsRepo] Failed to fetch summary:', response.status);
        return this.getDefaultSummary();
      }

      const data = await response.json();
      return data.summary || data;
    } catch (error) {
      console.error('[AnalyticsRepo.getSummary] failed:', error);
      return this.getDefaultSummary();
    }
  },

  /**
   * Get trending topics
   */
  async getTrending(params?: {
    limit?: number;
    period?: '7d' | '30d' | '90d';
  }): Promise<TrendingTopic[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.period) queryParams.append('period', params.period);

      const url = `/api/trending/topics${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiFetch(url, { requireAuth: true });

      if (!response.ok) {
        console.error('[AnalyticsRepo] Failed to fetch trending:', response.status);
        return [];
      }

      const data = await response.json();
      return data.topics || data.items || [];
    } catch (error) {
      console.error('[AnalyticsRepo.getTrending] failed:', error);
      return [];
    }
  },

  /**
   * Advanced search across all entities
   */
  async search(params: {
    query: string;
    types?: Array<'contact' | 'message' | 'interaction' | 'note'>;
    limit?: number;
  }): Promise<SearchResult[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.query);
      if (params.types) params.types.forEach(t => queryParams.append('type', t));
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = `/api/v1/search?${queryParams.toString()}`;
      const response = await apiFetch(url, { requireAuth: true });

      if (!response.ok) {
        console.error('[AnalyticsRepo] Search failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.results || data.items || [];
    } catch (error) {
      console.error('[AnalyticsRepo.search] failed:', error);
      return [];
    }
  },

  /**
   * Performance monitoring
   */
  async reportPerformance(metrics: {
    screen: string;
    load_time_ms: number;
    api_calls?: number;
    errors?: string[];
  }): Promise<void> {
    try {
      await apiFetch('/api/telemetry/performance', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('[AnalyticsRepo] Failed to report performance:', error);
    }
  },

  /**
   * Default summary for offline mode
   */
  getDefaultSummary(): AnalyticsSummary {
    return {
      total_contacts: 0,
      total_messages: 0,
      total_interactions: 0,
      active_last_7_days: 0,
      active_last_30_days: 0,
      messages_sent_last_7_days: 0,
      messages_sent_last_30_days: 0,
      top_contacts: [],
      interaction_types: {},
    };
  },
};

/**
 * Analytics Repository (backend-only)
 */
export const AnalyticsRepo = {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[AnalyticsRepo] Event tracked (local only):', event.event);
      return;
    }
    return BackendAnalyticsRepo.trackEvent(event);
  },

  async getSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<AnalyticsSummary> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[AnalyticsRepo] Using mock summary (local only)');
      return BackendAnalyticsRepo.getDefaultSummary();
    }
    return BackendAnalyticsRepo.getSummary(params);
  },

  async getTrending(params?: {
    limit?: number;
    period?: '7d' | '30d' | '90d';
  }): Promise<TrendingTopic[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[AnalyticsRepo] Trending not available (local only)');
      return [];
    }
    return BackendAnalyticsRepo.getTrending(params);
  },

  async search(params: {
    query: string;
    types?: Array<'contact' | 'message' | 'interaction' | 'note'>;
    limit?: number;
  }): Promise<SearchResult[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[AnalyticsRepo] Advanced search not available (local only)');
      return [];
    }
    return BackendAnalyticsRepo.search(params);
  },

  async reportPerformance(metrics: {
    screen: string;
    load_time_ms: number;
    api_calls?: number;
    errors?: string[];
  }): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[AnalyticsRepo] Performance reported (local only):', metrics.screen);
      return;
    }
    return BackendAnalyticsRepo.reportPerformance(metrics);
  },
};

export default AnalyticsRepo;
