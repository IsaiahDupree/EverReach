/**
 * Social Platform Integrations Test Suite
 * Tests WhatsApp, Instagram, and Facebook Ads APIs
 * 
 * Run: node test/agent/integration-social-platforms.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Social Platform Integrations Test',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const BASE_URL = await getEnv('NEXT_PUBLIC_API_URL');
    const SUPABASE_URL = await getEnv('SUPABASE_URL');
    const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');
    const TEST_EMAIL = await getEnv('TEST_USER_EMAIL', 'isaiahdupree33@gmail.com');
    const TEST_PASSWORD = await getEnv('TEST_USER_PASSWORD', 'frogger12');
    
    lines.push('## Test Setup');
    lines.push('- ✅ Environment loaded');
    lines.push(`- Base URL: \`${BASE_URL}\``);
    lines.push('');
    
    // Authenticate
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (authError) {
      lines.push('- ❌ Authentication failed');
      throw new Error(`Auth failed: ${authError.message}`);
    }
    
    const token = authData.session.access_token;
    lines.push('- ✅ Authenticated successfully');
    lines.push('');
    
    // ============================================================================
    // TEST 1: WhatsApp Business API
    // ============================================================================
    
    lines.push('## Test 1: WhatsApp Business - Send Template Message');
    
    try {
      const whatsappRes = await apiFetch(BASE_URL, '/api/v1/integrations/whatsapp/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: '12177996721',
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' }
          }
        })
      });
      
      if (whatsappRes.res.ok) {
        lines.push('- ✅ WhatsApp template message sent successfully');
        lines.push(`- Message ID: \`${whatsappRes.json.message_id || 'N/A'}\``);
        lines.push(`- Sent to: ${whatsappRes.json.sent_to}`);
      } else {
        const errorMsg = whatsappRes.json.error || whatsappRes.json.details || 'Unknown error';
        if (errorMsg.includes('not configured')) {
          lines.push('- ⚠️ WhatsApp API token not configured (expected for first run)');
        } else {
          lines.push(`- ❌ WhatsApp send failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      lines.push(`- ❌ WhatsApp test error: ${error.message}`);
    }
    lines.push('');
    
    // ============================================================================
    // TEST 2: Instagram Business API
    // ============================================================================
    
    lines.push('## Test 2: Instagram Business - Get Account Stats');
    
    try {
      const instagramRes = await apiFetch(BASE_URL, '/api/v1/integrations/instagram/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (instagramRes.res.ok) {
        lines.push('- ✅ Instagram stats fetched successfully');
        const account = instagramRes.json.account;
        if (account) {
          lines.push(`- Account: \`${account.name || account.username || 'N/A'}\``);
          lines.push(`- Followers: ${account.followers_count || 'N/A'}`);
          lines.push(`- Media Count: ${account.media_count || 'N/A'}`);
          if (instagramRes.json.recent_media) {
            lines.push(`- Recent Posts: ${instagramRes.json.recent_media.length}`);
          }
        }
      } else {
        const errorMsg = instagramRes.json.error || instagramRes.json.details || 'Unknown error';
        if (errorMsg.includes('not configured')) {
          lines.push('- ⚠️ Instagram API token not configured (expected for first run)');
        } else {
          lines.push(`- ❌ Instagram stats failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      lines.push(`- ❌ Instagram test error: ${error.message}`);
    }
    lines.push('');
    
    // ============================================================================
    // TEST 3: Facebook Ads - List Campaigns
    // ============================================================================
    
    lines.push('## Test 3: Facebook Ads - List Campaigns');
    
    try {
      const fbAdsRes = await apiFetch(BASE_URL, '/api/v1/integrations/facebook-ads/campaigns?limit=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (fbAdsRes.res.ok) {
        lines.push('- ✅ Facebook Ads campaigns fetched successfully');
        lines.push(`- Total campaigns: ${fbAdsRes.json.total_count || 0}`);
        lines.push(`- Ad Account: \`${fbAdsRes.json.ad_account_id}\``);
        
        if (fbAdsRes.json.campaigns && fbAdsRes.json.campaigns.length > 0) {
          lines.push('- Recent campaigns:');
          fbAdsRes.json.campaigns.slice(0, 3).forEach(campaign => {
            lines.push(`  - ${campaign.name} (${campaign.status})`);
          });
        }
      } else {
        const errorMsg = fbAdsRes.json.error || fbAdsRes.json.details || 'Unknown error';
        if (errorMsg.includes('not configured')) {
          lines.push('- ⚠️ Facebook Ads API token not configured (expected for first run)');
        } else {
          lines.push(`- ❌ Facebook Ads list failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      lines.push(`- ❌ Facebook Ads test error: ${error.message}`);
    }
    lines.push('');
    
    // ============================================================================
    // TEST 4: Facebook Ads - Create Campaign (Dry Run)
    // ============================================================================
    
    lines.push('## Test 4: Facebook Ads - Create Campaign (PAUSED)');
    
    try {
      const createCampaignRes = await apiFetch(BASE_URL, '/api/v1/integrations/facebook-ads/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Campaign - ${rid}`,
          objective: 'OUTCOME_TRAFFIC',
          status: 'PAUSED', // Important: Create as PAUSED for testing
          special_ad_categories: []
        })
      });
      
      if (createCampaignRes.res.ok) {
        lines.push('- ✅ Facebook Ads campaign created (PAUSED)');
        lines.push(`- Campaign ID: \`${createCampaignRes.json.campaign_id}\``);
        lines.push(`- Name: ${createCampaignRes.json.name}`);
        lines.push(`- Objective: ${createCampaignRes.json.objective}`);
        lines.push(`- Status: ${createCampaignRes.json.status}`);
      } else {
        const errorMsg = createCampaignRes.json.error || createCampaignRes.json.details || 'Unknown error';
        if (errorMsg.includes('not configured')) {
          lines.push('- ⚠️ Facebook Ads API token not configured (expected for first run)');
        } else {
          lines.push(`- ❌ Campaign creation failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      lines.push(`- ❌ Facebook Ads create test error: ${error.message}`);
    }
    lines.push('');
    
    lines.push('## ✅ All Integration Tests Completed');
    lines.push('');
    lines.push('### Configuration Notes');
    lines.push('To enable these integrations, add to `.env`:');
    lines.push('```');
    lines.push('WHATSAPP_ACCESS_TOKEN=your_whatsapp_token');
    lines.push('INSTAGRAM_ACCESS_TOKEN=your_instagram_token');
    lines.push('FB_ADS_ACCESS_TOKEN=your_facebook_ads_token');
    lines.push('```');
    
  } catch (err) {
    lines.push('');
    lines.push('## ❌ Test Failed');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
  } finally {
    await writeReport(lines, 'test/agent/reports', 'social_platforms');
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
