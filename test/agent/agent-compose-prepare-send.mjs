// Agent test: compose via agent, then prepare and send message
import { getEnv, getAccessToken, apiFetch, mdEscape, runId, writeReport, ensureContact, writeJsonArtifact } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const CLEANUP = String(process.env.CLEANUP ?? 'true').toLowerCase() !== 'false';

  const token = await getAccessToken();
  const id = runId();

  const contact = await ensureContact({ base: BACKEND_BASE, token, origin: TEST_ORIGIN, name: `Agent Compose ${id.slice(0,8)}` });

  // Compose via agent smart endpoint
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
  // Artifacts
  await writeJsonArtifact('agent_compose_prepare_send', id, 'compose_input', composePayload);
  await writeJsonArtifact('agent_compose_prepare_send', id, 'compose_output', compose.json ?? {});
  const body = compose.json?.message?.body || 'Hello from agent compose test.';

  // Prepare message (logs assistant draft)
  const preparePayload = {
    contact_id: contact.id,
    channel: 'email',
    draft: { subject: 'Agent Compose Test', body },
    composer_context: { template_id: null }
  };
  const prepare = await apiFetch(BACKEND_BASE, '/api/v1/messages/prepare', {
    method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify(preparePayload)
  });
  await writeJsonArtifact('agent_compose_prepare_send', id, 'prepare_input', preparePayload);
  await writeJsonArtifact('agent_compose_prepare_send', id, 'prepare_output', prepare.json ?? {});
  const messageId = prepare.json?.message?.id;

  // Send message (marks sent)
  let send = { res: { status: 0 }, json: null };
  if (messageId) {
    send = await apiFetch(BACKEND_BASE, '/api/v1/messages/send', {
      method: 'POST', token, origin: TEST_ORIGIN, body: JSON.stringify({ message_id: messageId })
    });
  }
  await writeJsonArtifact('agent_compose_prepare_send', id, 'send_output', send.json ?? {});

  // Steps & I/O
  const steps = [];
  steps.push(`- Compose smart: ${compose.res.status}`);
  steps.push(`- Prepare message: ${prepare.res.status}`);
  steps.push(`- Send message: ${send.res.status}`);

  const lines = [
    '# Agent Test: Compose → Prepare → Send',
    '',
    `- **Contact**: ${contact.id} (${mdEscape(contact.display_name)})`,
    '',
    '## Steps',
    ...steps,
    '',
    '## Inputs',
    '### Compose payload',
    '```json',
    JSON.stringify(composePayload, null, 2),
    '```',
    '### Prepare payload',
    '```json',
    JSON.stringify(preparePayload, null, 2),
    '```',
    '',
    '## Outputs',
    '### Compose response snippet',
    '```',
    (compose.json?.message?.body || JSON.stringify(compose.json || {}, null, 2)),
    '```',
    '### Send response',
    '```json',
    JSON.stringify(send.json || {}, null, 2),
    '```',
    '',
    '## Assertions',
    `- **Compose returned 200/201**: ${compose.res.status === 200 || compose.res.status === 201}`,
    `- **Prepare returned 201**: ${prepare.res.status === 201}`,
    `- **Send returned 200**: ${send.res.status === 200}`,
    `- **Send status 'sent'**: ${send.json?.delivery_status === 'sent'}`,
    `- **PASS**: ${(compose.res.status === 200 || compose.res.status === 201) && prepare.res.status === 201 && send.res.status === 200 && send.json?.delivery_status === 'sent'}`,
  ];

  await writeReport(lines, 'test/agent/reports', 'agent_compose_prepare_send');

  if (CLEANUP) {
    await apiFetch(BACKEND_BASE, `/api/v1/contacts/${contact.id}`, { method: 'DELETE', token, origin: TEST_ORIGIN });
  }
}

main().catch(err => { console.error('[agent-compose-prepare-send] failed:', err?.message || err); process.exit(1); });
