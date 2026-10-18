/**
 * E2E Test: Interactions
 * 
 * Tests interaction logging endpoints:
 * - POST /v1/interactions - Create interaction
 * - GET /v1/interactions - List interactions
 * - GET /v1/interactions/:id - Get single interaction
 * - PATCH /v1/interactions/:id - Update interaction
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, ensureContact } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Interactions',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();

  lines.push(`- **Backend**: ${BASE}`);
  lines.push(`- **Origin**: ${ORIGIN}`);
  lines.push('');

  const tests = [];
  let testContactId = null;
  let testInteractionId = null;

  // Setup: Create test contact
  try {
    const contact = await ensureContact({ base: BASE, token, origin: ORIGIN, name: `Interaction Test ${rid.slice(0, 8)}` });
    testContactId = contact?.id;
    lines.push(`- **Test Contact**: ${testContactId}`);
  } catch (e) {
    lines.push(`- **Setup Error**: ${e.message}`);
    exitCode = 1;
  }

  lines.push('');
  lines.push('## Test Results');
  lines.push('');

  // Test 1: Create interaction
  if (testContactId) {
    try {
      const payload = {
        contact_id: testContactId,
        kind: 'email',
        direction: 'outbound',
        summary: 'Test email interaction',
        occurred_at: new Date().toISOString(),
        metadata: { subject: 'Test Subject' },
      };
      const { res, json, ms } = await apiFetch(BASE, '/v1/interactions', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
      const pass = (res.status === 200 || res.status === 201) && json?.interaction?.id;
      if (pass) testInteractionId = json.interaction.id;
      tests.push({
        name: 'POST /v1/interactions (create)',
        pass,
        status: res.status,
        ms,
        interaction_id: testInteractionId,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'POST /v1/interactions (create)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Test 2: List interactions
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/interactions?limit=10', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.items);  // Changed from json?.interactions to json?.items
    tests.push({
      name: 'GET /v1/interactions (list)',
      pass,
      status: res.status,
      ms,
      count: json?.items?.length || 0,  // Changed from json?.interactions
      note: json?.items?.length === 0 ? 'No interactions found (expected if no test data)' : null,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/interactions (list)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 3: Filter by contact
  if (testContactId) {
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/interactions?contact_id=${testContactId}`, { token, origin: ORIGIN });
      const pass = res.status === 200 && Array.isArray(json?.items);  // Changed from json?.interactions
      tests.push({
        name: 'GET /v1/interactions?contact_id= (filter)',
        pass,
        status: res.status,
        ms,
        count: json?.items?.length || 0,  // Changed from json?.interactions
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'GET /v1/interactions?contact_id= (filter)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Test 4: Get single interaction
  if (testInteractionId) {
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/interactions/${testInteractionId}`, { token, origin: ORIGIN });
      const pass = res.status === 200 && json?.interaction?.id === testInteractionId;
      tests.push({
        name: 'GET /v1/interactions/:id (get single)',
        pass,
        status: res.status,
        ms,
        kind: json?.interaction?.kind,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'GET /v1/interactions/:id (get single)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Test 5: Update interaction
  if (testInteractionId) {
    try {
      const payload = { content: 'Updated test interaction' };  
      const { res, json, ms } = await apiFetch(BASE, `/v1/interactions/${testInteractionId}`, {
        method: 'PATCH',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
      const pass = res.status === 200;
      tests.push({
        name: 'PATCH /v1/interactions/:id (update)',
        pass,
        status: res.status,
        ms,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'PATCH /v1/interactions/:id (update)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Test 6: Filter by kind
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/interactions?kind=email', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.items);  // Changed from json?.interactions
    tests.push({
      name: 'GET /v1/interactions?kind= (filter by type)',
      pass,
      status: res.status,
      ms,
      count: json?.items?.length || 0,  // Changed from json?.interactions
      note: json?.items?.length === 0 ? 'No email interactions found (expected if no test data)' : null,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/interactions?kind= (filter by type)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Generate report
  const passed = tests.filter(t => t.pass).length;
  const failed = tests.filter(t => !t.pass).length;

  lines.push(`**Summary**: ${passed} passed, ${failed} failed`);
  lines.push('');

  for (const t of tests) {
    const icon = t.pass ? '✅' : '❌';
    lines.push(`### ${icon} ${t.name}`);
    lines.push('');
    if (t.error) {
      lines.push(`- **Error**: ${t.error}`);
    } else {
      lines.push(`- **Status**: ${t.status}`);
      lines.push(`- **Duration**: ${t.ms}ms`);
      if (t.interaction_id) lines.push(`- **Interaction ID**: ${t.interaction_id}`);
      if (t.count !== undefined) lines.push(`- **Count**: ${t.count}`);
      if (t.kind) lines.push(`- **Kind**: ${t.kind}`);
      if (t.updated_summary) lines.push(`- **Updated Summary**: ${t.updated_summary}`);
      if (t.note) lines.push(`- **Note**: ${t.note}`);
    }
    lines.push('');
  }

  await writeReport(lines, 'test/agent/reports', 'e2e_interactions');
  
  if (exitCode === 0) {
    console.log(`✅ All interactions tests passed`);
  } else {
    console.error(`❌ Some interactions tests failed`);
  }
}

main().catch((err) => {
  console.error('[Interactions Test Failed]', err?.message || err);
  lines.push('');
  lines.push('## Fatal Error');
  lines.push('');
  lines.push('```');
  lines.push(err?.stack || err?.message || String(err));
  lines.push('```');
  writeReport(lines, 'test/agent/reports', 'e2e_interactions').catch(() => {});
  process.exit(1);
});

process.on('exit', () => process.exit(exitCode));
