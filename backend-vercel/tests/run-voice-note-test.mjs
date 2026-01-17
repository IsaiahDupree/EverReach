/**
 * Standalone test runner for voice note interactions
 * Run with: node tests/run-voice-note-test.mjs
 */

const BASE_URL = process.env.TEST_BACKEND_URL || process.env.TEST_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';

// Test credentials
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

let authToken = '';
let testContactId = '';
let testNoteId = '';
let testInteractionId = '';

// Simple test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function log(message, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✓ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function error(message, data) {
  console.error(`\n${'!'.repeat(60)}`);
  console.error(`✗ ${message}`);
  if (data) {
    console.error(JSON.stringify(data, null, 2));
  }
}

// Setup: Authenticate using Supabase (matching api-smoke.test.mjs pattern)
async function authenticate() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    authToken = data.access_token;
    
    if (!authToken) {
      throw new Error('No access token in Supabase response');
    }
    
    log('Authenticated successfully', { email: TEST_EMAIL, method: 'Supabase' });
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Test 1: Create a contact
async function createTestContact() {
  const response = await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      display_name: 'Voice Test',
      emails: ['voice.test@example.com'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create contact: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  // API returns { contact: { id, ... } }
  testContactId = data.contact?.id || data.id;
  
  if (!testContactId) {
    console.error('Contact creation response:', JSON.stringify(data, null, 2));
    throw new Error('No contact ID in response');
  }
  
  log('Created test contact', { id: testContactId, name: 'Voice Test' });
}

// Test 2: Create voice note with contact link
async function createVoiceNote() {
  const response = await fetch(`${BASE_URL}/api/v1/me/persona-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: 'voice',
      title: 'Test Voice Note',
      transcript: 'This is a test voice note transcript for automated testing.',
      file_url: 'https://storage.example.com/test-voice-note.m4a',
      linked_contacts: [testContactId],
    }),
  });

  assert(response.ok, 'Failed to create voice note');
  
  const data = await response.json();
  testNoteId = data.id;
  
  assert(testNoteId, 'No note ID returned');
  log('Created voice note', { id: testNoteId, linked_to: testContactId });
}

// Test 3: Verify interaction was auto-created
async function verifyInteractionCreated() {
  // Wait a moment for the interaction to be created
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = await fetch(
    `${BASE_URL}/api/v1/interactions?contact_id=${testContactId}`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch interactions: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const interactions = data.items || data;
  
  assert(Array.isArray(interactions), 'Interactions should be an array');
  assert(interactions.length > 0, 'Should have at least one interaction');
  
  const noteInteraction = interactions.find(i => i.channel === 'note');
  assert(noteInteraction, 'Should find note-type interaction');
  
  testInteractionId = noteInteraction.id;
  
  log('Found auto-created interaction', {
    id: noteInteraction.id,
    channel: noteInteraction.channel,
    summary: noteInteraction.summary,
  });
  
  return noteInteraction;
}

// Test 4: Verify interaction metadata
async function verifyInteractionMetadata(interaction) {
  assert(interaction.metadata, 'Interaction should have metadata');
  assert(interaction.metadata.note_id === testNoteId, 'Metadata should include note_id');
  assert(interaction.metadata.note_type === 'voice', 'Metadata should include note_type=voice');
  assert(interaction.metadata.audio_url, 'Metadata should include audio_url');
  assert(
    interaction.metadata.audio_url === 'https://storage.example.com/test-voice-note.m4a',
    'audio_url should match file_url from voice note'
  );
  
  log('Verified interaction metadata', {
    note_id: interaction.metadata.note_id,
    note_type: interaction.metadata.note_type,
    audio_url: interaction.metadata.audio_url,
  });
}

// Test 5: Verify contact detail endpoint includes metadata
async function verifyContactDetailMetadata() {
  const response = await fetch(
    `${BASE_URL}/api/v1/contacts/${testContactId}/detail`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }
  );

  assert(response.ok, 'Failed to fetch contact detail');
  
  const data = await response.json();
  
  assert(data.interactions, 'Contact detail should include interactions');
  assert(data.interactions.recent, 'Contact detail should include recent interactions');
  assert(Array.isArray(data.interactions.recent), 'Recent interactions should be an array');
  
  const noteInteraction = data.interactions.recent.find(i => i.channel === 'note');
  assert(noteInteraction, 'Should find note interaction in contact detail');
  
  assert(noteInteraction.metadata, 'Interaction in contact detail should have metadata');
  assert(
    noteInteraction.metadata.note_id === testNoteId,
    'Contact detail metadata should include note_id'
  );
  assert(
    noteInteraction.metadata.audio_url,
    'Contact detail metadata should include audio_url'
  );
  
  log('Verified contact detail includes metadata', {
    total_interactions: data.interactions.recent.length,
    note_interaction_id: noteInteraction.id,
    has_audio_url: !!noteInteraction.metadata.audio_url,
  });
}

// Test 6: Create text note and verify
async function testTextNote() {
  const response = await fetch(`${BASE_URL}/api/v1/me/persona-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: 'text',
      title: 'Test Text Note',
      body_text: 'This is a test text note for automated testing.',
      linked_contacts: [testContactId],
    }),
  });

  assert(response.ok, 'Failed to create text note');
  
  const data = await response.json();
  log('Created text note', { id: data.id });
  
  // Wait and verify interaction
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const interactionsResponse = await fetch(
    `${BASE_URL}/api/v1/interactions?contact_id=${testContactId}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  const interactionsData = await interactionsResponse.json();
  const interactions = interactionsData.items || interactionsData;
  
  const textInteraction = interactions.find(
    i => i.channel === 'note' && i.metadata?.note_type === 'text'
  );
  
  assert(textInteraction, 'Should find text note interaction');
  assert(textInteraction.metadata.note_id === data.id, 'Text interaction should have note_id');
  
  log('Verified text note interaction', {
    id: textInteraction.id,
    note_type: textInteraction.metadata.note_type,
  });
}

// Cleanup: Delete test data
async function cleanup() {
  if (testContactId) {
    try {
      await fetch(`${BASE_URL}/api/v1/contacts/${testContactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      log('Cleaned up test contact', { id: testContactId });
    } catch (err) {
      error('Failed to clean up contact', err.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Voice Note Auto-Interaction Tests');
  console.log('Backend URL:', BASE_URL);
  console.log('='.repeat(60));
  
  try {
    // Setup
    await authenticate();
    await createTestContact();
    
    // Main tests
    await createVoiceNote();
    const interaction = await verifyInteractionCreated();
    await verifyInteractionMetadata(interaction);
    await verifyContactDetailMetadata();
    await testTextNote();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    
  } catch (err) {
    error('TEST FAILED', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run
runTests();
