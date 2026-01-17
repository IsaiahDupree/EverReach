-- Rename transcription column to transcript in persona_notes table
-- This aligns the database schema with the backend API code

-- Check if the old column exists and rename it
DO $$
BEGIN
    -- Check if 'transcription' column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'transcription'
    ) THEN
        -- Rename transcription to transcript
        ALTER TABLE persona_notes RENAME COLUMN transcription TO transcript;
        RAISE NOTICE 'Renamed column transcription to transcript in persona_notes';
    ELSE
        RAISE NOTICE 'Column transcription does not exist (may already be renamed to transcript)';
    END IF;
    
    -- Also add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE persona_notes 
        ADD COLUMN status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'ready', 'failed'));
        
        RAISE NOTICE 'Added status column to persona_notes';
    ELSE
        RAISE NOTICE 'Column status already exists in persona_notes';
    END IF;
    
    -- Also rename audio_url to file_url if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE persona_notes RENAME COLUMN audio_url TO file_url;
        RAISE NOTICE 'Renamed column audio_url to file_url in persona_notes';
    ELSE
        RAISE NOTICE 'Column audio_url does not exist (may already be renamed to file_url)';
    END IF;
    
    -- Add duration_sec column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'duration_sec'
    ) THEN
        ALTER TABLE persona_notes ADD COLUMN duration_sec INTEGER;
        RAISE NOTICE 'Added duration_sec column to persona_notes';
    ELSE
        RAISE NOTICE 'Column duration_sec already exists in persona_notes';
    END IF;
END $$;

-- Verify the changes
DO $$
DECLARE
    transcript_exists BOOLEAN;
    status_exists BOOLEAN;
    file_url_exists BOOLEAN;
    duration_exists BOOLEAN;
BEGIN
    -- Check if transcript column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'transcript'
    ) INTO transcript_exists;
    
    -- Check if status column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'status'
    ) INTO status_exists;
    
    -- Check if file_url column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'file_url'
    ) INTO file_url_exists;
    
    -- Check if duration_sec column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'duration_sec'
    ) INTO duration_exists;
    
    IF transcript_exists AND status_exists AND file_url_exists AND duration_exists THEN
        RAISE NOTICE '✅ Migration successful: All required columns exist';
        RAISE NOTICE '   - transcript: %', transcript_exists;
        RAISE NOTICE '   - status: %', status_exists;
        RAISE NOTICE '   - file_url: %', file_url_exists;
        RAISE NOTICE '   - duration_sec: %', duration_exists;
    ELSE
        RAISE WARNING '⚠️  Some columns are missing:';
        RAISE WARNING '   - transcript: %', transcript_exists;
        RAISE WARNING '   - status: %', status_exists;
        RAISE WARNING '   - file_url: %', file_url_exists;
        RAISE WARNING '   - duration_sec: %', duration_exists;
    END IF;
END $$;
