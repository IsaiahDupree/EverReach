#!/usr/bin/env node
/**
 * Comprehensive Endpoint Testing - Local vs Deployed
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

const LOCAL_URL = 'http://localhost:3000';
const DEPLOYED_URL = 'https://ever-reach-be.vercel.app';

async function getAuthToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session.access_token;
}

async function testEndpoint(name, method, path, baseUrl, token, body = null) {
  const url = `${baseUrl}${path}`;
  const startTime = Date.now();
  
  try {
    const options = {
      method,
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined,
        'Content-Type': 'application/json',
        'Origin': 'https://everreach.app',
      },
    };
    
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    const status = response.status;
    
    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {}
    
    return { 
      name, 
      status, 
      ok: status < 400, 
      duration,
      hasData: !!data,
      errorMessage: data?.error || data?.message,
    };
  } catch (error) {
    return { 
      name, 
      ok: false, 
      status: 'ERROR', 
      duration: Date.now() - startTime,
      errorMessage: error.message,
    };
  }
}

async function runTests(baseUrl, token, contactId) {
  const tests = [];
  
  // Public endpoints
  tests.push(await testEndpoint('Health Check', 'GET', '/api/health', baseUrl, null));
  tests.push(await testEndpoint('Paywall Config', 'GET', '/api/v1/config/paywall', baseUrl, null));
  tests.push(await testEndpoint('Paywall Strategy', 'GET', '/api/v1/config/paywall-strategy', baseUrl, null));
  
  // Auth required - User endpoints
  tests.push(await testEndpoint('Get User Profile', 'GET', '/api/v1/me', baseUrl, token));
  tests.push(await testEndpoint('Get User Entitlements', 'GET', '/api/v1/me/entitlements', baseUrl, token));
  tests.push(await testEndpoint('Get Compose Settings', 'GET', '/api/v1/me/compose-settings', baseUrl, token));
  
  // Contacts endpoints
  tests.push(await testEndpoint('Get Contacts', 'GET', '/api/v1/contacts', baseUrl, token));
  tests.push(await testEndpoint('Get Goals', 'GET', '/api/v1/goals', baseUrl, token));
  
  if (contactId) {
    tests.push(await testEndpoint('Get Contact Detail', 'GET', `/api/v1/contacts/${contactId}`, baseUrl, token));
    tests.push(await testEndpoint('Get Contact Goals', 'GET', `/api/v1/contacts/${contactId}/goal-suggestions`, baseUrl, token));
  }
  
  // Interactions
  tests.push(await testEndpoint('Get Interactions', 'GET', '/api/v1/interactions', baseUrl, token));
  
  // Warmth
  tests.push(await testEndpoint('Get Warmth Summary', 'GET', '/api/v1/warmth/summary', baseUrl, token));
  
  // Messages
  if (contactId) {
    tests.push(await testEndpoint('Prepare Message', 'POST', '/api/v1/messages/prepare', baseUrl, token, {
      contact_id: contactId,
      goal: 'Just checking in',
      channel: 'email',
    }));
    
    tests.push(await testEndpoint('Compose Message', 'POST', '/api/v1/compose', baseUrl, token, {
      contact_id: contactId,
      goal: 'Just checking in',
      channel: 'email',
    }));
  }
  
  // Agent
  tests.push(await testEndpoint('Agent Chat', 'POST', '/api/v1/agent/chat', baseUrl, token, {
    messages: [{ role: 'user', content: 'Hello' }],
  }));
  
  return tests;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 Comprehensive Endpoint Testing - Local vs Deployed       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('🔐 Authenticating...');
  const token = await getAuthToken();
  console.log('   ✅ Auth token obtained\n');

  // Get a contact ID for testing
  console.log('📋 Fetching test contact...');
  const contactsResponse = await fetch(`${LOCAL_URL}/api/v1/contacts`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const contacts = await contactsResponse.json();
  const contactId = contacts[0]?.id;
  console.log(`   ✅ Using contact ID: ${contactId || 'none'}\n`);

  console.log('═'.repeat(70));
  console.log('\n🔬 Running Tests...\n');

  // Test LOCAL
  console.log('📍 Testing LOCAL backend...');
  const localResults = await runTests(LOCAL_URL, token, contactId);
  const localPassed = localResults.filter(r => r.ok).length;
  console.log(`   ✅ Passed: ${localPassed}/${localResults.length}\n`);

  // Test DEPLOYED
  console.log('📍 Testing DEPLOYED backend...');
  const deployedResults = await runTests(DEPLOYED_URL, token, contactId);
  const deployedPassed = deployedResults.filter(r => r.ok).length;
  console.log(`   ✅ Passed: ${deployedPassed}/${deployedResults.length}\n`);

  console.log('═'.repeat(70));
  console.log('\n📊 DETAILED RESULTS\n');

  // Compare results
  console.log('Endpoint'.padEnd(35) + 'Local'.padEnd(15) + 'Deployed'.padEnd(15) + 'Match');
  console.log('─'.repeat(70));

  for (let i = 0; i < localResults.length; i++) {
    const local = localResults[i];
    const deployed = deployedResults[i];
    
    const localStatus = local.ok ? `✅ ${local.status}` : `❌ ${local.status}`;
    const deployedStatus = deployed.ok ? `✅ ${deployed.status}` : `❌ ${deployed.status}`;
    const match = local.ok === deployed.ok ? '✅' : '⚠️';
    
    console.log(
      local.name.padEnd(35) +
      localStatus.padEnd(15) +
      deployedStatus.padEnd(15) +
      match
    );
    
    // Show timing
    if (local.ok && deployed.ok) {
      const localTime = `${local.duration}ms`.padEnd(8);
      const deployedTime = `${deployed.duration}ms`.padEnd(8);
      console.log(`${''.padEnd(35)}${localTime}${' '.repeat(7)}${deployedTime}`);
    }
    
    // Show errors
    if (!local.ok && local.errorMessage) {
      console.log(`   LOCAL ERROR: ${local.errorMessage.substring(0, 50)}`);
    }
    if (!deployed.ok && deployed.errorMessage) {
      console.log(`   DEPLOYED ERROR: ${deployed.errorMessage.substring(0, 50)}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📈 SUMMARY\n');

  console.log('LOCAL Backend:');
  console.log(`   URL:      ${LOCAL_URL}`);
  console.log(`   ✅ Passed: ${localPassed}/${localResults.length}`);
  console.log(`   ❌ Failed: ${localResults.length - localPassed}/${localResults.length}`);
  console.log(`   Success:  ${((localPassed/localResults.length)*100).toFixed(1)}%\n`);

  console.log('DEPLOYED Backend:');
  console.log(`   URL:      ${DEPLOYED_URL}`);
  console.log(`   ✅ Passed: ${deployedPassed}/${deployedResults.length}`);
  console.log(`   ❌ Failed: ${deployedResults.length - deployedPassed}/${deployedResults.length}`);
  console.log(`   Success:  ${((deployedPassed/deployedResults.length)*100).toFixed(1)}%\n`);

  // Discrepancies
  const discrepancies = localResults.filter((local, i) => {
    const deployed = deployedResults[i];
    return local.ok !== deployed.ok;
  });

  if (discrepancies.length > 0) {
    console.log('⚠️  DISCREPANCIES FOUND:\n');
    discrepancies.forEach((local, idx) => {
      const deployed = deployedResults[localResults.indexOf(local)];
      console.log(`   ${local.name}`);
      console.log(`      Local:    ${local.ok ? 'PASS' : 'FAIL'} (${local.status})`);
      console.log(`      Deployed: ${deployed.ok ? 'PASS' : 'FAIL'} (${deployed.status})\n`);
    });
  } else {
    console.log('✅ Perfect Match - Both backends behave identically!\n');
  }

  // Performance comparison
  const avgLocalTime = localResults.filter(r => r.ok).reduce((sum, r) => sum + r.duration, 0) / localPassed;
  const avgDeployedTime = deployedResults.filter(r => r.ok).reduce((sum, r) => sum + r.duration, 0) / deployedPassed;
  
  console.log('⚡ PERFORMANCE:\n');
  console.log(`   Local Avg:    ${avgLocalTime.toFixed(0)}ms`);
  console.log(`   Deployed Avg: ${avgDeployedTime.toFixed(0)}ms`);
  console.log(`   Difference:   ${Math.abs(avgLocalTime - avgDeployedTime).toFixed(0)}ms\n`);

  console.log('═'.repeat(70));
  console.log('');

  const allPassed = localPassed === localResults.length && deployedPassed === deployedResults.length;
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
