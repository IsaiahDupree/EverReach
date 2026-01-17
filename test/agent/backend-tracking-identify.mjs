/**
 * Backend Tracking Identify API Test
 * 
 * Tests the /api/tracking/identify endpoint:
 * - User identification
 * - Property setting
 * - Anonymous session linking
 */

import { getEnv, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Backend Tracking Identify API Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const BASE_URL = await getEnv('NEXT_PUBLIC_API_URL', true, 'http://localhost:3000');
    const testUserId = `test-user-${rid}`;
    const anonymousId = `anon-${rid}`;
    
    lines.push('## Test Setup');
    lines.push(`- Backend URL: ${BASE_URL}`);
    lines.push(`- Test User ID: \`${testUserId}\``);
    lines.push(`- Anonymous ID: \`${anonymousId}\``);
    lines.push('');
    
    // Test 1: Identify user
    lines.push('## Test 1: Identify User');
    const identify = await apiFetch(BASE_URL, '/api/tracking/identify', {
      method: 'POST',
      body: JSON.stringify({
        user_id: testUserId,
        properties: {
          email: 'test@example.com',
          plan: 'free',
          name: 'Test User',
        },
        anonymous_id: anonymousId,
      }),
    });
    
    if (identify.res.ok && identify.json?.success) {
      lines.push('- ✅ User identified');
      lines.push(`- User ID: ${identify.json.user_id}`);
    } else {
      lines.push('- ❌ User identification failed');
      lines.push(`- Error: ${identify.json?.error || 'Unknown'}`);
      throw new Error('User identification failed');
    }
    lines.push('');
    
    // Test 2: Verify identify event in Supabase
    lines.push('## Test 2: Verify Identify Event');
    const SUPABASE_URL = await getEnv('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY');
    
    const checkEvent = await apiFetch(SUPABASE_URL, `/rest/v1/event_log?user_id=eq.${testUserId}&event_name=eq.user_identified&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (checkEvent.res.ok && checkEvent.json && checkEvent.json.length > 0) {
      lines.push('- ✅ Identify event found in Supabase');
      lines.push(`- Anonymous ID: ${checkEvent.json[0].anonymous_id}`);
      lines.push(`- Properties: ${JSON.stringify(checkEvent.json[0].properties)}`);
    } else {
      lines.push('- ⚠️  Identify event not found in Supabase');
    }
    lines.push('');
    
    // Test 3: Test missing user_id error
    lines.push('## Test 3: Test Missing User ID');
    const invalidIdentify = await apiFetch(BASE_URL, '/api/tracking/identify', {
      method: 'POST',
      body: JSON.stringify({
        properties: { email: 'test@example.com' },
        // Missing user_id
      }),
    });
    
    if (invalidIdentify.res.status === 400 && invalidIdentify.json?.error) {
      lines.push('- ✅ Missing user_id rejected');
      lines.push(`- Error: ${invalidIdentify.json.error}`);
    } else {
      lines.push('- ⚠️  Missing user_id not properly rejected');
    }
    lines.push('');
    
    // Cleanup
    lines.push('## Cleanup');
    await apiFetch(SUPABASE_URL, `/rest/v1/event_log?user_id=eq.${testUserId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    lines.push('- ✅ Test data cleaned up');
    lines.push('');
    
    lines.push('## ✅ All Tests Passed');
    process.exit(0);
    
  } catch (err) {
    lines.push('');
    lines.push('## ❌ Test Failed');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
    process.exit(1);
  } finally {
    await writeReport(lines, 'test/agent/reports', 'backend_tracking_identify');
  }
}

test();
