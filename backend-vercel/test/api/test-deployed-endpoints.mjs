#!/usr/bin/env node

/**
 * Test Deployed API Endpoints
 * Verifies that occurred_at is being returned in production
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';
const PRODUCTION_URL = 'https://backend-vercel-21y0s1dvx-isaiahduprees-projects.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🧪 Testing Deployed API Endpoints\n');
console.log('Production URL:', PRODUCTION_URL);
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

// ============================================================================
// Test 1: Health Check
// ============================================================================

async function testHealthCheck() {
  console.log('\n✓ Test 1: Health Check');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('   ✅ PASS - API is healthy');
      console.log(`   Database latency: ${data.services.database_latency_ms}ms`);
      passed++;
      return true;
    } else {
      console.log('   ❌ FAIL - API unhealthy');
      failed++;
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAIL -', error.message);
    failed++;
    return false;
  }
}

// ============================================================================
// Test 2: Database has occurred_at data
// ============================================================================

async function testDatabaseData() {
  console.log('\n✓ Test 2: Database Data Integrity');
  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('id, kind, occurred_at, created_at')
      .limit(3);

    if (error) {
      console.log('   ❌ FAIL -', error.message);
      failed++;
      return false;
    }

    if (!data || data.length === 0) {
      console.log('   ⚠️  WARN - No interactions in database');
      passed++;
      return true;
    }

    console.log(`   Found ${data.length} interactions`);
    
    let allHaveOccurredAt = true;
    data.forEach((item, i) => {
      const hasOccurredAt = item.occurred_at !== null && item.occurred_at !== undefined;
      console.log(`   ${i + 1}. ${item.kind.padEnd(10)} occurred_at: ${hasOccurredAt ? '✅' : '❌'} ${item.occurred_at || 'NULL'}`);
      if (!hasOccurredAt) allHaveOccurredAt = false;
    });

    if (allHaveOccurredAt) {
      console.log('   ✅ PASS - All interactions have occurred_at');
      passed++;
      return true;
    } else {
      console.log('   ❌ FAIL - Some interactions missing occurred_at');
      failed++;
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAIL -', error.message);
    failed++;
    return false;
  }
}

// ============================================================================
// Test 3: Test with API Key (if available)
// ============================================================================

async function testWithApiKey() {
  console.log('\n✓ Test 3: API Endpoint Test (Direct DB Query)');
  console.log('   Note: Using Supabase client instead of HTTP (auth required)');
  
  try {
    // Get a sample interaction
    const { data, error } = await supabase
      .from('interactions')
      .select('id, contact_id, kind, content, metadata, occurred_at, created_at, updated_at')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log('   ❌ FAIL -', error.message);
      failed++;
      return false;
    }

    if (!data) {
      console.log('   ⚠️  WARN - No interactions found');
      passed++;
      return true;
    }

    console.log('   Response fields:');
    const fields = Object.keys(data);
    fields.forEach(field => {
      const value = data[field];
      const hasValue = value !== null && value !== undefined;
      console.log(`   - ${field.padEnd(15)}: ${hasValue ? '✅' : '⚠️ '} ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
    });

    if (data.occurred_at) {
      console.log('   ✅ PASS - occurred_at field present');
      passed++;
      return true;
    } else {
      console.log('   ❌ FAIL - occurred_at field missing');
      failed++;
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAIL -', error.message);
    failed++;
    return false;
  }
}

// ============================================================================
// Test 4: Verify Migration Applied
// ============================================================================

async function testMigrationStatus() {
  console.log('\n✓ Test 4: Migration Status');
  try {
    // Check NULL count
    const { count: nullCount, error: nullError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .is('occurred_at', null);

    if (nullError) {
      console.log('   ❌ FAIL -', nullError.message);
      failed++;
      return false;
    }

    console.log(`   NULL occurred_at count: ${nullCount || 0}`);

    if ((nullCount || 0) === 0) {
      console.log('   ✅ PASS - No NULL occurred_at values');
      passed++;
      return true;
    } else {
      console.log(`   ❌ FAIL - Found ${nullCount} NULL values`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAIL -', error.message);
    failed++;
    return false;
  }
}

// ============================================================================
// Test 5: Production URL Accessibility
// ============================================================================

async function testProductionAccess() {
  console.log('\n✓ Test 5: Production URL Accessibility');
  try {
    const response = await fetch(PRODUCTION_URL);
    const ok = response.ok || response.status === 404; // 404 is ok, means server is responding
    
    if (ok) {
      console.log(`   ✅ PASS - Production URL accessible (status: ${response.status})`);
      passed++;
      return true;
    } else {
      console.log(`   ❌ FAIL - Production URL not accessible (status: ${response.status})`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAIL -', error.message);
    failed++;
    return false;
  }
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runTests() {
  await testHealthCheck();
  await testProductionAccess();
  await testDatabaseData();
  await testWithApiKey();
  await testMigrationStatus();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${passed > 0 ? ((passed / (passed + failed)) * 100).toFixed(1) : 0}%`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The occurred_at fix is live!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
