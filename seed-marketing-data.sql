-- Seed Data for Marketing Intelligence Tests
-- Fixes funnel, persona, and magnetism calculation failures

-- ============================================================================
-- 1. FUNNEL STAGES
-- ============================================================================

-- Create funnel stages if not exists
INSERT INTO funnel_stage (stage_name, ordinal, conversion_threshold, description)
VALUES 
  ('ad_click', 1, 0.5, 'User clicked on advertisement'),
  ('landing_view', 2, 0.3, 'User viewed landing page'),
  ('signup', 3, 0.2, 'User created an account'),
  ('onboarding', 4, 0.15, 'User completed onboarding'),
  ('first_action', 5, 0.1, 'User performed first meaningful action'),
  ('active_user', 6, 0.05, 'User became active (7+ days)'),
  ('paying_customer', 7, 0.02, 'User converted to paying customer')
ON CONFLICT (stage_name) DO UPDATE
SET 
  ordinal = EXCLUDED.ordinal,
  conversion_threshold = EXCLUDED.conversion_threshold,
  description = EXCLUDED.description;

-- ============================================================================
-- 2. PERSONA BUCKETS
-- ============================================================================

-- Create persona buckets if not exists
INSERT INTO persona_bucket (label, description, priority, criteria)
VALUES 
  ('power_user', 'Highly engaged users with frequent activity', 1, '{"min_sessions": 10, "min_actions": 50}'),
  ('casual_user', 'Moderate engagement, regular check-ins', 2, '{"min_sessions": 3, "max_sessions": 10}'),
  ('dormant_user', 'Previously active, now inactive', 3, '{"days_inactive": 30}'),
  ('new_user', 'Recently signed up, exploring features', 4, '{"account_age_days": 7}'),
  ('at_risk', 'Declining engagement, potential churn', 5, '{"engagement_drop": 0.5}')
ON CONFLICT (label) DO UPDATE
SET 
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  criteria = EXCLUDED.criteria;

-- ============================================================================
-- 3. SAMPLE MAGNETISM DATA
-- ============================================================================

-- Create sample magnetism scores for existing users
-- This assumes user_event table exists and has data

-- Calculate and insert magnetism scores
INSERT INTO magnetism_score (user_id, score, signals, calculated_at, expires_at)
SELECT 
  ue.user_id,
  -- Simple magnetism calculation: more events = higher score
  LEAST(100, COUNT(*) * 5) as score,
  jsonb_build_object(
    'total_events', COUNT(*),
    'unique_days', COUNT(DISTINCT DATE(ue.created_at)),
    'recent_activity', COUNT(*) FILTER (WHERE ue.created_at > NOW() - INTERVAL '7 days')
  ) as signals,
  NOW() as calculated_at,
  NOW() + INTERVAL '24 hours' as expires_at
FROM user_event ue
WHERE ue.created_at > NOW() - INTERVAL '30 days'
GROUP BY ue.user_id
HAVING COUNT(*) > 0
ON CONFLICT (user_id) 
DO UPDATE SET
  score = EXCLUDED.score,
  signals = EXCLUDED.signals,
  calculated_at = EXCLUDED.calculated_at,
  expires_at = EXCLUDED.expires_at;

-- ============================================================================
-- 4. SAMPLE FUNNEL DATA
-- ============================================================================

-- Create sample funnel progress for users with events
INSERT INTO funnel_user_progress (user_id, stage_id, reached_at, converted)
SELECT DISTINCT
  ue.user_id,
  fs.stage_id,
  MIN(ue.created_at) as reached_at,
  true as converted
FROM user_event ue
CROSS JOIN funnel_stage fs
WHERE 
  ue.created_at > NOW() - INTERVAL '30 days'
  AND (
    (fs.stage_name = 'ad_click' AND ue.event_type IN ('ad_click', 'utm_tracking'))
    OR (fs.stage_name = 'landing_view' AND ue.event_type IN ('page_view', 'landing_view'))
    OR (fs.stage_name = 'signup' AND ue.event_type IN ('signup', 'user_created'))
  )
GROUP BY ue.user_id, fs.stage_id
ON CONFLICT (user_id, stage_id) DO NOTHING;

-- ============================================================================
-- 5. SAMPLE PERSONA ASSIGNMENTS
-- ============================================================================

-- Assign personas to users based on their activity
INSERT INTO user_persona (user_id, persona_bucket_id, assigned_at, confidence)
SELECT 
  ue.user_id,
  pb.bucket_id,
  NOW() as assigned_at,
  CASE 
    WHEN COUNT(*) > 50 THEN 0.9
    WHEN COUNT(*) > 20 THEN 0.7
    WHEN COUNT(*) > 10 THEN 0.5
    ELSE 0.3
  END as confidence
FROM user_event ue
CROSS JOIN persona_bucket pb
WHERE 
  ue.created_at > NOW() - INTERVAL '30 days'
  AND (
    (pb.label = 'power_user' AND (SELECT COUNT(*) FROM user_event WHERE user_id = ue.user_id) > 50)
    OR (pb.label = 'casual_user' AND (SELECT COUNT(*) FROM user_event WHERE user_id = ue.user_id) BETWEEN 10 AND 50)
    OR (pb.label = 'new_user' AND (SELECT COUNT(*) FROM user_event WHERE user_id = ue.user_id) < 10)
  )
GROUP BY ue.user_id, pb.bucket_id
ON CONFLICT (user_id, persona_bucket_id) 
DO UPDATE SET
  assigned_at = EXCLUDED.assigned_at,
  confidence = EXCLUDED.confidence;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check funnel stages
SELECT 'Funnel Stages' as check_type, COUNT(*) as count FROM funnel_stage;

-- Check persona buckets
SELECT 'Persona Buckets' as check_type, COUNT(*) as count FROM persona_bucket;

-- Check magnetism scores
SELECT 'Magnetism Scores' as check_type, COUNT(*) as count FROM magnetism_score;

-- Check funnel progress
SELECT 'Funnel Progress' as check_type, COUNT(*) as count FROM funnel_user_progress;

-- Check persona assignments
SELECT 'Persona Assignments' as check_type, COUNT(*) as count FROM user_persona;

-- Summary
SELECT 
  '✅ Marketing Intelligence Seed Data Complete' as status,
  (SELECT COUNT(*) FROM funnel_stage) as funnel_stages,
  (SELECT COUNT(*) FROM persona_bucket) as persona_buckets,
  (SELECT COUNT(*) FROM magnetism_score) as magnetism_scores,
  (SELECT COUNT(*) FROM funnel_user_progress) as funnel_progress,
  (SELECT COUNT(*) FROM user_persona) as persona_assignments;
