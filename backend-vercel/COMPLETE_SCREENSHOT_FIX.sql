-- ============================================================================
-- COMPLETE SCREENSHOT ANALYSIS FIX
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click "Run"
-- This fixes ALL screenshot-related errors in one go
-- ============================================================================

-- PART 1: Add missing columns
-- ============================================================================

-- Add key_phrases to screenshot_analysis (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screenshot_analysis') THEN
        ALTER TABLE screenshot_analysis ADD COLUMN IF NOT EXISTS key_phrases text[];
        COMMENT ON COLUMN screenshot_analysis.key_phrases IS 'Extracted key phrases';
    END IF;
END $$;

-- Add key_phrases to screenshot_analyses (if it exists as table)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'screenshot_analyses' 
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE screenshot_analyses ADD COLUMN IF NOT EXISTS key_phrases text[];
        ALTER TABLE screenshot_analyses ADD COLUMN IF NOT EXISTS processing_metadata jsonb DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN screenshot_analyses.key_phrases IS 'Extracted key phrases';
        COMMENT ON COLUMN screenshot_analyses.processing_metadata IS 'Processing metadata';
    END IF;
END $$;

-- PART 2: Create usage tracking table
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_usage_periods_user_period 
ON usage_periods(user_id, period_start DESC);

ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (no IF NOT EXISTS for policies)
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

-- PART 3: Create missing functions
-- ============================================================================

-- Function: can_use_screenshot_analysis
CREATE OR REPLACE FUNCTION can_use_screenshot_analysis(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count int;
    v_limit int := 100;
BEGIN
    -- Count screenshots this month
    SELECT COALESCE(screenshot_count, 0)
    INTO v_count
    FROM usage_periods
    WHERE user_id = p_user_id
      AND period_start = date_trunc('month', now());
    
    -- If no record, user hasn't used any
    IF NOT FOUND THEN
        v_count := 0;
    END IF;
    
    RETURN v_count < v_limit;
END;
$$;

-- Function: increment_screenshot_usage
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_start timestamptz;
BEGIN
    v_period_start := date_trunc('month', now());
    
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

-- Function: get_or_create_usage_period
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
    
    -- Return the record
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.period_start,
        up.period_end,
        up.screenshot_count,
        up.screenshot_limit,
        up.created_at,
        up.updated_at
    FROM usage_periods up
    WHERE up.user_id = p_user_id
      AND up.period_start = v_period_start;
END;
$$;

-- PART 4: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON usage_periods TO authenticated;
GRANT ALL ON usage_periods TO service_role;

GRANT EXECUTE ON FUNCTION can_use_screenshot_analysis(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_screenshot_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_or_create_usage_period(uuid) TO authenticated, service_role;

-- Grant on screenshot_analyses (whether table or view)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screenshot_analyses') THEN
        GRANT SELECT ON screenshot_analyses TO authenticated;
        GRANT ALL ON screenshot_analyses TO service_role;
    END IF;
END $$;

-- PART 5: Verification
-- ============================================================================

-- Check what we created
DO $$
DECLARE
    v_has_key_phrases boolean;
    v_has_processing_metadata boolean;
    v_has_usage_table boolean;
    v_has_functions boolean;
BEGIN
    -- Check columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name IN ('screenshot_analyses', 'screenshot_analysis')
        AND column_name = 'key_phrases'
    ) INTO v_has_key_phrases;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screenshot_analyses'
        AND column_name = 'processing_metadata'
    ) INTO v_has_processing_metadata;
    
    -- Check table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'usage_periods'
    ) INTO v_has_usage_table;
    
    -- Check functions
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname IN ('can_use_screenshot_analysis', 'increment_screenshot_usage', 'get_or_create_usage_period')
    ) INTO v_has_functions;
    
    -- Report
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Screenshot Analysis Fix - Verification';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'key_phrases column: %', CASE WHEN v_has_key_phrases THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'processing_metadata column: %', CASE WHEN v_has_processing_metadata THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'usage_periods table: %', CASE WHEN v_has_usage_table THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Required functions: %', CASE WHEN v_has_functions THEN '✅' ELSE '❌' END;
    RAISE NOTICE '========================================';
    
    IF v_has_key_phrases AND v_has_processing_metadata AND v_has_usage_table AND v_has_functions THEN
        RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    ELSE
        RAISE WARNING '⚠️  Some fixes may have failed. Check errors above.';
    END IF;
END $$;

-- Final success message
SELECT '✅ Complete screenshot analysis fix applied!' as status;
