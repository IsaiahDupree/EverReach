-- Migration: Onboarding System
-- Description: Tables for storing onboarding questionnaire responses and user segmentation
-- Created: 2025-11-01

-- =====================================================
-- 1. Onboarding Responses Table
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core segmentation data
  segment text CHECK (segment IN ('business', 'networking', 'personal', 'all')),
  goal text,
  cadence text CHECK (cadence IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'custom')),
  channels text[], -- ['SMS', 'Email', 'Call', 'LinkedIn', 'Instagram', 'Twitter', 'WhatsApp']
  
  -- AI and privacy preferences
  ai_comfort text CHECK (ai_comfort IN ('help_write', 'just_remind', 'mix')),
  privacy_mode boolean DEFAULT false,
  analytics_consent boolean DEFAULT false,
  
  -- Initial contact info
  first_contact_name text,
  import_source text CHECK (import_source IN ('phone', 'google', 'csv', 'manual', 'skip')),
  
  -- Additional context
  relationship_count text CHECK (relationship_count IN ('5-10', '10-25', '25-50', '50-100', '100+')),
  last_outreach text CHECK (last_outreach IN ('week', 'month', 'few_months', 'cant_remember')),
  friction_points text[], -- what stops them from reaching out
  has_system text CHECK (has_system IN ('yes', 'sort_of', 'no', 'tried_apps')),
  warmth_receptive text CHECK (warmth_receptive IN ('yes', 'maybe', 'no')),
  
  -- Flexible storage for all answers
  all_answers jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id ON onboarding_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_segment ON onboarding_responses(segment);
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_created_at ON onboarding_responses(created_at DESC);

-- =====================================================
-- 2. User Tags Table (for marketing segmentation)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text NOT NULL, -- e.g., 'segment:business', 'goal:close_deals', 'cadence:weekly'
  source text NOT NULL, -- 'onboarding', 'conversion', 'manual', 'system'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick tag lookups
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag ON user_tags(tag);
CREATE INDEX IF NOT EXISTS idx_user_tags_source ON user_tags(source);

-- Unique constraint: one tag per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tags_unique ON user_tags(user_id, tag);

-- =====================================================
-- 3. Add Columns to Profiles Table
-- =====================================================
-- Add onboarding-related fields to profiles if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_cadence text CHECK (default_cadence IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'custom'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_channels text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_mode boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_assistance_level text CHECK (ai_assistance_level IN ('help_write', 'just_remind', 'mix'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_consent boolean DEFAULT true;

-- =====================================================
-- 4. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on onboarding_responses
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Users can only read their own onboarding responses
CREATE POLICY "Users can view own onboarding responses"
  ON onboarding_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own onboarding responses
CREATE POLICY "Users can insert own onboarding responses"
  ON onboarding_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding responses
CREATE POLICY "Users can update own onboarding responses"
  ON onboarding_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on user_tags
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

-- Users can view their own tags
CREATE POLICY "Users can view own tags"
  ON user_tags
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update tags (service role)
CREATE POLICY "Service role can manage tags"
  ON user_tags
  FOR ALL
  USING (true);

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to get user segment from onboarding
CREATE OR REPLACE FUNCTION get_user_segment(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT segment
  FROM onboarding_responses
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function to check if user completed onboarding
CREATE OR REPLACE FUNCTION has_completed_onboarding(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM onboarding_responses
    WHERE user_id = p_user_id
  );
$$;

-- =====================================================
-- 6. Comments
-- =====================================================
COMMENT ON TABLE onboarding_responses IS 'Stores user responses from the 20-question onboarding flow';
COMMENT ON TABLE user_tags IS 'Stores marketing segmentation tags for users';
COMMENT ON COLUMN onboarding_responses.segment IS 'Primary user segment: business, networking, or personal';
COMMENT ON COLUMN onboarding_responses.all_answers IS 'Flexible JSONB storage for all onboarding question answers';
COMMENT ON COLUMN profiles.default_cadence IS 'Default check-in cadence set during onboarding';
COMMENT ON COLUMN profiles.privacy_mode IS 'Whether user enabled private mode (local-only AI)';
