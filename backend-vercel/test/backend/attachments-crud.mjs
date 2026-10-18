/**
 * Attachments CRUD E2E Tests
 * Tests file attachment operations for contacts and persona notes
 */

import { getAccessToken, apiFetch, logSection, logOk, logFail, assert, writeReport, nowIso } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
const tests = [];
const reportLines = [];
const createdResources = {
  contacts: [],
  personaNotes: [],
  attachments: [],
};

// Helper: Track test results
function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

// Helper: Create contact
async function createContact(displayName) {
  const { res, json } = await apiFetch(API_BASE, '/api/v1/contacts', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ display_name: displayName }),
  });

  assert(res.status === 201, `createContact expected 201, got ${res.status}`);
  const id = json?.contact?.id;
  assert(id, 'createContact: missing contact id');
  createdResources.contacts.push(id);
  return id;
}

// Helper: Create persona note
async function createPersonaNote(title, bodyText) {
  const { res, json } = await apiFetch(API_BASE, '/api/v1/me/persona-notes', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ 
      type: 'text', 
      title, 
      body_text: bodyText,
      tags: ['test']
    }),
  });

  assert(res.status === 201, `createPersonaNote expected 201, got ${res.status}`);
  const id = json?.note?.id;
  assert(id, 'createPersonaNote: missing note id');
  createdResources.personaNotes.push(id);
  return id;
}

// Helper: Upload and get file path (simulated)
function generateTestFilePath(userId, filename) {
  return `${userId}/test/${filename}`;
}

// Helper: Clean up resources
async function cleanup() {
  logSection('Cleanup');

  // Delete persona notes (cascades to attachments)
  for (const noteId of createdResources.personaNotes) {
    try {
      await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}`, {
        method: 'DELETE',
        token: authToken,
      });
    } catch (err) {
      console.error(`Failed to delete persona note ${noteId}:`, err);
    }
  }

  // Delete contacts (cascades to attachments)
  for (const contactId of createdResources.contacts) {
    try {
      await apiFetch(API_BASE, `/api/v1/contacts/${contactId}`, {
        method: 'DELETE',
        token: authToken,
      });
    } catch (err) {
      console.error(`Failed to delete contact ${contactId}:`, err);
    }
  }

  logOk(`Cleaned up ${createdResources.personaNotes.length} persona notes, ${createdResources.contacts.length} contacts`);
}

// ============================================================================
// Test 1: Contact Attachments - Create (POST)
// ============================================================================
async function test1_ContactAttachments_Create() {
  logSection('Test 1: Contact Attachments - Create');

  const contactId = await createContact('Test Contact');
  const filePath = generateTestFilePath('user-123', 'document.pdf');

  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({
      path: filePath,
      mime_type: 'application/pdf',
      size_bytes: 5000,
    }),
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(json?.attachment?.id, 'Should return attachment id');
  assert(json?.attachment?.file_path === filePath, 'File path should match');
  
  createdResources.attachments.push(json.attachment.id);
  logOk(`Created attachment: ${json.attachment.id}`);

  return { contactId, attachmentId: json.attachment.id };
}

// ============================================================================
// Test 2: Contact Attachments - List (GET)
// ============================================================================
async function test2_ContactAttachments_List() {
  logSection('Test 2: Contact Attachments - List');

  const contactId = await createContact('Test Contact 2');
  const filePath1 = generateTestFilePath('user-123', 'file1.jpg');
  const filePath2 = generateTestFilePath('user-123', 'file2.png');

  // Create two attachments
  await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath1, mime_type: 'image/jpeg', size_bytes: 1000 }),
  });

  await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath2, mime_type: 'image/png', size_bytes: 2000 }),
  });

  // List attachments
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    token: authToken,
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(Array.isArray(json?.attachments), 'Should return attachments array');
  assert(json.attachments.length === 2, `Expected 2 attachments, got ${json.attachments.length}`);
  logOk(`Listed ${json.attachments.length} attachments`);
}

// ============================================================================
// Test 3: Contact Attachments - Delete
// ============================================================================
async function test3_ContactAttachments_Delete() {
  logSection('Test 3: Contact Attachments - Delete');

  const contactId = await createContact('Test Contact 3');
  const filePath = generateTestFilePath('user-123', 'delete-me.pdf');

  // Create attachment
  const { res: createRes, json: createJson } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath, mime_type: 'application/pdf', size_bytes: 3000 }),
  });

  const attachmentId = createJson.attachment.id;
  logOk(`Created attachment to delete: ${attachmentId}`);

  // Delete attachment
  const { res, json } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files?attachment_id=${attachmentId}`, {
    method: 'DELETE',
    token: authToken,
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(json?.success === true, 'Should return success: true');
  logOk('Attachment deleted successfully');

  // Verify it's gone
  const { res: listRes, json: listJson } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    token: authToken,
  });

  assert(listJson.attachments.length === 0, 'Should have no attachments after deletion');
  logOk('Verified attachment no longer in list');
}

// ============================================================================
// Test 4: Persona Note Attachments - Create (POST)
// ============================================================================
async function test4_PersonaNoteAttachments_Create() {
  logSection('Test 4: Persona Note Attachments - Create');

  const noteId = await createPersonaNote('Test Note', 'This is a test note');
  const filePath = generateTestFilePath('user-123', 'voice-note.mp3');

  const { res, json } = await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({
      path: filePath,
      mime_type: 'audio/mp3',
      size_bytes: 50000,
    }),
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(json?.attachment?.id, 'Should return attachment id');
  assert(json?.attachment?.file_path === filePath, 'File path should match');
  
  logOk(`Created attachment: ${json.attachment.id}`);
  return { noteId, attachmentId: json.attachment.id };
}

// ============================================================================
// Test 5: Persona Note Attachments - List (GET)
// ============================================================================
async function test5_PersonaNoteAttachments_List() {
  logSection('Test 5: Persona Note Attachments - List');

  const noteId = await createPersonaNote('Test Note 2', 'Another test note');
  const filePath1 = generateTestFilePath('user-123', 'audio1.mp3');
  const filePath2 = generateTestFilePath('user-123', 'image1.jpg');

  // Create two attachments
  await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath1, mime_type: 'audio/mp3', size_bytes: 10000 }),
  });

  await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath2, mime_type: 'image/jpeg', size_bytes: 5000 }),
  });

  // List attachments
  const { res, json } = await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    token: authToken,
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(Array.isArray(json?.attachments), 'Should return attachments array');
  assert(json.attachments.length === 2, `Expected 2 attachments, got ${json.attachments.length}`);
  logOk(`Listed ${json.attachments.length} attachments`);
}

// ============================================================================
// Test 6: Persona Note Attachments - Delete
// ============================================================================
async function test6_PersonaNoteAttachments_Delete() {
  logSection('Test 6: Persona Note Attachments - Delete');

  const noteId = await createPersonaNote('Test Note 3', 'Delete test note');
  const filePath = generateTestFilePath('user-123', 'temp-audio.mp3');

  // Create attachment
  const { res: createRes, json: createJson } = await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath, mime_type: 'audio/mp3', size_bytes: 8000 }),
  });

  const attachmentId = createJson.attachment.id;
  logOk(`Created attachment to delete: ${attachmentId}`);

  // Delete attachment
  const { res, json } = await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files?attachment_id=${attachmentId}`, {
    method: 'DELETE',
    token: authToken,
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(json?.success === true, 'Should return success: true');
  logOk('Attachment deleted successfully');

  // Verify it's gone
  const { res: listRes, json: listJson } = await apiFetch(API_BASE, `/api/v1/me/persona-notes/${noteId}/files`, {
    token: authToken,
  });

  assert(listJson.attachments.length === 0, 'Should have no attachments after deletion');
  logOk('Verified attachment no longer in list');
}

// ============================================================================
// Test 7: Security - User Isolation
// ============================================================================
async function test7_Security_UserIsolation() {
  logSection('Test 7: Security - User Isolation');

  const contactId = await createContact('Security Test Contact');
  const filePath = generateTestFilePath('user-123', 'private.pdf');

  // Create attachment
  const { res: createRes, json: createJson } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ path: filePath, mime_type: 'application/pdf', size_bytes: 4000 }),
  });

  const attachmentId = createJson.attachment.id;

  // Try to access without auth (should fail)
  const { res: unauthRes } = await apiFetch(API_BASE, `/api/v1/contacts/${contactId}/files`, {});

  assert(unauthRes.status === 401, `Unauth access should return 401, got ${unauthRes.status}`);
  logOk('Unauthorized access properly blocked');
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n🚀 Attachments CRUD E2E Tests');
  console.log(`API: ${API_BASE}\n`);

  reportLines.push('# E2E Test: Attachments CRUD', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');

  let passed = 0;
  let failed = 0;
  let exitCode = 0;

  try {
    authToken = await getAccessToken();
    logOk('Authenticated successfully');

    const testFunctions = [
      { name: 'Contact Attachments - Create', fn: test1_ContactAttachments_Create },
      { name: 'Contact Attachments - List', fn: test2_ContactAttachments_List },
      { name: 'Contact Attachments - Delete', fn: test3_ContactAttachments_Delete },
      { name: 'Persona Note Attachments - Create', fn: test4_PersonaNoteAttachments_Create },
      { name: 'Persona Note Attachments - List', fn: test5_PersonaNoteAttachments_List },
      { name: 'Persona Note Attachments - Delete', fn: test6_PersonaNoteAttachments_Delete },
      { name: 'Security - User Isolation', fn: test7_Security_UserIsolation },
    ];

    for (const { name, fn } of testFunctions) {
      try {
        const t0 = Date.now();
        await fn();
        const dt = Date.now() - t0;
        trackTest(name, true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest(name, false, dt, error.message);
        failed++;
        logFail(`${name} failed: ${error.message}`);
      }
    }

  } catch (error) {
    exitCode = 1;
    logFail(`Setup failed: ${error.message}`);
  } finally {
    // Always clean up
    await cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Tests Failed: ${failed}`);
    exitCode = 1;
  }
  console.log(`Total: ${passed + failed} tests`);
  console.log('='.repeat(60));

  await writeReport('attachments-crud', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
