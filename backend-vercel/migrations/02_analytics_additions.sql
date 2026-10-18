-- Migration: Analytics Additions (Prompts, Responses, ML View, Password Resets)
-- Description: Add missing tables for AI prompts/responses and password resets
-- Date: 2025-11-01
-- Version: 1.0
-- Note: app_events table already exists, so we skip it

-- =====================================================
-- 1. Prompts Table (AI Prompt Storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS prompts (
  prompt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  text text NOT NULL,
  model text,
  temperature numeric,
  context_len int,
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompts_user_idx ON prompts(user_id);
CREATE INDEX IF NOT EXISTS prompts_contact_idx ON prompts(contact_id);
CREATE INDEX IF NOT EXISTS prompts_created_idx ON prompts(created_at DESC);

-- =====================================================
-- 2. Responses Table (AI Response Storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS responses (
  response_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES prompts(prompt_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text,
  text text NOT NULL,
  tokens_out int,
  finish_reason text,
  cost_usd numeric(10, 6),
  latency_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS responses_prompt_idx ON responses(prompt_id);
CREATE INDEX IF NOT EXISTS responses_user_idx ON responses(user_id);
CREATE INDEX IF NOT EXISTS responses_created_idx ON responses(created_at DESC);

-- =====================================================
-- 3. ML Response Samples View (Wide Table for ML)
-- =====================================================
CREATE OR REPLACE VIEW ml_response_samples AS
SELECT
  r.response_id,
  r.user_id,
  r.model,
  r.created_at,
  p.text as prompt_text,
  r.text as response_text,
  r.tokens_out,
  r.cost_usd,
  r.latency_ms,
  -- Aggregated feedback signals (using existing app_events schema)
  COALESCE(SUM((e.event_name='response_copied')::int), 0) as copied_count,
  COALESCE(SUM((e.event_name='response_liked')::int), 0) as liked_count,
  COALESCE(SUM((e.event_name='response_disliked')::int), 0) as disliked_count,
  -- Derived ML labels
  (COALESCE(SUM((e.event_name='response_liked')::int), 0) - COALESCE(SUM((e.event_name='response_disliked')::int), 0)) as helpful_score,
  CASE 
    WHEN COALESCE(SUM((e.event_name='response_copied')::int), 0) > 0 THEN 1 
    ELSE 0 
  END as was_copied
FROM responses r
JOIN prompts p ON p.prompt_id = r.prompt_id
LEFT JOIN app_events e ON 
  e.properties ? 'response_id' AND 
  (e.properties->>'response_id')::uuid = r.response_id
GROUP BY r.response_id, r.user_id, r.model, r.created_at, p.text, r.text, r.tokens_out, r.cost_usd, r.latency_ms;

-- =====================================================
-- 4. Password Resets Table
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets(expires_at);

-- =====================================================
-- 5. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on prompts
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Users can view their own prompts
CREATE POLICY "Users can view own prompts"
  ON prompts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage prompts
CREATE POLICY "Service role can manage prompts"
  ON prompts
  FOR ALL
  USING (true);

-- Enable RLS on responses
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view own responses"
  ON responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage responses
CREATE POLICY "Service role can manage responses"
  ON responses
  FOR ALL
  USING (true);

-- Enable RLS on password_resets
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Only service role can access password_resets
CREATE POLICY "Service role can manage password resets"
  ON password_resets
  FOR ALL
  USING (true);

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Function to get user's event count (updated for existing schema)
CREATE OR REPLACE FUNCTION get_user_event_count(p_user_id uuid, p_event_name text DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM app_events
  WHERE user_id = p_user_id
    AND (p_event_name IS NULL OR event_name = p_event_name);
$$;

-- Function to get user's aha moment status
CREATE OR REPLACE FUNCTION has_reached_aha_moment(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_events
    WHERE user_id = p_user_id
      AND event_name = 'aha_reached'
  );
$$;

-- Function to get user's trial conversion status
CREATE OR REPLACE FUNCTION has_converted_from_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_events
    WHERE user_id = p_user_id
      AND event_name = 'purchase_succeeded'
      AND properties->>'source' = 'trial'
  );
$$;

-- Function to cleanup old events (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_events(days_to_keep int DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM app_events
  WHERE occurred_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 7. Comments
-- =====================================================
COMMENT ON TABLE prompts IS 'Stores AI prompts submitted by users';
COMMENT ON TABLE responses IS 'Stores AI-generated responses to prompts';
COMMENT ON TABLE password_resets IS 'Stores password reset tokens and expiry';

COMMENT ON VIEW ml_response_samples IS 'ML-ready view with response feedback aggregated';

COMMENT ON COLUMN responses.cost_usd IS 'Cost of AI response generation in USD';
COMMENT ON COLUMN responses.latency_ms IS 'Time taken to generate response in milliseconds';

-- =====================================================
-- Migration Complete
-- =====================================================
