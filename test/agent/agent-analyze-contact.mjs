// Agent test: analyze contact endpoint
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, nowIso } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  // Ensure contact
  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent Analyze ${id.slice(0,8)}` });

  // Optional: seed a note to enrich context
  const notePayload = {
    type: 'text',
    title: `A-Note ${id.slice(0,6)}`,
    body_text: `Context for ${contact.display_name} @ ${nowIso()}`,
    tags: [contact.display_name, 'business']
  };
  await apiFetch(BACKEND_BASE, '/api/v1/me/persona-notes', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(notePayload)
  });

  // Call analysis endpoint
  const analyzePayload = {
    contact_id: contact.id,
    analysis_type: 'context_summary',
    include_voice_notes: true,
    include_interactions: true,
  };
  const analyze = await apiFetch(BACKEND_BASE, '/api/v1/agent/analyze/contact', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(analyzePayload)
  });

  // Criteria
  const statusOk = analyze.res.status === 200;
  const correctName = (analyze.json?.contact?.name || '').toLowerCase().includes(contact.display_name.toLowerCase());
  const hasAnalysis = !!(analyze.json?.analysis || '').trim();
  const usedCounts = analyze.json?.context_used || {};
  const passed = statusOk && correctName && hasAnalysis;

  const lines = [
    '# Agent Test: Analyze Contact',
    '',
    `- **Contact**: ${contact.id} (${mdEscape(contact.display_name)})`,
    '',
    '## Input',
    '```json',
    JSON.stringify(analyzePayload, null, 2),
    '```',
    '',
    '## Output (excerpt)',
    '```',
    (analyze.json?.analysis || JSON.stringify(analyze.json || {}, null, 2)).slice(0, 1200),
    '```',
    '',
    '## Assertions',
    `- **Status 200**: ${statusOk}`,
    `- **Correct contact name**: ${correctName}`,
    `- **Non-empty analysis**: ${hasAnalysis}`,
    `- **Context counts**: interactions=${usedCounts.interactions ?? 'n/a'}, persona_notes=${usedCounts.persona_notes ?? 'n/a'}`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_analyze_contact');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-analyze-contact] failed:', err?.message || err); process.exit(1); });
