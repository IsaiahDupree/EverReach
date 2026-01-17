-- Analytics Events Mirror
-- Mirrors critical PostHog events to Supabase for product analytics joins

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- APP EVENTS TABLE
-- ============================================================================

-- Store critical analytics events for product joins
CREATE TABLE IF NOT EXISTS app_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID,
  anonymous_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB NOT NULL DEFAULT '{}',
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_app_events_event_name 
  ON app_events(event_name);

CREATE INDEX IF NOT EXISTS idx_app_events_user_id 
  ON app_events(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at 
  ON app_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_event_time 
  ON app_events(event_name, occurred_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_app_events_properties 
  ON app_events USING GIN (properties);

CREATE INDEX IF NOT EXISTS idx_app_events_context 
  ON app_events USING GIN (context);

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily event summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_event_summary AS
SELECT
  DATE(occurred_at) as date,
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT anonymous_id) as unique_anonymous,
  context->>'platform' as platform,
  context->>'plan_tier' as plan_tier
FROM app_events
GROUP BY DATE(occurred_at), event_name, context->>'platform', context->>'plan_tier'
ORDER BY date DESC, event_count DESC;

CREATE UNIQUE INDEX ON mv_daily_event_summary(date, event_name, platform, plan_tier);

-- User activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT
  user_id,
  DATE(occurred_at) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT event_name) as unique_events,
  MIN(occurred_at) as first_event_at,
  MAX(occurred_at) as last_event_at,
  ARRAY_AGG(DISTINCT event_name) as events
FROM app_events
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE(occurred_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_user_activity_summary(user_id, date);

-- Conversion funnel (example)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_conversion_funnel AS
WITH user_events AS (
  SELECT DISTINCT
    user_id,
    event_name,
    MIN(occurred_at) as first_occurred_at
  FROM app_events
  WHERE user_id IS NOT NULL
  GROUP BY user_id, event_name
)
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'user_signed_up' THEN user_id END) as signed_up,
  COUNT(DISTINCT CASE WHEN event_name = 'contact_created' THEN user_id END) as created_contact,
  COUNT(DISTINCT CASE WHEN event_name = 'interaction_logged' THEN user_id END) as logged_interaction,
  COUNT(DISTINCT CASE WHEN event_name = 'message_sent' THEN user_id END) as sent_message,
  COUNT(DISTINCT CASE WHEN event_name = 'checkout_completed' THEN user_id END) as completed_checkout,
  DATE_TRUNC('day', first_occurred_at) as cohort_date
FROM user_events
GROUP BY DATE_TRUNC('day', first_occurred_at)
ORDER BY cohort_date DESC;

CREATE UNIQUE INDEX ON mv_conversion_funnel(cohort_date);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh all analytics views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_event_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversion_funnel;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old events (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_app_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM app_events
  WHERE occurred_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get event count by category
CREATE OR REPLACE FUNCTION get_event_count_by_category(
  p_start_date DATE DEFAULT CURRENT_DATE - 7,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category TEXT,
  event_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN event_name LIKE 'user_%' OR event_name LIKE '%auth%' THEN 'auth'
      WHEN event_name LIKE 'onboarding_%' THEN 'onboarding'
      WHEN event_name LIKE 'contact_%' THEN 'contacts'
      WHEN event_name LIKE 'interaction_%' THEN 'interactions'
      WHEN event_name LIKE 'message_%' THEN 'messages'
      WHEN event_name LIKE 'warmth_%' THEN 'warmth'
      WHEN event_name LIKE 'ai_%' THEN 'ai'
      WHEN event_name LIKE 'screenshot_%' THEN 'screenshots'
      WHEN event_name LIKE '%plan%' OR event_name LIKE '%checkout%' OR event_name LIKE '%subscription%' THEN 'monetization'
      WHEN event_name LIKE 'app_%' OR event_name LIKE '%session%' THEN 'lifecycle'
      ELSE 'other'
    END as category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM app_events
  WHERE occurred_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY category
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own events
CREATE POLICY user_events_select ON app_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR 
    auth.jwt()->>'role' = 'admin'
  );

-- Policy: Service role can insert
CREATE POLICY service_events_insert ON app_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE app_events IS 'Mirror of critical PostHog events for product analytics joins';
COMMENT ON COLUMN app_events.event_name IS 'Name of the analytics event';
COMMENT ON COLUMN app_events.user_id IS 'Authenticated user ID (links to auth.users)';
COMMENT ON COLUMN app_events.anonymous_id IS 'Anonymous user ID for pre-auth tracking';
COMMENT ON COLUMN app_events.context IS 'Event context (platform, version, etc)';
COMMENT ON COLUMN app_events.properties IS 'Event-specific properties';

COMMIT;
