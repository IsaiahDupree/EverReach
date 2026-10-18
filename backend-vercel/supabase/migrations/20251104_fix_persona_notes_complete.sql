-- Complete Persona Notes Fix
-- 1. Rename image_url to file_url for consistency (voice uses file_url, screenshots should too)
-- 2. Fix existing voice notes with wrong status (transcript exists but status='pending')
-- 3. Verify schema

DO $$
BEGIN
    -- 1. Rename image_url to file_url if it exists (unify voice and screenshot storage)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'image_url'
    ) THEN
        -- First, copy any image_url values to file_url if file_url is null
        UPDATE persona_notes
        SET file_url = image_url
        WHERE file_url IS NULL AND image_url IS NOT NULL;
        
        -- Then drop the image_url column
        ALTER TABLE persona_notes DROP COLUMN image_url;
        RAISE NOTICE '✅ Renamed image_url to file_url (data preserved)';
    ELSE
        RAISE NOTICE 'ℹ️  Column image_url does not exist (already migrated)';
    END IF;
END $$;

-- 2. Fix existing voice notes with transcripts but wrong status
UPDATE persona_notes
SET status = 'ready',
    updated_at = NOW()
WHERE type = 'voice'
  AND status = 'pending'
  AND transcript IS NOT NULL
  AND transcript != '';

-- Get count of fixed records
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    IF fixed_count > 0 THEN
        RAISE NOTICE '✅ Fixed % voice notes with wrong status', fixed_count;
    ELSE
        RAISE NOTICE 'ℹ️  No voice notes needed status fix';
    END IF;
END $$;

-- 3. Verify final schema
DO $$
DECLARE
    file_url_exists BOOLEAN;
    transcript_exists BOOLEAN;
    status_exists BOOLEAN;
    duration_exists BOOLEAN;
    image_url_exists BOOLEAN;
BEGIN
    -- Check all required columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'file_url'
    ) INTO file_url_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'transcript'
    ) INTO transcript_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'status'
    ) INTO status_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'duration_sec'
    ) INTO duration_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'image_url'
    ) INTO image_url_exists;
    
    -- Report results
    IF file_url_exists AND transcript_exists AND status_exists AND duration_exists AND NOT image_url_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════';
        RAISE NOTICE '✅ PERSONA NOTES MIGRATION SUCCESSFUL';
        RAISE NOTICE '═══════════════════════════════════════════════';
        RAISE NOTICE 'Schema Status:';
        RAISE NOTICE '  ✅ file_url column exists (unified for voice & screenshots)';
        RAISE NOTICE '  ✅ transcript column exists';
        RAISE NOTICE '  ✅ status column exists';
        RAISE NOTICE '  ✅ duration_sec column exists';
        RAISE NOTICE '  ✅ image_url column removed (migrated to file_url)';
        RAISE NOTICE '';
        RAISE NOTICE 'Ready for:';
        RAISE NOTICE '  • Voice notes with transcriptions';
        RAISE NOTICE '  • Screenshot uploads';
        RAISE NOTICE '  • Status tracking';
        RAISE NOTICE '═══════════════════════════════════════════════';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '⚠️  MIGRATION INCOMPLETE - Some issues detected:';
        RAISE WARNING '  file_url exists: %', file_url_exists;
        RAISE WARNING '  transcript exists: %', transcript_exists;
        RAISE WARNING '  status exists: %', status_exists;
        RAISE WARNING '  duration_sec exists: %', duration_exists;
        RAISE WARNING '  image_url removed: %', NOT image_url_exists;
    END IF;
END $$;
