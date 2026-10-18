#!/usr/bin/env node
/**
 * Get Auth Token and Test Authenticated Endpoints
 */

import { createClient } from '@supabase/supabase-js';

// Load .env file
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || (process.env.SUPABASE_ANON_KEY);
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function getAuthToken() {
  console.log('\n🔐 Authenticating with Supabase...');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    throw new Error(`Auth failed: ${error.message}`);
  }

  console.log('   ✅ Authentication successful!');
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Token expires: ${new Date(data.session.expires_at * 1000).toISOString()}`);
  
  return {
    accessToken: data.session.access_token,
    userId: data.user.id,
    email: data.user.email,
  };
}

async function testEndpoint(name, method, path, token, body = null) {
  const url = `${BASE_URL}${path}`;
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://everreach.app',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const status = response.status;
    
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    const result = status < 400 ? '✅' : '❌';
    console.log(`${result} ${name.padEnd(35)} ${method.padEnd(6)} ${status}`);
    
    return { name, status, ok: status < 400, data };
  } catch (error) {
    console.log(`❌ ${name.padEnd(35)} ${method.padEnd(6)} ERROR`);
    return { name, ok: false, error: error.message };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 Authenticated Endpoint Testing                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📍 Target: ${BASE_URL}\n`);

  // Get auth token
  const auth = await getAuthToken();
  const token = auth.accessToken;
  
  console.log('\n📋 Auth Token (first 50 chars):');
  console.log(`   ${token.substring(0, 50)}...\n`);
  
  console.log('═'.repeat(70));
  console.log('\n🔬 Testing Authenticated Endpoints\n');
  
  const results = [];

  // Test authenticated endpoints
  results.push(await testEndpoint('Get User Profile', 'GET', '/api/v1/me', token));
  results.push(await testEndpoint('Get Contacts', 'GET', '/api/v1/contacts', token));
  results.push(await testEndpoint('Get Interactions', 'GET', '/api/v1/interactions', token));
  results.push(await testEndpoint('Get Warmth Summary', 'GET', '/api/v1/warmth/summary', token));
  results.push(await testEndpoint('Get Goals', 'GET', '/api/v1/goals', token));
  results.push(await testEndpoint('Get User Entitlements', 'GET', '/api/v1/me/entitlements', token));
  results.push(await testEndpoint('Get Compose Settings', 'GET', '/api/v1/me/compose-settings', token));
  
  // Test a contact if we have any
  const contactsResult = results.find(r => r.name === 'Get Contacts');
  if (contactsResult?.ok && contactsResult.data?.length > 0) {
    const contactId = contactsResult.data[0].id;
    results.push(await testEndpoint('Get Contact Detail', 'GET', `/api/v1/contacts/${contactId}`, token));
    results.push(await testEndpoint('Get Contact Goal Suggestions', 'GET', `/api/v1/contacts/${contactId}/goal-suggestions`, token));
  }

  // Test compose endpoint (the one we fixed)
  if (contactsResult?.ok && contactsResult.data?.length > 0) {
    const contactId = contactsResult.data[0].id;
    results.push(await testEndpoint('Compose Message', 'POST', '/api/v1/compose', token, {
      contact_id: contactId,
      goal: 'Just checking in',
      channel: 'email',
    }));
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const total = results.length;
  
  console.log('\n📊 Summary:');
  console.log(`   Total:   ${total}`);
  console.log(`   ✅ Pass: ${passed}`);
  console.log(`   ❌ Fail: ${failed}`);
  console.log(`   Rate:   ${((passed/total)*100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ Failed Endpoints:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   - ${r.name} (${r.status || 'ERROR'})`);
      if (r.error) console.log(`     ${r.error}`);
    });
    console.log('');
  }

  // Show token for manual testing
  console.log('═'.repeat(70));
  console.log('\n🔑 Full Access Token (copy for manual testing):');
  console.log('\n' + token + '\n');
  console.log('💡 Use with: curl -H "Authorization: Bearer <token>" ' + BASE_URL + '/api/v1/me\n');
  console.log('═'.repeat(70));
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
