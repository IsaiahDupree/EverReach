import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function getEnv(name, required = true, def) {
  const v = process.env[name] ?? def;
  if (required && (!v || String(v).trim() === '')) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function getAccessToken() {
  if (process.env.ACCESS_TOKEN) return process.env.ACCESS_TOKEN;
  const SUPABASE_URL = await getEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');
  const TEST_EMAIL = await getEnv('TEST_EMAIL');
  const TEST_PASSWORD = await getEnv('TEST_PASSWORD');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error_description || json?.error || res.statusText;
    throw new Error(`Supabase sign-in failed: ${res.status} ${msg}`);
  }
  const token = json?.access_token;
  if (!token) throw new Error('No access_token from Supabase REST');
  return token;
}

export async function apiFetch(base, path, { method = 'GET', headers = {}, body, token, origin } = {}) {
  const url = `${base}${path}`;
  const hdrs = {
    'Content-Type': 'application/json',
    'Origin': origin,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...headers,
  };
  const t0 = Date.now();
  const res = await fetch(url, { method, headers: hdrs, body });
  const dt = Date.now() - t0;
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json, ms: dt };
}

export function mdEscape(s) { return String(s ?? '').replaceAll('`', '\\`'); }
export function nowIso() { return new Date().toISOString(); }
export function runId() { return randomUUID(); }

export async function ensureReportsDir(dir = 'test/agent/reports') {
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeReport(lines, outDir = 'test/agent/reports', prefix = 'agent_test') {
  const dir = await ensureReportsDir(outDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  const outPath = `${dir}/${prefix}${runTag}_${ts}.md`;
  await writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(outPath);
  return outPath;
}

export async function writeJsonArtifact(prefix, rid, name, data, outDir = 'test/agent/reports/json') {
  await mkdir(outDir, { recursive: true });
  const file = `${outDir}/${prefix}_${rid}_${name}.json`;
  await writeFile(file, JSON.stringify(data ?? {}, null, 2), 'utf8');
  console.log(file);
  return file;
}

export async function ensureContact({ base, token, origin, name, email, tags }) {
  const idem = `agent-${randomUUID()}`;
  const payload = {
    display_name: name,
    email: email || `test-${randomUUID().slice(0,8)}@test.com`,
    notes: '',
    tags: tags || [],
    warmth: 50
  };
  const resp = await apiFetch(base, '/api/v1/contacts', {
    method: 'POST', token, origin, headers: { 'Idempotency-Key': idem }, body: JSON.stringify(payload)
  });
  if (!resp.res.ok) throw new Error(`ensureContact failed: ${resp.res.status}`);
  return resp.json?.contact || resp.json;
}

export async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
