/**
 * Test Contact Import OAuth Flows
 * 
 * Tests:
 * 1. Start Google import (get OAuth URL)
 * 2. Start Microsoft import (get OAuth URL)
 * 3. List import jobs
 * 4. Check import status (after OAuth callback)
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_TOKEN = process.env.TEST_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ Missing TEST_TOKEN environment variable');
  console.log('Usage: TEST_TOKEN=your_token node test-contact-import.mjs');
  process.exit(1);
}

console.log('🧪 Testing Contact Import OAuth Flows\n');
console.log(`API Base: ${API_BASE}\n`);

async function testStartGoogleImport() {
  console.log('1️⃣  POST /v1/contacts/import/google/start');
  
  const response = await fetch(`${API_BASE}/api/v1/contacts/import/google/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.job_id || !data.authorization_url || data.provider !== 'google') {
    throw new Error(`Invalid response: ${JSON.stringify(data)}`);
  }
  
  console.log(`   ✅ OAuth URL generated successfully`);
  console.log(`   📊 Job ID: ${data.job_id}`);
  console.log(`   📊 Provider: ${data.provider}`);
  console.log(`   🔗 OAuth URL: ${data.authorization_url.substring(0, 80)}...`);
  console.log(`\n   📝 To complete import:`);
  console.log(`      1. Open this URL in browser: ${data.authorization_url}`);
  console.log(`      2. Grant permissions`);
  console.log(`      3. Check status with: curl "${API_BASE}/api/v1/contacts/import/status/${data.job_id}" -H "Authorization: Bearer ${TEST_TOKEN}"\n`);
  
  return data;
}

async function testStartMicrosoftImport() {
  console.log('2️⃣  POST /v1/contacts/import/microsoft/start');
  
  const response = await fetch(`${API_BASE}/api/v1/contacts/import/microsoft/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.job_id || !data.authorization_url || data.provider !== 'microsoft') {
    throw new Error(`Invalid response: ${JSON.stringify(data)}`);
  }
  
  console.log(`   ✅ OAuth URL generated successfully`);
  console.log(`   📊 Job ID: ${data.job_id}`);
  console.log(`   📊 Provider: ${data.provider}`);
  console.log(`   🔗 OAuth URL: ${data.authorization_url.substring(0, 80)}...`);
  console.log(`\n   📝 To complete import:`);
  console.log(`      1. Open this URL in browser: ${data.authorization_url}`);
  console.log(`      2. Grant permissions`);
  console.log(`      3. Check status with: curl "${API_BASE}/api/v1/contacts/import/status/${data.job_id}" -H "Authorization: Bearer ${TEST_TOKEN}"\n`);
  
  return data;
}

async function testListImports() {
  console.log('3️⃣  GET /v1/contacts/import/list');
  
  const response = await fetch(`${API_BASE}/api/v1/contacts/import/list`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  console.log(`   ✅ Import list retrieved`);
  console.log(`   📊 Total jobs: ${data.total}`);
  
  if (data.jobs && data.jobs.length > 0) {
    console.log(`\n   Recent imports:`);
    data.jobs.slice(0, 3).forEach(job => {
      console.log(`      - ${job.provider}: ${job.status} (${job.imported_contacts || 0} imported)`);
    });
  }
  
  return data;
}

async function testCheckStatus(jobId) {
  console.log(`\n4️⃣  GET /v1/contacts/import/status/${jobId}`);
  
  const response = await fetch(`${API_BASE}/api/v1/contacts/import/status/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  console.log(`   ✅ Status retrieved`);
  console.log(`   📊 Status: ${data.status}`);
  console.log(`   📊 Progress: ${data.progress_percent || 0}%`);
  console.log(`   📊 Imported: ${data.imported_contacts || 0}`);
  console.log(`   📊 Skipped: ${data.skipped_contacts || 0}`);
  console.log(`   📊 Failed: ${data.failed_contacts || 0}`);
  
  return data;
}

// Run all tests
(async () => {
  try {
    const googleJob = await testStartGoogleImport();
    await testStartMicrosoftImport();
    await testListImports();
    
    console.log('\n✅ All OAuth endpoint tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - Google OAuth URL generated ✅');
    console.log('   - Microsoft OAuth URL generated ✅');
    console.log('   - Import list accessible ✅');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open one of the OAuth URLs above in your browser');
    console.log('   2. Complete the authorization flow');
    console.log('   3. Contacts will import automatically in background');
    console.log('   4. Check status using the curl command provided above\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
