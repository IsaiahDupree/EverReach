-- Developer Dashboard - Core Schema Migration
-- Created: November 2, 2025
-- Purpose: Enable hot-swappable monitoring dashboard for all service integrations

-- ============================================================================
-- Integration Credentials (Encrypted)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  service text NOT NULL, -- 'stripe', 'revenuecat', 'posthog', etc.
  auth_json jsonb NOT NULL, -- Encrypted credentials
  scopes text[] DEFAULT '{}', -- API scopes/permissions
  last_refresh timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, service)
);

CREATE INDEX IF NOT EXISTS idx_integration_accounts_workspace ON integration_accounts(workspace_id, service);
CREATE INDEX IF NOT EXISTS idx_integration_accounts_active ON integration_accounts(workspace_id) WHERE is_active = true;

COMMENT ON TABLE integration_accounts IS 'Encrypted credentials for third-party service integrations';
COMMENT ON COLUMN integration_accounts.auth_json IS 'Encrypted JSON containing API keys, tokens, etc.';

-- ============================================================================
-- Service Health Status
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE service_status_enum AS ENUM ('UP', 'DEGRADED', 'DOWN', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS service_status (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  service text NOT NULL,
  status service_status_enum DEFAULT 'UNKNOWN',
  latency_ms integer,
  last_success timestamptz,
  last_check timestamptz DEFAULT now(),
  message text,
  error_details jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, service)
);

CREATE INDEX IF NOT EXISTS idx_service_status_workspace ON service_status(workspace_id, service);
CREATE INDEX IF NOT EXISTS idx_service_status_updated ON service_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_status_down ON service_status(workspace_id) WHERE status IN ('DOWN', 'DEGRADED');

COMMENT ON TABLE service_status IS 'Real-time health status for integrated services';
COMMENT ON COLUMN service_status.latency_ms IS 'Response time in milliseconds for last check';

-- ============================================================================
-- Metrics Time-Series
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_timeseries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_name text NOT NULL, -- 'stripe.mrr_usd', 'posthog.dau', etc.
  ts timestamptz NOT NULL,
  value numeric(20, 4) NOT NULL,
  labels jsonb DEFAULT '{}', -- { plan: 'pro', feature: 'ai_composer' }
  created_at timestamptz DEFAULT now()
);

-- Hypertable-ready partitioning by time (for TimescaleDB if needed)
CREATE INDEX IF NOT EXISTS idx_metrics_ts_workspace_name_time ON metrics_timeseries(workspace_id, metric_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_ts_labels ON metrics_timeseries USING gin(labels);
CREATE INDEX IF NOT EXISTS idx_metrics_ts_time_only ON metrics_timeseries(ts DESC);

COMMENT ON TABLE metrics_timeseries IS 'Time-series metrics from all integrated services';
COMMENT ON COLUMN metrics_timeseries.labels IS 'JSONB labels for filtering (plan, feature, user_id, etc.)';

-- ============================================================================
-- Dashboard Layouts
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text DEFAULT 'My Dashboard',
  layout jsonb NOT NULL DEFAULT '[]', -- React-grid-layout format
  widgets jsonb NOT NULL DEFAULT '[]', -- Widget configurations
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboards_workspace_user ON dashboards(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_default ON dashboards(workspace_id, user_id) WHERE is_default = true;

COMMENT ON TABLE dashboards IS 'User-customizable dashboard layouts and widget configurations';
COMMENT ON COLUMN dashboards.layout IS 'Grid layout positions (x, y, w, h) for each widget';
COMMENT ON COLUMN dashboards.widgets IS 'Array of widget configs with queries and renderers';

-- ============================================================================
-- Events Ingest (Cross-Provider Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events_ingest (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  ts timestamptz DEFAULT now(),
  user_id uuid,
  session_id text,
  props jsonb DEFAULT '{}',
  source text, -- 'posthog', 'app_tracking', 'custom'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_ingest_workspace_name ON events_ingest(workspace_id, event_name, ts DESC);
CREATE INDEX idx_events_ingest_user ON events_ingest(user_id, ts DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_ingest_session ON events_ingest(session_id, ts DESC) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_ingest_props ON events_ingest USING gin(props);

COMMENT ON TABLE events_ingest IS 'Unified event stream from all analytics providers';

-- ============================================================================
-- Alerts (Phase 2)
-- ============================================================================

CREATE TYPE alert_channel_enum AS ENUM ('slack', 'email', 'sms', 'webhook');
CREATE TYPE alert_status_enum AS ENUM ('active', 'snoozed', 'resolved', 'disabled');

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric_name text NOT NULL,
  predicate text NOT NULL, -- 'gt', 'lt', 'eq', 'gte', 'lte'
  threshold numeric(20, 4) NOT NULL,
  window_seconds integer DEFAULT 300, -- Check window (5 min default)
  channels alert_channel_enum[] DEFAULT '{email}',
  notification_config jsonb DEFAULT '{}', -- { slack_webhook: '...', emails: [...] }
  status alert_status_enum DEFAULT 'active',
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_alerts_workspace ON alerts(workspace_id);
CREATE INDEX idx_alerts_active ON alerts(workspace_id, status) WHERE status = 'active';
CREATE INDEX idx_alerts_metric ON alerts(workspace_id, metric_name);

COMMENT ON TABLE alerts IS 'Threshold-based alerts for metrics monitoring';

-- ============================================================================
-- Alert History
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_value numeric(20, 4) NOT NULL,
  threshold numeric(20, 4) NOT NULL,
  message text,
  notified_channels alert_channel_enum[],
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_alert_history_alert ON alert_history(alert_id, created_at DESC);
CREATE INDEX idx_alert_history_workspace ON alert_history(workspace_id, created_at DESC);
CREATE INDEX idx_alert_history_unresolved ON alert_history(alert_id) WHERE resolved_at IS NULL;

COMMENT ON TABLE alert_history IS 'Historical log of alert triggers and resolutions';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get service health summary
CREATE OR REPLACE FUNCTION get_service_health_summary(p_workspace_id uuid)
RETURNS TABLE(
  total_services integer,
  up_count integer,
  degraded_count integer,
  down_count integer,
  unknown_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer AS total_services,
    SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END)::integer AS up_count,
    SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END)::integer AS degraded_count,
    SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END)::integer AS down_count,
    SUM(CASE WHEN status = 'UNKNOWN' THEN 1 ELSE 0 END)::integer AS unknown_count
  FROM service_status
  WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Query metrics with aggregation
CREATE OR REPLACE FUNCTION query_metrics(
  p_workspace_id uuid,
  p_metric_name text,
  p_from timestamptz,
  p_to timestamptz,
  p_interval text DEFAULT '1h',
  p_agg text DEFAULT 'avg',
  p_labels jsonb DEFAULT '{}'
)
RETURNS TABLE(
  bucket timestamptz,
  value numeric
) AS $$
DECLARE
  v_interval interval;
BEGIN
  -- Convert interval string to interval type
  v_interval := p_interval::interval;
  
  -- Build query based on aggregation type
  IF p_agg = 'sum' THEN
    RETURN QUERY
    SELECT
      time_bucket(v_interval, ts) AS bucket,
      SUM(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSIF p_agg = 'max' THEN
    RETURN QUERY
    SELECT
      time_bucket(v_interval, ts) AS bucket,
      MAX(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSIF p_agg = 'min' THEN
    RETURN QUERY
    SELECT
      time_bucket(v_interval, ts) AS bucket,
      MIN(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSE -- Default to avg
    RETURN QUERY
    SELECT
      time_bucket(v_interval, ts) AS bucket,
      AVG(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Note: time_bucket requires TimescaleDB extension
-- For standard Postgres, use date_trunc:
CREATE OR REPLACE FUNCTION query_metrics_simple(
  p_workspace_id uuid,
  p_metric_name text,
  p_from timestamptz,
  p_to timestamptz,
  p_interval text DEFAULT 'hour',
  p_agg text DEFAULT 'avg',
  p_labels jsonb DEFAULT '{}'
)
RETURNS TABLE(
  bucket timestamptz,
  value numeric
) AS $$
BEGIN
  IF p_agg = 'sum' THEN
    RETURN QUERY
    SELECT
      date_trunc(p_interval, ts) AS bucket,
      SUM(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSIF p_agg = 'max' THEN
    RETURN QUERY
    SELECT
      date_trunc(p_interval, ts) AS bucket,
      MAX(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSIF p_agg = 'min' THEN
    RETURN QUERY
    SELECT
      date_trunc(p_interval, ts) AS bucket,
      MIN(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  ELSE -- Default to avg
    RETURN QUERY
    SELECT
      date_trunc(p_interval, ts) AS bucket,
      AVG(value) AS value
    FROM metrics_timeseries
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND ts >= p_from
      AND ts <= p_to
      AND (p_labels = '{}'::jsonb OR labels @> p_labels)
    GROUP BY bucket
    ORDER BY bucket;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_ingest ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Integration accounts: Users can only access their workspace's integrations
CREATE POLICY integration_accounts_workspace_isolation ON integration_accounts
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Service status: Users can only see their workspace's service status
CREATE POLICY service_status_workspace_isolation ON service_status
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Metrics: Users can only query their workspace's metrics
CREATE POLICY metrics_timeseries_workspace_isolation ON metrics_timeseries
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Dashboards: Users can only access their own dashboards
CREATE POLICY dashboards_user_isolation ON dashboards
  USING (user_id = auth.uid());

-- Events: Users can only see their workspace's events
CREATE POLICY events_ingest_workspace_isolation ON events_ingest
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Alerts: Users can only access their workspace's alerts
CREATE POLICY alerts_workspace_isolation ON alerts
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Alert history: Users can only see their workspace's alert history
CREATE POLICY alert_history_workspace_isolation ON alert_history
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at on integration_accounts
CREATE OR REPLACE FUNCTION update_integration_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_accounts_updated_at
  BEFORE UPDATE ON integration_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_accounts_updated_at();

-- Update updated_at on service_status
CREATE OR REPLACE FUNCTION update_service_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_status_updated_at
  BEFORE UPDATE ON service_status
  FOR EACH ROW
  EXECUTE FUNCTION update_service_status_updated_at();

-- Update updated_at on dashboards
CREATE OR REPLACE FUNCTION update_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboards_updated_at();

-- Update updated_at on alerts
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alerts_updated_at();

-- ============================================================================
-- Default Data
-- ============================================================================

-- Insert default dashboard for existing users (optional)
-- This can be run separately or commented out

-- ============================================================================
-- Cleanup Functions
-- ============================================================================

-- Clean up old metrics (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_metrics(p_retention_days integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM metrics_timeseries
  WHERE ts < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Clean up old events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_events(p_retention_days integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM events_ingest
  WHERE ts < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_metrics IS 'Delete metrics older than retention period (default 90 days)';
COMMENT ON FUNCTION cleanup_old_events IS 'Delete events older than retention period (default 90 days)';
