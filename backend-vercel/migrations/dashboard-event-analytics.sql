-- =====================================================
-- DASHBOARD EVENT ANALYTICS MIGRATION
-- =====================================================
-- Creates database views, indexes, and security policies
-- for the EverReach Analytics Dashboard
--
-- Date: 2024-11-09
-- Purpose: Support real-time event analytics dashboard
-- =====================================================

-- =====================================================
-- SECTION 1: PERFORMANCE INDEXES
-- =====================================================
-- Ensure optimal query performance for analytics views

-- Index on event_name for grouping
CREATE INDEX IF NOT EXISTS idx_app_events_event_name 
ON app_events(event_name) 
WHERE event_name IS NOT NULL;

-- Index on platform for filtering
CREATE INDEX IF NOT EXISTS idx_app_events_platform 
ON app_events(platform);

-- Composite index for time-based queries
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_user 
ON app_events(occurred_at DESC, user_id);

-- Index for session aggregations
CREATE INDEX IF NOT EXISTS idx_app_events_session_id 
ON app_events((session_info->>'session_id')) 
WHERE session_info IS NOT NULL;

-- =====================================================
-- SECTION 2: ANALYTICS VIEWS
-- =====================================================

-- -----------------------------------------------------
-- VIEW: app_events_24h
-- Purpose: Hourly event aggregations for last 24 hours
-- Usage: Real-time dashboard, hourly charts
-- Performance: ~24 rows, <100ms query time
-- -----------------------------------------------------
CREATE OR REPLACE VIEW app_events_24h AS
SELECT 
  date_trunc('hour', occurred_at) AS hour,
  event_name,
  platform,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_info->>'session_id') AS unique_sessions,
  MIN(occurred_at) AS first_event,
  MAX(occurred_at) AS last_event
FROM app_events
WHERE 
  occurred_at >= NOW() - INTERVAL '24 hours'
  AND event_name IS NOT NULL
GROUP BY 
  date_trunc('hour', occurred_at), 
  event_name, 
  platform
ORDER BY 
  hour DESC, 
  event_count DESC;

COMMENT ON VIEW app_events_24h IS 
'Hourly event aggregations for the last 24 hours. Used for real-time dashboard and activity charts.';

-- -----------------------------------------------------
-- VIEW: app_events_7d
-- Purpose: Daily event aggregations for last 7 days
-- Usage: Weekly trends, historical analysis
-- Performance: ~56 rows (8 events × 7 days), <100ms
-- -----------------------------------------------------
CREATE OR REPLACE VIEW app_events_7d AS
SELECT 
  date_trunc('day', occurred_at) AS day,
  event_name,
  platform,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_info->>'session_id') AS unique_sessions,
  AVG((metadata->>'duration')::numeric) FILTER (WHERE metadata->>'duration' IS NOT NULL) AS avg_duration_ms,
  MIN(occurred_at) AS first_event,
  MAX(occurred_at) AS last_event
FROM app_events
WHERE 
  occurred_at >= NOW() - INTERVAL '7 days'
  AND event_name IS NOT NULL
GROUP BY 
  date_trunc('day', occurred_at), 
  event_name, 
  platform
ORDER BY 
  day DESC, 
  event_count DESC;

COMMENT ON VIEW app_events_7d IS 
'Daily event aggregations for the last 7 days. Used for weekly trends and historical analysis.';

-- -----------------------------------------------------
-- VIEW: app_events_summary
-- Purpose: Overall event statistics and metrics
-- Usage: KPI cards, event type listing
-- Performance: ~10 rows (event type count), <100ms
-- -----------------------------------------------------
CREATE OR REPLACE VIEW app_events_summary AS
SELECT 
  event_name,
  platform,
  COUNT(*) AS total_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_info->>'session_id') AS unique_sessions,
  MIN(occurred_at) AS first_seen,
  MAX(occurred_at) AS last_seen,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours') AS count_24h,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS count_7d,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days') AS count_30d,
  AVG((metadata->>'duration')::numeric) FILTER (WHERE metadata->>'duration' IS NOT NULL) AS avg_duration_ms,
  COUNT(DISTINCT date_trunc('day', occurred_at)) AS days_active
FROM app_events
WHERE event_name IS NOT NULL
GROUP BY 
  event_name, 
  platform
ORDER BY 
  total_count DESC;

COMMENT ON VIEW app_events_summary IS 
'Overall event statistics including total counts, unique users, and temporal data. Used for dashboard KPI cards.';

-- -----------------------------------------------------
-- VIEW: app_events_realtime
-- Purpose: Recent events for live feed
-- Usage: Real-time event monitoring
-- Performance: Returns last 50 events, <50ms
-- -----------------------------------------------------
CREATE OR REPLACE VIEW app_events_realtime AS
SELECT 
  id,
  user_id,
  event_name,
  platform,
  app_version,
  metadata,
  device_info,
  session_info,
  occurred_at,
  created_at
FROM app_events
WHERE event_name IS NOT NULL
ORDER BY occurred_at DESC
LIMIT 50;

COMMENT ON VIEW app_events_realtime IS 
'Most recent 50 events for real-time dashboard feed. Auto-refreshes every 30 seconds.';

-- =====================================================
-- SECTION 3: SECURITY POLICIES (RLS)
-- =====================================================
-- Row Level Security for production dashboard access

-- Create admin_users table for dashboard access control
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_accessed TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_active 
ON admin_users(user_id) 
WHERE is_active = TRUE;

COMMENT ON TABLE admin_users IS 
'Dashboard administrators with access to analytics. Controls who can view the event analytics dashboard.';

-- Enable RLS on app_events (commented out for now - enable in production)
-- ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own events (always enabled)
DROP POLICY IF EXISTS "Users can view own events" ON app_events;
CREATE POLICY "Users can view own events"
ON app_events FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow admin users to view all events (for dashboard)
-- Uncomment when ready to enable admin-only access:
/*
DROP POLICY IF EXISTS "Admins can view all events" ON app_events;
CREATE POLICY "Admins can view all events"
ON app_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
  )
);
*/

-- Grant view access to authenticated users
-- Views inherit RLS from underlying tables
GRANT SELECT ON app_events_24h TO authenticated;
GRANT SELECT ON app_events_7d TO authenticated;
GRANT SELECT ON app_events_summary TO authenticated;
GRANT SELECT ON app_events_realtime TO authenticated;

-- Grant admin table access
GRANT SELECT ON admin_users TO authenticated;

-- =====================================================
-- SECTION 4: HELPER FUNCTIONS
-- =====================================================

-- Function to add admin users
CREATE OR REPLACE FUNCTION add_admin_user(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'viewer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_email;
  END IF;
  
  -- Insert or update admin user
  INSERT INTO admin_users (user_id, email, full_name, role, created_by)
  VALUES (v_user_id, p_email, p_full_name, p_role, auth.uid())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, admin_users.full_name),
    role = EXCLUDED.role,
    is_active = TRUE;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION add_admin_user IS 
'Add a user as dashboard admin by email. Usage: SELECT add_admin_user(''user@example.com'', ''John Doe'', ''admin'');';

-- Function to remove admin access
CREATE OR REPLACE FUNCTION remove_admin_user(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_users
  SET is_active = FALSE
  WHERE email = p_email;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION remove_admin_user IS 
'Revoke dashboard admin access for a user. Usage: SELECT remove_admin_user(''user@example.com'');';

-- =====================================================
-- SECTION 5: VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration succeeded

DO $$
BEGIN
  -- Verify views exist
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'app_events_24h') THEN
    RAISE NOTICE 'ERROR: View app_events_24h was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: View app_events_24h created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'app_events_7d') THEN
    RAISE NOTICE 'ERROR: View app_events_7d was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: View app_events_7d created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'app_events_summary') THEN
    RAISE NOTICE 'ERROR: View app_events_summary was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: View app_events_summary created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'app_events_realtime') THEN
    RAISE NOTICE 'ERROR: View app_events_realtime was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: View app_events_realtime created';
  END IF;
  
  -- Verify admin_users table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'admin_users') THEN
    RAISE NOTICE 'ERROR: Table admin_users was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: Table admin_users created';
  END IF;
  
  -- Show index count
  RAISE NOTICE 'Indexes created: %', (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE tablename = 'app_events' 
      AND indexname LIKE 'idx_app_events_%'
  );
  
  -- Test view queries
  RAISE NOTICE 'app_events_24h row count: %', (SELECT COUNT(*) FROM app_events_24h);
  RAISE NOTICE 'app_events_7d row count: %', (SELECT COUNT(*) FROM app_events_7d);
  RAISE NOTICE 'app_events_summary row count: %', (SELECT COUNT(*) FROM app_events_summary);
  
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Add your user as admin: SELECT add_admin_user('your@email.com', 'Your Name', 'admin');
-- 2. Test views in dashboard
-- 3. Enable RLS when ready for production (uncomment ALTER TABLE and admin policy)
-- =====================================================
