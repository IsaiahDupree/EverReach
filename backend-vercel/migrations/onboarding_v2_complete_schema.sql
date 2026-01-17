-- =====================================================
-- Onboarding V2 Complete Schema
-- 22 Questions (removed Q12: today_list_size, Q15: privacy_mode)
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
  
  -- ========================================
  -- Phase 1: Easy Warmup (Q1-Q5)
  -- ========================================
  profile_first_name TEXT,
  -- Q1: "What should we call you?"
  -- Values: Any text
  
  feeling_lose_touch TEXT,
  -- Q2: "Do you ever feel like you're losing touch with people?"
  -- Values: 'often', 'sometimes', 'rarely'
  
  persona_type TEXT,
  -- Q3: "Which sounds most like you?"
  -- Values: 'founder', 'worker_student', 'other'
  
  desired_contacts_size TEXT,
  -- Q4: "How many people would you realistically want to keep in touch with?"
  -- Values: 'lt25', '25_75', 'gt75'
  
  last_reachout_window TEXT,
  -- Q5: "When was the last time you messaged someone you have been meaning to reach out to?"
  -- Values: 'lt1m', 'few_months', 'cant_remember'
  
  -- ========================================
  -- Phase 2: What You Need Help With (Q6-Q10)
  -- ========================================
  friction_primary TEXT,
  -- Q6: "What makes it hard to stay in touch?"
  -- Values: 'forget', 'dont_know_what_to_say', 'both_other'
  
  focus_segment TEXT,
  -- Q7: "Where do you want to focus first?"
  -- Values: 'work', 'personal', 'both'
  
  goal_30_days TEXT,
  -- Q8: "In 30 days, what would success look like?"
  -- Values: 'opportunities', 'reconnect', 'consistency'
  
  existing_system TEXT,
  -- Q9: "Do you have a system for this already?"
  -- Values: 'yes_system', 'messy', 'none'
  
  daily_help_pref TEXT,
  -- Q10: "What helps you most on a daily basis?"
  -- Values: 'who', 'what', 'both'
  
  -- ========================================
  -- Phase 3: How EverReach Should Feel (Q11-Q13)
  -- ========================================
  message_style TEXT,
  -- Q11: "When you reach out, what feels most like 'you'?"
  -- Values: 'super_short', 'short_friendly', 'detailed', 'mixed'
  
  channel_primary TEXT,
  -- Q12: "How do you usually reach out?" (was Q13)
  -- Values: 'text_calls', 'email_linkedin', 'mixed'
  
  assistance_level TEXT,
  -- Q13: "When you reach out, how much help do you want from EverReach?" (was Q14)
  -- Values: 'ai_help', 'reminders_only', 'mix'
  
  -- ========================================
  -- Phase 4: Privacy & Safety (Q14-Q16)
  -- ========================================
  contacts_comfort TEXT,
  -- Q14: "How do you feel about EverReach using your contacts to remind you?" (was Q15)
  -- Values: 'ok', 'ok_control', 'not_comfortable'
  
  analytics_consent TEXT,
  -- Q15: "Can we use anonymous, combined data to make the app better over time?" (was Q16)
  -- Values: 'yes', 'no'
  
  import_start_method TEXT,
  -- Q16: "What's the easiest way to bring your people into EverReach?" (was Q17)
  -- Values: 'import_contacts', 'manual_few'
  
  -- ========================================
  -- Phase 5: First Win / Aha Moment (Q17-Q18)
  -- ========================================
  first_person_flag TEXT,
  -- Q17: "Is there one person you have been meaning to reach out to?" (was Q18)
  -- Values: 'yes', 'not_now', 'skip'
  
  first_person_name TEXT,
  -- Q18: "Who is that person?" (was Q19)
  -- Values: Any text (e.g. "Mom", "My old boss Alex")
  
  -- ========================================
  -- Phase 6: Expectation Setting & Emotional Anchoring (Q19-Q22)
  -- ========================================
  first_week_win TEXT,
  -- Q19: "In your first week, what would feel like a 'win' with EverReach?" (was Q20)
  -- Values: 'reconnect', 'on_top', 'lead'
  
  worst_to_forget TEXT,
  -- Q20: "Which of these would you feel worst about forgetting?" (was Q21)
  -- Values: 'personal', 'work', 'both'
  
  celebrate_wins TEXT,
  -- Q21: "Do you want EverReach to celebrate your small wins?" (was Q22)
  -- Values: 'yes', 'low_key', 'unsure'
  
  why_matters TEXT
  -- Q22: "Last one: Why does staying in touch matter to you right now?" (was Q23)
  -- Values: 'relationships', 'work', 'both'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_id 
  ON onboarding_responses_v2(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_completed_at 
  ON onboarding_responses_v2(completed_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_path 
  ON onboarding_responses_v2(path);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_persona 
  ON onboarding_responses_v2(persona_type);

CREATE INDEX IF NOT EXISTS idx_onboarding_v2_focus 
  ON onboarding_responses_v2(focus_segment);

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
-- Column Summary
-- =====================================================
-- Total columns: 25
--   3 metadata columns (id, user_id, version, path, completed_at, created_at, updated_at)
--   22 question columns (Q1-Q22)
--
-- Removed from original 24-question version:
--   - today_list_size (was Q12)
--   - privacy_mode (was Q15)
--
-- Total screens: 25
--   S1: Paywall screen (triggers Superwall)
--   A1: Email capture (redirects to auth)
--   Q1-Q22: 22 questions
-- =====================================================

-- Verification Query
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'onboarding_responses_v2'
-- ORDER BY ordinal_position;
