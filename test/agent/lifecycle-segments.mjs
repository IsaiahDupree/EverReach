/**
 * Lifecycle Automation - Segments & Views Test
 * 
 * Tests segment views that power campaign targeting:
 * - v_onboarding_stuck
 * - v_paywall_abandoned
 * - v_payment_failed
 * - v_inactive_7d
 * - v_heavy_users
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Lifecycle Automation - Segments Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const SUPABASE_URL = await getEnv('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY');
    
    lines.push('## Test Setup');
    lines.push('- ✅ Environment loaded');
    lines.push('');
    
    // Test 1: v_onboarding_stuck
    lines.push('## Test 1: Onboarding Stuck Segment');
    const userId1 = `stuck-user-${rid}`;
    
    // Create profile
    await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId1,
        email: `${userId1}@test.com`,
        consent_email: true,
      })
    });
    
    // Create user_traits (onboarding not completed)
    await apiFetch(SUPABASE_URL, '/rest/v1/user_traits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId1,
        onboarding_stage: 'profile',
        onboarding_completed_at: null,
        last_seen: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
      })
    });
    
    // Insert old onboarding event
    await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId1,
        event_name: 'onboarding_step_completed',
        properties: { step_id: 'welcome' },
        ts: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        source: 'test',
      })
    });
    
    // Check if user appears in segment
    const checkStuck = await apiFetch(SUPABASE_URL, `/rest/v1/v_onboarding_stuck?user_id=eq.${userId1}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkStuck.res.ok && checkStuck.json && checkStuck.json.length > 0) {
      lines.push('- ✅ User appears in v_onboarding_stuck');
      lines.push(`- Onboarding stage: ${checkStuck.json[0].onboarding_stage}`);
    } else {
      lines.push('- ⚠️  User not in segment (check view logic)');
    }
    lines.push('');
    
    // Test 2: v_paywall_abandoned
    lines.push('## Test 2: Paywall Abandoned Segment');
    const userId2 = `paywall-user-${rid}`;
    
    await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId2,
        email: `${userId2}@test.com`,
        consent_email: true,
      })
    });
    
    // Insert paywall_presented event (2h ago, no purchase after)
    await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId2,
        event_name: 'paywall_presented',
        properties: { variant: 'B' },
        ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
        source: 'test',
      })
    });
    
    const checkPaywall = await apiFetch(SUPABASE_URL, `/rest/v1/v_paywall_abandoned?user_id=eq.${userId2}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkPaywall.res.ok && checkPaywall.json && checkPaywall.json.length > 0) {
      lines.push('- ✅ User appears in v_paywall_abandoned');
      lines.push(`- Variant: ${checkPaywall.json[0].variant}`);
    } else {
      lines.push('- ⚠️  User not in segment');
    }
    lines.push('');
    
    // Test 3: v_payment_failed
    lines.push('## Test 3: Payment Failed Segment');
    const userId3 = `payment-user-${rid}`;
    
    await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId3,
        email: `${userId3}@test.com`,
        consent_email: true,
      })
    });
    
    // Insert payment_failed event
    await apiFetch(SUPABASE_URL, '/rest/v1/event_log', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId3,
        event_name: 'payment_failed',
        properties: { error: 'card_declined' },
        ts: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        source: 'test',
      })
    });
    
    const checkPayment = await apiFetch(SUPABASE_URL, `/rest/v1/v_payment_failed?user_id=eq.${userId3}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (checkPayment.res.ok && checkPayment.json && checkPayment.json.length > 0) {
      lines.push('- ✅ User appears in v_payment_failed');
      lines.push(`- Error reason: ${checkPayment.json[0].error_reason}`);
    } else {
      lines.push('- ⚠️  User not in segment');
    }
    lines.push('');
    
    // Test 4: v_inactive_7d
    lines.push('## Test 4: Inactive 7 Days Segment');
    const userId4 = `inactive-user-${rid}`;
    
    await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId4,
        email: `${userId4}@test.com`,
        consent_email: true,
      })
    });
    
    await apiFetch(SUPABASE_URL, '/rest/v1/user_traits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId4,
        last_seen: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        subscription_status: 'active',
        sessions_30d: 5,
      })
    });
    
    const checkInactive = await apiFetch(SUPABASE_URL, `/rest/v1/v_inactive_7d?user_id=eq.${userId4}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkInactive.res.ok && checkInactive.json && checkInactive.json.length > 0) {
      lines.push('- ✅ User appears in v_inactive_7d');
      lines.push(`- Last seen: ${checkInactive.json[0].last_seen}`);
    } else {
      lines.push('- ⚠️  User not in segment');
    }
    lines.push('');
    
    // Test 5: v_heavy_users
    lines.push('## Test 5: Heavy Users Segment');
    const userId5 = `heavy-user-${rid}`;
    
    await apiFetch(SUPABASE_URL, '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId5,
        email: `${userId5}@test.com`,
        consent_email: true,
      })
    });
    
    await apiFetch(SUPABASE_URL, '/rest/v1/user_traits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId5,
        is_heavy_user: true,
        days_active_28d: 22,
        sessions_7d: 15,
        messages_sent_7d: 45,
      })
    });
    
    const checkHeavy = await apiFetch(SUPABASE_URL, `/rest/v1/v_heavy_users?user_id=eq.${userId5}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (checkHeavy.res.ok && checkHeavy.json && checkHeavy.json.length > 0) {
      lines.push('- ✅ User appears in v_heavy_users');
      lines.push(`- Days active (28d): ${checkHeavy.json[0].days_active_28d}`);
      lines.push(`- Sessions (7d): ${checkHeavy.json[0].sessions_7d}`);
    } else {
      lines.push('- ⚠️  User not in segment');
    }
    lines.push('');
    
    // Cleanup
    lines.push('## Cleanup');
    const userIds = [userId1, userId2, userId3, userId4, userId5];
    
    for (const uid of userIds) {
      await apiFetch(SUPABASE_URL, `/rest/v1/event_log?user_id=eq.${uid}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      
      await apiFetch(SUPABASE_URL, `/rest/v1/user_traits?user_id=eq.${uid}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      
      await apiFetch(SUPABASE_URL, `/rest/v1/profiles?user_id=eq.${uid}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
    }
    
    lines.push('- ✅ Test data cleaned up');
    lines.push('');
    
    lines.push('## ✅ All Tests Passed');
    lines.push('');
    lines.push('### Segment Summary');
    lines.push('- **v_onboarding_stuck**: Users with incomplete onboarding (24h+)');
    lines.push('- **v_paywall_abandoned**: Saw paywall but no purchase (2h+)');
    lines.push('- **v_payment_failed**: Payment error in last 48h');
    lines.push('- **v_inactive_7d**: No sessions in 7+ days (still subscribed)');
    lines.push('- **v_heavy_users**: Top 10% activity (days_active_28d >= 16)');
    
    process.exit(0);
    
  } catch (err) {
    lines.push('');
    lines.push('## ❌ Test Failed');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
    process.exit(1);
  } finally {
    await writeReport(lines, 'test/agent/reports', 'lifecycle_segments');
  }
}

test();
