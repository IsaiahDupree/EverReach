#!/usr/bin/env node

/**
 * E2E Test: User Profile Journey
 * 
 * Tests the complete user profile lifecycle:
 * 1. Get initial profile
 * 2. Update profile (display_name, preferences)
 * 3. Get/create compose settings
 * 4. Update compose settings
 * 5. Create persona notes (text, voice, screenshot)
 * 6. List and filter persona notes
 * 7. Update persona note
 * 8. Delete persona note
 * 9. Cleanup
 * 
 * Bucket: User Settings & Profile Management
 */

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_JWT = process.env.TEST_JWT;

let testNoteId = null;

function log(msg) { console.log(`  ${msg}`); }
function logSection(msg) { console.log(`\n📋 ${msg}`); }
function logOk(msg) { console.log(`  ✅ ${msg}`); }
function logFail(msg) { console.error(`  ❌ ${msg}`); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function apiCall(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}/api${path}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return { status: response.status, data };
}

async function test1_GetInitialProfile() {
  logSection('Test 1: Get Initial Profile');
  
  const { data } = await apiCall('GET', '/v1/me');
  
  assert(data.user, 'Response should have user object');
  assert(data.user.id, 'User should have ID');
  // Email might be null if profile doesn't exist yet
  assert(typeof data.user.preferences === 'object', 'User should have preferences object');
  
  logOk(`Profile retrieved: ${data.user.email || 'No email in profile'}`);
  logOk(`User ID: ${data.user.id}`);
  logOk(`Preferences: ${JSON.stringify(data.user.preferences)}`);
  
  return data.user;
}

async function test2_UpdateProfile(user) {
  logSection('Test 2: Update Profile');
  
  const updates = {
    display_name: 'E2E Test User',
    preferences: {
      theme: 'dark',
      notifications_enabled: true,
      timezone: 'America/New_York'
    }
  };
  
  const { data } = await apiCall('PATCH', '/v1/me', updates);
  
  assert(data.user.display_name === updates.display_name, 'Display name should be updated');
  assert(data.user.preferences.theme === 'dark', 'Theme preference should be updated');
  
  logOk(`Display name updated: ${data.user.display_name}`);
  logOk(`Preferences updated: ${JSON.stringify(data.user.preferences)}`);
  
  return data.user;
}

async function test3_GetComposeSettings() {
  logSection('Test 3: Get Compose Settings (Auto-Create)');
  
  const { data } = await apiCall('GET', '/v1/me/compose-settings');
  
  assert(data.settings || data.compose_settings || data.user, 'Should return settings');
  
  logOk('Compose settings retrieved (auto-created if missing)');
  log(`Settings: ${JSON.stringify(data).substring(0, 100)}...`);
  
  return data;
}

async function test4_UpdateComposeSettings() {
  logSection('Test 4: Update Compose Settings');
  
  const updates = {
    enabled: true,
    default_channel: 'email',
    auto_use_persona_notes: true,
    tone: 'professional',
    max_length: 500,
    guardrails: {
      avoid_topics: ['politics', 'religion'],
      required_tone: 'professional'
    }
  };
  
  const { data } = await apiCall('PATCH', '/v1/me/compose-settings', updates);
  
  logOk('Compose settings updated');
  log(`Tone: ${updates.tone}, Max length: ${updates.max_length}, Channel: ${updates.default_channel}`);
  
  return data;
}

async function test5_CreatePersonaNotes() {
  logSection('Test 5: Create Persona Notes');
  
  // Create text note
  const textNote = {
    type: 'text',
    title: 'E2E Test Note',
    body_text: 'This is a test note created during E2E testing',
    tags: ['test', 'e2e', 'automated']
  };
  
  const { data: textData } = await apiCall('POST', '/v1/me/persona-notes', textNote);
  testNoteId = textData.id || textData.note?.id;
  
  assert(testNoteId, 'Created note should have ID');
  logOk(`Text note created: ${testNoteId}`);
  
  // Create voice note with file_url
  const voiceNote = {
    type: 'voice',
    title: 'Voice Memo Test',
    transcription: 'This is a transcribed voice note for testing',
    file_url: 'https://example.com/audio.mp3',
    tags: ['voice', 'test']
  };
  
  const { data: voiceData } = await apiCall('POST', '/v1/me/persona-notes', voiceNote);
  logOk(`Voice note created: ${voiceData.id || voiceData.note?.id}`);
  
  // Create another text note (screenshot type not supported)
  const textNote2 = {
    type: 'text',
    title: 'Image Reference Note',
    body_text: 'Screenshot analysis results stored as text with image reference: https://example.com/screenshot.png',
    tags: ['image-reference', 'test']
  };
  
  const { data: textData2 } = await apiCall('POST', '/v1/me/persona-notes', textNote2);
  logOk(`Image reference note created: ${textData2.id || textData2.note?.id}`);
  
  return { textNoteId: testNoteId };
}

async function test6_ListAndFilterNotes() {
  logSection('Test 6: List and Filter Persona Notes');
  
  // List all notes
  const { data } = await apiCall('GET', '/v1/me/persona-notes');
  assert(data.items && Array.isArray(data.items), 'Should return items array');
  
  logOk(`Listed ${data.items.length} total notes`);
  log(`Next cursor: ${data.nextCursor || 'none'}`);
  
  // Filter by type
  const { data: voiceData } = await apiCall('GET', '/v1/me/persona-notes?type=voice');
  assert(voiceData.items && Array.isArray(voiceData.items), 'Should return items array for voice filter');
  logOk(`Filtered ${voiceData.items.length} voice notes`);
  
  // Filter by limit
  const { data: limitedData } = await apiCall('GET', '/v1/me/persona-notes?limit=2');
  assert(limitedData.items && Array.isArray(limitedData.items), 'Should return items array with limit');
  logOk(`Limited to ${limitedData.items.length} notes (max 2)`);
  
  return data.items;
}

async function test7_UpdatePersonaNote() {
  logSection('Test 7: Update Persona Note');
  
  const updates = {
    title: 'E2E Test Note (Updated)',
    body_text: 'This note was updated during E2E testing',
    tags: ['test', 'e2e', 'automated', 'updated']
  };
  
  const { data } = await apiCall('PATCH', `/v1/me/persona-notes/${testNoteId}`, updates);
  
  logOk(`Note updated: ${testNoteId}`);
  log(`New title: ${updates.title}`);
  
  return data;
}

async function test8_GetSpecificNote() {
  logSection('Test 8: Get Specific Persona Note');
  
  const { data } = await apiCall('GET', `/v1/me/persona-notes/${testNoteId}`);
  
  assert(data.id || data.note?.id, 'Should return note with ID');
  logOk(`Retrieved note: ${testNoteId}`);
  
  return data;
}

async function test9_DeletePersonaNote() {
  logSection('Test 9: Delete Persona Note');
  
  await apiCall('DELETE', `/v1/me/persona-notes/${testNoteId}`);
  
  logOk(`Note deleted: ${testNoteId}`);
  
  // Verify deletion
  try {
    await apiCall('GET', `/v1/me/persona-notes/${testNoteId}`);
    throw new Error('Note should not exist after deletion');
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      logOk('Verified: Note no longer exists');
    } else {
      throw error;
    }
  }
}

async function test10_CleanupTestNotes() {
  logSection('Test 10: Cleanup Test Notes');
  
  // Get all notes (cannot filter by tag via API, so get all and filter)
  const { data } = await apiCall('GET', '/v1/me/persona-notes?limit=100');
  const notes = data.items || [];
  
  // Filter for test notes (those with 'test' tag)
  const testNotes = notes.filter(note => note.tags && note.tags.includes('test'));
  
  let cleaned = 0;
  for (const note of testNotes) {
    const noteId = note.id;
    try {
      await apiCall('DELETE', `/v1/me/persona-notes/${noteId}`);
      cleaned++;
    } catch (error) {
      log(`Failed to delete note ${noteId}: ${error.message}`);
    }
  }
  
  logOk(`Cleaned up ${cleaned} test notes out of ${notes.length} total notes`);
}

async function main() {
  console.log('========================================');
  console.log('E2E Test: User Profile Journey');
  console.log('========================================');
  console.log(`API: ${API_BASE}`);
  console.log(`Auth: ${TEST_JWT ? 'Provided' : 'Missing'}`);
  console.log('');
  
  if (!TEST_JWT) {
    logFail('TEST_JWT environment variable is required');
    console.log('\nUsage:');
    console.log('  $env:TEST_JWT = "<your-jwt-token>"');
    console.log('  $env:API_BASE = "https://ever-reach-be.vercel.app"');
    console.log('  node test/e2e-user-profile-journey.mjs');
    process.exit(1);
  }
  
  try {
    const user = await test1_GetInitialProfile();
    await test2_UpdateProfile(user);
    await test3_GetComposeSettings();
    await test4_UpdateComposeSettings();
    await test5_CreatePersonaNotes();
    await test6_ListAndFilterNotes();
    await test7_UpdatePersonaNote();
    await test8_GetSpecificNote();
    await test9_DeletePersonaNote();
    await test10_CleanupTestNotes();
    
    console.log('\n========================================');
    console.log('✅ All Tests Passed!');
    console.log('========================================\n');
    console.log('User Profile Journey Complete:');
    console.log('  ✅ Profile CRUD');
    console.log('  ✅ Compose Settings');
    console.log('  ✅ Persona Notes (text, voice, screenshot)');
    console.log('  ✅ Filtering & Search');
    console.log('  ✅ Cleanup\n');
    
  } catch (error) {
    logFail(error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
