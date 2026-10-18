-- Metrics Timeseries & Service Status Tables
-- Core infrastructure for growth metrics ingestion and serving

-- =============================================
-- 1. Metrics Timeseries (central metrics store)
-- =============================================
CREATE TABLE IF NOT EXISTS metrics_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metric identity
  metric_name TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  value NUMERIC NOT NULL,
  
  -- Labels for filtering/grouping (JSONB for flexibility)
  labels JSONB DEFAULT '{}',
  
  -- Optional workspace isolation
  workspace_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_metrics_timeseries_metric_ts ON metrics_timeseries(metric_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timeseries_ts ON metrics_timeseries(ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timeseries_labels ON metrics_timeseries USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_metrics_timeseries_workspace ON metrics_timeseries(workspace_id) WHERE workspace_id IS NOT NULL;

COMMENT ON TABLE metrics_timeseries IS 'Central metrics store for all growth/revenue/engagement metrics from webhooks and ETL jobs';
COMMENT ON COLUMN metrics_timeseries.metric_name IS 'Dot-separated metric name, e.g. stripe.mrr_usd, posthog.dau, superwall.paywall_view';
COMMENT ON COLUMN metrics_timeseries.labels IS 'JSONB labels for filtering: {product_id, platform, campaign, paywall_id, variant, etc.}';

-- =============================================
-- 2. Service Status (integration health monitoring)
-- =============================================
CREATE TABLE IF NOT EXISTS service_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service identity
  service TEXT NOT NULL UNIQUE,
  
  -- Health status
  status TEXT NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
  latency_ms INTEGER,
  
  -- Timestamps
  last_success TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Error details
  message TEXT,
  error_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_status_service ON service_status(service);
CREATE INDEX IF NOT EXISTS idx_service_status_status ON service_status(status);
CREATE INDEX IF NOT EXISTS idx_service_status_last_check ON service_status(last_check DESC);

COMMENT ON TABLE service_status IS 'Real-time health status for all integrations (Stripe, RevenueCat, Superwall, PostHog, etc.)';
COMMENT ON COLUMN service_status.service IS 'Service identifier, e.g. stripe, revenuecat, superwall, posthog, supabase_db';
COMMENT ON COLUMN service_status.latency_ms IS 'Last measured latency in milliseconds';

-- =============================================
-- 3. Webhook Log (idempotency and audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook identity (for idempotency)
  webhook_id TEXT NOT NULL UNIQUE,
  
  -- Provider and event details
  provider TEXT NOT NULL, -- 'stripe', 'revenuecat', 'superwall', 'resend'
  event_type TEXT NOT NULL,
  
  -- Payload
  payload JSONB,
  
  -- Processing
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'success', -- 'success', 'failed', 'skipped'
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_webhook_id ON webhook_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_provider ON webhook_log(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_log_processed ON webhook_log(processed_at DESC);

COMMENT ON TABLE webhook_log IS 'Idempotency log for all webhook events to prevent duplicate processing';
COMMENT ON COLUMN webhook_log.webhook_id IS 'Unique idempotency key composed of provider + event details + timestamp';

-- =============================================
-- 4. RLS Policies (if needed for multi-tenant)
-- =============================================
-- Note: metrics_timeseries may or may not need RLS depending on your auth setup
-- If you use workspace_id for isolation, uncomment below:

-- ALTER TABLE metrics_timeseries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY metrics_timeseries_workspace_isolation ON metrics_timeseries
--   USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE) OR workspace_id IS NULL);

-- Service status and webhook_log are typically service-only tables (no RLS needed)
