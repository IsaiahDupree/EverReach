#!/usr/bin/env node
/**
 * Complete Endpoint Test - All 52 Frontend Endpoints
 * Tests against both local and production with auth
 */

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const LOCAL_URL = 'http://localhost:3000';
const PROD_URL = 'https://ever-reach-be.vercel.app';

// All 52 Frontend endpoints from ENDPOINT_AUDIT.md
const ENDPOINTS = [
  // ═══════════════ HEALTH & VERSION (2) ═══════════════
  { name: 'health', path: '/api/health', method: 'GET', auth: false },
  { name: 'version', path: '/api/version', method: 'GET', auth: false },

  // ═══════════════ USER & AUTH - /me (8) ═══════════════
  { name: 'me', path: '/api/v1/me', method: 'GET', auth: true },
  { name: 'me/compose-settings', path: '/api/v1/me/compose-settings', method: 'GET', auth: true },
  { name: 'me/entitlements', path: '/api/v1/me/entitlements', method: 'GET', auth: true },
  { name: 'me/onboarding-status', path: '/api/v1/me/onboarding-status', method: 'GET', auth: true },
  { name: 'me/persona-notes', path: '/api/v1/me/persona-notes', method: 'GET', auth: true },
  { name: 'me/persona-notes POST', path: '/api/v1/me/persona-notes', method: 'POST', auth: true, body: { type: 'text', body_text: 'health check' } },
  { name: 'me/persona-notes/{id}', path: '/api/v1/me/persona-notes/00000000-0000-0000-0000-000000000000', method: 'GET', auth: true },
  { name: 'me/persona-notes/{id} PATCH', path: '/api/v1/me/persona-notes/00000000-0000-0000-0000-000000000000', method: 'PATCH', auth: true, body: { body_text: 'updated' } },
  { name: 'me/compose-settings PATCH', path: '/api/v1/me/compose-settings', method: 'PATCH', auth: true, body: {} },
  { name: 'me/account DELETE', path: '/api/v1/me/account', method: 'DELETE', auth: true, skip: true, reason: 'Destructive' },

  // ═══════════════ CONTACTS (12) ═══════════════
  { name: 'contacts', path: '/api/v1/contacts', method: 'GET', auth: true },
  { name: 'contacts POST', path: '/api/v1/contacts', method: 'POST', auth: true, body: { display_name: 'Health Check Test', emails: ['healthcheck@test.com'] } },
  { name: 'contacts/{id}', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', method: 'GET', auth: true },
  { name: 'contacts/{id}/notes', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/notes', method: 'GET', auth: true },
  { name: 'contacts/{id}/messages', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/messages', method: 'GET', auth: true },
  { name: 'contacts/{id}/files POST', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/files', method: 'POST', auth: true, body: { file_id: 'test' } },
  { name: 'contacts/{id}/tags PATCH', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/tags', method: 'PATCH', auth: true, body: { tags: ['test'] } },
  { name: 'contacts/{id}/pipeline', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline', method: 'GET', auth: true },
  { name: 'contacts/{id}/pipeline/move', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline/move', method: 'POST', auth: true, body: { stage_id: 'test' } },
  { name: 'contacts/{id}/context-summary', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/context-summary', method: 'GET', auth: true },
  { name: 'contacts/{id}/goal-suggestions', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/goal-suggestions', method: 'GET', auth: true },
  { name: 'contacts/{id}/warmth/mode', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/warmth/mode', method: 'GET', auth: true },
  { name: 'contacts/{id}/warmth/recompute', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/warmth/recompute', method: 'POST', auth: true, body: {} },
  { name: 'contacts/{id} PATCH', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', method: 'PATCH', auth: true, body: { display_name: 'Test Update' } },
  { name: 'contacts/{id} DELETE', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', method: 'DELETE', auth: true },

  // ═══════════════ CONTACT IMPORT (4) ═══════════════
  { name: 'import/health', path: '/api/v1/contacts/import/health', method: 'GET', auth: true },
  { name: 'import/list', path: '/api/v1/contacts/import/list', method: 'GET', auth: true },
  { name: 'import/status/{id}', path: '/api/v1/contacts/import/status/00000000-0000-0000-0000-000000000000', method: 'GET', auth: true },
  { name: 'import/google/start', path: '/api/v1/contacts/import/google/start', method: 'POST', auth: true, body: {} },

  // ═══════════════ MESSAGES & COMPOSE (4) ═══════════════
  { name: 'messages POST', path: '/api/v1/messages', method: 'POST', auth: true, body: { contact_id: '00000000-0000-0000-0000-000000000000', channel: 'email' } },
  { name: 'messages/prepare', path: '/api/v1/messages/prepare', method: 'POST', auth: true, body: {} },
  { name: 'messages/send', path: '/api/v1/messages/send', method: 'POST', auth: true, body: {} },
  { name: 'compose', path: '/api/v1/compose', method: 'POST', auth: true, body: { contact_id: '00000000-0000-0000-0000-000000000000', channel: 'email', goal: 'test' } },

  // ═══════════════ INTERACTIONS & GOALS (4) ═══════════════
  { name: 'interactions', path: '/api/v1/interactions', method: 'GET', auth: true },
  { name: 'interactions POST', path: '/api/v1/interactions', method: 'POST', auth: true, body: { contact_id: '00000000-0000-0000-0000-000000000000', kind: 'note', content: 'health check' } },
  { name: 'interactions/{id}/files', path: '/api/v1/interactions/00000000-0000-0000-0000-000000000000/files', method: 'POST', auth: true, body: { file_id: 'test' } },
  { name: 'goals', path: '/api/v1/goals', method: 'GET', auth: true },
  { name: 'goals POST', path: '/api/v1/goals', method: 'POST', auth: true, body: { name: 'Health Check Goal', description: 'test' } },

  // ═══════════════ PIPELINES & TEMPLATES (2) ═══════════════
  { name: 'pipelines', path: '/api/v1/pipelines', method: 'GET', auth: true },
  { name: 'templates', path: '/api/v1/templates', method: 'GET', auth: true },
  { name: 'templates POST', path: '/api/v1/templates', method: 'POST', auth: true, body: { name: 'Health Test', content: 'test template' } },

  // ═══════════════ FILES & MEDIA (3) ═══════════════
  { name: 'files POST', path: '/api/v1/files', method: 'POST', auth: true, body: { path: 'test/health.txt', contentType: 'text/plain' } },
  { name: 'screenshots/{id}/analyze', path: '/api/v1/screenshots/00000000-0000-0000-0000-000000000000/analyze', method: 'POST', auth: true, body: { contact_id: '00000000-0000-0000-0000-000000000000' } },
  // Skipped: screenshots POST (multipart), transcribe (multipart)

  // ═══════════════ SEARCH & ANALYTICS (3) ═══════════════
  { name: 'search', path: '/api/v1/search', method: 'POST', auth: true, body: { query: 'test' } },
  { name: 'events/track', path: '/api/v1/events/track', method: 'POST', auth: true, body: { event_type: 'health_check', metadata: { test: true } } },
  { name: 'feature-requests', path: '/api/v1/feature-requests', method: 'POST', auth: true, body: { type: 'feature', title: 'Health Check Test', description: 'Automated test' } },

  // ═══════════════ BILLING & CONFIG (5) ═══════════════
  { name: 'billing/restore', path: '/api/v1/billing/restore', method: 'POST', auth: true, body: {} },
  { name: 'config/paywall-live', path: '/api/v1/config/paywall-live', method: 'GET', auth: true },
  { name: 'config/paywall-strategy', path: '/api/v1/config/paywall-strategy', method: 'GET', auth: false },
  { name: 'warmth/modes', path: '/api/v1/warmth/modes', method: 'GET', auth: false },
  // Skipped: subscriptions/sync (needs RevenueCat data)

  // ═══════════════ AGENT & OTHER (2) ═══════════════
  { name: 'agent/chat', path: '/api/v1/agent/chat', method: 'POST', auth: true, body: { message: 'health check ping' } },
  { name: 'analysis/screenshot', path: '/api/v1/analysis/screenshot', method: 'POST', auth: true, body: { image_url: 'test' } },
];

async function authenticate(email, password) {
  console.log('🔐 Authenticating...');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Auth failed: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

async function testEndpoint(baseUrl, endpoint, token) {
  const headers = {
    'Content-Type': 'application/json',
    'Origin': 'https://www.everreach.app',
  };
  
  if (endpoint.auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method: endpoint.method,
    headers,
  };
  
  if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    options.body = JSON.stringify(endpoint.body);
  }
  
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}${endpoint.path}`, options);
    const duration = Date.now() - start;
    return {
      status: response.status,
      ok: response.ok,
      duration,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      duration: Date.now() - start,
      error: error.message,
    };
  }
}

function getIcon(status) {
  if (status >= 200 && status < 300) return '✅';
  if (status >= 400 && status < 500) return '⚠️';
  return '❌';
}

function pad(str, len) {
  return String(str).padEnd(len);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node test-52-endpoints.mjs <email> <password>');
    process.exit(1);
  }
  
  let token;
  try {
    token = await authenticate(email, password);
    console.log(`✅ Authenticated! Token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('='.repeat(100));
  console.log('🧪 COMPLETE ENDPOINT TEST (52 Frontend Endpoints)');
  console.log('='.repeat(100));
  console.log(`📍 Local:      ${LOCAL_URL}`);
  console.log(`📍 Production: ${PROD_URL}`);
  console.log('');
  console.log('='.repeat(100));
  console.log(`${pad('#', 3)} ${pad('Endpoint', 35)} ${pad('Method', 7)}| ${pad('Local', 10)} | ${pad('Prod', 10)} | Match`);
  console.log('='.repeat(100));
  
  let stats = {
    local: { pass: 0, warn: 0, fail: 0 },
    prod: { pass: 0, warn: 0, fail: 0 },
    match: 0,
    total: 0,
  };
  
  let currentSection = '';
  
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const endpoint = ENDPOINTS[i];
    
    if (endpoint.skip) continue;
    
    stats.total++;
    
    // Test both environments
    const [localResult, prodResult] = await Promise.all([
      testEndpoint(LOCAL_URL, endpoint, token),
      testEndpoint(PROD_URL, endpoint, token),
    ]);
    
    // Count stats
    if (localResult.status >= 200 && localResult.status < 300) stats.local.pass++;
    else if (localResult.status >= 400 && localResult.status < 500) stats.local.warn++;
    else stats.local.fail++;
    
    if (prodResult.status >= 200 && prodResult.status < 300) stats.prod.pass++;
    else if (prodResult.status >= 400 && prodResult.status < 500) stats.prod.warn++;
    else stats.prod.fail++;
    
    const match = localResult.status === prodResult.status;
    if (match) stats.match++;
    
    console.log(
      `${pad(stats.total, 3)} ${pad(endpoint.name, 35)} ${pad(endpoint.method, 7)}| ` +
      `${getIcon(localResult.status)} ${pad(localResult.status, 7)} | ` +
      `${getIcon(prodResult.status)} ${pad(prodResult.status, 7)} | ` +
      `${match ? '✅' : '❌'}`
    );
  }
  
  console.log('');
  console.log('='.repeat(100));
  console.log('📊 SUMMARY');
  console.log('='.repeat(100));
  console.log('');
  console.log('           LOCAL          PRODUCTION');
  console.log('           -----          ----------');
  console.log(`✅ Pass:   ${pad(stats.local.pass, 15)} ${stats.prod.pass}`);
  console.log(`⚠️  Warn:   ${pad(stats.local.warn, 15)} ${stats.prod.warn}`);
  console.log(`❌ Fail:   ${pad(stats.local.fail, 15)} ${stats.prod.fail}`);
  console.log('');
  console.log(`🔄 Match:     ${stats.match} / ${stats.total}`);
  console.log(`❌ Mismatch:  ${stats.total - stats.match} / ${stats.total}`);
  console.log('');
  console.log('='.repeat(100));
  console.log('Note: 4xx on dynamic /{id} endpoints is expected - they need real UUIDs');
  console.log('      Multipart endpoints (screenshots POST, transcribe) skipped');
  console.log('='.repeat(100));
}

main().catch(console.error);

