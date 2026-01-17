-- ============================================
-- Voice & Tone Context - ROLLBACK SCRIPT
-- Use this to undo the migrations if needed
-- ============================================

-- ============================================
-- ROLLBACK OPTION A (Simple - profiles table)
-- ============================================

-- Remove the voice_context column from profiles
-- WARNING: This will delete all stored voice context data
-- ALTER TABLE profiles DROP COLUMN IF EXISTS voice_context;

-- Remove the index
-- DROP INDEX IF EXISTS idx_profiles_voice_context;

-- ============================================
-- ROLLBACK OPTION B (Full - user_preferences table)
-- ============================================

-- Drop the user_preferences table
-- WARNING: This will delete ALL user preferences data
-- DROP TABLE IF EXISTS user_preferences CASCADE;

-- Drop the trigger function
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- VERIFY ROLLBACK
-- ============================================

-- Check if voice_context column still exists in profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'voice_context';
-- Should return 0 rows if rolled back

-- Check if user_preferences table still exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_preferences';
-- Should return 0 rows if rolled back

-- ============================================
-- NOTES
-- ============================================

/*
  BEFORE ROLLING BACK:
  
  1. Backup your data:
     - Option A: SELECT user_id, voice_context FROM profiles WHERE voice_context IS NOT NULL;
     - Option B: SELECT * FROM user_preferences;
  
  2. Notify users if they have stored preferences
  
  3. Update mobile app to handle missing data gracefully
  
  4. Consider creating a backup table before rollback:
     - CREATE TABLE profiles_backup AS SELECT * FROM profiles;
     - CREATE TABLE user_preferences_backup AS SELECT * FROM user_preferences;
  
  AFTER ROLLBACK:
  
  1. Deploy backend changes to remove voiceContext from APIs
  2. Update mobile app to remove backend sync
  3. Keep local storage in mobile app working
*/
