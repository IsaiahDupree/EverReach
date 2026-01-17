// Agent test: interactions context via chat tools
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, nowIso, writeJsonArtifact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  const apiBase = BACKEND_BASE.includes('/api') ? BACKEND_BASE : `${BACKEND_BASE}/api`;
  const contact = await ensureContact({ base: apiBase, token, origin: TEST_ORIGIN, name: `Agent Inter ${id.slice(0,8)}` });

  // Seed interactions
  const seedOne = await apiFetch(BACKEND_BASE, '/api/v1/interactions', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify({ contact_id: contact.id, kind: 'note', content: `First note ${nowIso()}` })
  });
  const seedTwo = await apiFetch(BACKEND_BASE, '/api/v1/interactions', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify({ contact_id: contact.id, kind: 'note', content: `Second note ${nowIso()}` })
  });

  // Chat asking to summarize last 2 interactions
  const chatPayload = {
    message: 'Using tools, summarize the last 2 interactions for this contact in one sentence.',
    context: { contact_id: contact.id, use_tools: true }
  };
  const chat = await apiFetch(BACKEND_BASE, '/api/v1/agent/chat', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(chatPayload)
  });
  // JSON artifacts
  await writeJsonArtifact('agent_interactions_summary', id, 'chat_input', chatPayload);
  await writeJsonArtifact('agent_interactions_summary', id, 'chat_output', chat.json ?? {});

  const steps = [];
  steps.push(`- Seed interactions: ${seedOne.res.status}, ${seedTwo.res.status}`);
  steps.push(`- Agent chat: ${chat.res.status}`);

  const chatInputJson = JSON.stringify(chatPayload, null, 2);
  const chatOutputText = chat.json?.message ? String(chat.json.message) : (chat.json ? JSON.stringify(chat.json, null, 2) : '');
  const chatToolsUsed = Array.isArray(chat.json?.tools_used) ? chat.json.tools_used.join(', ') : '';
  const chatConvId = chat.json?.conversation_id || '';

  // Success criteria
  const usedTool = (chatToolsUsed || '').includes('get_contact_interactions');
  const hasOutput = !!chatOutputText && chatOutputText.length > 0;
  const passed = usedTool && hasOutput;

  const lines = [
    '# Agent Test: Interactions Summary',
    '',
    `- **Contact**: ${contact.id} (${mdEscape(contact.display_name)})`,
    '',
    '## Steps',
    ...steps,
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
    `- **Used get_contact_interactions tool**: ${usedTool}`,
    `- **Produced non-empty output**: ${hasOutput}`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_interactions_summary');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-interactions-summary] failed:', err?.message || err); process.exit(1); });
