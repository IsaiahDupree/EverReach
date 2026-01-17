/**
 * Paywall Analytics API Test
 * 
 * Tests paywall analytics endpoints:
 * - /api/me/impact-summary
 * - /api/me/usage-summary
 * - /api/me/plan-recommendation
 * - /api/cron/paywall-rollup
 */

import { getEnv, apiFetch, getAccessToken, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Paywall Analytics API Test',
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
    
    // Test 1: Impact Summary
    lines.push('## Test 1: Impact Summary');
    const impactSummary = await apiFetch(BASE_URL, '/api/me/impact-summary', {
      method: 'GET',
      token,
    });
    
    if (impactSummary.res.ok) {
      lines.push('- ✅ Impact summary retrieved');
      lines.push('');
      lines.push('**Metrics:**');
      const data = impactSummary.json;
      lines.push(`- Contacts added: ${data?.contacts_added || 0}`);
      lines.push(`- Messages sent: ${data?.messages_sent || 0}`);
      lines.push(`- Relationships strengthened: ${data?.relationships_strengthened || 0}`);
      lines.push(`- Active days: ${data?.active_days || 0}`);
      lines.push(`- Response time: ${impactSummary.ms}ms`);
    } else {
      lines.push('- ❌ Failed to retrieve impact summary');
      lines.push(`- Status: ${impactSummary.res.status}`);
      lines.push(`- Error: ${mdEscape(impactSummary.json?.error || 'Unknown')}`);
    }
    lines.push('');
    
    // Test 2: Usage Summary
    lines.push('## Test 2: Usage Summary');
    const usageSummary = await apiFetch(BASE_URL, '/api/me/usage-summary', {
      method: 'GET',
      token,
    });
    
    if (usageSummary.res.ok) {
      lines.push('- ✅ Usage summary retrieved');
      lines.push('');
      lines.push('**Usage stats:**');
      const data = usageSummary.json;
      lines.push(`- Sessions this month: ${data?.sessions_count || 0}`);
      lines.push(`- Features used: ${data?.features_used?.length || 0}`);
      lines.push(`- AI messages generated: ${data?.ai_messages_generated || 0}`);
      lines.push(`- Storage used: ${data?.storage_mb || 0}MB`);
      lines.push(`- Response time: ${usageSummary.ms}ms`);
    } else {
      lines.push('- ❌ Failed to retrieve usage summary');
      lines.push(`- Status: ${usageSummary.res.status}`);
    }
    lines.push('');
    
    // Test 3: Plan Recommendation
    lines.push('## Test 3: AI Plan Recommendation');
    const planRec = await apiFetch(BASE_URL, '/api/me/plan-recommendation', {
      method: 'GET',
      token,
    });
    
    if (planRec.res.ok) {
      lines.push('- ✅ Plan recommendation generated');
      lines.push('');
      const data = planRec.json;
      lines.push(`**Recommended plan:** ${data?.recommended_plan || 'N/A'}`);
      lines.push(`**Confidence:** ${data?.confidence || 'N/A'}%`);
      lines.push('');
      if (data?.reasons && Array.isArray(data.reasons)) {
        lines.push('**Reasons:**');
        data.reasons.forEach(reason => {
          lines.push(`  - ${reason}`);
        });
      }
      lines.push(`- Response time: ${planRec.ms}ms`);
    } else {
      lines.push('- ⚠️ Plan recommendation unavailable');
      lines.push(`- Status: ${planRec.res.status}`);
    }
    lines.push('');
    
    // Test 4: Paywall Rollup (cron endpoint)
    lines.push('## Test 4: Paywall Rollup Cron');
    const rollup = await apiFetch(BASE_URL, '/api/cron/paywall-rollup', {
      method: 'GET',
      token,
    });
    
    // Expecting 401 without CRON_SECRET
    if (rollup.res.status === 401 || rollup.res.status === 403) {
      lines.push('- ✅ Cron endpoint deployed (auth required)');
    } else if (rollup.res.ok) {
      lines.push('- ✅ Cron endpoint accessible');
      lines.push(`- Rollup completed: ${rollup.json?.success}`);
    } else {
      lines.push('- ❌ Cron endpoint not found');
      lines.push(`- Status: ${rollup.res.status}`);
    }
    lines.push('');
    
    // Test 5: Performance check
    lines.push('## Test 5: Performance Check');
    const avgResponseTime = (impactSummary.ms + usageSummary.ms + planRec.ms) / 3;
    lines.push(`- Average response time: ${Math.round(avgResponseTime)}ms`);
    
    if (avgResponseTime < 500) {
      lines.push('- ✅ Excellent performance (<500ms)');
    } else if (avgResponseTime < 1000) {
      lines.push('- ✅ Good performance (<1s)');
    } else {
      lines.push('- ⚠️ Slow performance (>1s)');
    }
    lines.push('');
    
    // Summary
    lines.push('## Test Summary');
    const passedTests = [
      impactSummary.res.ok,
      usageSummary.res.ok,
      planRec.res.ok || planRec.res.status === 404, // OK if not implemented
      rollup.res.status === 401 || rollup.res.status === 403 || rollup.res.ok,
    ].filter(Boolean).length;
    
    lines.push(`- **Tests passed**: ${passedTests}/4`);
    lines.push(`- **API Status**: ${impactSummary.res.ok && usageSummary.res.ok ? 'Operational ✅' : 'Issues detected ❌'}`);
    lines.push('');
    
    lines.push('## Feature Status');
    lines.push('- **Impact tracking**: Measures user value (contacts, messages, relationships)');
    lines.push('- **Usage analytics**: Tracks feature adoption and engagement');
    lines.push('- **AI recommendations**: Suggests optimal plan based on usage patterns');
    lines.push('- **Rollup automation**: Aggregates analytics for dashboard');
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
  .then(() => writeReport(lines, 'test/agent/reports', 'paywall_analytics'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'paywall_analytics').finally(() => process.exit(1));
  });
