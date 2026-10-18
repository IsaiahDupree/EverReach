import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');

try {
  const envContent = await readFile(resolve(rootDir, '.env.local'), 'utf-8');
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
  // .env.local not required for deployed tests
}

export async function getEnv(name, required = true, def) {
  const v = process.env[name] ?? def;
  if (required && (!v || String(v).trim() === '')) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function getAccessToken() {
  // First try to read from test-token.txt (same as agent tests)
  try {
    const token = await readFile(resolve(rootDir, 'test-token.txt'), 'utf-8');
    if (token && token.trim()) {
      return token.trim();
    }
  } catch {}

  // Fall back to environment variable
  if (process.env.TEST_JWT) {
    return process.env.TEST_JWT;
  }

  // Last resort: authenticate with Supabase
  const SUPABASE_URL = await getEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');
  const TEST_EMAIL = await getEnv('TEST_EMAIL', false, 'isaiahdupree33@gmail.com');
  const TEST_PASSWORD = await getEnv('TEST_PASSWORD', false, 'frogger12');

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

export async function apiFetch(base, path, { method = 'GET', headers = {}, body, token } = {}) {
  const url = `${base}${path}`;
  const hdrs = {
    'Content-Type': 'application/json',
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

export async function ensureReportsDir(dir = 'test/backend/reports') {
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeReport(testName, lines, tests, exitCode) {
  const outDir = await ensureReportsDir();
  const prefix = testName.replace(/\//g, '_');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${prefix}${runTag}_${timestamp}.md`;
  
  // Optionally append test results
  if (Array.isArray(tests) && tests.length > 0) {
    lines.push('', '## Test Results', '');
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    lines.push(`**Passed**: ${passed} | **Failed**: ${failed} | **Total**: ${tests.length}`, '');
    lines.push('| Test | Status | Duration |');
    lines.push('|------|--------|----------|');
    for (const t of tests) {
      const status = t.passed ? '✅ PASS' : '❌ FAIL';
      const duration = t.duration ? `${t.duration}ms` : 'N/A';
      lines.push(`| ${mdEscape(t.name)} | ${status} | ${duration} |`);
    }
    lines.push('');
    
    if (typeof exitCode === 'number') {
      lines.push(`**Exit Code**: ${exitCode}`);
    }
  }
  
  const content = lines.join('\n');
  await writeFile(resolve(outDir, filename), content, 'utf8');
  return resolve(outDir, filename);
}

// Color helpers for console output
export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function logOk(message) {
  log(`  ✅ ${message}`, 'green');
}

export function logFail(message) {
  log(`  ❌ ${message}`, 'red');
}

export function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// OpenAI test gating
export const OPENAI_TESTS_ENABLED = process.env.RUN_OPENAI_TESTS === '1';

export function skipIfNoOpenAI(testName) {
  if (!OPENAI_TESTS_ENABLED) {
    console.log(`⏭️  Skipped (OpenAI disabled): ${testName}`);
    return true;
  }
  return false;
}

export function requireOpenAI() {
  if (!OPENAI_TESTS_ENABLED) {
    throw new Error('OpenAI tests disabled. Set RUN_OPENAI_TESTS=1 to enable.');
  }
}
