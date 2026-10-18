-- Repair partial migration: Add missing column if needed

-- Check and add linked_contacts column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persona_notes' AND column_name = 'linked_contacts'
    ) THEN
        ALTER TABLE persona_notes ADD COLUMN linked_contacts UUID[];
        RAISE NOTICE 'Added linked_contacts column';
    ELSE
        RAISE NOTICE 'linked_contacts column already exists';
    END IF;
END $$;

-- Create index if not exists (should work now)
CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts ON persona_notes USING GIN(linked_contacts);

-- Verify the repair
SELECT 
    'persona_notes' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'persona_notes'
ORDER BY ordinal_position;
