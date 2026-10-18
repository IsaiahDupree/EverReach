import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');

try {
  const envContent = await readFile(resolve(rootDir, '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (err) {
  console.warn('Warning: Could not load .env file:', err.message);
}

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

export async function writeReport(testNameOrLines, linesOrOutDir, testsOrPrefix, exitCode) {
  // Support two signatures:
  // Old: writeReport(lines, outDir, prefix)
  // New: writeReport(testName, lines, tests, exitCode)
  let lines, outDir, prefix;
  
  if (Array.isArray(testNameOrLines)) {
    // Old signature: writeReport(lines, outDir, prefix)
    lines = testNameOrLines;
    outDir = linesOrOutDir || 'test/agent/reports';
    prefix = testsOrPrefix || 'agent_test';
  } else {
    // New signature: writeReport(testName, lines, tests, exitCode)
    prefix = testNameOrLines;
    lines = linesOrOutDir || [];
    outDir = 'test/agent/reports';
    // Optional: append test results to lines if tests array provided
    if (Array.isArray(testsOrPrefix)) {
      lines.push('', '## Test Results', '');
      lines.push('```json');
      lines.push(JSON.stringify(testsOrPrefix, null, 2));
      lines.push('```');
    }
  }
  
  const dir = await ensureReportsDir(outDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  const outPath = resolve(dir, `${prefix}${runTag}_${ts}.md`);
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

export async function ensureContact({ base, token, origin, name }) {
  const idem = `agent-${randomUUID()}`;
  const payload = {
    display_name: name,
    emails: [ `${name.toLowerCase().replace(/\s+/g, '')}.${idem.slice(0,6)}@example.com` ],
    tags: ['agent_test']
  };
  const resp = await apiFetch(base, '/v1/contacts', {
    method: 'POST', token, origin, headers: { 'Idempotency-Key': idem }, body: JSON.stringify(payload)
  });
  if (!resp.res.ok) throw new Error(`ensureContact failed: ${resp.res.status}`);
  return resp.json?.contact;
}

export async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
