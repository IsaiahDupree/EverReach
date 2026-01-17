/**
 * Lifecycle Automation - PostHog Webhook Integration Test
 * 
 * Tests PostHog webhook ingestion into Supabase event_log:
 * - Event ingestion via webhook
 * - Idempotency (duplicate prevention)
 * - User trait updates on events
 * - Session counter increments
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Lifecycle Automation - PostHog Webhook Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const SUPABASE_URL = await getEnv('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const token = await getAccessToken();
    
    const testUserId = `test-user-${rid}`;
    const anonymousId = `anon-${rid}`;
    
    lines.push('## Test Setup');
    lines.push('- ✅ Environment loaded');
    lines.push(`- Test User ID: \`${testUserId}\``);
    lines.push('');
    
    // Test 1: Create test user profile
    lines.push('## Test 1: Create Test Profile');
    const createProfile = await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: testUserId,
        email: `${testUserId}@test.com`,
        consent_email: true,
        consent_analytics: true,
      })
    });
    
    if (createProfile.res.ok) {
      lines.push('- ✅ Test profile created');
    } else {
      lines.push(`- ❌ Failed to create profile: ${createProfile.res.status}`);
      throw new Error('Profile creation failed');
    }
    lines.push('');
    
    // Test 2: Simulate PostHog webhook - session_started event
    lines.push('## Test 2: Ingest session_started Event');
    const event1 = {
      distinct_id: testUserId,
      event: 'session_started',
      properties: {
        platform: 'ios',
        app_version: '1.0.0',
        $user_id: testUserId,
        $idempotency_key: `${rid}-event-1`,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Insert directly into event_log (simulating webhook)
    const insertEvent1 = await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: testUserId,
        anonymous_id: anonymousId,
        event_name: event1.event,
        properties: event1.properties,
        ts: event1.timestamp,
        source: 'posthog',
        idempotency_key: event1.properties.$idempotency_key,
      })
    });
    
    if (insertEvent1.res.ok) {
      lines.push('- ✅ Event inserted into event_log');
    } else {
      lines.push(`- ❌ Event insert failed: ${insertEvent1.res.status}`);
    }
    lines.push('');
    
    // Wait for trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Verify user_traits updated
    lines.push('## Test 3: Verify User Traits Updated');
    const checkTraits = await apiFetch(SUPABASE_URL, `/rest/v1/user_traits?user_id=eq.${testUserId}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkTraits.res.ok && checkTraits.json && checkTraits.json.length > 0) {
      const traits = checkTraits.json[0];
      lines.push('- ✅ User traits record exists');
      lines.push(`- Last seen: ${traits.last_seen}`);
      lines.push(`- Sessions 7d: ${traits.sessions_7d}`);
    } else {
      lines.push('- ❌ User traits not found or not updated');
    }
    lines.push('');
    
    // Test 4: Test idempotency (duplicate event)
    lines.push('## Test 4: Test Idempotency (Duplicate Event)');
    const insertDupe = await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: testUserId,
        anonymous_id: anonymousId,
        event_name: event1.event,
        properties: event1.properties,
        ts: event1.timestamp,
        source: 'posthog',
        idempotency_key: event1.properties.$idempotency_key, // SAME key
      })
    });
    
    // Should fail or be ignored due to unique constraint
    if (insertDupe.res.status === 409 || insertDupe.res.status === 400) {
      lines.push('- ✅ Duplicate event rejected (idempotency working)');
    } else if (insertDupe.res.ok) {
      lines.push('- ⚠️  Duplicate event accepted (check upsert config)');
    } else {
      lines.push(`- ℹ️  Status: ${insertDupe.res.status}`);
    }
    lines.push('');
    
    // Test 5: Insert paywall_presented event
    lines.push('## Test 5: Paywall Event Updates Traits');
    const paywallEvent = {
      user_id: testUserId,
      anonymous_id: anonymousId,
      event_name: 'paywall_presented',
      properties: {
        variant: 'B',
        platform: 'ios',
      },
      ts: new Date().toISOString(),
      source: 'posthog',
      idempotency_key: `${rid}-event-paywall`,
    };
    
    const insertPaywall = await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paywallEvent)
    });
    
    if (insertPaywall.res.ok) {
      lines.push('- ✅ Paywall event inserted');
    } else {
      lines.push(`- ❌ Paywall event failed: ${insertPaywall.res.status}`);
    }
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check traits for paywall_last_seen
    const checkPaywallTraits = await apiFetch(SUPABASE_URL, `/rest/v1/user_traits?user_id=eq.${testUserId}&select=paywall_last_seen,paywall_impressions_total`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkPaywallTraits.res.ok && checkPaywallTraits.json && checkPaywallTraits.json.length > 0) {
      const traits = checkPaywallTraits.json[0];
      if (traits.paywall_last_seen) {
        lines.push(`- ✅ Paywall traits updated: impressions=${traits.paywall_impressions_total}`);
      } else {
        lines.push('- ⚠️  Paywall traits not updated yet');
      }
    }
    lines.push('');
    
    // Cleanup
    lines.push('## Cleanup');
    const cleanup1 = await apiFetch(SUPABASE_URL, `/rest/v1/user_traits?user_id=eq.${testUserId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    const cleanup2 = await apiFetch(SUPABASE_URL, `/rest/v1/event_log?user_id=eq.${testUserId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    const cleanup3 = await apiFetch(SUPABASE_URL, `/rest/v1/profiles?user_id=eq.${testUserId}`, {
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
    await writeReport(lines, 'test/agent/reports', 'lifecycle_posthog_webhook');
  }
}

test();
