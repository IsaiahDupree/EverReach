-- ============================================================================
-- ADDITIONAL SCREENSHOT FIXES
-- Run this after the first migration
-- ============================================================================

-- 1. Add processing_metadata column to screenshot_analyses
ALTER TABLE screenshot_analyses 
ADD COLUMN IF NOT EXISTS processing_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN screenshot_analyses.processing_metadata IS 'Metadata about the analysis processing (timing, model used, etc)';

-- 2. Create get_or_create_usage_period function
CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    period_start timestamptz,
    period_end timestamptz,
    screenshot_count int,
    screenshot_limit int,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_usage_record RECORD;
BEGIN
    -- Calculate current period (monthly)
    v_period_start := date_trunc('month', now());
    v_period_end := v_period_start + interval '1 month';
    
    -- Try to get existing usage period
    SELECT * INTO v_usage_record
    FROM usage_periods
    WHERE usage_periods.user_id = p_user_id
      AND usage_periods.period_start = v_period_start
    LIMIT 1;
    
    -- If not found, create it
    IF NOT FOUND THEN
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
            100  -- Default limit
        )
        RETURNING * INTO v_usage_record;
    END IF;
    
    -- Return the record
    RETURN QUERY
    SELECT 
        v_usage_record.id,
        v_usage_record.user_id,
        v_usage_record.period_start,
        v_usage_record.period_end,
        v_usage_record.screenshot_count,
        v_usage_record.screenshot_limit,
        v_usage_record.created_at,
        v_usage_record.updated_at;
END;
$$;

-- 3. Create usage_periods table if it doesn't exist
CREATE TABLE IF NOT EXISTS usage_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    screenshot_count int DEFAULT 0,
    screenshot_limit int DEFAULT 100,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, period_start)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_usage_periods_user_period 
ON usage_periods(user_id, period_start DESC);

-- Enable RLS
ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own usage
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own usage" ON usage_periods;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view own usage"
    ON usage_periods FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service can manage usage" ON usage_periods;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service can manage usage"
    ON usage_periods FOR ALL
    USING (true);

-- 4. Update increment_screenshot_usage to actually increment
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_start timestamptz;
BEGIN
    v_period_start := date_trunc('month', now());
    
    -- Insert or update usage count
    INSERT INTO usage_periods (
        user_id,
        period_start,
        period_end,
        screenshot_count,
        screenshot_limit
    ) VALUES (
        p_user_id,
        v_period_start,
        v_period_start + interval '1 month',
        1,
        100
    )
    ON CONFLICT (user_id, period_start)
    DO UPDATE SET
        screenshot_count = usage_periods.screenshot_count + 1,
        updated_at = now();
END;
$$;

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE ON usage_periods TO authenticated;
GRANT ALL ON usage_periods TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_usage_period(uuid) TO authenticated, service_role;

-- Done!
SELECT '✅ Additional screenshot fixes applied!' as status;
