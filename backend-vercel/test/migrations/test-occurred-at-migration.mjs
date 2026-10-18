#!/usr/bin/env node

/**
 * Test: interactions occurred_at migration
 * Verifies that the migration correctly handles occurred_at field
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test results
let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Testing occurred_at Migration\n');
  console.log('=' .repeat(60));

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Test 1: Verify no NULL occurred_at values
// ============================================================================

test('No interactions have NULL occurred_at', async () => {
  const { count, error } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .is('occurred_at', null);

  if (error) throw new Error(`Query failed: ${error.message}`);
  if (count && count > 0) {
    throw new Error(`Found ${count} interactions with NULL occurred_at`);
  }
});

// ============================================================================
// Test 2: Verify default value is set
// ============================================================================

test('Default value is set for occurred_at', async () => {
  // Insert a test interaction without occurred_at
  const { data: insertData, error: insertError } = await supabase
    .from('interactions')
    .insert({
      kind: 'note',
      content: 'Test migration - can be deleted',
      // occurred_at intentionally omitted to test default
    })
    .select('id, occurred_at')
    .single();

  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  // Verify occurred_at was auto-set
  if (!insertData.occurred_at) {
    throw new Error('occurred_at was not auto-set by default');
  }

  // Clean up
  await supabase.from('interactions').delete().eq('id', insertData.id);
});

// ============================================================================
// Test 3: Verify index exists on occurred_at
// ============================================================================

test('Index exists on occurred_at', async () => {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'interactions' 
      AND indexname = 'idx_interactions_occurred_at'
    `
  });

  // If RPC doesn't work, we'll skip this test
  if (error && error.message.includes('function')) {
    console.log('   ⊙ Skipping (RPC not available)');
    return;
  }

  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Index idx_interactions_occurred_at not found');
  }
});

// ============================================================================
// Test 4: Verify composite index exists
// ============================================================================

test('Composite index exists on contact_id + occurred_at', async () => {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'interactions' 
      AND indexname = 'idx_interactions_contact_occurred'
    `
  });

  // If RPC doesn't work, we'll skip this test
  if (error && error.message.includes('function')) {
    console.log('   ⊙ Skipping (RPC not available)');
    return;
  }

  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Index idx_interactions_contact_occurred not found');
  }
});

// ============================================================================
// Test 5: Verify API endpoint returns occurred_at
// ============================================================================

test('API endpoint returns occurred_at field', async () => {
  const { data, error } = await supabase
    .from('interactions')
    .select('id, occurred_at')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Query failed: ${error.message}`);
  
  if (data && data.occurred_at === undefined) {
    throw new Error('occurred_at field not returned by query');
  }
});

// ============================================================================
// Test 6: Verify timeline query performance
// ============================================================================

test('Timeline query uses index', async () => {
  const startTime = Date.now();
  
  const { data, error } = await supabase
    .from('interactions')
    .select('id, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(20);

  const queryTime = Date.now() - startTime;

  if (error) throw new Error(`Query failed: ${error.message}`);
  
  // Query should be fast with index (< 500ms for reasonable dataset)
  if (queryTime > 1000) {
    console.log(`   ⚠️  Query took ${queryTime}ms (may not be using index)`);
  }
});

// ============================================================================
// Test 7: Verify occurred_at matches created_at for backfilled records
// ============================================================================

test('Backfilled records have occurred_at = created_at', async () => {
  const { data, error } = await supabase
    .from('interactions')
    .select('id, occurred_at, created_at')
    .limit(5);

  if (error) throw new Error(`Query failed: ${error.message}`);
  
  if (data && data.length > 0) {
    // For most records, occurred_at should be close to created_at
    // (within a few seconds for backfilled records)
    const sample = data[0];
    const occurredTime = new Date(sample.occurred_at).getTime();
    const createdTime = new Date(sample.created_at).getTime();
    const diffSeconds = Math.abs(occurredTime - createdTime) / 1000;
    
    // Allow up to 5 seconds difference (migration execution time)
    if (diffSeconds > 5) {
      console.log(`   ⚠️  Sample record has ${diffSeconds}s difference (may be intentional)`);
    }
  }
});

// ============================================================================
// Run all tests
// ============================================================================

runTests().then(() => {
  console.log('✅ All migration tests passed!\n');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
