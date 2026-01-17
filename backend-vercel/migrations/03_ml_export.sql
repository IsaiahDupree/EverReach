-- Migration: ML Export System
-- Description: Functions and views for ML dataset exports
-- Date: 2025-11-01
-- Version: 1.0

-- =====================================================
-- 1. ML Export Function (Last 30 Days)
-- =====================================================
CREATE OR REPLACE FUNCTION ml_dump_last_30_days()
RETURNS TABLE (
  response_id uuid,
  user_id uuid,
  model text,
  created_at timestamptz,
  prompt_chars int,
  response_chars int,
  tokens_out int,
  liked_count bigint,
  disliked_count bigint,
  copied_count bigint,
  label_helpful int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    response_id,
    user_id,
    model,
    created_at,
    length(prompt_text) as prompt_chars,
    length(response_text) as response_chars,
    tokens_out,
    liked_count,
    disliked_count,
    copied_count,
    (CASE WHEN liked_count > disliked_count THEN 1 ELSE 0 END) as label_helpful
  FROM ml_response_samples
  WHERE created_at >= now() - interval '30 days'
  ORDER BY created_at DESC;
$$;

-- =====================================================
-- 2. ML Export Function (Custom Date Range)
-- =====================================================
CREATE OR REPLACE FUNCTION ml_dump_date_range(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
  response_id uuid,
  user_id uuid,
  model text,
  created_at timestamptz,
  prompt_chars int,
  response_chars int,
  tokens_out int,
  cost_usd numeric,
  latency_ms int,
  liked_count bigint,
  disliked_count bigint,
  copied_count bigint,
  helpful_score bigint,
  was_copied int,
  label_helpful int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    response_id,
    user_id,
    model,
    created_at,
    length(prompt_text) as prompt_chars,
    length(response_text) as response_chars,
    tokens_out,
    cost_usd,
    latency_ms,
    liked_count,
    disliked_count,
    copied_count,
    helpful_score,
    was_copied,
    (CASE WHEN liked_count > disliked_count THEN 1 ELSE 0 END) as label_helpful
  FROM ml_response_samples
  WHERE created_at BETWEEN start_date AND end_date
  ORDER BY created_at DESC;
$$;

-- =====================================================
-- 3. Cleanup Old Responses Function
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_responses(days_to_keep int DEFAULT 180)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  -- Delete responses older than retention period
  DELETE FROM responses
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also cleanup orphaned prompts (no responses)
  DELETE FROM prompts p
  WHERE NOT EXISTS (
    SELECT 1 FROM responses r WHERE r.prompt_id = p.prompt_id
  )
  AND p.created_at < now() - (days_to_keep || ' days')::interval;
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 4. Comments
-- =====================================================
COMMENT ON FUNCTION ml_dump_last_30_days IS 'Export ML-ready dataset for last 30 days';
COMMENT ON FUNCTION ml_dump_date_range IS 'Export ML-ready dataset for custom date range';
COMMENT ON FUNCTION cleanup_old_responses IS 'Delete old responses and orphaned prompts';

-- =====================================================
-- Migration Complete
-- =====================================================
