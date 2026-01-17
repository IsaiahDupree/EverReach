#!/usr/bin/env node

// Complete smoke test with auth

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const email = 'isaiahdupree33@gmail.com';
const password = 'frogger12';

console.log(`[Smoke] API_BASE=${API_BASE}\n`);

function logOk(msg){ console.log(`✅ ${msg}`); }
function logFail(msg){ console.error(`❌ ${msg}`); }
function assert(cond, msg){ if(!cond){ throw new Error(msg); } }

async function getJWT(){
  console.log('[Auth] Signing in via Supabase...');
  
  const SUPABASE_URL = 'https://bvhqolnytimehzpwdiqd.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aHFvbG55dGltZWh6cHdkaXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4ODEyMDAsImV4cCI6MjA0MzQ1NzIwMH0.YxVZretYJ6UPPiWoB4JgdYfKPBCFNNdLgOvqMh5kBEU';
  
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-in failed: ${res.status} - ${text}`);
  }
  
  const data = await res.json();
  const token = data?.access_token;
  
  if (!token) {
    throw new Error('No access token in response: ' + JSON.stringify(data));
  }
  
  logOk('Authenticated');
  return token;
}

async function unauthShould401(){
  const res = await fetch(`${API_BASE}/api/v1/me`);
  assert(res.status === 401, `Expected 401 for unauth /v1/me, got ${res.status}`);
  logOk('Unauthenticated GET /v1/me returns 401');
}

async function authedProfile(jwt){
  const res = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${jwt}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET /v1/me failed: ${res.status} - ${text}`);
  }
  
  const body = await res.json();
  assert(body?.user?.id, 'Profile response missing user.id');
  assert(typeof body?.user?.preferences === 'object', 'Profile preferences missing or not object');
  logOk('GET /v1/me returns profile with preferences');
}

async function authedComposeSettings(jwt){
  const res = await fetch(`${API_BASE}/api/v1/me/compose-settings`, {
    headers: { Authorization: `Bearer ${jwt}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET /v1/me/compose-settings failed: ${res.status} - ${text}`);
  }
  
  const body = await res.json();
  assert(body?.settings || body?.compose_settings || body?.user, 'Compose settings response looks unexpected');
  logOk('GET /v1/me/compose-settings returns settings');
}

async function authedPersonaNotes(jwt){
  // Create note
  const create = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      type: 'text', 
      title: 'Smoke Test Note', 
      body_text: 'Created by automated smoke test' 
    })
  });
  
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`POST /v1/me/persona-notes failed: ${create.status} - ${text}`);
  }
  
  const created = await create.json();
  const noteId = created?.id || created?.note?.id;

  // List notes
  const list = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
    headers: { Authorization: `Bearer ${jwt}` }
  });
  
  if (!list.ok) {
    const text = await list.text();
    throw new Error(`GET /v1/me/persona-notes failed: ${list.status} - ${text}`);
  }
  
  const arr = await list.json();
  assert(Array.isArray(arr) || Array.isArray(arr?.notes), 'Persona notes response expected to be array');
  logOk('POST/GET persona-notes works');

  // Cleanup (best-effort)
  if (noteId) {
    await fetch(`${API_BASE}/api/v1/me/persona-notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` }
    });
    logOk('Cleaned up test note');
  }
}

(async () => {
  try {
    await unauthShould401();
    
    const jwt = await getJWT();
    
    await authedProfile(jwt);
    await authedComposeSettings(jwt);
    await authedPersonaNotes(jwt);

    console.log('\n========================================');
    console.log('✅ All smoke tests passed!');
    console.log('========================================\n');
  } catch (err) {
    logFail(err.message || String(err));
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
})();
