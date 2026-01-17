#!/usr/bin/env node

// Minimal smoke tests for Personal Profile API
// Usage (PowerShell):
//   $env:API_BASE = "https://ever-reach-be.vercel.app"
//   $env:TEST_JWT = "<paste a valid user JWT>"
//   node test/profile-smoke.mjs

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_JWT = process.env.TEST_JWT || '';

function logOk(msg){ console.log(`✅ ${msg}`); }
function logFail(msg){ console.error(`❌ ${msg}`); }
function assert(cond, msg){ if(!cond){ throw new Error(msg); } }

async function unauthShould401(){
  const res = await fetch(`${API_BASE}/api/v1/me`);
  assert(res.status === 401, `Expected 401 for unauth /v1/me, got ${res.status}`);
  logOk('Unauthenticated GET /v1/me returns 401');
}

async function authedProfile(){
  const res = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${TEST_JWT}` }
  });
  assert(res.ok, `GET /v1/me failed: ${res.status}`);
  const body = await res.json();
  assert(body?.user?.id, 'Profile response missing user.id');
  assert(typeof body?.user?.preferences === 'object', 'Profile preferences missing or not object');
  logOk('GET /v1/me returns profile with preferences');
}

async function authedComposeSettings(){
  const res = await fetch(`${API_BASE}/api/v1/me/compose-settings`, {
    headers: { Authorization: `Bearer ${TEST_JWT}` }
  });
  assert(res.ok, `GET /v1/me/compose-settings failed: ${res.status}`);
  const body = await res.json();
  assert(body?.settings || body?.compose_settings || body?.user, 'Compose settings response looks unexpected');
  logOk('GET /v1/me/compose-settings returns settings');
}

async function authedPersonaNotes(){
  // Create note
  const create = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'text', title: 'Smoke Test', body_text: 'hello from smoke test' })
  });
  assert(create.ok, `POST /v1/me/persona-notes failed: ${create.status}`);
  const created = await create.json();
  const noteId = created?.id || created?.note?.id;

  // List notes
  const list = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
    headers: { Authorization: `Bearer ${TEST_JWT}` }
  });
  assert(list.ok, `GET /v1/me/persona-notes failed: ${list.status}`);
  const arr = await list.json();
  assert(Array.isArray(arr), 'Persona notes response expected to be array');
  logOk('POST/GET persona-notes works');

  // Cleanup (best-effort)
  if (noteId) {
    await fetch(`${API_BASE}/api/v1/me/persona-notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TEST_JWT}` }
    });
  }
}

(async () => {
  try {
    console.log(`[Smoke] API_BASE=${API_BASE}`);
    await unauthShould401();

    if (!TEST_JWT) {
      console.log('\nNo TEST_JWT provided, skipping authenticated checks.');
      process.exit(0);
    }

    await authedProfile();
    await authedComposeSettings();
    await authedPersonaNotes();

    console.log('\nAll smoke tests passed.');
  } catch (err) {
    logFail(err.message || String(err));
    process.exit(1);
  }
})();
