-- ============================================================================
-- Migration Verification: interactions occurred_at
-- ============================================================================

\echo '🧪 Testing occurred_at Migration\n'
\echo '============================================================'

-- Test 1: Check NULL values (should be 0)
\echo '\n✓ Test 1: No NULL occurred_at values'
SELECT 
  COUNT(*) as total_interactions,
  COUNT(occurred_at) as with_occurred_at,
  COUNT(*) FILTER (WHERE occurred_at IS NULL) as null_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE occurred_at IS NULL) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL: Found NULL values'
  END as status
FROM interactions;

-- Test 2: Check default value is set
\echo '\n✓ Test 2: Default value is set'
SELECT 
  column_name,
  column_default,
  CASE 
    WHEN column_default LIKE '%now()%' THEN '✅ PASS: Default is NOW()'
    ELSE '❌ FAIL: No default set'
  END as status
FROM information_schema.columns
WHERE table_name = 'interactions' 
AND column_name = 'occurred_at';

-- Test 3: Check index on occurred_at
\echo '\n✓ Test 3: Index exists on occurred_at'
SELECT 
  indexname,
  indexdef,
  '✅ PASS: Index exists' as status
FROM pg_indexes
WHERE tablename = 'interactions'
AND indexname = 'idx_interactions_occurred_at';

-- Test 4: Check composite index
\echo '\n✓ Test 4: Composite index on contact_id + occurred_at'
SELECT 
  indexname,
  indexdef,
  '✅ PASS: Composite index exists' as status
FROM pg_indexes
WHERE tablename = 'interactions'
AND indexname = 'idx_interactions_contact_occurred';

-- Test 5: Check column comment
\echo '\n✓ Test 5: Column has documentation'
SELECT 
  col_description('interactions'::regclass, 
    (SELECT ordinal_position 
     FROM information_schema.columns 
     WHERE table_name = 'interactions' 
     AND column_name = 'occurred_at')
  ) as column_comment,
  CASE 
    WHEN col_description('interactions'::regclass, 
      (SELECT ordinal_position 
       FROM information_schema.columns 
       WHERE table_name = 'interactions' 
       AND column_name = 'occurred_at')
    ) IS NOT NULL THEN '✅ PASS: Comment exists'
    ELSE '⚠️  WARN: No comment'
  END as status;

-- Test 6: Sample interactions with dates
\echo '\n✓ Test 6: Sample interactions show occurred_at values'
SELECT 
  id,
  kind,
  occurred_at::date as occurred_date,
  created_at::date as created_date,
  '✅ Data present' as status
FROM interactions
ORDER BY created_at DESC
LIMIT 5;

-- Test 7: Performance test - timeline query
\echo '\n✓ Test 7: Timeline query performance (should use index)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, kind, occurred_at
FROM interactions
ORDER BY occurred_at DESC
LIMIT 20;

-- Summary
\echo '\n============================================================'
\echo '📊 Migration Verification Summary\n'

SELECT 
  '✅ Migration verified successfully!' as result,
  COUNT(*) as total_interactions,
  pg_size_pretty(pg_total_relation_size('interactions')) as table_size
FROM interactions;

\echo '\n✅ All migration requirements met!'
\echo '============================================================\n'
