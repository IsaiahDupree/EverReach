// MetaCoach Integration Types for Everreach Dashboard

export interface MetaHealthResponse {
  service: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latency_ms: number;
  timestamp: string;
  details: {
    authenticated: boolean;
    token_valid: boolean;
    rate_limit?: {
      calls_used: number;
      total_calls: number;
      calls_remaining: number;
      percentage_used: number;
    };
  };
}

export interface MetaMetricsResponse {
  period: {
    from: string;
    to: string;
  };
  organic: {
    posts: number;
    reach: number;
    engagement: number;
    engagement_rate: number;
  };
  ai_analysis: {
    analyzed_posts: number;
    avg_hook_score: number;
    avg_thumbnail_score: number;
    avg_overall_score: number;
  };
  ads?: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    roas: number;
    cpm: number;
    cpc: number;
    ctr: number;
  };
  metrics: Array<{
    date: string;
    posts: number;
    reach: number;
    engagement: number;
  }>;
}

export type TimeRange = '24h' | '7d' | '30d';

export interface MetaDataCache {
  health: MetaHealthResponse | null;
  metrics: MetaMetricsResponse | null;
  lastUpdated: number;
}
