// Agent test: suggestions endpoint (global and per-contact)
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  // Ensure contact to test per-contact suggestions
  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent Suggest ${id.slice(0,8)}` });

  // Global suggestions
  const globalPayload = { context: 'dashboard', focus: 'all', limit: 3 };
  const global = await apiFetch(BACKEND_BASE, '/api/v1/agent/suggest/actions', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(globalPayload)
  });

  // Per-contact suggestions
  const contactPayload = { context: 'contact_view', contact_id: contact.id, focus: 'engagement', limit: 3 };
  const perContact = await apiFetch(BACKEND_BASE, '/api/v1/agent/suggest/actions', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(contactPayload)
  });

  // Criteria
  const globalOk = global.res.status === 200 && Array.isArray(global.json?.suggestions);
  const perContactOk = perContact.res.status === 200 && Array.isArray(perContact.json?.suggestions);
  const passed = globalOk && perContactOk;

  const lines = [
    '# Agent Test: Suggest Actions',
    '',
    `- **Contact**: ${contact.id} (${mdEscape(contact.display_name)})`,
    '',
    '## Inputs',
    '### Global payload',
    '```json',
    JSON.stringify(globalPayload, null, 2),
    '```',
    '### Per-contact payload',
    '```json',
    JSON.stringify(contactPayload, null, 2),
    '```',
    '',
    '## Outputs',
    '### Global response',
    '```json',
    JSON.stringify(global.json || {}, null, 2),
    '```',
    '### Per-contact response',
    '```json',
    JSON.stringify(perContact.json || {}, null, 2),
    '```',
    '',
    '## Assertions',
    `- **Global returned suggestions[]**: ${globalOk}`,
    `- **Per-contact returned suggestions[]**: ${perContactOk}`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_suggest_actions');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-suggest-actions] failed:', err?.message || err); process.exit(1); });
