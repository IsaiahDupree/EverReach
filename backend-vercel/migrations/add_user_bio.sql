/**
 * Add Bio to User Profile
 * 
 * Adds a bio/description field to the profiles table
 * This bio is used in AI message generation to provide user context
 */

-- Add bio column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN profiles.bio IS 'User bio/description - used in AI message generation for personalization';

-- Index for searching bios (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_profiles_bio ON profiles USING gin(to_tsvector('english', bio)) WHERE bio IS NOT NULL;

-- Update existing records to have NULL bio (explicit, though it's already NULL by default)
-- This is a no-op but documents the intent
UPDATE profiles SET bio = NULL WHERE bio IS NULL;
