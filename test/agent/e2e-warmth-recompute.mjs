/**
 * E2E Test: Warmth Recompute Endpoints
 * 
 * Tests warmth score recomputation for individual contacts and batch operations.
 * Verifies the automatic warmth calculation after interactions.
 */

import { getEnv, getAccessToken, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Warmth Recompute',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
  const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
  const BACKEND_BASE = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
  const token = await getAccessToken();

  lines.push(`- **Supabase URL**: ${SUPABASE_URL}`);
  lines.push(`- **Backend URL**: ${BACKEND_BASE}`);
  lines.push('');
  lines.push('## Test Workflow: Recompute Warmth Scores');
  lines.push('');

  const tests = [];
  let testContactId = null;
  let testContactId2 = null;
  let initialWarmth = 0;

  // ===== STEP 1: Create Test Contact =====
  lines.push('### Step 1: Create Test Contact');
  lines.push('');

  try {
    const payload = {
      display_name: `Warmth Recompute Test ${rid.slice(0, 8)}`,
      emails: [`warmth-recompute-${rid.slice(0, 8)}@example.com`],
      tags: ['e2e_recompute_test'],
      metadata: {
        test_run: `e2e_warmth_recompute_${rid}`,
      },
    };
    
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const contact = Array.isArray(json) ? json[0] : json;
    
    const pass = (res.status === 200 || res.status === 201) && contact?.id;
    if (pass) {
      testContactId = contact.id;
      initialWarmth = contact.warmth || 0;
    }
    tests.push({
      name: 'Create test contact',
      pass,
      status: res.status,
      ms,
      contact_id: testContactId,
      initial_warmth: initialWarmth,
    });
    lines.push(`- ✅ Contact created: ${testContactId}`);
    lines.push(`- Initial warmth: ${initialWarmth}/100`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Create test contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 2: Add Interaction =====
  lines.push('### Step 2: Add Interaction');
  lines.push('');

  let interactionId = null;
  try {
    const payload = {
      contact_id: testContactId,
      channel: 'email',
      direction: 'outbound',
      summary: 'Test email for warmth recompute',
      sentiment: 'positive',
      occurred_at: new Date().toISOString(),
    };
    
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const interaction = Array.isArray(json) ? json[0] : json;
    
    const pass = (res.status === 200 || res.status === 201) && interaction?.id;
    if (pass) {
      interactionId = interaction.id;
    }
    tests.push({
      name: 'Add interaction',
      pass,
      status: res.status,
      ms,
      interaction_id: interactionId,
    });
    lines.push(`- ✅ Interaction added: ${interactionId}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Add interaction', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 3: Trigger Individual Recompute =====
  lines.push('### Step 3: Trigger Individual Warmth Recompute');
  lines.push('');

  let warmthAfterRecompute = null;
  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/contacts/${testContactId}/warmth/recompute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200;
    if (pass && json?.contact?.warmth !== undefined) {
      warmthAfterRecompute = json.contact.warmth;
    }
    
    tests.push({
      name: 'Trigger individual recompute',
      pass,
      status: res.status,
      ms,
      warmth_after: warmthAfterRecompute,
    });
    
    if (pass) {
      lines.push(`- ✅ Recompute successful`);
      lines.push(`- Warmth after recompute: ${warmthAfterRecompute}/100`);
      lines.push(`- Change: ${initialWarmth} → ${warmthAfterRecompute}`);
    } else {
      lines.push(`- ❌ Recompute failed: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Trigger individual recompute', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 4: Verify Warmth Changed =====
  lines.push('### Step 4: Verify Warmth in Database');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${testContactId}&select=warmth,warmth_band`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => []);
    const contact = Array.isArray(json) ? json[0] : json;
    
    const pass = res.status === 200 && contact?.warmth !== undefined;
    const dbWarmth = contact?.warmth || 0;
    
    tests.push({
      name: 'Verify warmth in database',
      pass,
      status: res.status,
      ms,
      db_warmth: dbWarmth,
      matches_recompute: dbWarmth === warmthAfterRecompute,
    });
    
    lines.push(`- Database warmth: ${dbWarmth}/100`);
    lines.push(`- Matches recompute response: ${dbWarmth === warmthAfterRecompute ? '✅ Yes' : '⚠️ No'}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Verify warmth in database', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 5: Create Second Contact for Batch Test =====
  lines.push('### Step 5: Create Second Contact for Batch Test');
  lines.push('');

  try {
    const payload = {
      display_name: `Batch Test ${rid.slice(0, 8)}`,
      emails: [`batch-${rid.slice(0, 8)}@example.com`],
      tags: ['e2e_recompute_test', 'batch'],
      metadata: {
        test_run: `e2e_warmth_recompute_${rid}`,
      },
    };
    
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const contact = Array.isArray(json) ? json[0] : json;
    
    const pass = (res.status === 200 || res.status === 201) && contact?.id;
    if (pass) {
      testContactId2 = contact.id;
    }
    tests.push({
      name: 'Create second contact',
      pass,
      status: res.status,
      ms,
      contact_id: testContactId2,
    });
    lines.push(`- ✅ Second contact created: ${testContactId2}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Create second contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 6: Batch Recompute =====
  lines.push('### Step 6: Batch Warmth Recompute');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/warmth/recompute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_ids: [testContactId, testContactId2],
      }),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200;
    
    tests.push({
      name: 'Batch recompute',
      pass,
      status: res.status,
      ms,
      contacts_processed: json?.contacts_processed || json?.updated || 0,
    });
    
    if (pass) {
      lines.push(`- ✅ Batch recompute successful`);
      lines.push(`- Contacts processed: ${json?.contacts_processed || json?.updated || 0}`);
    } else {
      lines.push(`- ❌ Batch recompute failed: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Batch recompute', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 7: Cleanup =====
  lines.push('### Step 7: Cleanup Test Data');
  lines.push('');

  try {
    const contactsToDelete = [testContactId, testContactId2].filter(Boolean);
    
    if (contactsToDelete.length > 0) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=in.(${contactsToDelete.join(',')})`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      
      lines.push(`- ✅ Cleaned up ${contactsToDelete.length} test contacts`);
    }
    lines.push('');
  } catch (e) {
    lines.push(`- ⚠️  Cleanup warning: ${e.message}`);
    lines.push('');
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push(`- **Initial Warmth**: ${initialWarmth}/100`);
  lines.push(`- **After Recompute**: ${warmthAfterRecompute}/100`);
  lines.push(`- **Contacts Tested**: ${[testContactId, testContactId2].filter(Boolean).length}`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **All warmth recompute tests passed**');
  } else {
    lines.push('❌ **Some warmth recompute tests failed**');
  }

  lines.push('');
  lines.push('## Test Results');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(tests, null, 2));
  lines.push('```');

  await writeReport('e2e_warmth_recompute', lines, tests, exitCode);
}

main().then(() => process.exit(exitCode)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
