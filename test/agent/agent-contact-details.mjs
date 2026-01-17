// Agent test: contact details via get_contact tool
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, writeJsonArtifact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent Details ${id.slice(0,8)}` });

  // Chat: fetch contact details and render name + warmth
  const chatPayload = {
    message: 'Using tools, fetch contact details and reply with: Name: <name>, Warmth: <score>'.
      concat(' If warmth is not available, use N/A.'),
    context: { contact_id: contact.id, use_tools: true }
  };
  const chat = await apiFetch(BACKEND_BASE, '/api/v1/agent/chat', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(chatPayload)
  });
  // JSON artifacts
  await writeJsonArtifact('agent_contact_details', id, 'chat_input', chatPayload);
  await writeJsonArtifact('agent_contact_details', id, 'chat_output', chat.json ?? {});

  const steps = [];
  steps.push(`- Create contact: ${contact.id}`);
  steps.push(`- Agent chat: ${chat.res.status}`);

  const chatInputJson = JSON.stringify(chatPayload, null, 2);
  const chatOutputText = chat.json?.message ? String(chat.json.message) : (chat.json ? JSON.stringify(chat.json, null, 2) : '');
  const chatToolsUsed = Array.isArray(chat.json?.tools_used) ? chat.json.tools_used.join(', ') : '';
  const chatConvId = chat.json?.conversation_id || '';

  // Success criteria: tool used and output references contact name
  const usedTool = (chatToolsUsed || '').includes('get_contact');
  const mentionsName = chatOutputText.toLowerCase().includes(contact.display_name.toLowerCase().split(' ')[0]);
  const passed = usedTool && mentionsName;

  const lines = [
    '# Agent Test: Contact Details',
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
    `- **Used get_contact tool**: ${usedTool}`,
    `- **Mentions contact name**: ${mentionsName}`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_contact_details');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-contact-details] failed:', err?.message || err); process.exit(1); });
