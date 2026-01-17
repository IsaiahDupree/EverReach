-- Migration: Add social_channels to contacts
-- Date: 2025-10-19
-- Purpose: Enable social media channel tracking for contacts

-- Add social_channels JSONB column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS social_channels JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN contacts.social_channels IS 
'Social media channels for the contact. Format: [{"platform": "instagram", "handle": "@username", "url": "https://..."}]';

-- Create GIN index for faster queries on social channels
CREATE INDEX IF NOT EXISTS idx_contacts_social_channels 
ON contacts USING GIN (social_channels);

-- Add check constraint to ensure valid JSON structure
ALTER TABLE contacts 
ADD CONSTRAINT check_social_channels_is_array 
CHECK (jsonb_typeof(social_channels) = 'array');

-- Example data structure:
-- [
--   {"platform": "instagram", "handle": "@johndoe", "url": "https://instagram.com/johndoe"},
--   {"platform": "twitter", "handle": "@johndoe", "url": "https://twitter.com/johndoe"},
--   {"platform": "linkedin", "handle": "johndoe", "url": "https://linkedin.com/in/johndoe"},
--   {"platform": "facebook", "handle": "john.doe", "url": "https://facebook.com/john.doe"},
--   {"platform": "whatsapp", "handle": "+1234567890", "url": "https://wa.me/1234567890"},
--   {"platform": "telegram", "handle": "johndoe", "url": "https://t.me/johndoe"},
--   {"platform": "tiktok", "handle": "@johndoe", "url": "https://tiktok.com/@johndoe"},
--   {"platform": "snapchat", "handle": "johndoe", "url": "https://snapchat.com/add/johndoe"}
-- ]

-- Update the contacts validation schema if needed
-- (This assumes you have validation functions for contacts)

-- Grant permissions (adjust based on your RLS setup)
-- No changes needed as existing RLS policies will apply to new column

-- Rollback script (if needed):
-- ALTER TABLE contacts DROP COLUMN IF EXISTS social_channels;
-- DROP INDEX IF EXISTS idx_contacts_social_channels;
