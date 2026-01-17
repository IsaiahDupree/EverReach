-- Add first_name column to profiles table
-- This allows storing the user's first name separately for the welcome message

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name) WHERE first_name IS NOT NULL;

-- Comment
COMMENT ON COLUMN profiles.first_name IS 'User first name for welcome messages and personalization';

