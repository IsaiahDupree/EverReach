-- ============================================
-- Voice & Tone Context - SIMPLE MIGRATION
-- Option A: Add to existing profiles table
-- ============================================

-- Add voice_context column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS voice_context TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_voice_context 
ON profiles(user_id) 
WHERE voice_context IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.voice_context IS 
'User-defined voice and tone preferences for AI message generation. Examples: "Gen Z casual", "Professional fintech tone", "Arizona slang"';

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'voice_context';
