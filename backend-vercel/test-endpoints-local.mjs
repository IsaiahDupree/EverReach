#!/usr/bin/env node
/**
 * Quick Endpoint Audit - Tests local backend endpoints
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function testEndpoint(name, method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    const status = response.status;
    const ok = options.expectStatus ? status === options.expectStatus : status < 500;
    const result = ok ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${result} ${name.padEnd(40)} ${method} ${path} → ${status}`);
    return { name, ok, status, path };
  } catch (error) {
    console.log(`❌ FAIL ${name.padEnd(40)} ${method} ${path} → ERROR: ${error.message}`);
    return { name, ok: false, status: 'ERROR', path, error: error.message };
  }
}

async function runAudit() {
  console.log('\n🔍 EverReach API Endpoint Audit');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('='.repeat(80));
  console.log('');

  const results = [];

  // Health & Status Endpoints
  console.log('📊 Health & Status');
  results.push(await testEndpoint('Health Check', 'GET', '/api/health', { expectStatus: 200 }));
  results.push(await testEndpoint('Health Detailed', 'GET', '/api/health/detailed'));
  console.log('');

  // Config Endpoints
  console.log('⚙️  Configuration');
  results.push(await testEndpoint('Paywall Config', 'GET', '/api/v1/config/paywall'));
  results.push(await testEndpoint('Paywall Strategy', 'GET', '/api/v1/config/paywall-strategy'));
  results.push(await testEndpoint('Paywall Live', 'GET', '/api/v1/config/paywall-live'));
  console.log('');

  // Public API (no auth)
  console.log('🌐 Public API');
  results.push(await testEndpoint('Goals List', 'GET', '/api/v1/goals'));
  console.log('');

  // Auth-required endpoints (will return 401 without token)
  console.log('🔐 Protected Endpoints (expect 401 without auth)');
  results.push(await testEndpoint('User Profile', 'GET', '/api/v1/me', { expectStatus: 401 }));
  results.push(await testEndpoint('Contacts List', 'GET', '/api/v1/contacts', { expectStatus: 401 }));
  results.push(await testEndpoint('Interactions', 'GET', '/api/v1/interactions', { expectStatus: 401 }));
  results.push(await testEndpoint('Warmth Summary', 'GET', '/api/v1/warmth/summary', { expectStatus: 401 }));
  results.push(await testEndpoint('Message Prepare', 'POST', '/api/v1/messages/prepare', { expectStatus: 401 }));
  results.push(await testEndpoint('Compose', 'POST', '/api/v1/compose', { expectStatus: 401 }));
  results.push(await testEndpoint('Agent Chat', 'POST', '/api/v1/agent/chat', { expectStatus: 401 }));
  console.log('');

  // Summary
  console.log('='.repeat(80));
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const total = results.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  console.log('\n📈 Summary:');
  console.log(`   Total Endpoints:  ${total}`);
  console.log(`   ✅ Passed:        ${passed}`);
  console.log(`   ❌ Failed:        ${failed}`);
  console.log(`   Success Rate:    ${successRate}%`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Failed Endpoints:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   - ${r.name} (${r.path}) → ${r.status} ${r.error || ''}`);
    });
    console.log('');
  }

  return results;
}

runAudit().then(results => {
  const allPassed = results.every(r => r.ok);
  process.exit(allPassed ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
