-- AI Goal Inference System Migration (Fixed for actual schema)
-- Enables implicit goal discovery from user behavior and notes
-- Created: 2025-10-13

-- ============================================================================
-- 1. Add Explicit Goal Fields to Profiles Table
-- ============================================================================

-- Add goal fields (user-facing in settings)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS personal_goal TEXT,
  ADD COLUMN IF NOT EXISTS networking_goal TEXT,
  ADD COLUMN IF NOT EXISTS business_goal TEXT,
  ADD COLUMN IF NOT EXISTS goals_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.personal_goal IS 'User-set personal development goal';
COMMENT ON COLUMN profiles.networking_goal IS 'User-set networking/relationship goal';
COMMENT ON COLUMN profiles.business_goal IS 'User-set business/revenue goal';

-- ============================================================================
-- 2. AI User Context Table (Hidden Intelligence Layer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Inferred goals (AI use only, not shown in UI)
  inferred_goals JSONB DEFAULT '[]'::jsonb,
  
  -- Additional AI context (future)
  communication_style TEXT,
  key_priorities JSONB DEFAULT '[]'::jsonb,
  relationship_approach TEXT,
  behavioral_patterns JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  last_analyzed_at TIMESTAMPTZ DEFAULT now(),
  analysis_version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_user_context_user ON ai_user_context(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_context_analyzed ON ai_user_context(last_analyzed_at);

COMMENT ON TABLE ai_user_context IS 'AI-inferred user context and goals - backend/AI use only';
COMMENT ON COLUMN ai_user_context.inferred_goals IS 'Weighted goal list extracted from multiple sources';

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

ALTER TABLE ai_user_context ENABLE ROW LEVEL SECURITY;

-- Service role can manage all context (for cron jobs)
CREATE POLICY "Service role can manage AI context" ON ai_user_context
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own context (for AI agent queries)
CREATE POLICY "Users can read own AI context" ON ai_user_context
  FOR SELECT USING (auth.uid() = user_id);

-- Users cannot directly modify AI context (only backend can)
CREATE POLICY "Users cannot modify AI context" ON ai_user_context
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Users cannot update AI context" ON ai_user_context
  FOR UPDATE USING (false);

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Function to get formatted goals for AI prompts
CREATE OR REPLACE FUNCTION get_user_goals_for_ai(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context JSONB;
  v_goals JSONB;
  v_result TEXT;
  v_goal JSONB;
  v_source_label TEXT;
BEGIN
  -- Get AI context
  SELECT inferred_goals INTO v_goals
  FROM ai_user_context
  WHERE user_id = p_user_id;
  
  -- If no context, return empty
  IF v_goals IS NULL OR jsonb_array_length(v_goals) = 0 THEN
    RETURN '';
  END IF;
  
  -- Sort by weight descending and format
  v_result := E'\n\nUser''s Goals (context for AI - don''t explicitly mention unless asked):\n';
  
  FOR v_goal IN 
    SELECT * FROM jsonb_array_elements(v_goals)
    ORDER BY (value->>'weight')::integer DESC
    LIMIT 5
  LOOP
    -- Determine source label
    v_source_label := CASE 
      WHEN v_goal->>'source' = 'explicit_field' THEN '✓ Explicit'
      WHEN v_goal->>'source' = 'note_explicit' THEN 'From notes'
      WHEN v_goal->>'source' = 'note_implicit' THEN 'Implied'
      ELSE 'Inferred'
    END;
    
    v_result := v_result || format(
      '- [%s] %s (%s, confidence: %s%%)\n',
      v_goal->>'category',
      v_goal->>'goal_text',
      v_source_label,
      round((v_goal->>'confidence')::numeric * 100)
    );
  END LOOP;
  
  RETURN v_result || E'\n';
END;
$$;

COMMENT ON FUNCTION get_user_goals_for_ai IS 'Formats user goals for AI prompt injection';

-- ============================================================================
-- 5. Triggers
-- ============================================================================

-- Update timestamp on ai_user_context changes
CREATE OR REPLACE FUNCTION update_ai_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_user_context_updated ON ai_user_context;
CREATE TRIGGER ai_user_context_updated
  BEFORE UPDATE ON ai_user_context
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_context_timestamp();

-- Update goals_updated_at when profile goals change
CREATE OR REPLACE FUNCTION update_profile_goals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.personal_goal IS DISTINCT FROM OLD.personal_goal) OR
     (NEW.networking_goal IS DISTINCT FROM OLD.networking_goal) OR
     (NEW.business_goal IS DISTINCT FROM OLD.business_goal) THEN
    NEW.goals_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_goals_updated ON profiles;
CREATE TRIGGER profile_goals_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_goals_timestamp();

-- ============================================================================
-- 6. Indexes for Performance
-- ============================================================================

-- Index for goal field queries
CREATE INDEX IF NOT EXISTS idx_profiles_goals 
  ON profiles(user_id) 
  WHERE personal_goal IS NOT NULL 
     OR networking_goal IS NOT NULL 
     OR business_goal IS NOT NULL;

-- GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_ai_context_goals_gin 
  ON ai_user_context USING GIN (inferred_goals);

-- ============================================================================
-- Complete
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON ai_user_context TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals_for_ai TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals_for_ai TO service_role;
