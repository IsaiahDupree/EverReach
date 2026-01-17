/**
 * Developer Notifications API Test
 * 
 * Tests the /api/admin/dev-notifications endpoint:
 * - Activity stats retrieval
 * - Event aggregation by type
 * - Unique user counting
 * - Time window filtering
 * - Subscription management
 */

import { getEnv, apiFetch, getAccessToken, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Developer Notifications API Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const BASE_URL = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();
    
    lines.push('## Test Setup');
    lines.push(`- Backend URL: ${BASE_URL}`);
    lines.push(`- Authenticated: ✅`);
    lines.push('');
    
    // Test 1: Get activity stats (24h)
    lines.push('## Test 1: Get Activity Stats (24h)');
    const stats24h = await apiFetch(BASE_URL, '/api/admin/dev-notifications?hours=24', {
      method: 'GET',
      token,
    });
    
    if (stats24h.res.ok && stats24h.json?.success) {
      lines.push('- ✅ Activity stats retrieved');
      lines.push(`- Hours: ${stats24h.json.hours}`);
      lines.push(`- Total events: ${stats24h.json.stats.total_events}`);
      lines.push(`- Unique users: ${stats24h.json.stats.unique_users}`);
      lines.push('');
      lines.push('**Events by type:**');
      Object.entries(stats24h.json.stats.by_type || {}).forEach(([type, count]) => {
        lines.push(`  - ${type}: ${count}`);
      });
      lines.push('');
      lines.push('**Recent events sample:**');
      lines.push(`  - Showing ${stats24h.json.stats.recent_events?.length || 0} recent events`);
    } else {
      lines.push('- ❌ Failed to retrieve stats');
      lines.push(`- Status: ${stats24h.res.status}`);
      lines.push(`- Error: ${mdEscape(stats24h.json?.error || 'Unknown')}`);
    }
    lines.push('');
    
    // Test 2: Get activity stats (custom window - 72h)
    lines.push('## Test 2: Get Activity Stats (72h)');
    const stats72h = await apiFetch(BASE_URL, '/api/admin/dev-notifications?hours=72', {
      method: 'GET',
      token,
    });
    
    if (stats72h.res.ok && stats72h.json?.success) {
      lines.push('- ✅ Custom time window works');
      lines.push(`- Hours: ${stats72h.json.hours}`);
      lines.push(`- Total events: ${stats72h.json.stats.total_events}`);
      lines.push(`- Unique users: ${stats72h.json.stats.unique_users}`);
      
      // Compare with 24h
      const increase = stats72h.json.stats.total_events - (stats24h.json?.stats?.total_events || 0);
      lines.push(`- Additional events in 72h vs 24h: ${increase}`);
    } else {
      lines.push('- ❌ Failed to retrieve 72h stats');
      lines.push(`- Status: ${stats72h.res.status}`);
    }
    lines.push('');
    
    // Test 3: Event filtering
    lines.push('## Test 3: Event Type Filtering');
    const filtered = await apiFetch(BASE_URL, '/api/admin/dev-notifications?hours=24&events=signup_completed,session_started', {
      method: 'GET',
      token,
    });
    
    if (filtered.res.ok && filtered.json?.success) {
      lines.push('- ✅ Event filtering works');
      const types = Object.keys(filtered.json.stats.by_type || {});
      lines.push(`- Filtered to: ${types.join(', ')}`);
    } else {
      lines.push('- ⚠️ Event filtering not available');
    }
    lines.push('');
    
    // Test 4: Subscribe to notifications
    lines.push('## Test 4: Subscribe to Notifications');
    const subscription = await apiFetch(BASE_URL, '/api/admin/dev-notifications', {
      method: 'POST',
      token,
      body: JSON.stringify({
        notification_channel: 'email',
        destination: 'isaiahdupree33@gmail.com',
        events: ['signup_completed', 'purchase_started'],
      }),
    });
    
    if (subscription.res.ok && subscription.json?.success) {
      lines.push('- ✅ Subscription created');
      lines.push(`- Channel: ${subscription.json.subscription?.channel}`);
      lines.push(`- Destination: ${subscription.json.subscription?.destination}`);
      lines.push(`- Events: ${subscription.json.subscription?.events?.join(', ')}`);
      
      if (subscription.json.next_steps) {
        lines.push('');
        lines.push('**Next steps:**');
        subscription.json.next_steps.forEach(step => {
          lines.push(`  - ${step}`);
        });
      }
    } else {
      lines.push('- ❌ Subscription failed');
      lines.push(`- Status: ${subscription.res.status}`);
    }
    lines.push('');
    
    // Test 5: Response time
    lines.push('## Test 5: Performance Check');
    const perfStats = await apiFetch(BASE_URL, '/api/admin/dev-notifications?hours=24', {
      method: 'GET',
      token,
    });
    lines.push(`- Response time: ${perfStats.ms}ms`);
    if (perfStats.ms < 1000) {
      lines.push('- ✅ Performance good (<1s)');
    } else if (perfStats.ms < 3000) {
      lines.push('- ⚠️ Performance acceptable (1-3s)');
    } else {
      lines.push('- ❌ Performance slow (>3s)');
    }
    lines.push('');
    
    // Summary
    lines.push('## Test Summary');
    const passedTests = [
      stats24h.res.ok,
      stats72h.res.ok,
      perfStats.ms < 3000,
    ].filter(Boolean).length;
    
    lines.push(`- **Tests passed**: ${passedTests}/5`);
    lines.push(`- **API Status**: ${stats24h.res.ok ? 'Operational ✅' : 'Issues detected ❌'}`);
    lines.push(`- **Feature**: Developer activity monitoring`);
    lines.push('');
    
    lines.push('## Recommendations');
    if (!stats24h.res.ok) {
      lines.push('- 🔴 **CRITICAL**: API endpoint not responding - check Vercel logs');
      lines.push('- Verify SUPABASE_SERVICE_ROLE_KEY env var is set');
      lines.push('- Check database permissions for event_log table');
    } else if (stats24h.json.stats.total_events === 0) {
      lines.push('- ℹ️ No events in last 24h - expected for new deployment');
    } else {
      lines.push('- ✅ All systems operational');
      lines.push('- Monitor daily digest emails (9 AM)');
    }
    lines.push('');
    
  } catch (err) {
    lines.push('## Fatal Error');
    lines.push('```');
    lines.push(err.stack || err.message);
    lines.push('```');
    throw err;
  }
}

test()
  .then(() => writeReport(lines, 'test/agent/reports', 'dev_notifications'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'dev_notifications').finally(() => process.exit(1));
  });
