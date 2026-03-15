-- Migration 006: Social Channels JSONB + Sync Log
-- Purpose: Add social_channels JSONB object column and social_sync_log table for Chrome extension imports
-- Date: 2026-03-15

-- Drop old array-based column if it exists
ALTER TABLE contacts DROP COLUMN IF EXISTS social_channels;

-- Add social_channels JSONB column with object structure
-- Structure: { instagram: {handle, profile_url, bio, followers, ...}, twitter: {...}, ... }
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS social_channels JSONB DEFAULT '{}'::jsonb;

-- Create JSONB path indexes for fast lookup by platform handle
CREATE INDEX IF NOT EXISTS idx_contacts_ig_handle
  ON contacts ((social_channels->'instagram'->>'handle'))
  WHERE social_channels ? 'instagram';

CREATE INDEX IF NOT EXISTS idx_contacts_twitter_handle
  ON contacts ((social_channels->'twitter'->>'handle'))
  WHERE social_channels ? 'twitter';

CREATE INDEX IF NOT EXISTS idx_contacts_linkedin_handle
  ON contacts ((social_channels->'linkedin'->>'handle'))
  WHERE social_channels ? 'linkedin';

CREATE INDEX IF NOT EXISTS idx_contacts_tiktok_handle
  ON contacts ((social_channels->'tiktok'->>'handle'))
  WHERE social_channels ? 'tiktok';

CREATE INDEX IF NOT EXISTS idx_contacts_facebook_url
  ON contacts ((social_channels->'facebook'->>'profile_url'))
  WHERE social_channels ? 'facebook';

-- social_sync_log table for tracking import history
CREATE TABLE IF NOT EXISTS social_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','twitter','linkedin','facebook','tiktok')),
  handle TEXT,
  profile_url TEXT,
  action TEXT NOT NULL CHECK (action IN ('created','updated','duplicate_skipped')),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user's sync history queries
CREATE INDEX IF NOT EXISTS idx_social_sync_log_user
  ON social_sync_log(user_id, created_at DESC);

-- Index for contact's import history
CREATE INDEX IF NOT EXISTS idx_social_sync_log_contact
  ON social_sync_log(contact_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN contacts.social_channels IS
'Social media channels for the contact. Format: { instagram: { handle, profile_url, bio, followers, profile_pic, ... }, twitter: {...}, linkedin: {...}, facebook: {...}, tiktok: {...} }';

COMMENT ON TABLE social_sync_log IS
'Tracks all social media contact imports from Chrome extension. Used for deduplication and sync history.';
