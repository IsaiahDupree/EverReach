-- ============================================================================
-- SCREENSHOT ANALYSIS FIX
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"
-- ============================================================================

-- 1. Add key_phrases column if missing
ALTER TABLE screenshot_analysis 
ADD COLUMN IF NOT EXISTS key_phrases text[];

COMMENT ON COLUMN screenshot_analysis.key_phrases IS 'Extracted key phrases from the screenshot';

-- 2. Create can_use_screenshot_analysis function
CREATE OR REPLACE FUNCTION can_use_screenshot_analysis(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count int;
    v_limit int := 100;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM screenshots s
    INNER JOIN screenshot_analysis sa ON sa.screenshot_id = s.id
    WHERE s.user_id = p_user_id
      AND sa.status = 'analyzed'
      AND s.created_at >= date_trunc('month', now());
    
    RETURN v_count < v_limit;
END;
$$;

-- 3. Create increment_screenshot_usage function
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Placeholder for future usage tracking
    IF NOT EXISTS (
        SELECT 1 FROM screenshots
        WHERE user_id = p_user_id
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'User has no screenshots';
    END IF;
END;
$$;

-- 4. Create screenshot_analyses view (for backend compatibility)
-- Only create if it doesn't exist as a table
DO $$
BEGIN
    -- Check if screenshot_analyses exists as a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'screenshot_analyses' 
        AND table_type = 'BASE TABLE'
    ) THEN
        -- It's already a table, add key_phrases to it too
        ALTER TABLE screenshot_analyses 
        ADD COLUMN IF NOT EXISTS key_phrases text[];
        
        RAISE NOTICE 'screenshot_analyses already exists as a table';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'screenshot_analyses'
    ) THEN
        -- Create view
        CREATE VIEW screenshot_analyses AS
        SELECT * FROM screenshot_analysis;
        
        RAISE NOTICE 'Created screenshot_analyses view';
    END IF;
END $$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION can_use_screenshot_analysis(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_screenshot_usage(uuid) TO authenticated, service_role;
GRANT SELECT ON screenshot_analyses TO authenticated;
GRANT ALL ON screenshot_analyses TO service_role;

-- Done!
SELECT '✅ Screenshot analysis schema fixed!' as status;
