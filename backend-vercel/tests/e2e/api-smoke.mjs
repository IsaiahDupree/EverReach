#!/usr/bin/env node
/**
 * API Smoke Tests - E2E tests for deployed backend
 * Tests real API endpoints after deployment
 * 
 * Usage:
 *   node backend-vercel/tests/e2e/api-smoke.mjs
 * 
 * Required env vars:
 *   TEST_EMAIL - Supabase user email
 *   TEST_PASSWORD - Supabase user password
 *   BACKEND_BASE - Backend URL (default: https://ever-reach-be.vercel.app)
 *   SUPABASE_URL - Supabase URL (default: https://utasetfxiqcrnwyfforx.supabase.co)
 *   SUPABASE_ANON_KEY - Supabase anon key
 */

import { request, authHeaders } from './lib/http.mjs';
import { signInWithPassword } from './lib/supabase.mjs';
import { Reporter } from './lib/report.mjs';

const LOG = (process?.env?.TEST_LOG || '').toLowerCase() === 'true' || process?.env?.TEST_LOG === '1';
const BASE = (process.env.BACKEND_BASE || 'https://ever-reach-be.vercel.app').replace(/\/$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';
const ORIGIN = 'https://everreach.app';

function jsonExcerpt(data) {
  try {
    const str = JSON.stringify(data, null, 2);
    return str.length > 500 ? str.slice(0, 500) + '...' : str;
  } catch {
    return String(data || '').slice(0, 500);
  }
}

async function main() {
  console.log(`[api-smoke] Base: ${BASE}`);
  console.log(`[api-smoke] Supabase: ${SUPABASE_URL}`);
  
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Missing TEST_EMAIL or TEST_PASSWORD');
  }

  const reporter = new Reporter({ baseUrl: BASE });
  reporter.setMeta('Environment', process.env.NODE_ENV || 'test');
  reporter.setMeta('Supabase', SUPABASE_URL);
  
  // Authenticate
  console.log('[api-smoke] Authenticating...');
  const auth = await signInWithPassword({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  const TOKEN = auth.accessToken;
  const H = () => authHeaders(TOKEN, ORIGIN, { 'Content-Type': 'application/json' });
  
  console.log('[api-smoke] Running tests...\n');

  const tests = [];
  const unique = `test-${Date.now()}`;
  let CONTACT_ID = null;

  // 1) Health check
  tests.push({ 
    name: 'Health Check', 
    method: 'GET', 
    url: `${BASE}/api/health`, 
    headers: {}, 
    expect: r => r.status === 200 
  });

  // 2) Me endpoint
  tests.push({ 
    name: 'Me - Get User', 
    method: 'GET', 
    url: `${BASE}/api/me`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  // 3) Contacts CRUD
  tests.push({
    name: 'Contacts - Create',
    method: 'POST',
    url: `${BASE}/api/contacts`,
    headers: H(),
    body: { name: `API Test ${unique}`, email: `${unique}@test.com`, tags: ['api-test'] },
    expect: r => r.status === 201 || r.status === 200,
    after: async (res) => {
      if (res.data?.id) CONTACT_ID = res.data.id;
    }
  });

  tests.push({ 
    name: 'Contacts - List', 
    method: 'GET', 
    url: `${BASE}/api/contacts?limit=5`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  tests.push({ 
    name: 'Contacts - Get by ID', 
    method: 'GET', 
    url: () => `${BASE}/api/contacts/${CONTACT_ID}`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  tests.push({
    name: 'Contacts - Update',
    method: 'PATCH',
    url: () => `${BASE}/api/contacts/${CONTACT_ID}`,
    headers: H(),
    body: { tags: ['api-test', 'updated'] },
    expect: r => r.status === 200
  });

  tests.push({ 
    name: 'Contacts - Search', 
    method: 'GET', 
    url: `${BASE}/api/contacts/search?q=API%20Test`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  // 4) Interactions
  tests.push({
    name: 'Interactions - Create',
    method: 'POST',
    url: `${BASE}/api/interactions`,
    headers: H(),
    body: () => ({
      contact_id: CONTACT_ID,
      kind: 'note',
      content: 'Test note from smoke tests'
    }),
    expect: r => r.status === 201 || r.status === 200 || r.status === 404
  });

  tests.push({ 
    name: 'Interactions - List', 
    method: 'GET', 
    url: () => `${BASE}/api/interactions?contact_id=${CONTACT_ID}&limit=5`, 
    headers: H(), 
    expect: r => r.status === 200 || r.status === 404
  });

  // 5) V1 Endpoints
  tests.push({ 
    name: 'V1 - Me', 
    method: 'GET', 
    url: `${BASE}/api/v1/me`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  tests.push({ 
    name: 'V1 - Pipelines', 
    method: 'GET', 
    url: `${BASE}/api/v1/pipelines`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  tests.push({ 
    name: 'V1 - Pipeline Stages', 
    method: 'GET', 
    url: `${BASE}/api/v1/pipelines/business/stages`, 
    headers: H(), 
    expect: r => r.status === 200 
  });

  // 6) Config Status
  tests.push({
    name: 'V1 - Config Status',
    method: 'GET',
    url: `${BASE}/api/v1/ops/config-status`,
    headers: H(),
    expect: r => r.status === 200 && r.data && typeof r.data.envs === 'object',
  });

  // 7) Cleanup - Delete test contact
  tests.push({
    name: 'Contacts - Delete',
    method: 'DELETE',
    url: () => `${BASE}/api/contacts/${CONTACT_ID}`,
    headers: H(),
    expect: r => r.status === 200 || r.status === 204
  });

  // Execute all tests
  for (const t of tests) {
    const name = t.name;
    const method = t.method;
    const url = typeof t.url === 'function' ? t.url() : t.url;
    const body = typeof t.body === 'function' ? t.body() : t.body;
    const headers = typeof t.headers === 'function' ? t.headers() : t.headers;
    const started = Date.now();
    
    try {
      if (LOG) console.log(`\n[test] ${name} -> ${method} ${url}`);
      const res = await request(method, url, { headers, body });
      const ok = t.expect ? !!t.expect(res) : res.ok;
      const entry = {
        name,
        method,
        url,
        status: res.status,
        ok,
        durationMs: Date.now() - started,
        responseExcerpt: jsonExcerpt(res.data ?? res.raw),
      };
      reporter.add(entry);
      
      const emoji = ok ? '✅' : '❌';
      console.log(`${emoji} ${name} - ${res.status} (${Date.now() - started}ms)`);
      
      if (t.after) {
        try { await t.after(res); } catch {}
      }
    } catch (e) {
      if (LOG) console.error(`[test] ${name} error:`, e.message);
      reporter.add({ 
        name, 
        method, 
        url, 
        status: 0, 
        ok: false, 
        error: e.message, 
        durationMs: Date.now() - started 
      });
      console.log(`❌ ${name} - ERROR: ${e.message}`);
    }
  }

  // Save report
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = `backend-vercel/tests/reports/smoke-test-${ts}.md`;
  await reporter.save(outPath);
  
  const { total, passed, failed } = reporter.summary();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[api-smoke] Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`[api-smoke] Report saved to: ${outPath}`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[api-smoke] FATAL:', err.message);
  process.exit(1);
});
