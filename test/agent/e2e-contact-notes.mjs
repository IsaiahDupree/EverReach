/**
 * E2E Test: Contact Notes CRUD
 * 
 * Tests contact notes system including create, read, update, delete operations.
 * Verifies notes are stored as interactions.
 */

import { getEnv, getAccessToken, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Contact Notes CRUD',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
  const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
  const BACKEND_BASE = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
  const token = await getAccessToken();

  lines.push(`- **Supabase URL**: ${SUPABASE_URL}`);
  lines.push(`- **Backend URL**: ${BACKEND_BASE}`);
  lines.push('');
  lines.push('## Test Workflow: Contact Notes CRUD Operations');
  lines.push('');

  const tests = [];
  let testContactId = null;
  let noteId = null;

  // ===== STEP 1: Create Test Contact =====
  lines.push('### Step 1: Create Test Contact');
  lines.push('');

  try {
    const payload = {
      display_name: `Notes Test ${rid.slice(0, 8)}`,
      emails: [`notes-test-${rid.slice(0, 8)}@example.com`],
      tags: ['e2e_notes_test'],
      metadata: { test_run: `e2e_contact_notes_${rid}` },
    };
    
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const contact = Array.isArray(json) ? json[0] : json;
    
    const pass = (res.status === 200 || res.status === 201) && contact?.id;
    if (pass) testContactId = contact.id;
    
    tests.push({
      name: 'Create test contact',
      pass,
      status: res.status,
      ms,
      contact_id: testContactId,
    });
    
    lines.push(`- ✅ Contact created: ${testContactId}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Create test contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 2: Create Note =====
  lines.push('### Step 2: Create Note');
  lines.push('');

  try {
    const noteContent = `Test note created at ${new Date().toISOString()}`;
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/contacts/${testContactId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: noteContent,
        note_type: 'text',
      }),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = (res.status === 200 || res.status === 201) && (json?.id || json?.note_id);
    if (pass) noteId = json?.id || json?.note_id;
    
    tests.push({
      name: 'Create note',
      pass,
      status: res.status,
      ms,
      note_id: noteId,
    });
    
    if (pass) {
      lines.push(`- ✅ Note created: ${noteId}`);
      lines.push(`- Content: "${noteContent.slice(0, 50)}..."`);
    } else {
      lines.push(`- ❌ Failed: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Create note', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 3: List Notes =====
  lines.push('### Step 3: List Notes');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/contacts/${testContactId}/notes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const notes = Array.isArray(json) ? json : json?.notes || [];
    
    const pass = res.status === 200 && notes.length > 0;
    const foundOurNote = notes.some(n => n.id === noteId);
    
    tests.push({
      name: 'List notes',
      pass,
      status: res.status,
      ms,
      note_count: notes.length,
      found_created_note: foundOurNote,
    });
    
    lines.push(`- ✅ Retrieved ${notes.length} note(s)`);
    lines.push(`- Our note found: ${foundOurNote ? '✅ Yes' : '⚠️ No'}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'List notes', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 4: Update Note =====
  lines.push('### Step 4: Update Note');
  lines.push('');

  if (noteId) {
    try {
      const updatedContent = `UPDATED: Test note modified at ${new Date().toISOString()}`;
      const startTime = Date.now();
      const res = await fetch(`${BACKEND_BASE}/api/v1/interactions/${noteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: updatedContent,
        }),
      });
      
      const ms = Date.now() - startTime;
      const json = await res.json().catch(() => ({}));
      
      const pass = res.status === 200;
      
      tests.push({
        name: 'Update note',
        pass,
        status: res.status,
        ms,
      });
      
      if (pass) {
        lines.push(`- ✅ Note updated successfully`);
        lines.push(`- New content: "${updatedContent.slice(0, 50)}..."`);
      } else {
        lines.push(`- ❌ Failed: ${res.status}`);
        lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
      }
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Update note', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  } else {
    tests.push({ name: 'Update note', pass: false, note: 'Skipped - no note ID' });
    lines.push(`- ⚠️  Skipped - no note ID from creation`);
    lines.push('');
  }

  // ===== STEP 5: Verify Update =====
  lines.push('### Step 5: Verify Update');
  lines.push('');

  if (noteId) {
    try {
      const startTime = Date.now();
      const res = await fetch(`${BACKEND_BASE}/api/v1/contacts/${testContactId}/notes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const ms = Date.now() - startTime;
      const json = await res.json().catch(() => ({}));
      const notes = Array.isArray(json) ? json : json?.notes || [];
      const updatedNote = notes.find(n => n.id === noteId);
      
      const pass = res.status === 200 && updatedNote?.summary?.includes('UPDATED');
      
      tests.push({
        name: 'Verify update',
        pass,
        status: res.status,
        ms,
        has_updated_content: updatedNote?.summary?.includes('UPDATED'),
      });
      
      if (pass) {
        lines.push(`- ✅ Update verified in database`);
      } else {
        lines.push(`- ⚠️  Could not verify update`);
      }
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Verify update', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  } else {
    tests.push({ name: 'Verify update', pass: false, note: 'Skipped - no note ID' });
    lines.push(`- ⚠️  Skipped - no note ID`);
    lines.push('');
  }

  // ===== STEP 6: Delete Note =====
  lines.push('### Step 6: Delete Note');
  lines.push('');

  if (noteId) {
    try {
      const startTime = Date.now();
      const res = await fetch(`${BACKEND_BASE}/api/v1/interactions/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const ms = Date.now() - startTime;
      const pass = res.status === 200 || res.status === 204;
      
      tests.push({
        name: 'Delete note',
        pass,
        status: res.status,
        ms,
      });
      
      if (pass) {
        lines.push(`- ✅ Note deleted successfully`);
      } else {
        lines.push(`- ❌ Failed: ${res.status}`);
      }
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Delete note', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  } else {
    tests.push({ name: 'Delete note', pass: false, note: 'Skipped - no note ID' });
    lines.push(`- ⚠️  Skipped - no note ID`);
    lines.push('');
  }

  // ===== STEP 7: Verify Deletion =====
  lines.push('### Step 7: Verify Deletion');
  lines.push('');

  if (noteId) {
    try {
      const startTime = Date.now();
      const res = await fetch(`${BACKEND_BASE}/api/v1/contacts/${testContactId}/notes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const ms = Date.now() - startTime;
      const json = await res.json().catch(() => ({}));
      const notes = Array.isArray(json) ? json : json?.notes || [];
      const noteStillExists = notes.some(n => n.id === noteId);
      
      const pass = res.status === 200 && !noteStillExists;
      
      tests.push({
        name: 'Verify deletion',
        pass,
        status: res.status,
        ms,
        note_still_exists: noteStillExists,
      });
      
      if (pass) {
        lines.push(`- ✅ Deletion verified - note not in list`);
      } else {
        lines.push(`- ⚠️  Note still exists: ${noteStillExists}`);
      }
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Verify deletion', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  } else {
    tests.push({ name: 'Verify deletion', pass: false, note: 'Skipped - no note ID' });
    lines.push(`- ⚠️  Skipped - no note ID`);
    lines.push('');
  }

  // ===== STEP 8: Cleanup =====
  lines.push('### Step 8: Cleanup Test Data');
  lines.push('');

  try {
    if (testContactId) {
      await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${testContactId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      lines.push(`- ✅ Cleaned up test contact`);
    }
    lines.push('');
  } catch (e) {
    lines.push(`- ⚠️  Cleanup warning: ${e.message}`);
    lines.push('');
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push(`- **Contact**: Created and cleaned up`);
  lines.push(`- **Note Operations**: Create, Read, Update, Delete`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **All contact notes tests passed**');
  } else {
    lines.push('❌ **Some contact notes tests failed**');
  }

  lines.push('');
  lines.push('## Test Results');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(tests, null, 2));
  lines.push('```');

  await writeReport('e2e_contact_notes', lines, tests, exitCode);
}

main().then(() => process.exit(exitCode)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
