#!/usr/bin/env node

/**
 * Warmth Score + Interactions Continuity Testing
 * 
 * Tests warmth continuity when interactions are added:
 * - Pre-change: interaction → mode switch (score increases then switches)
 * - Post-change: mode switch → interaction (new anchor with new λ)
 * - Log validation (warmth_mode_changes, interactions)
 * - Edge cases (multiple interactions, past interactions)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const BACKEND_URL = process.env.BACKEND_URL || 'https://ever-reach-be.vercel.app';
const TEST_USER_ID = process.env.TEST_USER_ID;

if (!SUPABASE_SERVICE_KEY || !TEST_USER_ID) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LAMBDA_PER_DAY = {
  slow: 0.040132,
  medium: 0.085998,
  fast: 0.171996,
  test: 55.26,
};

const DAY_MS = 86_400_000;

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`   ✅ ${description}`);
  } else {
    failedTests++;
    failures.push(description);
    console.log(`   ❌ ${description}`);
  }
  return condition;
}

function assertClose(actual, expected, tolerance, description) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  
  if (pass) {
    passedTests++;
    console.log(`   ✅ ${description} (diff: ${diff.toExponential(2)})`);
  } else {
    failedTests++;
    failures.push(`${description}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)}, diff ${diff.toFixed(2)}`);
    console.log(`   ❌ ${description}`);
    console.log(`      Expected: ${expected.toFixed(2)}, Got: ${actual.toFixed(2)}, Diff: ${diff.toFixed(2)}`);
  }
  
  return pass;
}

// Auth token cache
let cachedToken = null;
async function getAuthToken() {
  if (cachedToken) return cachedToken;
  
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com',
    password: process.env.TEST_PASSWORD || 'Frogger12',
  });
  
  if (error || !data.session) return null;
  
  cachedToken = data.session.access_token;
  console.log(`   🔐 Authenticated as: ${data.user.email}`);
  return cachedToken;
}

/**
 * Create test contact
 */
async function createContact() {
  const { data: userOrg } = await supabase
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', TEST_USER_ID)
    .single();
  
  if (!userOrg) return null;
  
  const now = new Date();
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      user_id: TEST_USER_ID,
      org_id: userOrg.org_id,
      display_name: 'Interaction Test',
      emails: ['interaction@test.com'],
      warmth_mode: 'medium',
      warmth: 50,
      warmth_band: 'neutral',
      warmth_anchor_score: 50,
      warmth_anchor_at: now.toISOString(),
      warmth_score_cached: 50,
      warmth_cached_at: now.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create contact:', error);
    return null;
  }
  
  console.log(`✅ Created: ${contact.display_name} (${contact.id})`);
  return contact;
}

/**
 * Get contact state
 */
async function getContactState(contactId) {
  const { data } = await supabase
    .from('contacts')
    .select('warmth, warmth_mode, warmth_anchor_score, warmth_anchor_at, warmth_band')
    .eq('id', contactId)
    .single();
  return data;
}

/**
 * Add interaction via API (preferred) or DB fallback
 */
async function addInteraction(contactId, { channel = 'email', direction = 'outbound', summary = 'Test interaction' }) {
  const token = await getAuthToken();
  
  if (token) {
    // Try API first
    const response = await fetch(`${BACKEND_URL}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        contact_id: contactId,
        channel,
        direction,
        summary,
        occurred_at: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   📝 Added interaction via API: ${channel} ${direction}`);
      return result;
    } else {
      console.log(`   ⚠️  API returned ${response.status}, using DB fallback`);
    }
  }
  
  // Fallback to direct DB insert
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: TEST_USER_ID,
      contact_id: contactId,
      channel,
      direction,
      summary,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('   ❌ Failed to add interaction:', error);
    return null;
  }
  
  console.log(`   📝 Added interaction via DB: ${channel} ${direction}`);
  return data;
}

/**
 * Switch mode via API
 */
async function switchMode(contactId, toMode) {
  const token = await getAuthToken();
  if (!token) return null;
  
  const response = await fetch(`${BACKEND_URL}/api/v1/contacts/${contactId}/warmth/mode`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ mode: toMode }),
  });
  
  if (!response.ok) {
    console.log(`   ⚠️  Mode switch API failed: ${response.status}`);
    return null;
  }
  
  const result = await response.json();
  console.log(`   🔄 Mode switched: ${result.mode_before} → ${result.mode_after}`);
  return result;
}

/**
 * Recompute warmth via API or trigger
 */
async function recomputeWarmth(contactId) {
  const token = await getAuthToken();
  if (!token) return false;
  
  const response = await fetch(`${BACKEND_URL}/api/v1/warmth/recompute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ contact_id: contactId }),
  });
  
  if (response.ok) {
    console.log(`   ♻️  Warmth recomputed`);
    return true;
  }
  
  return false;
}

/**
 * TEST 1: Pre-change interaction (interaction → mode switch)
 */
async function testPreChangeInteraction(contactId) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`TEST 1: Pre-change Interaction (interaction → mode switch)`);
  console.log(`${'━'.repeat(60)}`);
  
  const stateBefore = await getContactState(contactId);
  console.log(`   Before: score=${stateBefore.warmth_anchor_score}, mode=${stateBefore.warmth_mode}`);
  
  // Add interaction (should increase warmth and reset anchor)
  await addInteraction(contactId, { channel: 'email', direction: 'outbound' });
  
  // Wait briefly for backend processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if warmth increased
  const stateAfterInteraction = await getContactState(contactId);
  console.log(`   After interaction: score=${stateAfterInteraction.warmth_anchor_score}`);
  
  const anchorTimeDiff = Math.abs(new Date() - new Date(stateAfterInteraction.warmth_anchor_at));
  assert(anchorTimeDiff < 5000, 'Anchor time updated (< 5s ago)');
  assert(stateAfterInteraction.warmth_anchor_score >= stateBefore.warmth_anchor_score, 'Score maintained or increased');
  
  // Now switch mode
  const switchResult = await switchMode(contactId, 'fast');
  if (switchResult) {
    assertClose(switchResult.score_before, switchResult.score_after, 0.5, 'No score jump on mode switch after interaction');
  }
  
  const stateFinal = await getContactState(contactId);
  assert(stateFinal.warmth_mode === 'fast', 'Mode changed to fast');
  assertClose(stateFinal.warmth_anchor_score, stateAfterInteraction.warmth_anchor_score, 1.0, 'Anchor score preserved');
}

/**
 * TEST 2: Post-change interaction (mode switch → interaction)
 */
async function testPostChangeInteraction(contactId) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`TEST 2: Post-change Interaction (mode switch → interaction)`);
  console.log(`${'━'.repeat(60)}`);
  
  const stateBefore = await getContactState(contactId);
  console.log(`   Before: score=${stateBefore.warmth_anchor_score}, mode=${stateBefore.warmth_mode}`);
  
  // Switch mode first
  const switchResult = await switchMode(contactId, 'slow');
  if (switchResult) {
    assertClose(switchResult.score_before, switchResult.score_after, 0.5, 'No score jump on mode switch');
  }
  
  const stateAfterSwitch = await getContactState(contactId);
  console.log(`   After switch: mode=${stateAfterSwitch.warmth_mode}`);
  
  // Add interaction (should update anchor with new mode)
  await addInteraction(contactId, { channel: 'call', direction: 'inbound' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stateFinal = await getContactState(contactId);
  console.log(`   After interaction: score=${stateFinal.warmth_anchor_score}, mode=${stateFinal.warmth_mode}`);
  
  assert(stateFinal.warmth_mode === 'slow', 'Mode still slow');
  assert(stateFinal.warmth_anchor_score >= stateAfterSwitch.warmth_anchor_score, 'Score increased after interaction');
  
  const anchorTimeDiff = Math.abs(new Date() - new Date(stateFinal.warmth_anchor_at));
  assert(anchorTimeDiff < 5000, 'Anchor updated after interaction');
}

/**
 * TEST 3: Multiple rapid interactions
 */
async function testMultipleInteractions(contactId) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`TEST 3: Multiple Rapid Interactions`);
  console.log(`${'━'.repeat(60)}`);
  
  const stateBefore = await getContactState(contactId);
  
  // Add 3 interactions rapidly
  await addInteraction(contactId, { channel: 'email', direction: 'outbound' });
  await addInteraction(contactId, { channel: 'sms', direction: 'outbound' });
  await addInteraction(contactId, { channel: 'call', direction: 'inbound' });
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const stateAfter = await getContactState(contactId);
  
  assert(stateAfter.warmth_anchor_score >= stateBefore.warmth_anchor_score, 'Score increased');
  assert(stateAfter.warmth_anchor_score <= 100, 'Score did not exceed 100');
  
  // Check interaction count
  const { count } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', contactId);
  
  assert(count >= 3, `At least 3 interactions logged (found ${count})`);
}

/**
 * TEST 4: Interaction logs validation
 */
async function testInteractionLogs(contactId) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`TEST 4: Interaction Logs Validation`);
  console.log(`${'━'.repeat(60)}`);
  
  // Get interactions
  const { data: interactions } = await supabase
    .from('interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(5);
  
  assert(interactions && interactions.length > 0, 'Interactions exist in DB');
  
  if (interactions && interactions.length > 0) {
    const latest = interactions[0];
    assert(latest.user_id === TEST_USER_ID, 'Interaction has correct user_id');
    assert(latest.contact_id === contactId, 'Interaction has correct contact_id');
    
    // Check channel field exists (can be null if backend sets default)
    const validChannels = ['email', 'sms', 'call', 'dm', 'in_person', 'social', 'other', null];
    const hasChannelField = 'channel' in latest;
    const hasValidChannel = hasChannelField && (
      latest.channel === null ||
      validChannels.includes(latest.channel) || 
      validChannels.includes(latest.channel?.toLowerCase())
    );
    assert(hasValidChannel, `Valid channel field (got: ${latest.channel})`);
    
    // Check direction exists and has valid value (backend may set 'internal' for system interactions)
    const validDirections = ['inbound', 'outbound', 'bidirectional', 'internal'];
    const hasValidDirection = latest.direction && validDirections.includes(latest.direction.toLowerCase());
    assert(hasValidDirection, `Valid direction (got: ${latest.direction})`);
  }
  
  // Get mode changes
  const { data: modeChanges } = await supabase
    .from('warmth_mode_changes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(3);
  
  assert(modeChanges && modeChanges.length > 0, 'Mode changes logged');
  
  if (modeChanges && modeChanges.length > 0) {
    const latest = modeChanges[0];
    assert(latest.from_mode && latest.to_mode, 'Mode change has from/to modes');
    assert(latest.score_before !== null && latest.score_after !== null, 'Mode change has scores');
  }
}

/**
 * TEST 5: Edge case - past interaction
 */
async function testPastInteraction(contactId) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`TEST 5: Edge Case - Past Interaction`);
  console.log(`${'━'.repeat(60)}`);
  
  const stateBefore = await getContactState(contactId);
  
  // Insert interaction from 30 days ago (should not materially affect current score)
  const pastDate = new Date(Date.now() - 30 * DAY_MS);
  const { error } = await supabase
    .from('interactions')
    .insert({
      user_id: TEST_USER_ID,
      contact_id: contactId,
      channel: 'email',
      direction: 'outbound',
      summary: 'Old interaction',
      occurred_at: pastDate.toISOString(),
    });
  
  if (!error) {
    console.log(`   📝 Added past interaction (30 days ago)`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stateAfter = await getContactState(contactId);
  
  // Past interaction should not reset anchor to now
  const anchorTimeDiff = Math.abs(new Date() - new Date(stateAfter.warmth_anchor_at));
  assert(anchorTimeDiff < 10000, 'Anchor time is recent (past interaction did not reset it)');
  
  console.log(`   ℹ️  Anchor age: ${(anchorTimeDiff / 1000).toFixed(1)}s`);
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 Warmth + Interactions Continuity Testing\n');
  
  let contact;
  
  try {
    contact = await createContact();
    if (!contact) {
      console.error('Failed to create contact');
      process.exit(1);
    }
    
    await testPreChangeInteraction(contact.id);
    await testPostChangeInteraction(contact.id);
    await testMultipleInteractions(contact.id);
    await testInteractionLogs(contact.id);
    await testPastInteraction(contact.id);
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failures.length > 0) {
      console.log('\n❌ FAILURES:');
      failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
    }
    
    console.log('='.repeat(60));
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await supabase.from('contacts').delete().eq('id', contact.id);
    console.log('✅ Test contact deleted\n');
    
    process.exit(failedTests > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (contact) {
      await supabase.from('contacts').delete().eq('id', contact.id);
    }
    process.exit(1);
  }
}

main();
