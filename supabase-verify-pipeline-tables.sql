-- Verification script for pipeline tables
-- Run this to check if all pipeline-related tables are properly configured

-- 1. Check if contact_pipeline_history table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'contact_pipeline_history'
    ) 
    THEN '✅ contact_pipeline_history table exists'
    ELSE '❌ contact_pipeline_history table MISSING'
  END as table_check;

-- 2. Check all columns in contact_pipeline_history
SELECT 
  '📋 Columns in contact_pipeline_history:' as info;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contact_pipeline_history'
ORDER BY ordinal_position;

-- 3. Check if contact_pipeline_state table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'contact_pipeline_state'
    ) 
    THEN '✅ contact_pipeline_state table exists'
    ELSE '❌ contact_pipeline_state table MISSING'
  END as table_check;

-- 4. Check RLS policies on contact_pipeline_history
SELECT 
  '🔒 RLS Policies on contact_pipeline_history:' as info;

SELECT 
  policyname,
  cmd,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE tablename = 'contact_pipeline_history';

-- 5. Check indexes on contact_pipeline_history
SELECT 
  '📊 Indexes on contact_pipeline_history:' as info;

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'contact_pipeline_history';

-- 6. Check if pipelines table has data
SELECT 
  '📦 Pipelines in database:' as info;

SELECT 
  id,
  key,
  name,
  org_id
FROM pipelines
LIMIT 5;

-- 7. Check if pipeline_stages table has data
SELECT 
  '🎯 Pipeline stages in database:' as info;

SELECT 
  ps.id,
  ps.key,
  ps.name,
  ps.position,
  p.name as pipeline_name
FROM pipeline_stages ps
JOIN pipelines p ON p.id = ps.pipeline_id
ORDER BY p.name, ps.position
LIMIT 10;

-- 8. Test insert permissions (this will fail if RLS is not configured correctly)
-- Uncomment to test:
-- INSERT INTO contact_pipeline_history (
--   org_id, 
--   contact_id, 
--   pipeline_id, 
--   to_stage_id, 
--   changed_by_user_id
-- ) VALUES (
--   'test-org-id'::uuid,
--   'test-contact-id'::uuid,
--   'test-pipeline-id'::uuid,
--   'test-stage-id'::uuid,
--   auth.uid()
-- );

SELECT '✅ All verification checks complete!' as final_message;
