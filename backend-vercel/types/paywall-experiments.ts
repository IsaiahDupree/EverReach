/**
 * TypeScript types for Paywall Experiments & Analytics
 */

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'archived';
export type Environment = 'production' | 'staging';
export type Platform = 'ios' | 'android' | 'web' | 'all';

export interface PaywallExperiment {
  id: string;
  name: string;
  description?: string;
  strategy_id: string;
  presentation_id: string;
  trial_type_id: string;
  platform: Platform;
  target_countries?: string[];
  target_cohorts?: string[];
  acquisition_channels?: string[];
  start_date: string;
  end_date?: string;
  status: ExperimentStatus;
  environment: Environment;
  created_by?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface PaywallConfigChange {
  id: string;
  change_type: 'strategy' | 'presentation' | 'trial' | 'review_timing' | 'full_config';
  platform: string;
  old_config: Record<string, any>;
  new_config: Record<string, any>;
  experiment_id?: string;
  changed_by?: string;
  changed_at: string;
  environment: Environment;
  notes?: string;
  summary_old: string;
  summary_new: string;
}

export type AnalyticsEventType =
  | 'paywall_impression'
  | 'paywall_cta_click'
  | 'paywall_dismissed'
  | 'paywall_skipped'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'subscription_activated'
  | 'trial_started'
  | 'trial_ended'
  | 'trial_converted'
  | 'review_prompt_shown'
  | 'review_prompt_interacted'
  | 'review_prompt_snoozed'
  | 'review_prompt_dismissed';

export interface PaywallAnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  user_id?: string;
  session_id?: string;
  anonymous_id?: string;
  platform: string;
  country_code?: string;
  acquisition_channel?: string;
  user_cohort?: string;
  config_snapshot: Record<string, any>;
  experiment_id?: string;
  metadata?: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

export interface ConversionFunnel {
  experiment_id: string;
  platform: string;
  event_date: string;
  impressions: number;
  cta_clicks: number;
  checkouts_started: number;
  subscriptions: number;
  dismissals: number;
  skips: number;
  conversion_rate: number;
  checkout_drop_off_rate: number;
}

export interface ReviewPromptPerformance {
  platform: string;
  event_date: string;
  strategy?: string;
  impressions: number;
  interactions: number;
  snoozed: number;
  dismissed: number;
  engagement_rate: number;
}

export interface ExperimentResults {
  experiment_id: string;
  name: string;
  strategy_id: string;
  presentation_id: string;
  trial_type_id: string;
  platform: Platform;
  status: ExperimentStatus;
  start_date: string;
  end_date?: string;
  total_impressions: number;
  total_subscriptions: number;
  avg_conversion_rate: number;
  avg_drop_off_rate: number;
  first_event_date?: string;
  last_event_date?: string;
}

// API Request/Response Types

export interface CreateExperimentRequest {
  name: string;
  description?: string;
  strategy_id: string;
  presentation_id: string;
  trial_type_id: string;
  platform: Platform;
  target_countries?: string[];
  target_cohorts?: string[];
  acquisition_channels?: string[];
  start_date: string;
  end_date?: string;
  environment: Environment;
  notes?: string;
}

export interface TrackEventRequest {
  event_type: AnalyticsEventType;
  user_id?: string;
  platform: string;
  config_snapshot: Record<string, any>;
  experiment_id?: string;
  metadata?: Record<string, any>;
  session_id?: string;
  country_code?: string;
  acquisition_channel?: string;
  user_cohort?: string;
}

export interface ExperimentsListResponse {
  experiments: ExperimentResults[];
  total: number;
}

export interface ConfigChangesListResponse {
  changes: PaywallConfigChange[];
  total: number;
}

export interface ReviewPromptStatsResponse {
  summary: {
    total_impressions: number;
    total_interactions: number;
    total_snoozed: number;
    total_dismissed: number;
    avg_engagement_rate: number;
  };
  by_platform: ReviewPromptPerformance[];
  by_strategy: ReviewPromptPerformance[];
}

export interface ExperimentDetailResponse {
  experiment: PaywallExperiment;
  funnel: ConversionFunnel[];
  timeline: {
    date: string;
    impressions: number;
    subscriptions: number;
    conversion_rate: number;
  }[];
  segments: {
    platform?: Record<string, any>;
    country?: Record<string, any>;
    cohort?: Record<string, any>;
  };
}

export interface DashboardKPIs {
  current_strategy: {
    strategy_id: string;
    strategy_name: string;
    presentation_id: string;
    presentation_name: string;
    trial_id: string;
    trial_name: string;
  };
  last_change: {
    changed_at: string;
    changed_by: string;
    summary: string;
  };
  last_7_days: {
    conversion_rate: number;
    delta_conversion: number;
    arpu_delta: number;
    mrr_delta: number;
  };
  review_prompts: {
    success_rate: number;
    total_shown: number;
  };
}
