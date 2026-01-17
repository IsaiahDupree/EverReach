-- ============================================================================
-- FINAL SCREENSHOT FIX - Run this to fix all remaining errors
-- ============================================================================

-- 1. Add missing columns and fix constraints
ALTER TABLE screenshot_analyses 
ADD COLUMN IF NOT EXISTS sentiment text,
ADD COLUMN IF NOT EXISTS suggested_template_type text,
ADD COLUMN IF NOT EXISTS urgency text;

-- Make file_url nullable (it's set after initial creation)
ALTER TABLE screenshot_analyses 
ALTER COLUMN file_url DROP NOT NULL;

COMMENT ON COLUMN screenshot_analyses.sentiment IS 'Sentiment analysis result (positive, negative, neutral)';
COMMENT ON COLUMN screenshot_analyses.suggested_template_type IS 'Suggested message template type based on screenshot content';
COMMENT ON COLUMN screenshot_analyses.urgency IS 'Urgency level (low, medium, high, urgent)';

-- 2. Fix get_or_create_usage_period function (remove ambiguous user_id)
-- Drop existing function first
DROP FUNCTION IF EXISTS get_or_create_usage_period(uuid);

CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id uuid)
RETURNS TABLE (
    period_id uuid,
    period_user_id uuid,
    period_start_ts timestamptz,
    period_end_ts timestamptz,
    period_screenshot_count int,
    period_screenshot_limit int,
    period_created_at timestamptz,
    period_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_start timestamptz;
    v_period_end timestamptz;
BEGIN
    v_period_start := date_trunc('month', now());
    v_period_end := v_period_start + interval '1 month';
    
    -- Insert if not exists
    INSERT INTO usage_periods (
        user_id,
        period_start,
        period_end,
        screenshot_count,
        screenshot_limit
    ) VALUES (
        p_user_id,
        v_period_start,
        v_period_end,
        0,
        100
    )
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    -- Return the record (with renamed columns to avoid ambiguity)
    RETURN QUERY
    SELECT 
        up.id as period_id,
        up.user_id as period_user_id,
        up.period_start as period_start_ts,
        up.period_end as period_end_ts,
        up.screenshot_count as period_screenshot_count,
        up.screenshot_limit as period_screenshot_limit,
        up.created_at as period_created_at,
        up.updated_at as period_updated_at
    FROM usage_periods up
    WHERE up.user_id = p_user_id
      AND up.period_start = v_period_start;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_usage_period(uuid) TO authenticated, service_role;

-- Success
SELECT '✅ Final fixes applied: sentiment column + fixed ambiguous user_id' as status;
