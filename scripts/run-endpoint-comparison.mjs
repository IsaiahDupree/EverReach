#!/usr/bin/env node
/**
 * Endpoint Comparison Test
 * 
 * Authenticates and tests all API endpoints against both local and production.
 * Compares results side-by-side.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://hkvffrghfqtwtzjqtaia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdmZmcmdoZnF0d3R6anF0YWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk5NzA2NzUsImV4cCI6MjA0NTU0NjY3NX0.Y0Bj1Jq_FwtUhLzR2FIle5Gu0sWuZAyP7hvqq7U2X88';

const ENVIRONMENTS = {
  local: 'http://localhost:3000',
  production: 'https://ever-reach-be.vercel.app',
};

// All endpoints to test
const ENDPOINTS = [
  // Health & Version (no auth)
  { name: 'health', path: '/api/health', method: 'GET', auth: false },
  { name: 'version', path: '/api/version', method: 'GET', auth: false },
  
  // User & Auth (requires auth)
  { name: 'me', path: '/api/v1/me', method: 'GET', auth: true },
  { name: 'entitlements', path: '/api/v1/me/entitlements', method: 'GET', auth: true },
  { name: 'compose-settings', path: '/api/v1/me/compose-settings', method: 'GET', auth: true },
  { name: 'onboarding-status', path: '/api/v1/me/onboarding-status', method: 'GET', auth: true },
  { name: 'persona-notes', path: '/api/v1/me/persona-notes', method: 'GET', auth: true },
  
  // Contacts (requires auth)
  { name: 'contacts', path: '/api/v1/contacts', method: 'GET', auth: true },
  { name: 'contacts-import-health', path: '/api/v1/contacts/import/health', method: 'GET', auth: true },
  { name: 'contacts-import-list', path: '/api/v1/contacts/import/list', method: 'GET', auth: true },
  
  // Pipelines & Templates (requires auth)
  { name: 'pipelines', path: '/api/v1/pipelines', method: 'GET', auth: true },
  { name: 'templates', path: '/api/v1/templates', method: 'GET', auth: true },
  
  // Interactions & Goals (requires auth)
  { name: 'interactions', path: '/api/v1/interactions', method: 'GET', auth: true },
  { name: 'goals', path: '/api/v1/goals', method: 'GET', auth: true },
  
  // Config (mixed auth)
  { name: 'paywall-live', path: '/api/v1/config/paywall-live', method: 'GET', auth: true },
  { name: 'paywall-strategy', path: '/api/v1/config/paywall-strategy', method: 'GET', auth: false },
  { name: 'warmth-modes', path: '/api/v1/warmth/modes', method: 'GET', auth: false },
  
  // POST endpoints (requires auth + body)
  { name: 'billing-restore', path: '/api/v1/billing/restore', method: 'POST', auth: true, body: {} },
  { name: 'files', path: '/api/v1/files', method: 'POST', auth: true, body: { path: 'test/health.txt', contentType: 'text/plain' } },
  { name: 'search', path: '/api/v1/search', method: 'POST', auth: true, body: { query: 'test' } },
  { name: 'events-track', path: '/api/v1/events/track', method: 'POST', auth: true, body: { event_type: 'test', metadata: {} } },
  { name: 'feature-requests', path: '/api/v1/feature-requests', method: 'POST', auth: true, body: { type: 'feature', title: 'Test', description: 'Test' } },
  { name: 'agent-chat', path: '/api/v1/agent/chat', method: 'POST', auth: true, body: { message: 'ping' } },
];

async function authenticate(email, password) {
  console.log('🔐 Authenticating...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  console.log('✅ Authenticated as:', data.user.email);
  return data.session.access_token;
}

async function testEndpoint(baseUrl, endpoint, token) {
  const url = `${baseUrl}${endpoint.path}`;
  const start = Date.now();
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (endpoint.auth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      method: endpoint.method,
      headers,
    };
    
    if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
      options.body = JSON.stringify(endpoint.body);
    }
    
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    
    return {
      status: response.status,
      ok: response.ok,
      reachable: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: null,
      ok: false,
      reachable: false,
      duration,
      error: error.message,
    };
  }
}

async function runTests(token) {
  const results = {
    local: [],
    production: [],
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 ENDPOINT COMPARISON TEST');
  console.log('='.repeat(80));
  
  // Test each endpoint against both environments
  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    
    // Test local
    const localResult = await testEndpoint(ENVIRONMENTS.local, endpoint, token);
    results.local.push({ ...endpoint, ...localResult });
    
    // Test production
    const prodResult = await testEndpoint(ENVIRONMENTS.production, endpoint, token);
    results.production.push({ ...endpoint, ...prodResult });
    
    // Quick status
    const localStatus = localResult.reachable ? (localResult.ok ? '✅' : `⚠️${localResult.status}`) : '❌';
    const prodStatus = prodResult.reachable ? (prodResult.ok ? '✅' : `⚠️${prodResult.status}`) : '❌';
    console.log(`Local: ${localStatus} | Prod: ${prodStatus}`);
  }
  
  return results;
}

function printComparison(results) {
  console.log('\n' + '='.repeat(100));
  console.log('📊 DETAILED COMPARISON');
  console.log('='.repeat(100));
  
  console.log('\n' + '-'.repeat(100));
  console.log(
    'Endpoint'.padEnd(25) +
    'Method'.padEnd(8) +
    'Local'.padEnd(15) +
    'Local Time'.padEnd(12) +
    'Prod'.padEnd(15) +
    'Prod Time'.padEnd(12) +
    'Match'
  );
  console.log('-'.repeat(100));
  
  let matchCount = 0;
  let mismatchCount = 0;
  
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const local = results.local[i];
    const prod = results.production[i];
    
    const localStatus = local.reachable ? `${local.status}` : 'ERR';
    const prodStatus = prod.reachable ? `${prod.status}` : 'ERR';
    
    // Check if results match (both OK, both same error, etc.)
    const statusMatch = local.status === prod.status;
    const match = statusMatch ? '✅' : '❌';
    
    if (statusMatch) matchCount++;
    else mismatchCount++;
    
    console.log(
      local.name.padEnd(25) +
      local.method.padEnd(8) +
      localStatus.padEnd(15) +
      `${local.duration}ms`.padEnd(12) +
      prodStatus.padEnd(15) +
      `${prod.duration}ms`.padEnd(12) +
      match
    );
  }
  
  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('📈 SUMMARY');
  console.log('='.repeat(100));
  
  const localPassed = results.local.filter(r => r.ok).length;
  const localReachable = results.local.filter(r => r.reachable && !r.ok).length;
  const localFailed = results.local.filter(r => !r.reachable).length;
  
  const prodPassed = results.production.filter(r => r.ok).length;
  const prodReachable = results.production.filter(r => r.reachable && !r.ok).length;
  const prodFailed = results.production.filter(r => !r.reachable).length;
  
  console.log('\n           LOCAL                    PRODUCTION');
  console.log('           -----                    ----------');
  console.log(`✅ Passed:  ${String(localPassed).padEnd(20)} ${prodPassed}`);
  console.log(`⚠️  Errors:  ${String(localReachable).padEnd(20)} ${prodReachable}`);
  console.log(`❌ Failed:  ${String(localFailed).padEnd(20)} ${prodFailed}`);
  console.log(`📊 Total:   ${String(ENDPOINTS.length).padEnd(20)} ${ENDPOINTS.length}`);
  
  console.log('\n🔄 Status Match:');
  console.log(`   ✅ Matching:   ${matchCount}`);
  console.log(`   ❌ Different:  ${mismatchCount}`);
  
  // Show mismatches
  if (mismatchCount > 0) {
    console.log('\n⚠️  MISMATCHES:');
    for (let i = 0; i < ENDPOINTS.length; i++) {
      const local = results.local[i];
      const prod = results.production[i];
      if (local.status !== prod.status) {
        console.log(`   - ${local.name}: Local=${local.status || 'ERR'}, Prod=${prod.status || 'ERR'}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(100));
}

// Main
async function main() {
  const email = process.argv[2] || 'isaiahdupree33@gmail.com';
  const password = process.argv[3] || 'Frogger12';
  
  try {
    const token = await authenticate(email, password);
    const results = await runTests(token);
    printComparison(results);
    
    // Exit with error if production has failures
    const prodFailed = results.production.filter(r => !r.reachable).length;
    process.exit(prodFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();

