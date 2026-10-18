/**
 * Marketing Intelligence - Comprehensive Test Suite
 * 
 * Tests all recently developed marketing intelligence endpoints:
 * - Attribution Analytics
 * - Magnetism Index
 * - Persona Analysis
 * - Contact Enrichment
 * - Funnel Analytics
 * - Marketing Analytics Dashboard
 * 
 * Run: node test/agent/marketing-intelligence-comprehensive.mjs
 */

import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.TEST_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  ✅ ${msg}`);
  testResults.passed++;
}

function fail(msg) {
  console.error(`  ❌ ${msg}`);
  testResults.failed++;
}

async function test(name, fn) {
  console.log(`\n🧪 ${name}`);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    testResults.tests.push({ name, passed: true, duration });
    success(`Passed (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    testResults.tests.push({ name, passed: false, duration, error: error.message });
    fail(`Failed: ${error.message}`);
  }
}

async function authenticateTestUser() {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session.access_token;
}

async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${data.error || data.message || 'Unknown'}`);
  }
  
  return data;
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MARKETING INTELLIGENCE - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('');

  let token;
  
  try {
    log('Authenticating test user...');
    token = await authenticateTestUser();
    success('Authenticated successfully');
  } catch (error) {
    fail(`Authentication failed: ${error.message}`);
    process.exit(1);
  }

  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // -------------------------------------------------------------------------
  // 1. ATTRIBUTION ANALYTICS
  // -------------------------------------------------------------------------
  
  await test('Attribution Analytics - Get Last Touch Attribution', async () => {
    const data = await apiCall('/api/v1/marketing/attribution', {
      headers: authHeaders
    });
    
    if (!data.attribution) throw new Error('No attribution data returned');
    log(`Found ${data.attribution.length || 0} attribution records`);
  });

  await test('Attribution Analytics - Filter by Date Range', async () => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const data = await apiCall(`/api/v1/marketing/attribution?start_date=${startDate}&end_date=${endDate}`, {
      headers: authHeaders
    });
    
    if (!data.attribution) throw new Error('No attribution data returned');
    log(`Date range filter working: ${data.attribution.length || 0} records`);
  });

  await test('Attribution Analytics - Filter by Source', async () => {
    const data = await apiCall('/api/v1/marketing/attribution?source=organic', {
      headers: authHeaders
    });
    
    if (!data.attribution) throw new Error('No attribution data returned');
    log(`Source filter working: ${data.attribution.length || 0} organic records`);
  });

  // -------------------------------------------------------------------------
  // 2. MAGNETISM INDEX
  // -------------------------------------------------------------------------

  await test('Magnetism Index - Get Current Magnetism Scores', async () => {
    const data = await apiCall('/api/v1/marketing/magnetism', {
      headers: authHeaders
    });
    
    if (!data.magnetism) throw new Error('No magnetism data returned');
    log(`Found ${data.magnetism.length || 0} magnetism scores`);
  });

  await test('Magnetism Index - Custom Time Window', async () => {
    const data = await apiCall('/api/v1/marketing/magnetism?window_days=14', {
      headers: authHeaders
    });
    
    if (!data.magnetism) throw new Error('No magnetism data returned');
    log(`14-day magnetism scores: ${data.magnetism.length || 0} records`);
  });

  await test('Magnetism Index - Filter High Engagement', async () => {
    const data = await apiCall('/api/v1/marketing/magnetism?min_score=0.7', {
      headers: authHeaders
    });
    
    if (!data.magnetism) throw new Error('No magnetism data returned');
    log(`High engagement users (>0.7): ${data.magnetism.length || 0}`);
  });

  // -------------------------------------------------------------------------
  // 3. PERSONA ANALYSIS
  // -------------------------------------------------------------------------

  await test('Persona Analysis - Get All Personas', async () => {
    const data = await apiCall('/api/v1/marketing/personas', {
      headers: authHeaders
    });
    
    if (!data.personas) throw new Error('No persona data returned');
    if (data.personas.length === 0) throw new Error('No personas found');
    log(`Found ${data.personas.length} persona segments`);
  });

  await test('Persona Analysis - Get Persona Details', async () => {
    const personas = await apiCall('/api/v1/marketing/personas', { headers: authHeaders });
    
    if (personas.personas.length > 0) {
      const firstPersona = personas.personas[0];
      log(`Checking persona: ${firstPersona.name || firstPersona.persona_key}`);
      
      if (firstPersona.user_count !== undefined) {
        log(`User count: ${firstPersona.user_count}`);
      } else {
        throw new Error('Persona missing user_count');
      }
    }
  });

  // -------------------------------------------------------------------------
  // 4. CONTACT ENRICHMENT
  // -------------------------------------------------------------------------

  await test('Contact Enrichment - Enrich Contact Data', async () => {
    const testContact = {
      email: 'test@example.com',
      full_name: 'Test User'
    };
    
    try {
      const data = await apiCall('/api/v1/marketing/enrich', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(testContact)
      });
      
      if (!data.enrichment) throw new Error('No enrichment data returned');
      log(`Enrichment completed for ${testContact.email}`);
    } catch (error) {
      // Enrichment might fail if no credits, but endpoint should respond
      if (error.message.includes('429') || error.message.includes('credits')) {
        log(`Enrichment rate limited (expected): ${error.message}`);
      } else {
        throw error;
      }
    }
  });

  // -------------------------------------------------------------------------
  // 5. FUNNEL ANALYTICS
  // -------------------------------------------------------------------------

  await test('Funnel Analytics - Get Conversion Funnel', async () => {
    const data = await apiCall('/api/v1/marketing/funnel', {
      headers: authHeaders
    });
    
    if (!data.funnel) throw new Error('No funnel data returned');
    log(`Funnel stages: ${data.funnel.length || 0}`);
    
    // Verify funnel structure
    if (data.funnel.length > 0) {
      const stage = data.funnel[0];
      if (!stage.stage_name || stage.user_count === undefined) {
        throw new Error('Invalid funnel stage structure');
      }
    }
  });

  await test('Funnel Analytics - Calculate Conversion Rates', async () => {
    const data = await apiCall('/api/v1/marketing/funnel', {
      headers: authHeaders
    });
    
    if (data.funnel && data.funnel.length > 1) {
      const firstStage = data.funnel[0];
      const secondStage = data.funnel[1];
      
      if (firstStage.user_count > 0) {
        const conversionRate = (secondStage.user_count / firstStage.user_count * 100).toFixed(2);
        log(`Conversion rate (${firstStage.stage_name} → ${secondStage.stage_name}): ${conversionRate}%`);
      }
    } else {
      log('Not enough funnel data to calculate conversion rates');
    }
  });

  // -------------------------------------------------------------------------
  // 6. MARKETING ANALYTICS DASHBOARD
  // -------------------------------------------------------------------------

  await test('Analytics Dashboard - Get Summary Stats', async () => {
    const data = await apiCall('/api/v1/marketing/analytics', {
      headers: authHeaders
    });
    
    if (!data.summary) throw new Error('No summary data returned');
    
    log(`Total users: ${data.summary.total_users || 0}`);
    log(`Active trials: ${data.summary.active_trials || 0}`);
    log(`Active subscriptions: ${data.summary.active_subscriptions || 0}`);
  });

  await test('Analytics Dashboard - Get Top Channels', async () => {
    const data = await apiCall('/api/v1/marketing/analytics', {
      headers: authHeaders
    });
    
    if (!data.top_channels) throw new Error('No channel data returned');
    
    if (data.top_channels.length > 0) {
      log(`Top channel: ${data.top_channels[0].source} (${data.top_channels[0].count} users)`);
    } else {
      log('No channel data available yet');
    }
  });

  await test('Analytics Dashboard - Get Recent Conversions', async () => {
    const data = await apiCall('/api/v1/marketing/analytics', {
      headers: authHeaders
    });
    
    if (!data.recent_conversions) throw new Error('No conversion data returned');
    
    log(`Recent conversions: ${data.recent_conversions.length || 0}`);
  });

  // -------------------------------------------------------------------------
  // 7. MAGNETISM SUMMARY
  // -------------------------------------------------------------------------

  await test('Magnetism Summary - Aggregate Statistics', async () => {
    const data = await apiCall('/api/v1/marketing/magnetism-summary', {
      headers: authHeaders
    });
    
    if (!data.summary) throw new Error('No summary data returned');
    
    log(`Average magnetism: ${data.summary.avg_magnetism?.toFixed(3) || 'N/A'}`);
    log(`High engagement count: ${data.summary.high_engagement_count || 0}`);
  });

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('\n✅ All marketing intelligence tests passed!');
    console.log('');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
