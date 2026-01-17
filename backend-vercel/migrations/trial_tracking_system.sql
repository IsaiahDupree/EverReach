/**
 * Trial Tracking & Session System Migration
 * 
 * Implements comprehensive trial tracking with:
 * - Session capture (start/end with duration)
 * - Enhanced subscription tracking (trial windows, origin)
 * - First/last seen tracking
 * - Usage calculation helpers
 * 
 * This gives us single source of truth for entitlement + accurate trial usage
 */

-- ============================================================================
-- 1. USER SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
         THEN GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at)))::INT
         ELSE NULL END
  ) STORED
);

COMMENT ON TABLE user_sessions IS 'Tracks user session start/end times for usage analytics and trial limits';
COMMENT ON COLUMN user_sessions.duration_seconds IS 'Auto-computed duration in seconds when session ends';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_time 
  ON user_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_ended 
  ON user_sessions (user_id, ended_at) 
  WHERE ended_at IS NOT NULL;

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to sessions"
  ON user_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 2. AUGMENT USER_SUBSCRIPTIONS TABLE
-- ============================================================================

-- Add trial tracking and origin fields
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS origin TEXT CHECK (origin IN ('stripe','app_store','play','manual')) DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_subscriptions.origin IS 'Subscription source: stripe | app_store | play | manual';
COMMENT ON COLUMN user_subscriptions.trial_started_at IS 'When trial period started';
COMMENT ON COLUMN user_subscriptions.trial_ends_at IS 'When trial period ends';
COMMENT ON COLUMN user_subscriptions.subscribed_at IS 'Canonical "member since" date - when user first subscribed';
COMMENT ON COLUMN user_subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';

-- Backfill subscribed_at from existing data
UPDATE user_subscriptions
SET subscribed_at = COALESCE(subscribed_at, purchased_at, created_at)
WHERE subscribed_at IS NULL;

-- Add index for trial queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial 
  ON user_subscriptions (user_id, trial_started_at, trial_ends_at) 
  WHERE trial_started_at IS NOT NULL;

-- ============================================================================
-- 3. AUGMENT PROFILES TABLE
-- ============================================================================

-- Add first/last seen tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.first_seen_at IS 'First time user was seen in the app';
COMMENT ON COLUMN profiles.last_active_at IS 'Most recent activity timestamp';

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_activity 
  ON profiles (user_id, last_active_at DESC);

-- ============================================================================
-- 4. USAGE CALCULATION HELPERS
-- ============================================================================

-- Function: Calculate usage seconds between two timestamps
CREATE OR REPLACE FUNCTION usage_seconds_between(
  p_user UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS INT 
LANGUAGE SQL 
STABLE AS $$
  SELECT COALESCE(SUM(
    GREATEST(0, EXTRACT(EPOCH FROM (
      LEAST(COALESCE(ended_at, NOW()), p_to) - GREATEST(started_at, p_from)
    )))::INT
  ), 0)
  FROM user_sessions
  WHERE user_id = p_user
    AND started_at < p_to
    AND COALESCE(ended_at, NOW()) > p_from;
$$;

COMMENT ON FUNCTION usage_seconds_between IS 'Calculate total usage seconds for a user within a time window';

-- Function: End session (idempotent & user-scoped)
CREATE OR REPLACE FUNCTION end_session_secure(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS VOID 
LANGUAGE PLPGSQL AS $$
BEGIN
  UPDATE user_sessions
  SET ended_at = COALESCE(ended_at, NOW())
  WHERE id = p_session_id
    AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION end_session_secure IS 'Safely end a session (idempotent, user-scoped)';

-- Function: Get active sessions count for a user
CREATE OR REPLACE FUNCTION get_active_sessions_count(p_user_id UUID)
RETURNS INT 
LANGUAGE SQL 
STABLE AS $$
  SELECT COUNT(*)::INT
  FROM user_sessions
  WHERE user_id = p_user_id
    AND ended_at IS NULL;
$$;

-- Function: Get total session count for a user
CREATE OR REPLACE FUNCTION get_total_sessions_count(p_user_id UUID)
RETURNS INT 
LANGUAGE SQL 
STABLE AS $$
  SELECT COUNT(*)::INT
  FROM user_sessions
  WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- 5. AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Trigger: Update last_active_at when session starts
CREATE OR REPLACE FUNCTION update_last_active_on_session()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = NEW.started_at
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_active
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active_on_session();

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  sessions_exists BOOLEAN;
  origin_exists BOOLEAN;
  first_seen_exists BOOLEAN;
BEGIN
  -- Check user_sessions table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_sessions'
  ) INTO sessions_exists;
  
  -- Check origin column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_subscriptions' 
      AND column_name = 'origin'
  ) INTO origin_exists;
  
  -- Check first_seen_at column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'first_seen_at'
  ) INTO first_seen_exists;
  
  IF sessions_exists AND origin_exists AND first_seen_exists THEN
    RAISE NOTICE '✅ Trial tracking system migration successful!';
    RAISE NOTICE '   - user_sessions table created';
    RAISE NOTICE '   - user_subscriptions augmented (origin, trial fields)';
    RAISE NOTICE '   - profiles augmented (first_seen_at, last_active_at)';
    RAISE NOTICE '   - Helper functions created';
  ELSE
    RAISE WARNING '❌ Migration verification failed';
    RAISE WARNING '   sessions_exists: %', sessions_exists;
    RAISE WARNING '   origin_exists: %', origin_exists;
    RAISE WARNING '   first_seen_exists: %', first_seen_exists;
  END IF;
END $$;

-- Show summary
SELECT 
  'user_sessions' AS table_name,
  COUNT(*) AS row_count
FROM user_sessions
UNION ALL
SELECT 
  'subscriptions_with_trial',
  COUNT(*)
FROM user_subscriptions
WHERE trial_started_at IS NOT NULL;
