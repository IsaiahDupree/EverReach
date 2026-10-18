/**
 * Campaign Automation End-to-End Test
 * 
 * Tests the complete campaign automation pipeline:
 * - Campaign configuration verification
 * - Template A/B variants
 * - Segment view queries
 * - Delivery tracking
 * - Token replacement
 * - Cron job endpoints
 */

import { getEnv, apiFetch, getAccessToken, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Campaign Automation E2E Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const BASE_URL = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
    const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
    const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
    const token = await getAccessToken();
    
    lines.push('## Test Setup');
    lines.push(`- Backend URL: ${BASE_URL}`);
    lines.push(`- Supabase URL: ${SUPABASE_URL}`);
    lines.push(`- Authenticated: ✅`);
    lines.push('');
    
    // Test 1: Verify campaigns exist in database
    lines.push('## Test 1: Verify Campaigns in Database');
    const campaignsQuery = await fetch(`${SUPABASE_URL}/rest/v1/campaigns?select=id,name,channel,enabled,cooldown_hours`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    const campaigns = await campaignsQuery.json();
    
    if (Array.isArray(campaigns) && campaigns.length > 0) {
      lines.push('- ✅ Campaigns found in database');
      lines.push(`- Total campaigns: ${campaigns.length}`);
      lines.push('');
      lines.push('**Campaign list:**');
      campaigns.forEach(c => {
        lines.push(`  - ${c.name} (${c.channel}) - ${c.enabled ? 'Enabled' : 'Disabled'}`);
        lines.push(`    Cooldown: ${c.cooldown_hours}h`);
      });
    } else {
      lines.push('- ❌ No campaigns found');
      lines.push('- Run: `Get-Content insert-campaigns.ps1 | powershell -Command -`');
    }
    lines.push('');
    
    // Test 2: Verify templates (A/B variants)
    lines.push('## Test 2: Verify A/B Templates');
    const templatesQuery = await fetch(`${SUPABASE_URL}/rest/v1/templates?select=id,campaign_id,variant_key,subject`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    const templates = await templatesQuery.json();
    
    if (Array.isArray(templates) && templates.length > 0) {
      lines.push('- ✅ Templates found');
      lines.push(`- Total templates: ${templates.length}`);
      
      const variantCount = templates.reduce((acc, t) => {
        acc[t.variant_key] = (acc[t.variant_key] || 0) + 1;
        return acc;
      }, {});
      
      lines.push('');
      lines.push('**Variant distribution:**');
      Object.entries(variantCount).forEach(([variant, count]) => {
        lines.push(`  - Variant ${variant}: ${count} templates`);
      });
      
      // Check for proper A/B split
      const expectedPerCampaign = 2;
      const campaignsWithTemplates = campaigns.length;
      const expectedTotal = campaignsWithTemplates * expectedPerCampaign;
      
      if (templates.length === expectedTotal) {
        lines.push('');
        lines.push(`- ✅ All campaigns have ${expectedPerCampaign} variants`);
      } else {
        lines.push('');
        lines.push(`- ⚠️ Expected ${expectedTotal} templates, found ${templates.length}`);
      }
    } else {
      lines.push('- ❌ No templates found');
    }
    lines.push('');
    
    // Test 3: Verify segment views
    lines.push('## Test 3: Verify Segment Views');
    const segmentViews = [
      'v_onboarding_stuck',
      'v_paywall_abandoned',
      'v_payment_failed',
      'v_inactive_7d',
      'v_heavy_users',
    ];
    
    const segmentResults = {};
    for (const viewName of segmentViews) {
      try {
        const viewQuery = await fetch(`${SUPABASE_URL}/rest/v1/${viewName}?select=count`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'count=exact',
          },
        });
        
        const count = viewQuery.headers.get('Content-Range')?.split('/')[1] || '0';
        segmentResults[viewName] = parseInt(count);
        lines.push(`- ${viewName}: ${count} eligible users`);
      } catch (err) {
        lines.push(`- ${viewName}: ❌ View not found`);
        segmentResults[viewName] = null;
      }
    }
    
    const allViewsExist = Object.values(segmentResults).every(v => v !== null);
    if (allViewsExist) {
      lines.push('');
      lines.push('- ✅ All segment views exist');
    } else {
      lines.push('');
      lines.push('- ❌ Some segment views missing - run migration');
    }
    lines.push('');
    
    // Test 4: Check deliveries table
    lines.push('## Test 4: Check Deliveries Table');
    const deliveriesQuery = await fetch(`${SUPABASE_URL}/rest/v1/deliveries?select=count`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'count=exact',
      },
    });
    
    const deliveriesCount = deliveriesQuery.headers.get('Content-Range')?.split('/')[1] || '0';
    lines.push(`- Total deliveries: ${deliveriesCount}`);
    if (parseInt(deliveriesCount) === 0) {
      lines.push('- ℹ️ No deliveries yet (expected for new system)');
    } else {
      lines.push('- ✅ Campaigns have executed');
    }
    lines.push('');
    
    // Test 5: Test cron endpoints (if available)
    lines.push('## Test 5: Cron Endpoints Check');
    
    // Note: These require CRON_SECRET, so we just check if they're deployed
    const cronEndpoints = [
      '/api/cron/run-campaigns',
      '/api/cron/send-email',
      '/api/cron/send-sms',
    ];
    
    for (const endpoint of cronEndpoints) {
      const check = await apiFetch(BASE_URL, endpoint, {
        method: 'GET',
        token,
      });
      
      // Expecting 401 (unauthorized) since we don't have CRON_SECRET
      // But endpoint should exist
      if (check.res.status === 401 || check.res.status === 403) {
        lines.push(`- ${endpoint}: ✅ Deployed (auth required)`);
      } else if (check.res.status === 404) {
        lines.push(`- ${endpoint}: ❌ Not found`);
      } else {
        lines.push(`- ${endpoint}: ⚠️ Unexpected status ${check.res.status}`);
      }
    }
    lines.push('');
    
    // Test Summary
    lines.push('## Test Summary');
    const checks = {
      campaigns: campaigns.length > 0,
      templates: templates.length > 0,
      segments: allViewsExist,
      ab_split: templates.length === campaigns.length * 2,
    };
    
    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    
    lines.push(`- **Checks passed**: ${passed}/${total}`);
    lines.push('');
    lines.push('**Component Status:**');
    lines.push(`- Campaigns: ${checks.campaigns ? '✅' : '❌'}`);
    lines.push(`- Templates: ${checks.templates ? '✅' : '❌'}`);
    lines.push(`- Segments: ${checks.segments ? '✅' : '❌'}`);
    lines.push(`- A/B Split: ${checks.ab_split ? '✅' : '❌'}`);
    lines.push('');
    
    lines.push('## Automation Status');
    lines.push('');
    lines.push('**Cron Schedule** (configured in `vercel.json`):');
    lines.push('- `run-campaigns`: Every 15 minutes');
    lines.push('- `send-email`: Every 5 minutes');
    lines.push('- `send-sms`: Every 5 minutes');
    lines.push('');
    lines.push('**Campaign Triggers:**');
    lines.push('- Onboarding Stuck: 24h after signup, <5 contacts');
    lines.push('- Paywall Abandoned: 2h after view, no purchase');
    lines.push('- Payment Failed: 48h after failure');
    lines.push('- Inactive 7 Days: No activity for 7 days');
    lines.push('- VIP Nurture: Top 10% active users');
    lines.push('');
    
    if (passed === total) {
      lines.push('## ✅ All Systems Operational');
      lines.push('');
      lines.push('Campaigns are ready to auto-execute when users match segment criteria.');
    } else {
      lines.push('## ⚠️ Action Required');
      lines.push('');
      if (!checks.campaigns || !checks.templates) {
        lines.push('- Run migrations: `Get-Content insert-campaigns.ps1 | powershell -Command -`');
      }
      if (!checks.segments) {
        lines.push('- Create segment views: `Get-Content create-views-from-migration.ps1 | powershell -Command -`');
      }
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
  .then(() => writeReport(lines, 'test/agent/reports', 'campaign_automation'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'campaign_automation').finally(() => process.exit(1));
  });
