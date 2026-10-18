-- =====================================================
-- VERIFY DATABASE SETUP
-- Run this AFTER the complete setup to verify everything
-- =====================================================

-- Check Marketing Intelligence Data
SELECT 
  'user_event' as table_name, 
  COUNT(*) as records,
  CASE WHEN COUNT(*) >= 19 THEN '✅' ELSE '❌' END as status
FROM user_event

UNION ALL

SELECT 
  'campaign', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 1 THEN '✅' ELSE '❌' END
FROM campaign

UNION ALL

SELECT 
  'persona_bucket', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 3 THEN '✅' ELSE '❌' END
FROM persona_bucket

UNION ALL

SELECT 
  'user_magnetism_index', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 1 THEN '✅' ELSE '❌' END
FROM user_magnetism_index

UNION ALL

SELECT 
  'user_intent_score', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 1 THEN '✅' ELSE '❌' END
FROM user_intent_score

-- Check Meta Platforms Tables
UNION ALL

SELECT 
  'conversation_thread (Meta)', 
  COUNT(*),
  '✅' -- Can be 0, just checking table exists
FROM conversation_thread

UNION ALL

SELECT 
  'conversation_message (Meta)', 
  COUNT(*),
  '✅'
FROM conversation_message

UNION ALL

SELECT 
  'meta_platform_config (Meta)', 
  COUNT(*),
  '✅'
FROM meta_platform_config

UNION ALL

SELECT 
  'ad_performance (Meta)', 
  COUNT(*),
  '✅'
FROM ad_performance

UNION ALL

SELECT 
  'meta_conversion_event (Meta)', 
  COUNT(*),
  '✅'
FROM meta_conversion_event

UNION ALL

SELECT 
  'meta_webhook_event (Meta)', 
  COUNT(*),
  '✅'
FROM meta_webhook_event;

-- Verify functions exist
SELECT 
  'Functions Check' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 3 THEN '✅ All functions created' ELSE '❌ Missing functions' END as status
FROM pg_proc
WHERE proname IN ('is_in_messaging_window', 'log_message_as_event', 'update_thread_timestamp');

-- Verify triggers exist
SELECT 
  'Triggers Check' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 2 THEN '✅ All triggers created' ELSE '❌ Missing triggers' END as status
FROM pg_trigger
WHERE tgname IN ('trigger_message_to_event', 'trigger_update_thread_timestamp');

-- Sample the data
SELECT '
===============================================
SAMPLE DATA CHECK
===============================================
' as info;

SELECT 
  'Recent User Events:' as info,
  etype as event_type,
  source,
  occurred_at
FROM user_event
ORDER BY occurred_at DESC
LIMIT 5;

SELECT '
Magnetism Score:' as info,
  index_value,
  time_window,
  details->>'events_last_7d' as events_last_7d
FROM user_magnetism_index
ORDER BY computed_at DESC
LIMIT 1;

SELECT '
Intent Score:' as info,
  score,
  details->>'period' as period,
  details->>'total_events' as total_events
FROM user_intent_score
ORDER BY computed_at DESC
LIMIT 1;
