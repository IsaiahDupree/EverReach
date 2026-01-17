-- Add persistent trial date columns to profiles table
-- This fixes the issue where trial dates reset on every page load

-- Add trial date columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Set trial dates for existing users based on their registration date
-- This preserves their actual trial period
UPDATE profiles 
SET 
  trial_started_at = COALESCE(trial_started_at, created_at),
  trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '7 days')
WHERE trial_started_at IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON profiles(trial_ends_at);

-- Add comments for documentation
COMMENT ON COLUMN profiles.trial_started_at IS 'When the user started their free trial (never changes after first set)';
COMMENT ON COLUMN profiles.trial_ends_at IS 'When the trial ends, calculated as trial_started_at + 7 days';
