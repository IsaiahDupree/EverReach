-- Fix Screenshot Analysis Schema
-- Adds missing functions and columns

-- 1. Add missing key_phrases column to screenshot_analysis table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screenshot_analysis' 
        AND column_name = 'key_phrases'
    ) THEN
        ALTER TABLE screenshot_analysis ADD COLUMN key_phrases text[];
        COMMENT ON COLUMN screenshot_analysis.key_phrases IS 'Extracted key phrases from the screenshot';
    END IF;
END $$;

-- 2. Create can_use_screenshot_analysis function
CREATE OR REPLACE FUNCTION can_use_screenshot_analysis(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count int;
    v_limit int := 100; -- Default limit per month
BEGIN
    -- Count screenshots analyzed this month
    SELECT COUNT(*)
    INTO v_count
    FROM screenshots s
    INNER JOIN screenshot_analysis sa ON sa.screenshot_id = s.id
    WHERE s.user_id = p_user_id
      AND sa.status = 'analyzed'
      AND s.created_at >= date_trunc('month', now());
    
    -- Check if under limit
    RETURN v_count < v_limit;
END;
$$;

COMMENT ON FUNCTION can_use_screenshot_analysis IS 'Check if user can analyze more screenshots this month';

-- 3. Create increment_screenshot_usage function
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function is called after successful screenshot analysis
    -- Currently just a placeholder for future usage tracking
    -- Could update a usage_stats table if needed
    
    -- For now, just ensure the screenshot exists
    IF NOT EXISTS (
        SELECT 1 FROM screenshots
        WHERE user_id = p_user_id
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'User has no screenshots';
    END IF;
END;
$$;

COMMENT ON FUNCTION increment_screenshot_usage IS 'Track screenshot analysis usage (placeholder for future stats)';

-- 4. Just add key_phrases to existing table (don't rename)
-- The backend expects 'screenshot_analyses' but we'll keep 'screenshot_analysis'
-- and create a view for compatibility

-- Create view if table name mismatch
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'screenshot_analysis'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'screenshot_analyses'
    ) THEN
        -- Create a view for backward compatibility
        CREATE OR REPLACE VIEW screenshot_analyses AS
        SELECT * FROM screenshot_analysis;
        
        RAISE NOTICE 'Created screenshot_analyses view';
    END IF;
END $$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION can_use_screenshot_analysis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_screenshot_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_use_screenshot_analysis(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_screenshot_usage(uuid) TO service_role;

-- 6. Grant permissions on view (views inherit base table RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'screenshot_analyses') THEN
        -- Grant permissions on the view
        GRANT SELECT ON screenshot_analyses TO authenticated;
        GRANT ALL ON screenshot_analyses TO service_role;
        
        RAISE NOTICE 'Granted permissions on screenshot_analyses view';
    END IF;
END $$;

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Screenshot analysis schema fixed:';
    RAISE NOTICE '  • Added key_phrases column';
    RAISE NOTICE '  • Created can_use_screenshot_analysis function';
    RAISE NOTICE '  • Created increment_screenshot_usage function';
    RAISE NOTICE '  • Updated table name to screenshot_analyses (if needed)';
    RAISE NOTICE '  • Updated RLS policies';
END $$;
