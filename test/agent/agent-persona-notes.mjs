// Agent test: persona notes access via chat tools
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, nowIso, writeJsonArtifact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  // Ensure contact
  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent PN ${id.slice(0,8)}` });

  // Create a persona note tagged with the contact's name
  const notePayload = {
    type: 'text',
    title: `PN ${id.slice(0,6)}`,
    body_text: `Persona note body for ${contact.display_name} at ${nowIso()} (${id.slice(0,6)})`,
    tags: [contact.display_name, 'business']
  };
  const createNote = await apiFetch(BACKEND_BASE, '/api/v1/me/persona-notes', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(notePayload)
  });

  // Chat: instruct use of tools
  const chatPayload = {
    message: 'Using tools, fetch my persona notes for this contact and summarize them in one sentence. Do not ask for contact_id. Only return the summary.',
    context: { contact_id: contact.id, use_tools: true }
  };
  const chat = await apiFetch(BACKEND_BASE, '/api/v1/agent/chat', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(chatPayload)
  });
  // JSON artifacts
  await writeJsonArtifact('agent_persona_notes', id, 'chat_input', chatPayload);
  await writeJsonArtifact('agent_persona_notes', id, 'chat_output', chat.json ?? {});

  // Prepare report
  const steps = [];
  steps.push(`- Create contact: ${contact.id}`);
  steps.push(`- Create persona note: ${createNote.res.status}`);
  steps.push(`- Agent chat: ${chat.res.status}`);

  const chatInputJson = JSON.stringify(chatPayload, null, 2);
  const chatOutputText = chat.json?.message ? String(chat.json.message) : (chat.json ? JSON.stringify(chat.json, null, 2) : '');
  const chatToolsUsed = Array.isArray(chat.json?.tools_used) ? chat.json.tools_used.join(', ') : '';
  const chatConvId = chat.json?.conversation_id || '';

  // Success criteria
  const usedTool = (chatToolsUsed || '').includes('get_persona_notes');
  const hasOutput = !!chatOutputText && chatOutputText.length > 0;
  const passed = usedTool && hasOutput;

  const lines = [
    '# Agent Test: Persona Notes',
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
    `- **Used get_persona_notes tool**: ${usedTool}`,
    `- **Produced non-empty output**: ${hasOutput}`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_persona_notes');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-persona-notes] failed:', err?.message || err); process.exit(1); });
