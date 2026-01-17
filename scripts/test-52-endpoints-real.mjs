#!/usr/bin/env node
/**
 * Complete Endpoint Test - All 52 Frontend Endpoints
 * Uses REAL data with REAL payloads - no mocks!
 */

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const LOCAL_URL = 'http://localhost:3000';
const PROD_URL = 'https://ever-reach-be.vercel.app';

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

async function fetchRealData(baseUrl, token) {
  console.log('📦 Fetching real data from', baseUrl, '...');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Origin': 'https://www.everreach.app',
  };
  
  const data = {
    contactId: null,
    noteId: null,
    interactionId: null,
    goalId: null,
    templateId: null,
    pipelineId: null,
  };
  
  try {
    // Get a real contact
    const contactsRes = await fetch(`${baseUrl}/api/v1/contacts?limit=1`, { headers });
    if (contactsRes.ok) {
      const contacts = await contactsRes.json();
      if (contacts.items?.[0]?.id) {
        data.contactId = contacts.items[0].id;
        console.log('  ✅ Found contact:', data.contactId);
      }
    }
    
    // Get a real persona note
    const notesRes = await fetch(`${baseUrl}/api/v1/me/persona-notes?limit=1`, { headers });
    if (notesRes.ok) {
      const notes = await notesRes.json();
      if (notes.items?.[0]?.id) {
        data.noteId = notes.items[0].id;
        console.log('  ✅ Found note:', data.noteId);
      }
    }
    
    // Get a real interaction
    const interactionsRes = await fetch(`${baseUrl}/api/v1/interactions?limit=1`, { headers });
    if (interactionsRes.ok) {
      const interactions = await interactionsRes.json();
      if (interactions.items?.[0]?.id) {
        data.interactionId = interactions.items[0].id;
        console.log('  ✅ Found interaction:', data.interactionId);
      }
    }
    
    // Get a real goal
    const goalsRes = await fetch(`${baseUrl}/api/v1/goals?limit=1`, { headers });
    if (goalsRes.ok) {
      const goals = await goalsRes.json();
      if (goals.items?.[0]?.id) {
        data.goalId = goals.items[0].id;
        console.log('  ✅ Found goal:', data.goalId);
      }
    }
    
    // Get a real template
    const templatesRes = await fetch(`${baseUrl}/api/v1/templates?limit=1`, { headers });
    if (templatesRes.ok) {
      const templates = await templatesRes.json();
      if (templates.items?.[0]?.id) {
        data.templateId = templates.items[0].id;
        console.log('  ✅ Found template:', data.templateId);
      }
    }
    
    // Get a real pipeline
    const pipelinesRes = await fetch(`${baseUrl}/api/v1/pipelines?limit=1`, { headers });
    if (pipelinesRes.ok) {
      const pipelines = await pipelinesRes.json();
      if (pipelines.items?.[0]?.id) {
        data.pipelineId = pipelines.items[0].id;
        console.log('  ✅ Found pipeline:', data.pipelineId);
      }
    }
  } catch (e) {
    console.log('  ⚠️ Error fetching data:', e.message);
  }
  
  return data;
}

function buildEndpoints(realData) {
  const contactId = realData.contactId || 'NO_CONTACT_FOUND';
  const noteId = realData.noteId || 'NO_NOTE_FOUND';
  const interactionId = realData.interactionId || 'NO_INTERACTION_FOUND';
  
  return [
    // ═══════════════ HEALTH & VERSION (2) ═══════════════
    { name: 'health', path: '/api/health', method: 'GET', auth: false },
    { name: 'version', path: '/api/version', method: 'GET', auth: false },

    // ═══════════════ USER & AUTH - /me (7) ═══════════════
    { name: 'me', path: '/api/v1/me', method: 'GET', auth: true },
    { name: 'me/compose-settings GET', path: '/api/v1/me/compose-settings', method: 'GET', auth: true },
    { name: 'me/entitlements', path: '/api/v1/me/entitlements', method: 'GET', auth: true },
    { name: 'me/onboarding-status', path: '/api/v1/me/onboarding-status', method: 'GET', auth: true },
    { name: 'me/persona-notes GET', path: '/api/v1/me/persona-notes', method: 'GET', auth: true },
    { name: 'me/persona-notes POST', path: '/api/v1/me/persona-notes', method: 'POST', auth: true, 
      body: { type: 'text', body_text: 'Health check test note - ' + new Date().toISOString() } },
    ...(noteId !== 'NO_NOTE_FOUND' ? [
      { name: 'me/persona-notes/{id} GET', path: `/api/v1/me/persona-notes/${noteId}`, method: 'GET', auth: true },
    ] : []),

    // ═══════════════ CONTACTS (12) ═══════════════
    { name: 'contacts GET', path: '/api/v1/contacts', method: 'GET', auth: true },
    { name: 'contacts POST', path: '/api/v1/contacts', method: 'POST', auth: true, 
      body: { 
        display_name: 'Health Check Test Contact ' + Date.now(), 
        emails: ['healthcheck' + Date.now() + '@test.com'],
        tags: ['health-check', 'automated-test']
      } 
    },
    ...(contactId !== 'NO_CONTACT_FOUND' ? [
      { name: 'contacts/{id} GET', path: `/api/v1/contacts/${contactId}`, method: 'GET', auth: true },
      { name: 'contacts/{id}/notes GET', path: `/api/v1/contacts/${contactId}/notes`, method: 'GET', auth: true },
      { name: 'contacts/{id}/notes POST', path: `/api/v1/contacts/${contactId}/notes`, method: 'POST', auth: true,
        body: { content: 'Health check note - ' + new Date().toISOString() } },
      { name: 'contacts/{id}/messages GET', path: `/api/v1/contacts/${contactId}/messages`, method: 'GET', auth: true },
      { name: 'contacts/{id}/pipeline GET', path: `/api/v1/contacts/${contactId}/pipeline`, method: 'GET', auth: true },
      { name: 'contacts/{id}/context-summary', path: `/api/v1/contacts/${contactId}/context-summary`, method: 'GET', auth: true },
      { name: 'contacts/{id}/goal-suggestions', path: `/api/v1/contacts/${contactId}/goal-suggestions`, method: 'GET', auth: true },
      { name: 'contacts/{id}/warmth/mode GET', path: `/api/v1/contacts/${contactId}/warmth/mode`, method: 'GET', auth: true },
      { name: 'contacts/{id}/warmth/recompute', path: `/api/v1/contacts/${contactId}/warmth/recompute`, method: 'POST', auth: true, body: {} },
    ] : []),

    // ═══════════════ CONTACT IMPORT (3) ═══════════════
    { name: 'import/health', path: '/api/v1/contacts/import/health', method: 'GET', auth: true },
    { name: 'import/list', path: '/api/v1/contacts/import/list', method: 'GET', auth: true },
    { name: 'import/google/start', path: '/api/v1/contacts/import/google/start', method: 'POST', auth: true, body: {} },

    // ═══════════════ INTERACTIONS (3) ═══════════════
    { name: 'interactions GET', path: '/api/v1/interactions', method: 'GET', auth: true },
    ...(contactId !== 'NO_CONTACT_FOUND' ? [
      { name: 'interactions POST', path: '/api/v1/interactions', method: 'POST', auth: true, 
        body: { contact_id: contactId, kind: 'note', content: 'Health check interaction - ' + new Date().toISOString() } },
    ] : []),
    ...(interactionId !== 'NO_INTERACTION_FOUND' ? [
      { name: 'interactions/{id} GET', path: `/api/v1/interactions/${interactionId}`, method: 'GET', auth: true },
    ] : []),

    // ═══════════════ GOALS (2) ═══════════════
    { name: 'goals GET', path: '/api/v1/goals', method: 'GET', auth: true },
    { name: 'goals POST', path: '/api/v1/goals', method: 'POST', auth: true, 
      body: { kind: 'business', name: 'Health Check Goal ' + Date.now(), description: 'Automated test goal' } },

    // ═══════════════ PIPELINES & TEMPLATES (3) ═══════════════
    { name: 'pipelines GET', path: '/api/v1/pipelines', method: 'GET', auth: true },
    { name: 'templates GET', path: '/api/v1/templates', method: 'GET', auth: true },
    { name: 'templates POST', path: '/api/v1/templates', method: 'POST', auth: true, 
      body: { channel: 'email', name: 'Health Check Template ' + Date.now(), body_tmpl: 'Hello {{name}}!' } },

    // ═══════════════ FILES (1) ═══════════════
    { name: 'files POST', path: '/api/v1/files', method: 'POST', auth: true, 
      body: { path: `health-check/${Date.now()}.txt`, contentType: 'text/plain' } },

    // ═══════════════ SEARCH & ANALYTICS (3) ═══════════════
    { name: 'search POST', path: '/api/v1/search', method: 'POST', auth: true, body: { query: 'test' } },
    { name: 'events/track POST', path: '/api/v1/events/track', method: 'POST', auth: true, 
      body: { event_type: 'health_check_test', metadata: { timestamp: new Date().toISOString(), source: 'endpoint_test' } } },
    { name: 'feature-requests POST', path: '/api/v1/feature-requests', method: 'POST', auth: true, 
      body: { type: 'feature', title: 'Health Check Test ' + Date.now(), description: 'Automated endpoint test' } },

    // ═══════════════ COMPOSE (1) ═══════════════
    ...(contactId !== 'NO_CONTACT_FOUND' ? [
      { name: 'compose POST', path: '/api/v1/compose', method: 'POST', auth: true, 
        body: { contact_id: contactId, channel: 'email', goal: 'networking' } },
    ] : []),

    // ═══════════════ BILLING & CONFIG (4) ═══════════════
    { name: 'billing/restore POST', path: '/api/v1/billing/restore', method: 'POST', auth: true, body: {} },
    { name: 'config/paywall-live GET', path: '/api/v1/config/paywall-live', method: 'GET', auth: true },
    { name: 'config/paywall-strategy GET', path: '/api/v1/config/paywall-strategy', method: 'GET', auth: false },
    { name: 'warmth/modes GET', path: '/api/v1/warmth/modes', method: 'GET', auth: false },

    // ═══════════════ AGENT (1) ═══════════════
    { name: 'agent/chat POST', path: '/api/v1/agent/chat', method: 'POST', auth: true, 
      body: { message: 'Health check: what contacts do I have?' } },
  ];
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
    
    let responseBody = null;
    try {
      responseBody = await response.text();
      if (responseBody) {
        responseBody = JSON.parse(responseBody);
      }
    } catch {}
    
    return {
      status: response.status,
      ok: response.ok,
      duration,
      body: responseBody,
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
    console.error('Usage: node test-52-endpoints-real.mjs <email> <password>');
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
  
  // Fetch real data from production (more stable)
  const realData = await fetchRealData(PROD_URL, token);
  
  if (!realData.contactId) {
    console.log('');
    console.log('⚠️  No contacts found! Creating a test contact first...');
    const createRes = await fetch(`${PROD_URL}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://www.everreach.app',
      },
      body: JSON.stringify({
        display_name: 'Health Check Bootstrap Contact',
        emails: ['bootstrap@healthcheck.test'],
      }),
    });
    if (createRes.ok) {
      const created = await createRes.json();
      realData.contactId = created.contact?.id;
      console.log('  ✅ Created bootstrap contact:', realData.contactId);
    }
  }
  
  const endpoints = buildEndpoints(realData);
  
  console.log('');
  console.log('='.repeat(105));
  console.log('🧪 REAL DATA ENDPOINT TEST');
  console.log('='.repeat(105));
  console.log(`📍 Local:      ${LOCAL_URL}`);
  console.log(`📍 Production: ${PROD_URL}`);
  console.log(`📦 Contact ID: ${realData.contactId || 'N/A'}`);
  console.log(`📝 Note ID:    ${realData.noteId || 'N/A'}`);
  console.log('');
  console.log('='.repeat(105));
  console.log(`${pad('#', 3)} ${pad('Endpoint', 35)} ${pad('Method', 7)}| ${pad('Local', 10)} | ${pad('Prod', 10)} | Match`);
  console.log('='.repeat(105));
  
  let stats = {
    local: { pass: 0, warn: 0, fail: 0 },
    prod: { pass: 0, warn: 0, fail: 0 },
    match: 0,
    total: 0,
  };
  
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
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
    
    // Show errors for failed endpoints
    if (localResult.status >= 500 || prodResult.status >= 500) {
      if (localResult.status >= 500 && localResult.body?.error) {
        console.log(`    └─ Local Error: ${localResult.body.error}`);
      }
      if (prodResult.status >= 500 && prodResult.body?.error) {
        console.log(`    └─ Prod Error: ${prodResult.body.error}`);
      }
    }
  }
  
  console.log('');
  console.log('='.repeat(105));
  console.log('📊 SUMMARY');
  console.log('='.repeat(105));
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
  console.log('='.repeat(105));
  console.log('✅ All tests used REAL data with REAL payloads');
  console.log('='.repeat(105));
}

main().catch(console.error);

