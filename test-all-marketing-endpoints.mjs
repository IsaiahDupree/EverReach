import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://backend-vercel-ozkif4pug-isaiahduprees-projects.vercel.app';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testEndpoint(name, url) {
  console.log(`\n🧪 Testing: ${name}`);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log(`   Status: ${response.status}`);
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ SUCCESS`);
    console.log(`   Data keys:`, Object.keys(data));
    return true;
  } else {
    const error = await response.json();
    console.log(`   ❌ FAILED:`, error.error || error.message);
    return false;
  }
}

let token;
let passed = 0;
let failed = 0;

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('🎯 TESTING ALL MARKETING INTELLIGENCE ENDPOINTS');
  console.log('═══════════════════════════════════════════════');

  // Authenticate
  console.log('\n1️⃣  Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'isaiahdupree33@gmail.com',
    password: 'frogger12'
  });

  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    process.exit(1);
  }

  token = authData.session.access_token;
  console.log('✅ Authenticated successfully');

  // Test each endpoint
  console.log('\n2️⃣  Testing Marketing Intelligence Endpoints...\n');

  if (await testEndpoint('Attribution', `${BASE_URL}/api/v1/marketing/attribution`)) passed++; else failed++;
  if (await testEndpoint('Magnetism', `${BASE_URL}/api/v1/marketing/magnetism`)) passed++; else failed++;
  if (await testEndpoint('Personas', `${BASE_URL}/api/v1/marketing/personas`)) passed++; else failed++;
  if (await testEndpoint('Funnel', `${BASE_URL}/api/v1/marketing/funnel`)) passed++; else failed++;
  if (await testEndpoint('Analytics', `${BASE_URL}/api/v1/marketing/analytics`)) passed++; else failed++;

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(console.error);
