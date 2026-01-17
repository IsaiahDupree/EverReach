-- Migration: Allow custom tone text in compose_settings
-- This removes the CHECK constraint that restricts tone to enum values
-- so users can save custom voice & tone descriptions like "Casual"

-- Drop the existing check constraint
ALTER TABLE compose_settings 
DROP CONSTRAINT IF EXISTS compose_settings_tone_check;

-- The tone column is already TEXT, so no need to change the column type
-- It will now accept any text value

COMMENT ON COLUMN compose_settings.tone IS 'Voice and tone preference. Can be enum value (warm, concise, professional, playful) or custom text description.';

