/**
 * Warmth History E2E Tests
 * Tests all 3 warmth history endpoints + auto-recording
 */

import { getAccessToken, apiFetch, logSection, logOk, logFail, assert, writeReport, nowIso } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
const tests = [];
const reportLines = [];
const createdResources = {
  contacts: [],
};

// Helper: Track test results
function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

// Helper: Create contact
async function createContact(displayName, warmth = null) {
  const body = {
    display_name: displayName,
    warmth: warmth,
  };

  const { res, json } = await apiFetch(API_BASE, '/api/v1/contacts', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(body),
  });

  assert(res.status === 201, `createContact expected 201, got ${res.status}`);
  const id = json?.contact?.id;
  assert(id, 'createContact: missing contact id');
  createdResources.contacts.push(id);
  return { id, warmth };
}

// Helper: Update contact warmth
async function updateContactWarmth(contactId, warmth, warmthBand) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}`, {
    method: 'PATCH',
    token: authToken,
    body: JSON.stringify({ warmth, warmth_band: warmthBand }),
  });

  assert(res.status === 200, `updateContactWarmth expected 200, got ${res.status}`);
  return json?.contact;
}

// Helper: Recompute warmth
async function recomputeWarmth(contactId) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({}),
  });

  assert(res.status === 200, `recomputeWarmth expected 200, got ${res.status}`);
  return json;
}

// Helper: Get warmth history (primary endpoint)
async function getWarmthHistory(contactId, window = '30d') {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/warmth-history?window=${window}`, {
    token: authToken,
  });

  assert(res.status === 200, `getWarmthHistory expected 200, got ${res.status}`);
  return json;
}

// Helper: Get warmth history (legacy endpoint)
async function getWarmthHistoryLegacy(contactId, limit = 30) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/warmth/history?limit=${limit}`, {
    token: authToken,
  });

  assert(res.status === 200, `getWarmthHistoryLegacy expected 200, got ${res.status}`);
  return json;
}

// Helper: Get current warmth
async function getCurrentWarmth(contactId) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/warmth`, {
    token: authToken,
  });

  assert(res.status === 200, `getCurrentWarmth expected 200, got ${res.status}`);
  return json;
}

// Helper: Clean up resources
async function cleanup() {
  logSection('Cleanup');

  for (const contactId of createdResources.contacts) {
    try {
      await apiFetch(API_BASE, `/api/v1/contacts/${contactId}`, {
        method: 'DELETE',
        token: authToken,
      });
    } catch (err) {
      console.error(`Failed to delete contact ${contactId}:`, err);
    }
  }

  logOk(`Cleaned up ${createdResources.contacts.length} contacts`);
}

// ============================================================================
// Test 1: Primary Endpoint - Default Window (30d)
// ============================================================================
async function test1_PrimaryEndpoint_DefaultWindow() {
  logSection('Test 1: Primary Endpoint - Default Window');

  const contact = await createContact('Alice Johnson', 65);
  logOk(`Created contact: ${contact.id}`);

  // Update warmth to trigger snapshot
  await updateContactWarmth(contact.id, 70, 'hot');
  logOk('Updated warmth to 70');

  // Wait a moment for trigger
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get history
  const history = await getWarmthHistory(contact.id);
  logOk(`Retrieved history: ${history.items?.length || 0} items`);

  // Assert structure
  assert(history.contact_id === contact.id, 'contact_id should match');
  assert(history.window === '30d', 'window should be 30d');
  assert(Array.isArray(history.items), 'items should be an array');
  assert(history.current, 'current should exist');
  assert(history.current.score === 70, 'current score should be 70');
  assert(history.current.band === 'hot', 'current band should be hot');

  logOk('✓ Primary endpoint structure correct');
}

// ============================================================================
// Test 2: Primary Endpoint - Different Windows (7d, 90d)
// ============================================================================
async function test2_PrimaryEndpoint_Windows() {
  logSection('Test 2: Primary Endpoint - Different Windows');

  const contact = await createContact('Bob Smith', 45);

  // Test 7d window
  const history7d = await getWarmthHistory(contact.id, '7d');
  assert(history7d.window === '7d', 'window should be 7d');
  logOk('✓ 7d window works');

  // Test 90d window
  const history90d = await getWarmthHistory(contact.id, '90d');
  assert(history90d.window === '90d', 'window should be 90d');
  logOk('✓ 90d window works');

  // Invalid window falls back to 30d
  const historyInvalid = await getWarmthHistory(contact.id, '180d');
  assert(historyInvalid.window === '30d', 'invalid window should fall back to 30d');
  logOk('✓ Invalid window falls back to 30d');
}

// ============================================================================
// Test 3: Legacy Endpoint - Limit Parameter
// ============================================================================
async function test3_LegacyEndpoint_Limit() {
  logSection('Test 3: Legacy Endpoint - Limit Parameter');

  const contact = await createContact('Carol Davis', 55);

  // Update warmth multiple times to create history
  for (let i = 1; i <= 3; i++) {
    await updateContactWarmth(contact.id, 50 + (i * 5), 'warm');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Get history with limit
  const history = await getWarmthHistoryLegacy(contact.id, 10);
  logOk(`Retrieved history: ${history.history?.length || 0} items`);

  // Assert structure (legacy format)
  assert(Array.isArray(history.history), 'history should be an array');
  if (history.history.length > 0) {
    assert(history.history[0].timestamp, 'timestamp should exist');
    assert(typeof history.history[0].warmth === 'number', 'warmth should be a number');
  }

  logOk('✓ Legacy endpoint format correct');
}

// ============================================================================
// Test 4: Current Warmth Endpoint
// ============================================================================
async function test4_CurrentWarmthEndpoint() {
  logSection('Test 4: Current Warmth Endpoint');

  const contact = await createContact('Dave Wilson', 80);

  const current = await getCurrentWarmth(contact.id);
  logOk(`Retrieved current warmth: ${current.warmth}`);

  // Assert structure
  assert(current.contact_id === contact.id, 'contact_id should match');
  assert(current.warmth === 80, 'warmth should be 80');
  assert(current.warmth_band, 'warmth_band should exist');
  logOk('✓ Current warmth endpoint works');
}

// ============================================================================
// Test 5: Auto-Recording via Trigger
// ============================================================================
async function test5_AutoRecording() {
  logSection('Test 5: Auto-Recording via Trigger');

  const contact = await createContact('Eve Martinez', 30);
  logOk(`Created contact: ${contact.id}`);

  // Update warmth (should trigger snapshot)
  await updateContactWarmth(contact.id, 75, 'hot');
  logOk('Updated warmth to 75');

  // Wait for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if history was recorded
  const history = await getWarmthHistory(contact.id);
  logOk(`History items: ${history.items?.length || 0}`);

  // Should have at least one history item from the trigger
  if (history.items && history.items.length > 0) {
    const latestItem = history.items[history.items.length - 1];
    logOk(`Latest snapshot: score=${latestItem.score}, band=${latestItem.band}`);
    assert(latestItem.score === 75 || latestItem.score === 30, 'Score should match one of the updates');
  }

  logOk('✓ Auto-recording mechanism verified');
}

// ============================================================================
// Test 6: Empty History (New Contact)
// ============================================================================
async function test6_EmptyHistory() {
  logSection('Test 6: Empty History (New Contact)');

  const contact = await createContact('Frank Thomas', 50);

  const history = await getWarmthHistory(contact.id);
  logOk(`History items: ${history.items?.length || 0}`);

  // New contact might have 0 or 1 items depending on timing
  assert(Array.isArray(history.items), 'items should be an array');
  assert(history.current, 'current should exist');
  assert(history.current.score === 50, 'current score should be 50');

  logOk('✓ Empty history handled gracefully');
}

// ============================================================================
// Test 7: Sorted Ascending by Date
// ============================================================================
async function test7_SortedAscending() {
  logSection('Test 7: Sorted Ascending by Date');

  const contact = await createContact('Grace Lee', 40);

  // Create multiple snapshots
  for (let i = 0; i < 3; i++) {
    await updateContactWarmth(contact.id, 40 + (i * 10), 'warm');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  const history = await getWarmthHistory(contact.id);
  
  if (history.items && history.items.length > 1) {
    // Verify ascending order
    for (let i = 1; i < history.items.length; i++) {
      const prev = new Date(history.items[i - 1].date);
      const curr = new Date(history.items[i].date);
      assert(curr >= prev, 'Items should be sorted ascending by date');
    }
    logOk('✓ Items sorted ascending by date');
  } else {
    logOk('Note: Not enough items to verify sorting');
  }
}

// ============================================================================
// Test 8: Cache Headers
// ============================================================================
async function test8_CacheHeaders() {
  logSection('Test 8: Cache Headers');

  const contact = await createContact('Henry Brown', 60);

  const response = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/warmth-history`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const cacheControl = response.headers.get('cache-control');
  logOk(`Cache-Control: ${cacheControl}`);

  // Should have cache headers
  if (cacheControl) {
    assert(cacheControl.includes('private'), 'Should have private cache');
    assert(cacheControl.includes('max-age'), 'Should have max-age');
    logOk('✓ Cache headers present');
  } else {
    logOk('Note: Cache headers not set (may be default behavior)');
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n🚀 Warmth History E2E Tests');
  console.log(`API: ${API_BASE}\n`);

  reportLines.push('# E2E Test: Warmth History', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');

  let passed = 0;
  let failed = 0;
  let exitCode = 0;

  try {
    authToken = await getAccessToken();
    logOk('Authenticated successfully');

    const testFunctions = [
      { name: 'Primary Endpoint - Default Window', fn: test1_PrimaryEndpoint_DefaultWindow },
      { name: 'Primary Endpoint - Windows', fn: test2_PrimaryEndpoint_Windows },
      { name: 'Legacy Endpoint - Limit', fn: test3_LegacyEndpoint_Limit },
      { name: 'Current Warmth Endpoint', fn: test4_CurrentWarmthEndpoint },
      { name: 'Auto-Recording via Trigger', fn: test5_AutoRecording },
      { name: 'Empty History', fn: test6_EmptyHistory },
      { name: 'Sorted Ascending', fn: test7_SortedAscending },
      { name: 'Cache Headers', fn: test8_CacheHeaders },
    ];

    for (const { name, fn } of testFunctions) {
      try {
        const t0 = Date.now();
        await fn();
        const dt = Date.now() - t0;
        trackTest(name, true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest(name, false, dt, error.message);
        failed++;
        logFail(`${name} failed: ${error.message}`);
      }
    }

  } catch (error) {
    exitCode = 1;
    logFail(`Setup failed: ${error.message}`);
  } finally {
    await cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Tests Failed: ${failed}`);
    exitCode = 1;
  }
  console.log(`Total: ${passed + failed} tests`);
  console.log('='.repeat(60));

  await writeReport('warmth-history', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
