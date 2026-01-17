-- Migration: User Profile Pictures
-- Description: Add avatar_url column to profiles table for user profile pictures
-- Date: 2025-11-01
-- Version: 1.0

-- =====================================================
-- 1. Add avatar_url Column to Profiles
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- =====================================================
-- 2. Add Index for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS profiles_avatar_url_idx 
ON profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- =====================================================
-- 3. Comments
-- =====================================================
COMMENT ON COLUMN profiles.avatar_url IS 'URL or path to user profile picture in Supabase storage';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Users can now upload/remove profile pictures via PATCH /v1/me
-- Profile pictures stored in Supabase storage at: users/{userId}/profile/avatar.*
