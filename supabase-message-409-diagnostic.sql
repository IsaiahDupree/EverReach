-- Diagnostic queries for 409 Conflict error in message saving
-- Run these queries in Supabase SQL Editor to identify the issue

-- 1. Find orphaned messages (messages without variants)
-- These could cause 409 errors if the cleanup failed
SELECT 
  gm.id,
  gm.created_at,
  gm.person_id,
  gm.channel_selected,
  gm.status,
  gm.org_id,
  gm.user_id
FROM generated_messages gm
LEFT JOIN message_variants mv ON mv.message_id = gm.id
WHERE mv.id IS NULL
ORDER BY gm.created_at DESC
LIMIT 20;

-- 2. Find duplicate variants (should not exist due to unique constraint)
-- If this returns rows, there's a data integrity issue
SELECT 
  message_id,
  variant_index,
  COUNT(*) as duplicate_count
FROM message_variants
GROUP BY message_id, variant_index
HAVING COUNT(*) > 1;

-- 3. Check recent message creation activity
-- Look for patterns of failed insertions
SELECT 
  gm.id,
  gm.created_at,
  gm.person_id,
  gm.channel_selected,
  COUNT(mv.id) as variant_count
FROM generated_messages gm
LEFT JOIN message_variants mv ON mv.message_id = gm.id
WHERE gm.created_at > NOW() - INTERVAL '1 hour'
GROUP BY gm.id, gm.created_at, gm.person_id, gm.channel_selected
ORDER BY gm.created_at DESC;

-- 4. Check for messages with incomplete variants
-- Should have 1-3 variants, if less than expected, cleanup may have failed
SELECT 
  gm.id,
  gm.created_at,
  gm.person_id,
  COUNT(mv.id) as variant_count
FROM generated_messages gm
LEFT JOIN message_variants mv ON mv.message_id = gm.id
GROUP BY gm.id, gm.created_at, gm.person_id
HAVING COUNT(mv.id) = 0 OR COUNT(mv.id) > 3
ORDER BY gm.created_at DESC
LIMIT 20;

-- 5. Verify RLS policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('generated_messages', 'message_variants')
ORDER BY tablename, policyname;

-- 6. Check if user has proper org membership
-- Replace 'YOUR_USER_ID' with the actual user ID from the error logs
-- SELECT 
--   uo.org_id,
--   uo.user_id,
--   uo.role,
--   o.name as org_name
-- FROM user_orgs uo
-- JOIN orgs o ON o.id = uo.org_id
-- WHERE uo.user_id = 'YOUR_USER_ID';

-- CLEANUP QUERIES (run only if you find orphaned messages)

-- 7. Delete orphaned messages (messages without variants)
-- CAUTION: This will permanently delete data
-- Uncomment to run:
-- DELETE FROM generated_messages
-- WHERE id IN (
--   SELECT gm.id
--   FROM generated_messages gm
--   LEFT JOIN message_variants mv ON mv.message_id = gm.id
--   WHERE mv.id IS NULL
-- );

-- 8. Delete old draft messages (older than 7 days)
-- CAUTION: This will permanently delete data
-- Uncomment to run:
-- DELETE FROM generated_messages
-- WHERE status = 'draft'
-- AND created_at < NOW() - INTERVAL '7 days';

-- VERIFICATION QUERIES (run after cleanup)

-- 9. Verify all messages have variants
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT gm.id) as messages_with_variants
FROM generated_messages gm
INNER JOIN message_variants mv ON mv.message_id = gm.id;

-- 10. Check variant distribution
SELECT 
  variant_count,
  COUNT(*) as message_count
FROM (
  SELECT 
    gm.id,
    COUNT(mv.id) as variant_count
  FROM generated_messages gm
  LEFT JOIN message_variants mv ON mv.message_id = gm.id
  GROUP BY gm.id
) as variant_stats
GROUP BY variant_count
ORDER BY variant_count;
