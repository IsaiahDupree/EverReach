-- =====================================================
-- Add Phase 6 Columns to Onboarding V2
-- For existing installations - adds Q21-Q24 columns
-- =====================================================

BEGIN;

-- Add Phase 6: Expectation Setting & Emotional Anchoring (Q21-Q24)
ALTER TABLE onboarding_responses_v2
  ADD COLUMN IF NOT EXISTS first_week_win TEXT,
  ADD COLUMN IF NOT EXISTS worst_to_forget TEXT,
  ADD COLUMN IF NOT EXISTS celebrate_wins TEXT,
  ADD COLUMN IF NOT EXISTS why_matters TEXT;

-- Add comments for documentation
COMMENT ON COLUMN onboarding_responses_v2.first_week_win IS 'Q21: First week win goal - values: reconnect, on_top, lead';
COMMENT ON COLUMN onboarding_responses_v2.worst_to_forget IS 'Q22: Worst thing to forget - values: personal, work, both';
COMMENT ON COLUMN onboarding_responses_v2.celebrate_wins IS 'Q23: Celebrate wins preference - values: yes, low_key, unsure';
COMMENT ON COLUMN onboarding_responses_v2.why_matters IS 'Q24: Why staying in touch matters - values: relationships, work, both';

COMMIT;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'onboarding_responses_v2'
--   AND column_name IN ('first_week_win', 'worst_to_forget', 'celebrate_wins', 'why_matters');
