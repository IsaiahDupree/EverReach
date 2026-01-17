// Agent test: update contact tags via update_contact tool
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, writeJsonArtifact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent Tags ${id.slice(0,8)}` });
  const tagToApply = `agent_tag_${id.slice(0,4)}`;

  // Chat: ask to add a tag using tools
  const chatPayload = {
    message: `Using tools, add the tag \"${tagToApply}\" to this contact. Reply with 'OK' when done.`,
    context: { contact_id: contact.id, use_tools: true }
  };
  const chat = await apiFetch(BACKEND_BASE, '/api/v1/agent/chat', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(chatPayload)
  });
  // JSON artifacts
  await writeJsonArtifact('agent_update_tags', id, 'chat_input', chatPayload);
  await writeJsonArtifact('agent_update_tags', id, 'chat_output', chat.json ?? {});

  // Fetch contact to verify tag present
  const getContact = await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'GET', token, origin: TEST_ORIGIN });
  await writeJsonArtifact('agent_update_tags', id, 'contact_after', getContact.json ?? {});
  const tags = getContact.json?.contact?.tags || [];

  const steps = [];
  steps.push(`- Create contact: ${contact.id}`);
  steps.push(`- Agent chat (update tags): ${chat.res.status}`);
  steps.push(`- Get contact: ${getContact.res.status}`);

  const chatInputJson = JSON.stringify(chatPayload, null, 2);
  const chatOutputText = chat.json?.message ? String(chat.json.message) : (chat.json ? JSON.stringify(chat.json, null, 2) : '');
  const chatToolsUsed = Array.isArray(chat.json?.tools_used) ? chat.json.tools_used.join(', ') : '';
  const chatConvId = chat.json?.conversation_id || '';

  // Success criteria: update_contact tool used and tag present
  const usedTool = (chatToolsUsed || '').includes('update_contact');
  const tagPresent = Array.isArray(tags) && tags.includes(tagToApply);
  const passed = usedTool && tagPresent;

  const lines = [
    '# Agent Test: Update Contact Tags',
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
    `- **Used update_contact tool**: ${usedTool}`,
    `- **Tag applied**: ${tagPresent} (${mdEscape(tagToApply)})`,
    `- **PASS**: ${passed}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_update_tags');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }

  if (!passed) process.exit(1);
}

main().catch(err => { console.error('[agent-update-tags] failed:', err?.message || err); process.exit(1); });
