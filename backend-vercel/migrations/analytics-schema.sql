-- =====================================================
-- ANALYTICS SCHEMA (PostHog Mirror)
-- =====================================================
-- Privacy-safe analytics storage for product insights
-- Receives events from PostHog via Vercel webhook
-- Created: 2025-10-09
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE ingestion_source AS ENUM ('posthog', 'server', 'app');

-- =====================================================
-- 2. ANALYTICS USERS (Privacy-Safe User Mapping)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_users (
  anon_user_id TEXT PRIMARY KEY,              -- sha256(supabase_user_id)
  user_id UUID REFERENCES auth.users(id),     -- nullable; backfilled after login
  plan TEXT CHECK (plan IN ('free','core','pro')) DEFAULT 'free',
  locale TEXT,
  platform TEXT CHECK (platform IN ('ios','android','web')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_users_user_id ON analytics_users(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_users_plan ON analytics_users(plan);
CREATE INDEX IF NOT EXISTS idx_analytics_users_platform ON analytics_users(platform);

-- =====================================================
-- 3. SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY,
  anon_user_id TEXT NOT NULL REFERENCES analytics_users(anon_user_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  screens_viewed_count INT DEFAULT 0,
  actions_performed_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON analytics_sessions(anon_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics_sessions(started_at DESC);

-- =====================================================
-- 4. EVENTS (Core Analytics Store)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL,
  name TEXT NOT NULL,
  anon_user_id TEXT NOT NULL REFERENCES analytics_users(anon_user_id) ON DELETE CASCADE,
  session_id TEXT REFERENCES analytics_sessions(session_id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ingestion ingestion_source NOT NULL DEFAULT 'posthog',
  props JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_time ON analytics_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON analytics_events(name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON analytics_events(anon_user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_contact ON analytics_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_props_gin ON analytics_events USING GIN (props jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_events_user_name ON analytics_events(anon_user_id, name);

-- =====================================================
-- 5. MESSAGE GENERATION EVENTS (High-Value Domain)
-- =====================================================

CREATE TABLE IF NOT EXISTS message_generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anon_user_id TEXT NOT NULL REFERENCES analytics_users(anon_user_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  template_id UUID,
  channel TEXT CHECK (channel IN ('email','sms','dm','whatsapp','imessage','linkedin')),
  goal TEXT,
  from_screenshot BOOLEAN DEFAULT FALSE,
  latency_ms INT,
  token_count INT,
  success BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_msggen_user_time ON message_generation_events(anon_user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_msggen_channel ON message_generation_events(channel, ts DESC);
CREATE INDEX IF NOT EXISTS idx_msggen_contact ON message_generation_events(contact_id) WHERE contact_id IS NOT NULL;

-- =====================================================
-- 6. WARMTH SCORE HISTORY (Already exists, kept for reference)
-- =====================================================

-- This table may already exist from warmth alerts feature
CREATE TABLE IF NOT EXISTS warmth_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  from_score INT,
  to_score INT,
  delta INT GENERATED ALWAYS AS (COALESCE(to_score, 0) - COALESCE(from_score, 0)) STORED,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_warmth_contact_time ON warmth_score_history(contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_warmth_delta ON warmth_score_history(delta) WHERE delta != 0;

-- =====================================================
-- 7. FEATURE FLAG EXPOSURES
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flag_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL,
  anon_user_id TEXT NOT NULL REFERENCES analytics_users(anon_user_id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  variant TEXT,
  is_enabled BOOLEAN,
  event_id UUID REFERENCES analytics_events(event_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flag_exposures_flag_time ON feature_flag_exposures(flag_key, ts DESC);
CREATE INDEX IF NOT EXISTS idx_flag_exposures_user ON feature_flag_exposures(anon_user_id);
CREATE INDEX IF NOT EXISTS idx_flag_exposures_flag_variant ON feature_flag_exposures(flag_key, variant);

-- =====================================================
-- 8. EXPERIMENT ASSIGNMENTS (Sticky Bucketing)
-- =====================================================

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anon_user_id TEXT NOT NULL REFERENCES analytics_users(anon_user_id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL,
  variant TEXT NOT NULL,
  source TEXT DEFAULT 'posthog',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_exp_user_active
  ON experiment_assignments (experiment_key, anon_user_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_exp_key_variant ON experiment_assignments(experiment_key, variant);

-- =====================================================
-- 9. MATERIALIZED VIEWS
-- =====================================================

-- Daily Core Funnel: Signup → First Contact → First Message → First Send
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_core_funnel AS
WITH daily_events AS (
  SELECT 
    DATE_TRUNC('day', ts) AS d,
    name,
    COUNT(DISTINCT anon_user_id) AS users
  FROM analytics_events
  WHERE name IN ('Signed Up', 'Contact Created', 'Message Generated', 'Message Sent')
  GROUP BY 1, 2
)
SELECT 
  d,
  COALESCE(MAX(users) FILTER (WHERE name = 'Signed Up'), 0) AS signed_up,
  COALESCE(MAX(users) FILTER (WHERE name = 'Contact Created'), 0) AS created_contact,
  COALESCE(MAX(users) FILTER (WHERE name = 'Message Generated'), 0) AS generated_message,
  COALESCE(MAX(users) FILTER (WHERE name = 'Message Sent'), 0) AS sent_message
FROM daily_events
GROUP BY d
ORDER BY d DESC;

-- Weekly Retention Cohorts
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_retention AS
WITH first_seen AS (
  SELECT 
    anon_user_id,
    DATE_TRUNC('week', MIN(ts)) AS cohort_week
  FROM analytics_events
  GROUP BY 1
),
activity AS (
  SELECT 
    anon_user_id,
    DATE_TRUNC('week', ts) AS active_week
  FROM analytics_events
  GROUP BY 1, 2
)
SELECT 
  f.cohort_week,
  a.active_week,
  COUNT(DISTINCT a.anon_user_id) AS returning_users,
  ROUND(
    100.0 * COUNT(DISTINCT a.anon_user_id) / 
    COUNT(DISTINCT f.anon_user_id),
    2
  ) AS retention_pct
FROM first_seen f
JOIN activity a USING (anon_user_id)
GROUP BY f.cohort_week, a.active_week
ORDER BY f.cohort_week DESC, a.active_week DESC;

-- Feature Request Engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_feature_request_metrics AS
WITH submissions AS (
  SELECT 
    DATE_TRUNC('day', ts) AS d,
    COUNT(*) AS submit_count,
    COUNT(DISTINCT anon_user_id) AS submitters
  FROM analytics_events
  WHERE name = 'Feature Request Submitted'
  GROUP BY 1
),
votes AS (
  SELECT 
    DATE_TRUNC('day', ts) AS d,
    COUNT(*) AS vote_count,
    COUNT(DISTINCT anon_user_id) AS voters
  FROM analytics_events
  WHERE name = 'Feature Request Voted'
  GROUP BY 1
)
SELECT 
  COALESCE(s.d, v.d) AS day,
  COALESCE(s.submit_count, 0) AS submissions,
  COALESCE(s.submitters, 0) AS unique_submitters,
  COALESCE(v.vote_count, 0) AS votes,
  COALESCE(v.voters, 0) AS unique_voters
FROM submissions s
FULL OUTER JOIN votes v USING (d)
ORDER BY day DESC;

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_core_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_retention;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feature_request_metrics;
END;
$$ LANGUAGE plpgsql;

-- Backfill user_id from anon_user_id mapping
CREATE OR REPLACE FUNCTION backfill_analytics_user_ids()
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Update analytics_events
  WITH updated AS (
    UPDATE analytics_events e
    SET user_id = u.user_id
    FROM analytics_users u
    WHERE e.anon_user_id = u.anon_user_id
      AND e.user_id IS NULL
      AND u.user_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- All analytics tables are service-role only by default
ALTER TABLE analytics_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_generation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

-- Deny all by default (service role bypasses RLS)
CREATE POLICY deny_all_analytics_users ON analytics_users FOR ALL USING (FALSE);
CREATE POLICY deny_all_analytics_sessions ON analytics_sessions FOR ALL USING (FALSE);
CREATE POLICY deny_all_analytics_events ON analytics_events FOR ALL USING (FALSE);
CREATE POLICY deny_all_message_gen ON message_generation_events FOR ALL USING (FALSE);
CREATE POLICY deny_all_flag_exposures ON feature_flag_exposures FOR ALL USING (FALSE);
CREATE POLICY deny_all_experiments ON experiment_assignments FOR ALL USING (FALSE);

-- If you want to show aggregated analytics to users in the future:
-- CREATE POLICY view_own_analytics ON analytics_events 
--   FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 12. TRIGGERS
-- =====================================================

-- Auto-update last_seen_at for analytics_users
CREATE OR REPLACE FUNCTION update_analytics_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_users (anon_user_id, last_seen_at)
  VALUES (NEW.anon_user_id, NEW.ts)
  ON CONFLICT (anon_user_id)
  DO UPDATE SET last_seen_at = GREATEST(analytics_users.last_seen_at, NEW.ts);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_last_seen
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_user_last_seen();

-- =====================================================
-- DONE
-- =====================================================

-- Grant usage to service role (Vercel webhook uses this)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMENT ON TABLE analytics_events IS 'Privacy-safe event store mirrored from PostHog';
COMMENT ON TABLE analytics_users IS 'Anonymized user tracking (sha256 hashed IDs)';
COMMENT ON TABLE message_generation_events IS 'High-value domain events for message generation metrics';
COMMENT ON TABLE feature_flag_exposures IS 'Feature flag evaluation log for experimentation';
COMMENT ON TABLE experiment_assignments IS 'Sticky experiment bucketing assignments';
