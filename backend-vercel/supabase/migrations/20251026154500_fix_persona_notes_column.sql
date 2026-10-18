-- Fix partial migration: Add missing linked_contacts column
-- This migration is idempotent and safe to run multiple times

-- Add the missing column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'linked_contacts'
    ) THEN
        ALTER TABLE persona_notes ADD COLUMN linked_contacts UUID[];
        RAISE NOTICE 'Added linked_contacts column to persona_notes';
    ELSE
        RAISE NOTICE 'Column linked_contacts already exists in persona_notes';
    END IF;
END $$;

-- Create the index (IF NOT EXISTS handles idempotency)
CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts 
ON persona_notes USING GIN(linked_contacts);

-- Verify the fix
DO $$
DECLARE
    col_exists BOOLEAN;
    idx_exists BOOLEAN;
BEGIN
    -- Check column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'persona_notes' 
          AND column_name = 'linked_contacts'
    ) INTO col_exists;
    
    -- Check index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND indexname = 'idx_persona_notes_contacts'
    ) INTO idx_exists;
    
    IF col_exists AND idx_exists THEN
        RAISE NOTICE '✅ Migration successful: Column and index are present';
    ELSE
        RAISE EXCEPTION 'Migration verification failed: column=%, index=%', col_exists, idx_exists;
    END IF;
END $$;
