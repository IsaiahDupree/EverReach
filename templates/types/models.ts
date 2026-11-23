/**
 * PulseLense - Data Models
 *
 * Core entities: Dashboard, Metric, Alert
 * Shared infrastructure: User, Subscription, Entitlement, SubscriptionEvent
 */

// ============================================
// PULSELENSE: Dashboard entity
// ============================================
export interface Dashboard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  is_default: boolean;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export type DashboardLayout = 'grid' | 'list' | 'compact';

export interface CreateDashboardInput {
  name: string;
  description?: string;
  layout?: DashboardLayout;
  is_default?: boolean;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  is_default?: boolean;
  status?: 'active' | 'archived';
}

// ============================================
// PULSELENSE: Metric entity
// ============================================
export type MetricType = 'count' | 'sum' | 'average' | 'rate' | 'gauge' | 'percentage';
export type MetricPeriod = '1h' | '6h' | '24h' | '7d' | '30d' | '90d';

export interface Metric {
  id: string;
  user_id: string;
  dashboard_id: string;
  name: string;
  description?: string;
  metric_type: MetricType;
  source: string;
  value: number;
  previous_value?: number;
  unit?: string;
  period: MetricPeriod;
  threshold_warning?: number;
  threshold_critical?: number;
  is_visible: boolean;
  sort_order: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMetricInput {
  dashboard_id: string;
  name: string;
  description?: string;
  metric_type: MetricType;
  source: string;
  unit?: string;
  period?: MetricPeriod;
  threshold_warning?: number;
  threshold_critical?: number;
}

export interface UpdateMetricInput {
  name?: string;
  description?: string;
  metric_type?: MetricType;
  source?: string;
  unit?: string;
  period?: MetricPeriod;
  threshold_warning?: number;
  threshold_critical?: number;
  is_visible?: boolean;
  sort_order?: number;
}

// ============================================
// PULSELENSE: Alert entity
// ============================================
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type AlertCondition = 'above' | 'below' | 'equals' | 'change_pct';

export interface Alert {
  id: string;
  user_id: string;
  metric_id: string;
  dashboard_id: string;
  name: string;
  description?: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  triggered_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  notification_channels: NotificationChannel[];
  created_at: string;
  updated_at: string;
}

export type NotificationChannel = 'push' | 'email' | 'sms' | 'webhook';

export interface CreateAlertInput {
  metric_id: string;
  dashboard_id: string;
  name: string;
  description?: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  notification_channels?: NotificationChannel[];
}

export interface UpdateAlertInput {
  name?: string;
  description?: string;
  condition?: AlertCondition;
  threshold?: number;
  severity?: AlertSeverity;
  notification_channels?: NotificationChannel[];
}

// ============================================
// KEEP: User model (works with Supabase Auth)
// ============================================
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'core' | 'pro' | 'team';
  subscription_status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  created_at: string;
}

// ============================================
// KEEP: Subscription model
// ============================================
export interface Subscription {
  id: string;
  user_id: string;
  product_id?: string;
  store: 'app_store' | 'play' | 'stripe';
  store_account_id?: string;
  status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  started_at?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  updated_at: string;
}

// ============================================
// KEEP: Entitlements model (derived from subscriptions)
// ============================================
export interface Entitlement {
  user_id: string;
  plan: 'free' | 'core' | 'pro' | 'team';
  valid_until?: string;
  source: 'app_store' | 'play' | 'stripe' | 'manual' | 'revenuecat';
  subscription_id?: string;
  updated_at: string;
}

// ============================================
// KEEP: Subscription events audit log
// ============================================
export interface SubscriptionEvent {
  id: string;
  user_id?: string;
  event_type: string;
  product_id?: string;
  store?: 'app_store' | 'play' | 'stripe';
  environment?: string;
  period_type?: string;
  plan?: string;
  status?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  revenue?: number;
  currency?: string;
  entitlement_ids?: string[];
  is_trial_conversion?: boolean;
  occurred_at?: string;
  created_at: string;
}

// ============================================
// KEEP: API Response types
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
