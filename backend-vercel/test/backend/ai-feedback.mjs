/**
 * AI Feedback E2E Test (real, no mocks)
 * Flow: create contact -> compose smart -> send feedback (like, copy) -> regenerate
 */

import { getAccessToken, getEnv, apiFetch, logSection, logOk, logFail, assert, writeReport, nowIso, skipIfNoOpenAI } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

const tests = [];
const reportLines = [];

function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

async function createContact(token) {
  const body = { display_name: `AI Test Contact ${Date.now()}` };
  const { res, json } = await apiFetch(API_BASE, '/api/v1/contacts', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
  assert(res.status === 201, `createContact expected 201, got ${res.status}`);
  const id = json?.contact?.id;
  assert(id, 'createContact: missing contact id');
  logOk(`Created contact ${id}`);
  return id;
}

async function composeSmart(token, contactId) {
  const payload = {
    contact_id: contactId,
    goal_type: 'personal',
    goal_description: 'Say hi and check in',
    channel: 'email',
    tone: 'warm',
  };
  const { res, json } = await apiFetch(API_BASE, '/api/v1/agent/compose/smart', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
  assert(res.status === 200, `composeSmart expected 200, got ${res.status}. Error: ${JSON.stringify(json)}`);
  assert(json?.message?.body, 'composeSmart: missing body');
  assert(json?.generation_id, 'composeSmart: missing generation_id');
  logOk(`Composed message (gen ${json.generation_id}) len=${json.message.body.length}`);
  return json.generation_id;
}

async function postFeedback(token, genId, action) {
  const { res } = await apiFetch(API_BASE, `/api/v1/messages/generations/${genId}/feedback`, {
    method: 'POST',
    token,
    body: JSON.stringify({ action }),
  });
  assert(res.status === 200, `feedback(${action}) expected 200, got ${res.status}`);
  logOk(`Feedback '${action}' recorded`);
}

async function listFeedback(token, genId) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/messages/generations/${genId}/feedback`, {
    method: 'GET',
    token,
  });
  assert(res.status === 200, `listFeedback expected 200, got ${res.status}`);
  assert(Array.isArray(json?.feedback), 'listFeedback: feedback array missing');
  logOk(`Feedback count=${json.feedback.length}`);
}

async function regenerate(token, genId) {
  const { res, json } = await apiFetch(API_BASE, `/api/v1/messages/generations/${genId}/regenerate`, {
    method: 'POST',
    token,
    body: JSON.stringify({ tone: 'professional' }),
  });
  assert(res.status === 200, `regenerate expected 200, got ${res.status}`);
  assert(json?.generation_id, 'regenerate: missing new generation id');
  assert(json?.message?.body, 'regenerate: missing body');
  logOk(`Regenerated -> new gen ${json.generation_id}`);
  return json.generation_id;
}

async function main() {
  console.log('\n🚀 AI Feedback E2E Test');
  console.log(`API: ${API_BASE}\n`);
  
  // This test requires OpenAI for compose/smart and regenerate
  if (skipIfNoOpenAI('AI Feedback E2E')) {
    console.log('⏭️  All tests skipped (requires RUN_OPENAI_TESTS=1)');
    process.exit(0);
  }
  
  reportLines.push(
    '# E2E Test: AI Feedback',
    '',
    `**Started**: ${nowIso()}`,
    `**API Base**: ${API_BASE}`,
    ''
  );

  let exitCode = 0;

  try {
    const token = await getAccessToken();

    const t1 = Date.now();
    const contactId = await createContact(token);
    trackTest('Create Contact', true, Date.now() - t1);

    const t2 = Date.now();
    const genId = await composeSmart(token, contactId);
    trackTest('Compose Smart', true, Date.now() - t2);

    const t3 = Date.now();
    await postFeedback(token, genId, 'like');
    trackTest('Feedback Like', true, Date.now() - t3);

    const t4 = Date.now();
    await postFeedback(token, genId, 'copy');
    trackTest('Feedback Copy', true, Date.now() - t4);

    const t5 = Date.now();
    await listFeedback(token, genId);
    trackTest('List Feedback', true, Date.now() - t5);

    const t6 = Date.now();
    const genId2 = await regenerate(token, genId);
    trackTest('Regenerate', true, Date.now() - t6);

  } catch (e) {
    exitCode = 1;
    logFail(e?.message || String(e));
  }

  await writeReport('ai-feedback', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => { console.error('Fatal', e); process.exit(1); });
