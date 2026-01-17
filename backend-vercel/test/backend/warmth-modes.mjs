#!/usr/bin/env node
/**
 * Test multi-mode warmth score system
 * Tests slow, medium, fast, and test modes with different decay rates
 */

import { getAccessToken, logSection, logOk, logFail, assert } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

console.log('🎯 Warmth Modes Test Suite');
console.log('API Base:', API_BASE);
console.log('==========================================\n');

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function createTestContact(token, name) {
  const res = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: name,
      primary_email: `warmth-mode-${Date.now()}@example.com`
    })
  });
  
  const data = await res.json();
  return data.id || data.contact?.id;
}

async function getContact(token, contactId) {
  const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.contact || data;
}

async function deleteContact(token, contactId) {
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function getAvailableModes(token) {
  const res = await fetch(`${API_BASE}/api/v1/warmth/modes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

async function getContactMode(token, contactId) {
  const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

async function switchMode(token, contactId, mode) {
  const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ mode })
  });
  return res.json();
}

async function setLastInteraction(token, contactId, daysAgo) {
  const timestamp = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)).toISOString();
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ last_interaction_at: timestamp })
  });
}

async function recomputeWarmth(token, contactId) {
  const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.warmth_score || data.contact?.warmth;
}

async function main() {
  const token = await getAccessToken();
  const testResults = [];
  let contactId = null;

  try {
    // ============================================================
    // TEST 1: Get Available Modes
    // ============================================================
    logSection('TEST 1: Get Available Warmth Modes');
    
    const modesData = await getAvailableModes(token);
    
    assert(modesData.modes, 'Should return modes array');
    assert(modesData.modes.length === 4, 'Should have 4 modes');
    assert(modesData.default === 'medium', 'Default should be medium');
    
    const modeNames = modesData.modes.map(m => m.mode);
    assert(modeNames.includes('slow'), 'Should include slow mode');
    assert(modeNames.includes('medium'), 'Should include medium mode');
    assert(modeNames.includes('fast'), 'Should include fast mode');
    assert(modeNames.includes('test'), 'Should include test mode');
    
    logOk('All 4 modes available');
    logOk(`Default mode: ${modesData.default}`);
    
    testResults.push({ name: 'Get Available Modes', passed: true });

    // ============================================================
    // TEST 2: Create Contact with Default Mode
    // ============================================================
    logSection('TEST 2: Create Contact with Default Mode');
    
    contactId = await createTestContact(token, 'Mode Test Contact');
    logOk(`Contact created: ${contactId}`);
    
    const contact = await getContact(token, contactId);
    const defaultMode = contact.warmth_mode || 'medium';
    
    assert(defaultMode === 'medium', 'Default mode should be medium');
    logOk(`Default mode confirmed: ${defaultMode}`);
    
    testResults.push({ name: 'Create Contact with Default Mode', passed: true });

    // ============================================================
    // TEST 3: Get Contact's Current Mode
    // ============================================================
    logSection('TEST 3: Get Contact\'s Current Mode');
    
    const modeData = await getContactMode(token, contactId);
    
    assert(modeData.contact_id === contactId, 'Should return correct contact ID');
    assert(modeData.current_mode === 'medium', 'Should return medium mode');
    assert(typeof modeData.current_score === 'number', 'Should return current score');
    
    logOk(`Current mode: ${modeData.current_mode}`);
    logOk(`Current score: ${modeData.current_score}`);
    
    testResults.push({ name: 'Get Contact Current Mode', passed: true });

    // ============================================================
    // TEST 4: Mode Switching - Instant Recalculation
    // ============================================================
    logSection('TEST 4: Mode Switching with Instant Recalculation');
    
    // Set last interaction to 10 days ago
    await setLastInteraction(token, contactId, 10);
    await recomputeWarmth(token, contactId);
    await delay(500);
    
    const contactBefore = await getContact(token, contactId);
    const scoreBefore = contactBefore.warmth;
    const modeBefore = contactBefore.warmth_mode || 'medium';
    
    logOk(`Before: mode=${modeBefore}, score=${scoreBefore}`);
    
    // Switch from medium to fast
    const switchResult = await switchMode(token, contactId, 'fast');
    
    assert(switchResult.mode_before === 'medium', 'Should show previous mode');
    assert(switchResult.mode_after === 'fast', 'Should show new mode');
    assert(switchResult.score_before === scoreBefore, 'Should show previous score');
    assert(switchResult.score_after !== scoreBefore, 'Score should change instantly');
    assert(switchResult.score_after < scoreBefore, 'Fast mode should have lower score');
    
    logOk(`After: mode=${switchResult.mode_after}, score=${switchResult.score_after}`);
    logOk(`Score changed: ${scoreBefore} → ${switchResult.score_after}`);
    
    testResults.push({ name: 'Mode Switching - Instant Recalculation', passed: true });

    // ============================================================
    // TEST 5: Score Differences Across Modes
    // ============================================================
    logSection('TEST 5: Score Differences Across All Modes');
    
    // Set to known time point (10 days ago)
    await setLastInteraction(token, contactId, 10);
    
    const modeScores = {};
    const modes = ['slow', 'medium', 'fast', 'test'];
    
    for (const mode of modes) {
      await switchMode(token, contactId, mode);
      await delay(300);
      const contact = await getContact(token, contactId);
      modeScores[mode] = contact.warmth;
      logOk(`${mode.padEnd(6)}: score = ${contact.warmth}`);
    }
    
    // Verify slow > medium > fast for same time elapsed
    assert(modeScores.slow > modeScores.medium, 'Slow should have higher score than medium');
    assert(modeScores.medium > modeScores.fast, 'Medium should have higher score than fast');
    assert(modeScores.fast > modeScores.test, 'Fast should have higher score than test');
    
    logOk('Score ordering verified: slow > medium > fast > test');
    
    testResults.push({ name: 'Score Differences Across Modes', passed: true });

    // ============================================================
    // TEST 6: Slow Mode (30-day horizon)
    // ============================================================
    logSection('TEST 6: Slow Mode - 30 Day Horizon');
    
    await switchMode(token, contactId, 'slow');
    await delay(300);
    
    // Test at different time points
    const slowTests = [
      { days: 0, expectedRange: [95, 100] },
      { days: 15, expectedRange: [50, 60] },
      { days: 30, expectedRange: [25, 35] }
    ];
    
    for (const test of slowTests) {
      await setLastInteraction(token, contactId, test.days);
      const score = await recomputeWarmth(token, contactId);
      await delay(300);
      
      const [min, max] = test.expectedRange;
      assert(score >= min && score <= max, 
        `Score at ${test.days} days should be ${min}-${max}, got ${score}`);
      
      logOk(`${test.days} days ago: score = ${score} (expected ${min}-${max})`);
    }
    
    testResults.push({ name: 'Slow Mode Decay Timeline', passed: true });

    // ============================================================
    // TEST 7: Fast Mode (7-day horizon)
    // ============================================================
    logSection('TEST 7: Fast Mode - 7 Day Horizon');
    
    await switchMode(token, contactId, 'fast');
    await delay(300);
    
    const fastTests = [
      { days: 0, expectedRange: [95, 100] },
      { days: 7, expectedRange: [25, 35] },
      { days: 14, expectedRange: [5, 15] }
    ];
    
    for (const test of fastTests) {
      await setLastInteraction(token, contactId, test.days);
      const score = await recomputeWarmth(token, contactId);
      await delay(300);
      
      const [min, max] = test.expectedRange;
      assert(score >= min && score <= max, 
        `Score at ${test.days} days should be ${min}-${max}, got ${score}`);
      
      logOk(`${test.days} days ago: score = ${score} (expected ${min}-${max})`);
    }
    
    testResults.push({ name: 'Fast Mode Decay Timeline', passed: true });

    // ============================================================
    // TEST 8: Test Mode (12-hour visible decay)
    // ============================================================
    logSection('TEST 8: Test Mode - 12 Hour Decay');
    
    await switchMode(token, contactId, 'test');
    await delay(300);
    
    // Test with hours instead of days
    const testHours = [
      { hours: 0, expectedRange: [95, 100] },
      { hours: 7, expectedRange: [45, 55] },   // ~50% at 7 hours (half-life)
      { hours: 12, expectedRange: [25, 35] }   // ~30 at 12 hours
    ];
    
    for (const test of testHours) {
      const daysAgo = test.hours / 24;
      await setLastInteraction(token, contactId, daysAgo);
      const score = await recomputeWarmth(token, contactId);
      await delay(300);
      
      const [min, max] = test.expectedRange;
      assert(score >= min && score <= max, 
        `Score at ${test.hours}h should be ${min}-${max}, got ${score}`);
      
      logOk(`${test.hours} hours ago: score = ${score} (expected ${min}-${max})`);
    }
    
    testResults.push({ name: 'Test Mode Hourly Decay', passed: true });

    // ============================================================
    // TEST 9: Invalid Mode Handling
    // ============================================================
    logSection('TEST 9: Invalid Mode Handling');
    
    const invalidModeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'invalid' })
    });
    
    assert(invalidModeRes.status === 400, 'Should return 400 for invalid mode');
    logOk('Invalid mode rejected with 400 status');
    
    testResults.push({ name: 'Invalid Mode Handling', passed: true });

    // ============================================================
    // TEST 10: Mode Persistence
    // ============================================================
    logSection('TEST 10: Mode Persistence');
    
    await switchMode(token, contactId, 'fast');
    await delay(500);
    
    // Fetch contact again
    const persistedContact = await getContact(token, contactId);
    assert(persistedContact.warmth_mode === 'fast', 'Mode should persist');
    logOk('Mode persisted after setting to fast');
    
    testResults.push({ name: 'Mode Persistence', passed: true });

  } catch (error) {
    logFail(`Test failed: ${error.message}`);
    testResults.push({ name: 'Current Test', passed: false, error: error.message });
    throw error;
  } finally {
    // Cleanup
    if (contactId) {
      logSection('Cleanup');
      await deleteContact(token, contactId);
      logOk('Test contact deleted');
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total:  ${testResults.length}\n`);
  
  testResults.forEach(t => {
    const status = t.passed ? '✅' : '❌';
    console.log(`${status} ${t.name}`);
    if (t.error) {
      console.log(`   Error: ${t.error}`);
    }
  });
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    console.log('\n🎉 Multi-mode warmth system working correctly!');
  }
}

main().catch(err => {
  console.error('\n❌ Test suite failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
