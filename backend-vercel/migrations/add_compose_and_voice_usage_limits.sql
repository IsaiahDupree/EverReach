-- Add compose_runs and voice_minutes tracking to usage_periods table
-- Migration: add_compose_and_voice_usage_limits
-- Date: Applied via Supabase MCP

BEGIN;

-- Add columns to usage_periods table
ALTER TABLE usage_periods
  ADD COLUMN IF NOT EXISTS compose_runs_used INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS compose_runs_limit INT DEFAULT -1 NOT NULL, -- -1 = unlimited
  ADD COLUMN IF NOT EXISTS voice_minutes_used NUMERIC(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_minutes_limit NUMERIC(10,2) DEFAULT -1 NOT NULL; -- -1 = unlimited

-- Drop and recreate get_or_create_usage_period to include new limits
DROP FUNCTION IF EXISTS get_or_create_usage_period(UUID);

CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id UUID)
RETURNS usage_periods AS $$
DECLARE
  v_period usage_periods;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_tier TEXT;
  v_screenshot_limit INT;
  v_compose_limit INT;
  v_voice_limit NUMERIC;
BEGIN
  -- Calculate current month period
  v_period_start := date_trunc('month', NOW());
  v_period_end := (v_period_start + INTERVAL '1 month') - INTERVAL '1 second';
  
  -- Try to get existing period
  SELECT * INTO v_period
  FROM usage_periods
  WHERE user_id = p_user_id
    AND period_start = v_period_start
  LIMIT 1;
  
  -- If not found, create new period
  IF v_period.id IS NULL THEN
    -- Get user's tier
    SELECT subscription_tier INTO v_tier
    FROM profiles
    WHERE user_id = p_user_id;
    
    -- Default to 'core' if no tier found
    v_tier := COALESCE(v_tier, 'core');
    
    -- Set limits based on tier
    CASE v_tier
      WHEN 'core' THEN
        v_screenshot_limit := 100;
        v_compose_limit := 50;  -- Core: 50 compose runs/month
        v_voice_limit := 30.0;  -- Core: 30 minutes/month
      WHEN 'pro' THEN
        v_screenshot_limit := 300;
        v_compose_limit := 200; -- Pro: 200 compose runs/month
        v_voice_limit := 120.0; -- Pro: 120 minutes/month
      WHEN 'enterprise' THEN
        v_screenshot_limit := -1; -- unlimited
        v_compose_limit := -1;    -- unlimited
        v_voice_limit := -1;      -- unlimited
      ELSE
        v_screenshot_limit := 100;
        v_compose_limit := 50;
        v_voice_limit := 30.0;
    END CASE;
    
    -- Insert new period
    INSERT INTO usage_periods (
      user_id,
      period_start,
      period_end,
      screenshot_limit,
      screenshot_count,
      compose_runs_limit,
      compose_runs_used,
      voice_minutes_limit,
      voice_minutes_used
    ) VALUES (
      p_user_id,
      v_period_start,
      v_period_end,
      v_screenshot_limit,
      0,
      v_compose_limit,
      0,
      v_voice_limit,
      0
    )
    RETURNING * INTO v_period;
  END IF;
  
  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use compose (message generation)
CREATE OR REPLACE FUNCTION can_use_compose(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_period usage_periods;
BEGIN
  v_period := get_or_create_usage_period(p_user_id);
  
  -- -1 means unlimited
  IF v_period.compose_runs_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN v_period.compose_runs_used < v_period.compose_runs_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment compose usage
CREATE OR REPLACE FUNCTION increment_compose_usage(p_user_id UUID)
RETURNS usage_periods AS $$
DECLARE
  v_period usage_periods;
BEGIN
  -- Get or create current period
  v_period := get_or_create_usage_period(p_user_id);
  
  -- Increment usage
  UPDATE usage_periods
  SET compose_runs_used = compose_runs_used + 1,
      updated_at = NOW()
  WHERE id = v_period.id
  RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use voice transcription
CREATE OR REPLACE FUNCTION can_use_voice_transcription(p_user_id UUID, p_minutes NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  v_period usage_periods;
BEGIN
  v_period := get_or_create_usage_period(p_user_id);
  
  -- -1 means unlimited
  IF v_period.voice_minutes_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if adding these minutes would exceed limit
  RETURN (v_period.voice_minutes_used + p_minutes) <= v_period.voice_minutes_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment voice transcription usage
CREATE OR REPLACE FUNCTION increment_voice_transcription_usage(p_user_id UUID, p_minutes NUMERIC)
RETURNS usage_periods AS $$
DECLARE
  v_period usage_periods;
BEGIN
  -- Get or create current period
  v_period := get_or_create_usage_period(p_user_id);
  
  -- Increment usage
  UPDATE usage_periods
  SET voice_minutes_used = voice_minutes_used + p_minutes,
      updated_at = NOW()
  WHERE id = v_period.id
  RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_use_compose IS 'Check if user can generate more messages this month';
COMMENT ON FUNCTION increment_compose_usage IS 'Increment message generation usage counter';
COMMENT ON FUNCTION can_use_voice_transcription IS 'Check if user has enough voice transcription minutes remaining';
COMMENT ON FUNCTION increment_voice_transcription_usage IS 'Increment voice transcription minutes used';

COMMIT;




