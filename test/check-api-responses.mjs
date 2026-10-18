#!/usr/bin/env node
/**
 * Check actual API response formats
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY);
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';
const BASE_URL = 'http://localhost:3000/api';

async function getAuthToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session.access_token;
}

async function checkEndpoint(name, url, token) {
  console.log(`\n🔍 ${name}`);
  console.log(`   URL: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  console.log(`   Status: ${response.status}`);
  console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
  console.log(`   Sample: ${JSON.stringify(data, null, 2).substring(0, 300)}...`);
}

async function main() {
  console.log('🔐 Getting auth token...');
  const token = await getAuthToken();
  console.log('✅ Authenticated\n');
  
  console.log('═'.repeat(70));
  
  await checkEndpoint('List Interactions', `${BASE_URL}/v1/interactions?limit=5`, token);
  await checkEndpoint('List Persona Notes', `${BASE_URL}/v1/me/persona-notes`, token);
  await checkEndpoint('Track Event', `${BASE_URL}/v1/events/track`, token);
  
  console.log('\n' + '═'.repeat(70));
}

main().catch(console.error);
