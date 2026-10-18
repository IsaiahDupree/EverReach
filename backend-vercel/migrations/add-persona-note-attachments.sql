-- Migration: Add Persona Note Attachments Support
-- Purpose: Allow attaching files (audio, images, documents) to persona notes

-- Add persona_note_id column to attachments table
ALTER TABLE attachments 
  ADD COLUMN IF NOT EXISTS persona_note_id UUID REFERENCES persona_notes(id) ON DELETE CASCADE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_attachments_persona_note 
  ON attachments(persona_note_id) 
  WHERE persona_note_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN attachments.persona_note_id IS 'Optional: Links attachment to a persona note (e.g., voice recording, reference image)';

-- Add check constraint to ensure attachment belongs to at most one entity
ALTER TABLE attachments 
  DROP CONSTRAINT IF EXISTS attachments_entity_check;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_entity_check 
  CHECK (
    (contact_id IS NOT NULL AND message_id IS NULL AND persona_note_id IS NULL) OR
    (contact_id IS NULL AND message_id IS NOT NULL AND persona_note_id IS NULL) OR
    (contact_id IS NULL AND message_id IS NULL AND persona_note_id IS NOT NULL) OR
    (contact_id IS NULL AND message_id IS NULL AND persona_note_id IS NULL)
  );

COMMENT ON CONSTRAINT attachments_entity_check ON attachments IS 'Ensures attachment belongs to at most one parent entity';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Persona note attachments support added';
  RAISE NOTICE 'Tables updated: attachments (added persona_note_id column)';
  RAISE NOTICE 'Indexes created: idx_attachments_persona_note';
END;
$$;
