-- Fix TOCTOU race condition in compose usage quota enforcement.
-- Migration: fix_compose_usage_race_condition
--
-- Problem: can_use_compose() (read) and increment_compose_usage() (write)
-- were called as two separate RPCs with an OpenAI call in between. Two
-- concurrent requests near the monthly limit boundary could both read
-- compose_runs_used < compose_runs_limit before either of them incremented,
-- so both would proceed to the paid OpenAI call and both would succeed,
-- overrunning the cap. This adds an atomic reserve/release pair so the
-- check-and-increment happens in a single statement instead.

BEGIN;

-- Atomically check-and-increment compose_runs_used. The UPDATE's WHERE
-- clause re-evaluates the limit condition against the row under the
-- implicit row lock the UPDATE takes, so concurrent callers serialize on
-- this row instead of racing on a separate SELECT + application compare.
-- reserved=false (with no increment) means the limit is already reached.
CREATE OR REPLACE FUNCTION reserve_compose_usage(p_user_id UUID)
RETURNS TABLE(reserved BOOLEAN, period usage_periods) AS $$
DECLARE
  v_period usage_periods;
  v_updated usage_periods;
BEGIN
  -- Ensure a period row exists for this user/month (idempotent).
  v_period := get_or_create_usage_period(p_user_id);

  UPDATE usage_periods
  SET compose_runs_used = compose_runs_used + 1,
      updated_at = NOW()
  WHERE id = v_period.id
    AND (compose_runs_limit = -1 OR compose_runs_used < compose_runs_limit)
  RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RETURN QUERY SELECT FALSE, v_period;
  ELSE
    RETURN QUERY SELECT TRUE, v_updated;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compensating rollback for reserve_compose_usage: call this when the
-- reserved compose run did not actually complete (e.g. the OpenAI call
-- failed) so the user isn't charged quota for a generation they never got.
CREATE OR REPLACE FUNCTION release_compose_usage(p_user_id UUID)
RETURNS usage_periods AS $$
DECLARE
  v_period usage_periods;
BEGIN
  v_period := get_or_create_usage_period(p_user_id);

  UPDATE usage_periods
  SET compose_runs_used = GREATEST(0, compose_runs_used - 1),
      updated_at = NOW()
  WHERE id = v_period.id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reserve_compose_usage IS 'Atomically check-and-increment compose_runs_used in one statement; reserved=false (no increment) if the monthly limit is already reached. Fixes TOCTOU race between the old separate can_use_compose + increment_compose_usage calls.';
COMMENT ON FUNCTION release_compose_usage IS 'Compensating rollback for reserve_compose_usage when the reserved compose run does not complete (e.g. OpenAI call fails).';

COMMIT;
