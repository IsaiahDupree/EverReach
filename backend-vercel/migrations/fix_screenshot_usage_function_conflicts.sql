-- Reconcile conflicting duplicate usage-enforcement functions.
-- Migration: fix_screenshot_usage_function_conflicts
--
-- Problem: get_or_create_usage_period(uuid), can_use_screenshot_analysis(uuid),
-- and increment_screenshot_usage(uuid) were each defined multiple times across
-- unordered, hand-applied scratch files, targeting three incompatible schemas:
--   1. migrations/subscription-tiers-and-usage-limits.sql
--        -> RETURNS user_usage_limits (columns: screenshots_used/screenshots_limit)
--   2. migrations/fix_screenshot_analysis.sql, APPLY_THIS_IN_SUPABASE.sql
--        -> can_use_screenshot_analysis: hardcoded COUNT(*) over
--           screenshots/screenshot_analysis, ignoring subscription_tier and
--           usage_periods entirely; increment_screenshot_usage: a no-op stub
--           ("placeholder for future usage tracking")
--   3. APPLY_THIS_NEXT.sql, FINAL_FIX.sql, COMPLETE_SCREENSHOT_FIX.sql
--        -> get_or_create_usage_period RETURNS TABLE(...) with differently
--           named/shaped columns (including a renamed period_screenshot_count
--           variant in FINAL_FIX.sql), and a hardcoded v_limit/screenshot_limit
--           of 100 that ignores the real tier-based limit.
--
-- Because CREATE OR REPLACE FUNCTION replaces the single (name, arg-types)
-- slot in place, whichever of these files was applied last on the live DB
-- silently won -- and NONE of them match the schema lib/usage-limits.ts and
-- migrations/add_compose_and_voice_usage_limits.sql actually rely on: a
-- get_or_create_usage_period(uuid) that RETURNS the usage_periods composite
-- row (screenshot_count/screenshot_limit/compose_runs_*/voice_minutes_*),
-- tier-aware, the same pattern already used correctly for
-- can_use_compose/increment_compose_usage in that file.
--
-- This migration is idempotent and is the single source of truth going
-- forward: it force-drops whichever conflicting version currently occupies
-- each function slot and reinstalls the versions that match the app code,
-- mirroring the existing can_use_compose/increment_compose_usage pattern.
-- The user_usage_limits/tier_limits_reference tables and the COUNT(*)-based
-- checks above are dead ends -- grep confirms no application code reads them.

BEGIN;

-- Defensive: ensure usage_periods has the full canonical column set even if
-- only an earlier, partial version of the table exists (or none at all).
CREATE TABLE IF NOT EXISTS usage_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    screenshot_count INT DEFAULT 0 NOT NULL,
    screenshot_limit INT DEFAULT 100 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, period_start)
);

ALTER TABLE usage_periods
  ADD COLUMN IF NOT EXISTS compose_runs_used INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS compose_runs_limit INT DEFAULT -1 NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_minutes_used NUMERIC(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_minutes_limit NUMERIC(10,2) DEFAULT -1 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usage_periods_user_period
  ON usage_periods(user_id, period_start DESC);

ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own usage" ON usage_periods;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view own usage"
    ON usage_periods FOR SELECT
    USING (auth.uid() = user_id);

DO $$
BEGIN
    DROP POLICY IF EXISTS "Service can manage usage" ON usage_periods;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service can manage usage"
    ON usage_periods FOR ALL
    USING (true);

-- Force-clear whatever conflicting definition currently occupies each slot
-- (CREATE OR REPLACE cannot change an existing function's return type
-- in place, so an explicit DROP is required to guarantee convergence
-- regardless of which of the files above was applied last).
DROP FUNCTION IF EXISTS get_or_create_usage_period(UUID);
DROP FUNCTION IF EXISTS can_use_screenshot_analysis(UUID);
DROP FUNCTION IF EXISTS increment_screenshot_usage(UUID);

-- Canonical get_or_create_usage_period: tier-aware, returns the full
-- usage_periods row. Identical to the version in
-- add_compose_and_voice_usage_limits.sql -- reinstalled here so this file
-- alone is sufficient to converge the schema no matter what is currently
-- live.
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
  v_period_start := date_trunc('month', NOW());
  v_period_end := (v_period_start + INTERVAL '1 month') - INTERVAL '1 second';

  SELECT * INTO v_period
  FROM usage_periods
  WHERE user_id = p_user_id
    AND period_start = v_period_start
  LIMIT 1;

  IF v_period.id IS NULL THEN
    SELECT subscription_tier INTO v_tier
    FROM profiles
    WHERE user_id = p_user_id;

    v_tier := COALESCE(v_tier, 'core');

    CASE v_tier
      WHEN 'core' THEN
        v_screenshot_limit := 100;
        v_compose_limit := 50;
        v_voice_limit := 30.0;
      WHEN 'pro' THEN
        v_screenshot_limit := 300;
        v_compose_limit := 200;
        v_voice_limit := 120.0;
      WHEN 'enterprise' THEN
        v_screenshot_limit := -1;
        v_compose_limit := -1;
        v_voice_limit := -1;
      ELSE
        v_screenshot_limit := 100;
        v_compose_limit := 50;
        v_voice_limit := 30.0;
    END CASE;

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

-- Canonical can_use_screenshot_analysis: checks the real, tier-based
-- screenshot_limit on the usage_periods row (not a hardcoded constant, and
-- not a different table), mirroring can_use_compose's pattern.
CREATE OR REPLACE FUNCTION can_use_screenshot_analysis(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_period usage_periods;
BEGIN
  v_period := get_or_create_usage_period(p_user_id);

  IF v_period.screenshot_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN v_period.screenshot_count < v_period.screenshot_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Canonical increment_screenshot_usage: actually increments
-- usage_periods.screenshot_count (the prior fix_screenshot_analysis.sql
-- version was a no-op placeholder) and returns the updated row, mirroring
-- increment_compose_usage's pattern and matching what
-- lib/usage-limits.ts's incrementScreenshotUsage() casts to UsageLimits.
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id UUID)
RETURNS usage_periods AS $$
DECLARE
  v_period usage_periods;
BEGIN
  v_period := get_or_create_usage_period(p_user_id);

  UPDATE usage_periods
  SET screenshot_count = screenshot_count + 1,
      updated_at = NOW()
  WHERE id = v_period.id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_usage_period(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_use_screenshot_analysis(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_screenshot_usage(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION get_or_create_usage_period IS 'Canonical, tier-aware usage_periods accessor. Reinstalled by fix_screenshot_usage_function_conflicts.sql to override any stale version from subscription-tiers-and-usage-limits.sql / APPLY_THIS_NEXT.sql / FINAL_FIX.sql / COMPLETE_SCREENSHOT_FIX.sql.';
COMMENT ON FUNCTION can_use_screenshot_analysis IS 'Check if user can analyze more screenshots this month, against the real tier-based usage_periods.screenshot_limit. Reinstalled by fix_screenshot_usage_function_conflicts.sql to override the hardcoded-limit / no-op / wrong-table versions in earlier scratch files.';
COMMENT ON FUNCTION increment_screenshot_usage IS 'Increment usage_periods.screenshot_count and return the updated row. Reinstalled by fix_screenshot_usage_function_conflicts.sql to override the no-op placeholder in fix_screenshot_analysis.sql / APPLY_THIS_IN_SUPABASE.sql.';

COMMIT;
