/**
 * E2E Test: Contact Files + Avatar
 *
 * Verifies:
 * - Link a file to a contact via POST /v1/contacts/:id/files
 * - List files via GET /v1/contacts/:id/files
 * - Set a contact's avatar_url via PATCH /v1/contacts/:id
 * - Verify avatar_url via GET /v1/contacts/:id
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, ensureContact } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Contact Files + Avatar',
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
  lines.push('## Test Results');
  lines.push('');

  const tests = [];

  // Setup: ensure a contact
  let contactId = null;
  try {
    const contact = await ensureContact({ base: BASE, token, origin: ORIGIN, name: `Files Test ${rid.slice(0,8)}` });
    contactId = contact?.id;
  } catch (e) {
    // ignore setup errors; tests will fail naturally
  }

  if (!contactId) {
    tests.push({ name: 'Setup contact', pass: false, error: 'Failed to create or fetch test contact' });
    exitCode = 1;
  } else {
    // Test 1: Link a file
    const uploadPath = `uploads/test/${rid}/dummy.pdf`;
    try {
      const payload = { path: uploadPath, mime_type: 'application/pdf', size_bytes: 12345 };
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${contactId}/files`, {
        method: 'POST', token, origin: ORIGIN, body: JSON.stringify(payload)
      });
      const pass = res.status === 200 && json?.attachment?.id;
      tests.push({ name: 'POST /v1/contacts/:id/files (link)', pass, status: res.status, ms, attachment_id: json?.attachment?.id });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'POST /v1/contacts/:id/files (link)', pass: false, error: e.message });
      exitCode = 1;
    }

    // Test 2: List files
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${contactId}/files`, { token, origin: ORIGIN });
      const pass = res.status === 200 && Array.isArray(json?.attachments);
      const contains = Array.isArray(json?.attachments) && json.attachments.some(a => a.file_path === uploadPath);
      tests.push({ name: 'GET /v1/contacts/:id/files (list)', pass: pass && contains, status: res.status, ms, count: json?.attachments?.length || 0 });
      if (!(pass && contains)) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'GET /v1/contacts/:id/files (list)', pass: false, error: e.message });
      exitCode = 1;
    }

    // Test 3: Set avatar_url
    const avatarUrl = `https://cdn.example.com/avatars/${contactId}-${rid.slice(0,6)}.jpg`;
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${contactId}`, {
        method: 'PATCH', token, origin: ORIGIN, body: JSON.stringify({ avatar_url: avatarUrl })
      });
      const pass = res.status === 200;
      tests.push({ name: 'PATCH /v1/contacts/:id (avatar_url)', pass, status: res.status, ms });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'PATCH /v1/contacts/:id (avatar_url)', pass: false, error: e.message });
      exitCode = 1;
    }

    // Test 4: Verify avatar_url via GET
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${contactId}`, { token, origin: ORIGIN });
      const pass = res.status === 200 && json?.contact?.id === contactId && json?.contact?.avatar_url === avatarUrl;
      tests.push({ name: 'GET /v1/contacts/:id (verify avatar_url)', pass, status: res.status, ms, avatar_url: json?.contact?.avatar_url });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'GET /v1/contacts/:id (verify avatar_url)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Report
  const passed = tests.filter(t => t.pass).length;
  const failed = tests.filter(t => !t.pass).length;
  lines.push('');
  lines.push(`**Summary**: ${passed} passed, ${failed} failed`);
  lines.push('');
  for (const t of tests) {
    const icon = t.pass ? '✅' : '❌';
    lines.push(`### ${icon} ${t.name}`);
    lines.push('');
    if (t.error) lines.push(`- **Error**: ${t.error}`);
    else {
      if (t.status !== undefined) lines.push(`- **Status**: ${t.status}`);
      if (t.ms !== undefined) lines.push(`- **Duration**: ${t.ms}ms`);
      if (t.attachment_id) lines.push(`- **Attachment ID**: ${t.attachment_id}`);
      if (t.count !== undefined) lines.push(`- **Count**: ${t.count}`);
      if (t.avatar_url) lines.push(`- **Avatar URL**: ${t.avatar_url}`);
    }
    lines.push('');
  }

  await writeReport(lines, 'test/agent/reports', 'e2e_contact_files');

  if (exitCode === 0) {
    console.log(`✅ All contact files/avatar tests passed`);
  } else {
    console.error(`❌ Some contact files/avatar tests failed`);
  }
}

main().catch((err) => {
  console.error('[Contact Files Test Failed]', err?.message || err);
  lines.push('');
  lines.push('## Fatal Error');
  lines.push('');
  lines.push('```');
  lines.push(err?.stack || err?.message || String(err));
  lines.push('```');
  writeReport(lines, 'test/agent/reports', 'e2e_contact_files').catch(() => {});
  process.exit(1);
});

process.on('exit', () => process.exit(exitCode));
