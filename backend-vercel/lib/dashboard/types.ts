/**
 * Developer Dashboard - Core Types
 * Type definitions for service adapters, metrics, and dashboard components
 */

// ============================================================================
// Service Status Types
// ============================================================================

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export interface ServiceHealth {
  service: string;
  status: ServiceStatus;
  latency_ms: number | null;
  last_success: string | null; // ISO timestamp
  last_check: string; // ISO timestamp
  message?: string;
  error_details?: Record<string, any>;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface MetricPoint {
  ts: string; // ISO timestamp
  value: number;
}

export interface MetricQuery {
  metric_name: string;
  from: string; // ISO timestamp or relative ('now-7d')
  to: string; // ISO timestamp or relative ('now')
  interval?: string; // '1h', '1d', '1w'
  agg?: 'sum' | 'avg' | 'min' | 'max' | 'p50' | 'p95' | 'p99';
  labels?: Record<string, string>; // Filter by labels
}

export interface MetricResult {
  metric_name: string;
  points: MetricPoint[];
  labels?: Record<string, string>;
}

// ============================================================================
// Integration Account Types
// ============================================================================

export interface IntegrationAccount {
  id: string;
  workspace_id: string;
  service: string;
  auth_json: Record<string, any>; // Decrypted credentials
  scopes: string[];
  last_refresh: string | null;
  is_active: boolean;
}

// ============================================================================
// Service Adapter Interface
// ============================================================================

export interface ServiceAdapter {
  /**
   * Service identifier (e.g., 'stripe', 'revenuecat')
   */
  readonly service: string;

  /**
   * Fetch current health status
   */
  fetchHealth(account: IntegrationAccount): Promise<ServiceHealth>;

  /**
   * Fetch metrics for a time range
   */
  fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]>;

  /**
   * Subscribe to webhooks (optional)
   */
  subscribeWebhooks?(account: IntegrationAccount): Promise<void>;

  /**
   * Test credentials
   */
  testCredentials?(account: IntegrationAccount): Promise<boolean>;
}

// ============================================================================
// Dashboard Widget Types
// ============================================================================

export type WidgetKind = 'kpi' | 'timeseries' | 'status' | 'table' | 'funnel';
export type ChartRenderer = 'stat' | 'line' | 'bar' | 'area' | 'pie' | 'grid' | 'table';

export interface WidgetConfig {
  id: string;
  title: string;
  kind: WidgetKind;
  query: MetricQuery | null;
  renderer: ChartRenderer;
  refresh_interval?: number; // seconds
  options?: Record<string, any>; // Renderer-specific options
}

export interface GridLayout {
  i: string; // widget id
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean; // disable drag/resize
}

export interface Dashboard {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  layout: GridLayout[];
  widgets: WidgetConfig[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertChannel = 'slack' | 'email' | 'sms' | 'webhook';
export type AlertStatus = 'active' | 'snoozed' | 'resolved' | 'disabled';
export type AlertPredicate = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';

export interface Alert {
  id: string;
  workspace_id: string;
  name: string;
  metric_name: string;
  predicate: AlertPredicate;
  threshold: number;
  window_seconds: number;
  channels: AlertChannel[];
  notification_config: Record<string, any>;
  status: AlertStatus;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AlertTrigger {
  id: string;
  alert_id: string;
  workspace_id: string;
  metric_value: number;
  threshold: number;
  message: string;
  notified_channels: AlertChannel[];
  resolved_at: string | null;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface HealthCheckRequest {
  services?: string[]; // If empty, check all
}

export interface HealthCheckResponse {
  workspace_id: string;
  results: ServiceHealth[];
}

export interface MetricsQueryRequest {
  queries: MetricQuery[];
}

export interface MetricsQueryResponse {
  results: MetricResult[];
}

export interface SaveDashboardRequest {
  name?: string;
  layout: GridLayout[];
  widgets: WidgetConfig[];
  is_default?: boolean;
}

export interface SaveDashboardResponse {
  id: string;
  message: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface Event {
  id: string;
  workspace_id: string;
  event_name: string;
  ts: string;
  user_id?: string;
  session_id?: string;
  props: Record<string, any>;
  source: string; // 'posthog', 'app_tracking', 'custom'
  created_at: string;
}

// ============================================================================
// Service-Specific Metric Names
// ============================================================================

export const MetricNames = {
  // Stripe
  STRIPE_MRR: 'stripe.mrr_usd',
  STRIPE_ARR: 'stripe.arr_usd',
  STRIPE_NEW_TRIALS: 'stripe.new_trials',
  STRIPE_CHURN_RATE: 'stripe.churn_rate',
  STRIPE_FAILED_PAYMENTS: 'stripe.failed_payments',
  STRIPE_REVENUE_TODAY: 'stripe.revenue_today',

  // RevenueCat
  REVENUECAT_ACTIVE_SUBS: 'revenuecat.active_subs',
  REVENUECAT_TRIAL_CONVERSIONS: 'revenuecat.trial_conversions',
  REVENUECAT_RENEWALS: 'revenuecat.renewals',
  REVENUECAT_CANCELLATIONS: 'revenuecat.cancellations',

  // PostHog
  POSTHOG_DAU: 'posthog.dau',
  POSTHOG_WAU: 'posthog.wau',
  POSTHOG_MAU: 'posthog.mau',
  POSTHOG_FEATURE_USAGE: 'posthog.feature_usage',
  POSTHOG_TIME_IN_APP_AVG: 'posthog.time_in_app_avg',

  // Supabase
  SUPABASE_DB_LATENCY: 'supabase.db_latency_ms',
  SUPABASE_AUTH_SIGNINS: 'supabase.auth_signins',
  SUPABASE_STORAGE_OPS: 'supabase.storage_ops',
  SUPABASE_EDGE_ERRORS: 'supabase.edge_errors',

  // Backend API
  BACKEND_UPTIME: 'backend.uptime_percent',
  BACKEND_LATENCY_P50: 'backend.latency_p50',
  BACKEND_LATENCY_P95: 'backend.latency_p95',
  BACKEND_ERROR_RATE: 'backend.error_rate',
  BACKEND_QUEUE_DEPTH: 'backend.queue_depth',

  // OpenAI
  OPENAI_TOKENS_IN: 'openai.tokens_in',
  OPENAI_TOKENS_OUT: 'openai.tokens_out',
  OPENAI_COST_USD: 'openai.cost_usd',

  // Twilio
  TWILIO_SMS_SENT: 'twilio.sms_sent',
  TWILIO_SMS_DELIVERED: 'twilio.sms_delivered',
  TWILIO_SMS_FAILED: 'twilio.sms_failed',
  TWILIO_COST_USD: 'twilio.cost_usd',

  // Resend
  RESEND_SENT: 'resend.sent',
  RESEND_DELIVERED: 'resend.delivered',
  RESEND_OPENED: 'resend.opened',
  RESEND_CLICKED: 'resend.clicked',
  RESEND_BOUNCED: 'resend.bounced',
  RESEND_SPAM: 'resend.spam',

  // Superwall
  SUPERWALL_VIEWS: 'superwall.paywall_views',
  SUPERWALL_CONVERSIONS: 'superwall.conversions',
  SUPERWALL_CONVERSION_RATE: 'superwall.conversion_rate',

  // Meta
  META_AD_SPEND: 'meta.ad_spend_usd',
  META_ROAS: 'meta.roas',
  META_CTR: 'meta.ctr',
  META_CPA: 'meta.cpa',
  META_IG_ENGAGEMENT: 'meta.ig_engagement',

  // App Stores
  APP_STORE_INSTALLS: 'app_store.installs',
  APP_STORE_CRASHES: 'app_store.crashes',
  APP_STORE_RATING: 'app_store.rating_avg',
  PLAY_STORE_INSTALLS: 'play_store.installs',
  PLAY_STORE_CRASHES: 'play_store.crashes',
  PLAY_STORE_RATING: 'play_store.rating_avg',
} as const;

export type MetricName = typeof MetricNames[keyof typeof MetricNames];
