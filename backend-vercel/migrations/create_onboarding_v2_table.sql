-- =====================================================
-- Onboarding V2 Table Migration
-- Creates table for 24-question onboarding flow
-- =====================================================

BEGIN;

-- Create onboarding_responses_v2 table
CREATE TABLE IF NOT EXISTS onboarding_responses_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  version INT DEFAULT 2 NOT NULL,
  path TEXT, -- 'paid' or 'free'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Phase 1: Easy Warmup (Q1-Q5)
  profile_first_name TEXT,
  feeling_lose_touch TEXT, -- 'often', 'sometimes', 'rarely'
  persona_type TEXT, -- 'founder', 'worker_student', 'other'
  desired_contacts_size TEXT, -- 'lt25', '25_75', 'gt75'
  last_reachout_window TEXT, -- 'lt1m', 'few_months', 'cant_remember'
  
  -- Phase 2: What You Need Help With (Q6-Q10)
  friction_primary TEXT, -- 'forget', 'dont_know_what_to_say', 'both_other'
  focus_segment TEXT, -- 'work', 'personal', 'both'
  goal_30_days TEXT, -- 'opportunities', 'reconnect', 'consistency'
  existing_system TEXT, -- 'yes_system', 'messy', 'none'
  daily_help_pref TEXT, -- 'who', 'what', 'both'
  
  -- Phase 3: How EverReach Should Feel (Q11-Q14)
  message_style TEXT, -- 'super_short', 'short_friendly', 'detailed', 'mixed'
  today_list_size TEXT, -- '1_2', '3_4', 'up_to_5'
  channel_primary TEXT, -- 'text_calls', 'email_linkedin', 'mixed'
  assistance_level TEXT, -- 'ai_help', 'reminders_only', 'mix'
  
  -- Phase 4: Privacy & Safety (Q15-Q18)
  contacts_comfort TEXT, -- 'ok', 'ok_control', 'not_comfortable'
  privacy_mode TEXT, -- 'local', 'cloud'
  analytics_consent TEXT, -- 'yes', 'no'
  import_start_method TEXT, -- 'import_contacts', 'manual_few'
  
  -- Phase 5: First Win / Aha Moment (Q19-Q20)
  first_person_flag TEXT, -- 'yes', 'not_now', 'skip'
  first_person_name TEXT,
  
  -- Phase 6: Expectation Setting & Emotional Anchoring (Q21-Q24)
  first_week_win TEXT, -- 'reconnect', 'on_top', 'lead'
  worst_to_forget TEXT, -- 'personal', 'work', 'both'
  celebrate_wins TEXT, -- 'yes', 'low_key', 'unsure'
  why_matters TEXT -- 'relationships', 'work', 'both'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_id 
  ON onboarding_responses_v2(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_completed_at 
  ON onboarding_responses_v2(completed_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_path 
  ON onboarding_responses_v2(path);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_onboarding_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_onboarding_v2_updated_at
  BEFORE UPDATE ON onboarding_responses_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_v2_updated_at();

-- Enable Row Level Security
ALTER TABLE onboarding_responses_v2 ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own onboarding responses
CREATE POLICY "Users can view own onboarding responses"
  ON onboarding_responses_v2
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own onboarding responses
CREATE POLICY "Users can insert own onboarding responses"
  ON onboarding_responses_v2
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own onboarding responses
CREATE POLICY "Users can update own onboarding responses"
  ON onboarding_responses_v2
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON onboarding_responses_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE ON onboarding_responses_v2 TO service_role;

COMMIT;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table was created correctly:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'onboarding_responses_v2'
-- ORDER BY ordinal_position;
