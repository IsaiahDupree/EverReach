/**
 * Frontend API Smoke (deployed backend)
 * - Uses TEST_API_BASE to target deployed API (e.g., https://ever-reach-be.vercel.app)
 * - Uses optional TEST_TOKEN for Authorization
 * - Writes a markdown report consumed by run-all-unified.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const REPORTS_DIR = 'test/agent/reports';
const NAME = 'frontend_api_smoke';

function now() { return new Date().toISOString().replace(/[:.]/g, '-'); }

async function report(lines) {
  await mkdir(REPORTS_DIR, { recursive: true });
  const file = join(REPORTS_DIR, `${NAME}_${now()}.md`);
  await writeFile(file, lines.join('\n'), 'utf8');
  console.log(`\n[report] wrote ${file}`);
}

function okOrAuth(status) {
  return status === 200 || status === 201 || status === 202 || status === 204 || status === 401;
}

async function main() {
  const API = process.env.TEST_API_BASE;
  const TOKEN = process.env.TEST_TOKEN || '';

  const lines = [
    `# E2E Test: ${NAME}`,
    '',
    `Target: ${API || 'N/A'}`,
    '',
  ];

  if (!API) {
    lines.push('❌ TEST_API_BASE is not set. Skipping smoke tests.');
    await report(lines);
    // Exit 0 to avoid failing unified run when env is not provided
    process.exit(0);
  }

  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } : { accept: 'application/json' };

  const checks = [
    { name: 'GET /v1/contacts?limit=1', url: `${API}/api/v1/contacts?limit=1`, method: 'GET' },
    { name: 'GET /v1/interactions (list)', url: `${API}/api/v1/interactions`, method: 'GET' },
    { name: 'GET /v1/contacts/:id/context-summary (first contact)', url: null, method: 'GET', dynamic: true },
    { name: 'POST /v1/uploads/sign', url: `${API}/api/v1/uploads/sign`, method: 'POST' },
  ];

  let pass = 0; let fail = 0;
  let firstContactId = null;

  // First: fetch a contact id (best-effort)
  try {
    const res = await fetch(`${API}/api/v1/contacts?limit=1`, { headers });
    if (res.ok) {
      const data = await res.json();
      const items = data.items || data.contacts || data || [];
      firstContactId = items[0]?.id || null;
    }
  } catch {}

  for (const c of checks) {
    let status = 0; let err = '';
    try {
      let url = c.url;
      if (c.dynamic && firstContactId) {
        url = `${API}/api/v1/contacts/${firstContactId}/context-summary`;
      } else if (c.dynamic && !firstContactId) {
        lines.push(`- ❕ ${c.name}: skipped (no contact id)`);
        continue;
      }
      const res = await fetch(url, { method: c.method, headers });
      status = res.status;
      if (okOrAuth(status)) { pass++; lines.push(`- ✅ ${c.name} → ${status}`); }
      else { fail++; lines.push(`- ❌ ${c.name} → ${status}`); }
    } catch (e) {
      fail++; err = e?.message || String(e);
      lines.push(`- ❌ ${c.name} → error: ${err}`);
    }
  }

  lines.push('');
  lines.push(`**Passed**: ${pass}`);
  lines.push(`**Failed**: ${fail}`);

  await report(lines);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  await report([`# E2E Test: ${NAME}`, '', `Runner error: ${e?.message || String(e)}`]);
  process.exit(1);
});
