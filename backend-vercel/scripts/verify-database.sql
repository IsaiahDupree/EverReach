-- ============================================================================
-- Database Verification Script
-- ============================================================================
-- Run this in Supabase SQL Editor to verify all migrations are installed
-- https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '🔍 Starting Database Verification...';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Test 1: Core Tables (Required)
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    required_tables TEXT[] := ARRAY[
        'organizations', 'users', 'organization_memberships',
        'people', 'interactions', 'voice_notes', 
        'relationship_scores', 'tasks', 'pipelines'
    ];
    missing_tables TEXT := '';
    t TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(required_tables);
    
    -- Check for missing tables
    FOREACH t IN ARRAY required_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            missing_tables := missing_tables || t || ', ';
        END IF;
    END LOOP;
    
    IF table_count >= 9 THEN
        RAISE NOTICE '✅ Core tables: % / % installed', table_count, array_length(required_tables, 1);
    ELSE
        RAISE WARNING '❌ Core tables: Only % / % installed', table_count, array_length(required_tables, 1);
        IF missing_tables != '' THEN
            RAISE WARNING '   Missing: %', trim(trailing ', ' from missing_tables);
        END IF;
        RAISE EXCEPTION '   → Run: supabase-future-schema.sql';
    END IF;
END $$;

-- ============================================================================
-- Test 2: API Tables (Required)
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    api_tables TEXT[] := ARRAY[
        'api_keys', 'api_rate_limits', 'api_audit_logs',
        'webhooks', 'webhook_deliveries', 'automation_rules',
        'outbox', 'segments'
    ];
    missing_tables TEXT := '';
    t TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(api_tables);
    
    -- Check for missing tables
    FOREACH t IN ARRAY api_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            missing_tables := missing_tables || t || ', ';
        END IF;
    END LOOP;
    
    IF table_count >= 8 THEN
        RAISE NOTICE '✅ API tables: % / % installed', table_count, array_length(api_tables, 1);
    ELSE
        RAISE WARNING '❌ API tables: Only % / % installed', table_count, array_length(api_tables, 1);
        IF missing_tables != '' THEN
            RAISE WARNING '   Missing: %', trim(trailing ', ' from missing_tables);
        END IF;
        RAISE EXCEPTION '   → Run: migrations/public-api-system.sql';
    END IF;
END $$;

-- ============================================================================
-- Test 3: Extensions (Required)
-- ============================================================================

DO $$
DECLARE
    ext_count INTEGER;
    required_exts TEXT[] := ARRAY['uuid-ossp', 'pgcrypto', 'vector'];
    missing_exts TEXT := '';
    e TEXT;
BEGIN
    SELECT COUNT(*) INTO ext_count
    FROM pg_extension 
    WHERE extname = ANY(required_exts);
    
    -- Check for missing extensions
    FOREACH e IN ARRAY required_exts LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = e
        ) THEN
            missing_exts := missing_exts || e || ', ';
        END IF;
    END LOOP;
    
    IF ext_count >= 3 THEN
        RAISE NOTICE '✅ Extensions: % / % enabled', ext_count, array_length(required_exts, 1);
    ELSE
        RAISE WARNING '❌ Extensions: Only % / % enabled', ext_count, array_length(required_exts, 1);
        IF missing_exts != '' THEN
            RAISE WARNING '   Missing: %', trim(trailing ', ' from missing_exts);
        END IF;
        RAISE EXCEPTION '   → Extensions are in supabase-future-schema.sql';
    END IF;
END $$;

-- ============================================================================
-- Test 4: Helper Functions (Required for API)
-- ============================================================================

DO $$
DECLARE
    func_count INTEGER;
    required_funcs TEXT[] := ARRAY['verify_api_key', 'has_scope', 'emit_webhook_event'];
    missing_funcs TEXT := '';
    f TEXT;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = ANY(required_funcs);
    
    -- Check for missing functions
    FOREACH f IN ARRAY required_funcs LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_name = f
        ) THEN
            missing_funcs := missing_funcs || f || '(), ';
        END IF;
    END LOOP;
    
    IF func_count >= 3 THEN
        RAISE NOTICE '✅ Helper functions: % / % installed', func_count, array_length(required_funcs, 1);
    ELSE
        RAISE WARNING '❌ Helper functions: Only % / % installed', func_count, array_length(required_funcs, 1);
        IF missing_funcs != '' THEN
            RAISE WARNING '   Missing: %', trim(trailing ', ' from missing_funcs);
        END IF;
        RAISE EXCEPTION '   → Run: migrations/public-api-system.sql';
    END IF;
END $$;

-- ============================================================================
-- Test 5: RLS Policies (Required for Security)
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled_count INTEGER;
    critical_tables TEXT[] := ARRAY['organizations', 'people', 'interactions', 'api_keys'];
    t TEXT;
    rls_status BOOLEAN;
BEGIN
    -- Check RLS is enabled
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename = ANY(critical_tables)
    AND rowsecurity = true;
    
    IF rls_enabled_count >= 4 THEN
        RAISE NOTICE '✅ RLS enabled on % / % critical tables', rls_enabled_count, array_length(critical_tables, 1);
    ELSE
        RAISE WARNING '⚠️  RLS enabled on only % / % critical tables', rls_enabled_count, array_length(critical_tables, 1);
    END IF;
    
    -- Check for service role policies (E2E test support)
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = ANY(critical_tables)
    AND policyname LIKE 'Service role%';
    
    IF policy_count >= 16 THEN
        RAISE NOTICE '✅ E2E test policies: % installed (tests enabled)', policy_count;
    ELSIF policy_count > 0 THEN
        RAISE WARNING '⚠️  E2E test policies: Only % / 16 installed', policy_count;
        RAISE WARNING '   → Run: migrations/enable-e2e-test-data.sql';
    ELSE
        RAISE NOTICE '⚪ E2E test policies: Not installed (tests will be skipped)';
        RAISE NOTICE '   → To enable E2E tests, run: migrations/enable-e2e-test-data.sql';
    END IF;
END $$;

-- ============================================================================
-- Test 6: Test Data Creation (E2E Readiness)
-- ============================================================================

DO $$
DECLARE
    test_org_id UUID;
    test_contact_id UUID;
    can_create_data BOOLEAN := true;
BEGIN
    -- Try to create test data
    BEGIN
        INSERT INTO organizations (name, slug) 
        VALUES ('E2E Verification Test', 'e2e-verify-' || gen_random_uuid())
        RETURNING id INTO test_org_id;
        
        INSERT INTO people (organization_id, full_name, email)
        VALUES (test_org_id, 'Test Contact', 'verify@test.com')
        RETURNING id INTO test_contact_id;
        
        -- Clean up
        DELETE FROM organizations WHERE id = test_org_id;
        
        RAISE NOTICE '✅ Test data creation: SUCCESS (E2E tests ready)';
    EXCEPTION WHEN OTHERS THEN
        can_create_data := false;
        RAISE WARNING '❌ Test data creation: FAILED';
        RAISE WARNING '   Error: %', SQLERRM;
        RAISE WARNING '   → E2E tests will fail';
        RAISE WARNING '   → Run: migrations/enable-e2e-test-data.sql';
    END;
END $$;

-- ============================================================================
-- Test 7: Optional Features
-- ============================================================================

DO $$
DECLARE
    agent_tables INTEGER;
    warmth_tables INTEGER;
    custom_fields_tables INTEGER;
    analytics_tables INTEGER;
BEGIN
    -- Agent System
    SELECT COUNT(*) INTO agent_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('agent_conversations', 'user_agent_context', 'contact_analysis');
    
    IF agent_tables >= 3 THEN
        RAISE NOTICE '✅ Agent System: Installed';
    ELSE
        RAISE NOTICE '⚪ Agent System: Not installed (optional)';
    END IF;
    
    -- Warmth Alerts
    SELECT COUNT(*) INTO warmth_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('warmth_alerts', 'user_push_tokens');
    
    IF warmth_tables >= 2 THEN
        RAISE NOTICE '✅ Warmth Alerts: Installed';
    ELSE
        RAISE NOTICE '⚪ Warmth Alerts: Not installed (optional)';
    END IF;
    
    -- Custom Fields
    SELECT COUNT(*) INTO custom_fields_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('field_definitions', 'field_audit_log');
    
    IF custom_fields_tables >= 2 THEN
        RAISE NOTICE '✅ Custom Fields: Installed';
    ELSE
        RAISE NOTICE '⚪ Custom Fields: Not installed (optional)';
    END IF;
    
    -- Analytics
    SELECT COUNT(*) INTO analytics_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('analytics_events', 'aggregated_metrics');
    
    IF analytics_tables >= 2 THEN
        RAISE NOTICE '✅ Analytics: Installed';
    ELSE
        RAISE NOTICE '⚪ Analytics: Not installed (optional)';
    END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '📊 Database Verification Complete!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. If tests failed, run the missing migrations';
    RAISE NOTICE '2. Update .env: TEST_SKIP_E2E=false';
    RAISE NOTICE '3. Run E2E tests: npm run test:e2e:public-api';
    RAISE NOTICE '';
END $$;
