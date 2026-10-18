// AI Context & Actions Smoke Test (agent-specific)
// Usage (PowerShell):
//   $env:BACKEND_BASE = "https://ever-reach-be.vercel.app"
//   $env:TEST_ORIGIN  = "https://everreach.app"
//   # Token strategy A: let the test sign in via Supabase REST (recommended for CI)
//   $env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
//   $env:SUPABASE_ANON_KEY = "<anon_key>"
//   $env:TEST_EMAIL = "<email>"
//   $env:TEST_PASSWORD = "<password>"
//   # Token strategy B: provide an ACCESS_TOKEN directly
//   # $env:ACCESS_TOKEN = "<jwt>"
//   node ./test/agent/ai-context-actions.smoke.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

async function getEnv(name, required = true, def) {
  const v = process.env[name] ?? def;
  if (required && (!v || String(v).trim() === '')) throw new Error(`Missing env: ${name}`);
  return v;
}

async function getAccessToken() {
  if (process.env.ACCESS_TOKEN) return process.env.ACCESS_TOKEN;
  const SUPABASE_URL = await getEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');
  const TEST_EMAIL = await getEnv('TEST_EMAIL');
  const TEST_PASSWORD = await getEnv('TEST_PASSWORD');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
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

async function apiFetch(base, path, { method = 'GET', headers = {}, body, token, origin } = {}) {
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

function nowIso() { return new Date().toISOString(); }
function mdEscape(s) { return String(s ?? '').replaceAll('`', '\\`'); }

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const runId = randomUUID();
  const idemKey = `ai-smoke-${runId}`;
  const report = [];
  const pad = (n) => String(n).padStart(3, ' ');

  // 1) Create contact
  const contactPayload = {
    display_name: `AI Smoke ${runId.slice(0, 8)}`,
    emails: [ `ai-smoke+${runId.slice(0,6)}@example.com` ],
    tags: ['ai_smoke'],
  };
  const createContact = await apiFetch(BACKEND_BASE, '/api/v1/contacts', {
    method: 'POST',
    token,
    origin: TEST_ORIGIN,
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify(contactPayload),
  });
  const contact = createContact.json?.contact;
  report.push(`- Create contact: ${createContact.res.status} in ${pad(createContact.ms)}ms`);
  if (!createContact.res.ok || !contact?.id) throw new Error(`Create contact failed: ${createContact.res.status}`);

  // 2) Seed interaction (note)
  const interactionPayload = {
    contact_id: contact.id,
    kind: 'note',
    content: `AI smoke seed at ${nowIso()}`,
  };
  const seedInteraction = await apiFetch(BACKEND_BASE, '/api/v1/interactions', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(interactionPayload)
  });
  report.push(`- Seed interaction: ${seedInteraction.res.status} in ${pad(seedInteraction.ms)}ms`);

  // 3) Smart compose (agent)
  const composePayload = {
    contact_id: contact.id,
    goal_type: 'business',
    channel: 'email',
    tone: 'concise',
    include_voice_context: true,
    include_interaction_history: true,
  };
  const compose = await apiFetch(BACKEND_BASE, '/api/v1/agent/compose/smart', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(composePayload)
  });
  const composedBody = compose.json?.message?.body;
  report.push(`- Agent compose smart: ${compose.res.status} in ${pad(compose.ms)}ms`);

  // 4) Prepare message (logs draft + thread)
  const preparePayload = {
    contact_id: contact.id,
    channel: 'email',
    draft: { subject: 'AI Smoke Test', body: composedBody || 'Hello from AI smoke test.' },
    composer_context: { template_id: null }
  };
  const prepare = await apiFetch(BACKEND_BASE, '/api/v1/messages/prepare', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(preparePayload)
  });
  report.push(`- Messages prepare: ${prepare.res.status} in ${pad(prepare.ms)}ms`);

  // 5) Warmth recompute
  const warmth = await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}/warmth/recompute`, {
    method: 'POST', token, origin: TEST_ORIGIN
  });
  const warmthVal = warmth.json?.contact?.warmth;
  const warmthBand = warmth.json?.contact?.warmth_band;
  report.push(`- Warmth recompute: ${warmth.res.status} in ${pad(warmth.ms)}ms (warmth=${warmthVal ?? 'n/a'}, band=${warmthBand ?? 'n/a'})`);

  // 6) Tools list
  const tools = await apiFetch(BACKEND_BASE, '/api/v1/agent/tools', { method: 'GET', token, origin: TEST_ORIGIN });
  const toolCount = tools.json?.count ?? (tools.json?.tools?.length ?? 'n/a');
  report.push(`- Agent tools list: ${tools.res.status} in ${pad(tools.ms)}ms (count=${toolCount})`);

  // 7) Agent chat (gracefully accept 200 or 500 depending on OPENAI availability)
  const chatPayload = { message: 'Give me a one-line context summary for this contact', context: { contact_id: contact.id, use_tools: true } };
  const chat = await apiFetch(BACKEND_BASE, '/api/v1/agent/chat', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(chatPayload)
  });
  const chatOkish = chat.res.status === 200 || chat.res.status === 500; // tolerate missing OPENAI key
  report.push(`- Agent chat: ${chat.res.status} in ${pad(chat.ms)}ms`);
  const chatInputJson = JSON.stringify(chatPayload, null, 2);
  const chatOutputText = chat.json?.message ? String(chat.json.message) : (chat.json ? JSON.stringify(chat.json, null, 2) : '');
  const chatToolsUsed = Array.isArray(chat.json?.tools_used) ? chat.json.tools_used.join(', ') : '';
  const chatConvId = chat.json?.conversation_id || '';

  // 8) Verify latest interaction fetched
  const listInteractions = await apiFetch(BACKEND_BASE, `/api/v1/interactions?contact_id=${contact.id}&limit=1`, { method: 'GET', token, origin: TEST_ORIGIN });
  const latest = listInteractions.json?.items?.[0];
  report.push(`- List interactions (latest): ${listInteractions.res.status} in ${pad(listInteractions.ms)}ms`);

  // Markdown report
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const lines = [
    '# AI Context & Actions Smoke Test',
    '',
    `- **Run ID**: ${runId}`,
    `- **Backend**: ${mdEscape(BACKEND_BASE)}`,
    `- **Contact**: ${contact.id} (${mdEscape(contact.display_name)})`,
    '',
    '## Steps',
    ...report,
    '',
    '## Chat',
    '### Input',
    '```json',
    chatInputJson,
    '```',
    '### Output',
    '```',
    chatOutputText,
    '```',
    chatToolsUsed ? `- Tools used: ${chatToolsUsed}` : '- Tools used: (none or unavailable)',
    chatConvId ? `- Conversation ID: ${chatConvId}` : '- Conversation ID: (unavailable)',
    '',
    '## Assertions',
    `- **Compose body present**: ${!!composedBody}`,
    `- **Warmth fields present**: ${Number.isFinite(warmthVal) && typeof warmthBand === 'string'}`,
    `- **Agent tools available**: ${(toolCount ?? 0) > 0}`,
    `- **Agent chat responded (200 or 500)**: ${chatOkish}`,
    `- **Has at least one interaction**: ${!!latest}`,
  ];

  const outDir = 'test/agent/reports';
  await mkdir(outDir, { recursive: true });
  const outPath = `${outDir}/ai_context_actions_${ts}.md`;
  await writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(outPath);

  // Cleanup (soft delete contact)
  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }
}

main().catch(err => {
  console.error('[AI Smoke Test Failed]', err?.message || err);
  process.exit(1);
});
