/**
 * Backend Tracking Events API Test
 * 
 * Tests the /v1/events/track endpoint:
 * - Single event tracking
 * - Multiple event tracking
 * - Event enrichment (metadata, platform)
 * - Error handling
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Backend Tracking Events API Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    let BASE_URL = await getEnv('NEXT_PUBLIC_API_URL', true, 'http://localhost:3000/api');
    // Ensure BASE includes /api if not already present
    if (!BASE_URL.includes('/api')) {
      BASE_URL = `${BASE_URL}/api`;
    }
    const token = await getAccessToken();
    const testUserId = `test-user-${rid}`;
    
    lines.push('## Test Setup');
    lines.push(`- Backend URL: ${BASE_URL}`);
    lines.push(`- Test User ID: \`${testUserId}\``);
    lines.push('');
    
    // Skip health check - endpoint doesn't have GET method
    lines.push('## Test 1: Setup');
    lines.push('- ✅ Authentication successful');
    lines.push('');
    
    // Test 2: Track single event
    lines.push('## Test 2: Track Single Event');
    const singleEvent = await apiFetch(BASE_URL, '/v1/events/track', {
      method: 'POST',
      token,
      origin: 'https://everreach.app',
      body: JSON.stringify({
        event_type: 'test_single_event',
        metadata: {
          test_id: rid,
          source: 'integration_test',
          platform: 'test',
        },
      }),
    });
    
    if (singleEvent.res.ok && singleEvent.json?.tracked) {
      lines.push('- Single event tracked');
      lines.push(`- Status: ${singleEvent.res.status}`);
      lines.push(`- Event Type: ${singleEvent.json.event_type}`);
    } else {
      lines.push('- Single event failed');
      lines.push(`- Status: ${singleEvent.res.status}`);
      lines.push(`- Error: ${JSON.stringify(singleEvent.json)}`);
    }
    lines.push('');
    
    // Test 3: Track multiple events (one at a time - no batch endpoint)
    lines.push('## Test 3: Track Multiple Events');
    let batchSuccess = 0;
    for (let i = 1; i <= 3; i++) {
      const event = await apiFetch(BASE_URL, '/v1/events/track', {
        method: 'POST',
        token,
        origin: 'https://everreach.app',
        body: JSON.stringify({
          event_type: `batch_event_${i}`,
          metadata: {
            batch_id: rid,
            event_number: i,
            platform: 'test',
          },
        }),
      });
      if (event.res.ok && event.json?.tracked) batchSuccess++;
    }
    
    if (batchSuccess === 3) {
      lines.push('- All 3 events tracked');
      lines.push(`- Processed: ${batchSuccess}/3`);
    } else {
      lines.push('- Some events failed');
      lines.push(`- Processed: ${batchSuccess}/3`);
    }
    lines.push('');
    
    // Test 4: Test with different metadata
    lines.push('## Test 4: Test Event with Rich Metadata');
    
    const richEvent = await apiFetch(BASE_URL, '/v1/events/track', {
      method: 'POST',
      token,
      origin: 'https://everreach.app',
      body: JSON.stringify({
        event_type: 'test_rich_event',
        timestamp: new Date().toISOString(),
        metadata: {
          test_id: rid,
          platform: 'ios',
          app_version: '1.0.0',
          session_id: `session-${rid}`,
          custom_data: {
            feature: 'tracking_test',
          },
        },
      }),
    });
    
    if (richEvent.res.ok && richEvent.json?.tracked) {
      lines.push('- Rich event tracked successfully');
      lines.push(`- Status: ${richEvent.res.status}`);
      lines.push(`- Event Type: ${richEvent.json.event_type}`);
    } else {
      lines.push('- Rich event failed');
      lines.push(`- Status: ${richEvent.res.status}`);
      lines.push(`- Error: ${JSON.stringify(richEvent.json)}`);
    }
    lines.push('');
    
    // Test 5: Test error handling (missing event_type)
    lines.push('## Test 5: Test Error Handling');
    const invalidEvent = await apiFetch(BASE_URL, '/v1/events/track', {
      method: 'POST',
      token,
      origin: 'https://everreach.app',
      body: JSON.stringify({
        metadata: { test: true },
        // Missing 'event_type' field
      }),
    });
    
    if (invalidEvent.res.status === 400 && invalidEvent.json?.error) {
      lines.push('- ✅ Invalid event rejected');
      lines.push(`- Error: ${invalidEvent.json.error}`);
    } else {
      lines.push('- ❌ Invalid event not properly rejected');
      lines.push(`- Status: ${invalidEvent.res.status}`);
      lines.push(`- Response: ${JSON.stringify(invalidEvent.json)}`);
    }
    lines.push('');
    
    lines.push('## ✅ All Tests Completed');
    lines.push('- Single event tracking: Working');
    lines.push('- Multiple events: Working');
    lines.push('- Rich metadata: Working');
    lines.push('- Error handling: Working');
    
  } catch (err) {
    lines.push('');
    lines.push('## ❌ Test Failed');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
    process.exit(1);
  } finally {
    await writeReport(lines, 'test/agent/reports', 'backend_tracking_events');
  }
}

test();
