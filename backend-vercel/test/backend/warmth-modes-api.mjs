#!/usr/bin/env node
/**
 * Test warmth modes API endpoints
 * Ensures all new endpoints are working correctly
 */

import { getAccessToken, logSection, logOk, logFail, assert } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

console.log('🔌 Warmth Modes API Endpoints Test');
console.log('API Base:', API_BASE);
console.log('==========================================\n');

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function createTestContact(token) {
  const res = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: 'API Test Contact',
      primary_email: `api-test-${Date.now()}@example.com`
    })
  });
  const data = await res.json();
  return data.id || data.contact?.id;
}

async function deleteContact(token, contactId) {
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function main() {
  const token = await getAccessToken();
  const testResults = [];
  let contactId = null;

  try {
    // ============================================================
    // TEST 1: GET /api/v1/warmth/modes
    // ============================================================
    logSection('TEST 1: GET /v1/warmth/modes');
    
    const res1 = await fetch(`${API_BASE}/api/v1/warmth/modes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    assert(res1.ok, `Should return 200, got ${res1.status}`);
    const data1 = await res1.json();
    
    // Validate response structure
    assert(data1.modes, 'Should have modes array');
    assert(Array.isArray(data1.modes), 'modes should be an array');
    assert(data1.modes.length === 4, 'Should have exactly 4 modes');
    assert(data1.default === 'medium', 'Default should be medium');
    
    // Validate each mode has required fields
    data1.modes.forEach(mode => {
      assert(mode.mode, 'Mode should have mode field');
      assert(typeof mode.lambda === 'number', 'Mode should have lambda (number)');
      assert(typeof mode.halfLifeDays === 'number', 'Mode should have halfLifeDays');
      assert(typeof mode.daysToReachout === 'number', 'Mode should have daysToReachout');
      assert(mode.description, 'Mode should have description');
    });
    
    logOk(`✅ Retrieved ${data1.modes.length} modes`);
    logOk(`✅ Default mode: ${data1.default}`);
    
    data1.modes.forEach(m => {
      logOk(`   ${m.mode}: λ=${m.lambda.toFixed(6)}, half-life=${m.halfLifeDays.toFixed(1)}d`);
    });
    
    testResults.push({ name: 'GET /v1/warmth/modes', passed: true });

    // ============================================================
    // TEST 2: GET /api/v1/contacts/:id/warmth/mode (with contact)
    // ============================================================
    logSection('TEST 2: GET /v1/contacts/:id/warmth/mode');
    
    // Create test contact
    contactId = await createTestContact(token);
    logOk(`Contact created: ${contactId}`);
    
    const res2 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    assert(res2.ok, `Should return 200, got ${res2.status}`);
    const data2 = await res2.json();
    
    assert(data2.contact_id === contactId, 'Should return correct contact_id');
    assert(data2.current_mode, 'Should have current_mode');
    assert(typeof data2.current_score === 'number', 'Should have current_score (number)');
    assert(data2.current_band, 'Should have current_band');
    
    logOk(`✅ Contact ID: ${data2.contact_id}`);
    logOk(`✅ Current mode: ${data2.current_mode}`);
    logOk(`✅ Current score: ${data2.current_score}`);
    logOk(`✅ Current band: ${data2.current_band}`);
    
    testResults.push({ name: 'GET /v1/contacts/:id/warmth/mode', passed: true });

    // ============================================================
    // TEST 3: PATCH /api/v1/contacts/:id/warmth/mode (switch mode)
    // ============================================================
    logSection('TEST 3: PATCH /v1/contacts/:id/warmth/mode');
    
    const res3 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'fast' })
    });
    
    assert(res3.ok, `Should return 200, got ${res3.status}`);
    const data3 = await res3.json();
    
    assert(data3.contact_id === contactId, 'Should return contact_id');
    assert(data3.mode_before, 'Should have mode_before');
    assert(data3.mode_after === 'fast', 'Should have mode_after = fast');
    assert(typeof data3.score_before === 'number', 'Should have score_before');
    assert(typeof data3.score_after === 'number', 'Should have score_after');
    assert(data3.band_after, 'Should have band_after');
    assert(data3.changed_at, 'Should have changed_at timestamp');
    
    logOk(`✅ Mode changed: ${data3.mode_before} → ${data3.mode_after}`);
    logOk(`✅ Score changed: ${data3.score_before} → ${data3.score_after}`);
    logOk(`✅ New band: ${data3.band_after}`);
    logOk(`✅ Changed at: ${data3.changed_at}`);
    
    testResults.push({ name: 'PATCH /v1/contacts/:id/warmth/mode', passed: true });

    // ============================================================
    // TEST 4: Verify mode persisted
    // ============================================================
    logSection('TEST 4: Verify Mode Persistence');
    
    await delay(500);
    
    const res4 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data4 = await res4.json();
    assert(data4.current_mode === 'fast', 'Mode should persist as fast');
    
    logOk(`✅ Mode persisted: ${data4.current_mode}`);
    
    testResults.push({ name: 'Mode Persistence', passed: true });

    // ============================================================
    // TEST 5: Invalid mode validation
    // ============================================================
    logSection('TEST 5: Invalid Mode Validation');
    
    const res5 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'superfast' })
    });
    
    assert(!res5.ok, 'Should reject invalid mode');
    assert(res5.status === 400, `Should return 400, got ${res5.status}`);
    
    const error5 = await res5.json();
    assert(error5.error || error5.message, 'Should return error message');
    
    logOk(`✅ Invalid mode rejected with status ${res5.status}`);
    logOk(`✅ Error message: ${error5.error || error5.message}`);
    
    testResults.push({ name: 'Invalid Mode Validation', passed: true });

    // ============================================================
    // TEST 6: Missing mode parameter
    // ============================================================
    logSection('TEST 6: Missing Mode Parameter');
    
    const res6 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    assert(!res6.ok, 'Should reject missing mode');
    assert(res6.status === 400, `Should return 400, got ${res6.status}`);
    
    logOk(`✅ Missing mode rejected with status ${res6.status}`);
    
    testResults.push({ name: 'Missing Mode Parameter', passed: true });

    // ============================================================
    // TEST 7: Non-existent contact
    // ============================================================
    logSection('TEST 7: Non-existent Contact');
    
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res7 = await fetch(`${API_BASE}/api/v1/contacts/${fakeId}/warmth/mode`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    assert(!res7.ok, 'Should fail for non-existent contact');
    assert(res7.status === 400 || res7.status === 404, `Should return 400/404, got ${res7.status}`);
    
    logOk(`✅ Non-existent contact rejected with status ${res7.status}`);
    
    testResults.push({ name: 'Non-existent Contact', passed: true });

    // ============================================================
    // TEST 8: Unauthorized access
    // ============================================================
    logSection('TEST 8: Unauthorized Access');
    
    const res8 = await fetch(`${API_BASE}/api/v1/warmth/modes`);
    
    assert(!res8.ok, 'Should reject unauthorized request');
    assert(res8.status === 401, `Should return 401, got ${res8.status}`);
    
    logOk(`✅ Unauthorized request rejected with status ${res8.status}`);
    
    testResults.push({ name: 'Unauthorized Access', passed: true });

    // ============================================================
    // TEST 9: All modes switchable
    // ============================================================
    logSection('TEST 9: Switch Through All Modes');
    
    const modes = ['slow', 'medium', 'fast', 'test'];
    const scores = {};
    
    for (const mode of modes) {
      const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode })
      });
      
      assert(res.ok, `Should switch to ${mode}`);
      const data = await res.json();
      assert(data.mode_after === mode, `Should confirm mode ${mode}`);
      scores[mode] = data.score_after;
      
      await delay(300);
    }
    
    logOk(`✅ All modes switchable`);
    Object.entries(scores).forEach(([mode, score]) => {
      logOk(`   ${mode}: ${score}`);
    });
    
    testResults.push({ name: 'Switch Through All Modes', passed: true });

    // ============================================================
    // TEST 10: Content-Type validation
    // ============================================================
    logSection('TEST 10: Content-Type Validation');
    
    const res10 = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
        // Missing Content-Type
      },
      body: JSON.stringify({ mode: 'slow' })
    });
    
    // Should still work with implicit JSON or fail gracefully
    const hasContentType = res10.ok || res10.status === 415;
    assert(hasContentType, 'Should handle Content-Type appropriately');
    
    logOk(`✅ Content-Type handled: ${res10.status}`);
    
    testResults.push({ name: 'Content-Type Validation', passed: true });

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
  console.log('📊 API TEST SUMMARY');
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
    console.log('\n❌ SOME API TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL API TESTS PASSED');
    console.log('\n🎉 Warmth modes API endpoints working correctly!');
  }
}

main().catch(err => {
  console.error('\n❌ API test suite failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
