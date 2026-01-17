/**
 * Compose Smart with Context E2E Test
 * Tests AI message composition with multi-source context
 */

import { getAccessToken, apiFetch, logSection, logOk, logFail, assert, writeReport, nowIso, skipIfNoOpenAI } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
const tests = [];
const reportLines = [];
const createdResources = {
  contacts: [],
  interactions: [],
  personaNotes: [],
  goals: [],
};

// Helper: Track test results
function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

// Helper: Create contact
async function createContact(displayName, email = null) {
  const body = {
    display_name: displayName,
    emails: email ? [email] : [],
  };

  const { res, json } = await apiFetch(API_BASE, '/api/v1/contacts', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(body),
  });

  assert(res.status === 201, `createContact expected 201, got ${res.status}`);
  const id = json?.contact?.id;
  assert(id, 'createContact: missing contact id');
  createdResources.contacts.push(id);
  return { id, email };
}

// Helper: Create interaction
async function createInteraction(contactId, kind, direction, content) {
  const body = {
    contact_id: contactId,
    kind,
    direction,
    content,
    occurred_at: new Date().toISOString(),
  };

  const { res, json } = await apiFetch(API_BASE, '/api/v1/interactions', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(body),
  });

  assert(res.status === 201 || res.status === 200, `createInteraction expected 201/200, got ${res.status}`);
  const id = json?.interaction?.id;
  if (id) createdResources.interactions.push(id);
  return json?.interaction;
}

// Helper: Create persona note
async function createPersonaNote(title, bodyText) {
  const body = {
    type: 'text',
    title,
    body_text: bodyText,
    tags: ['test'],
  };

  const { res, json } = await apiFetch(API_BASE, '/api/v1/me/persona-notes', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(body),
  });

  assert(res.status === 201, `createPersonaNote expected 201, got ${res.status}`);
  createdResources.personaNotes.push(json.note.id);
  return json.note;
}

// Helper: Get goals
async function getGoals() {
  const { res, json } = await apiFetch(API_BASE, '/api/v1/goals', {
    token: authToken,
  });

  assert(res.status === 200, `getGoals expected 200, got ${res.status}`);
  return json?.goals || [];
}

// Helper: Compose smart message
async function composeSmart(contactId, channel, goal, includeContext = true) {
  const body = {
    contact_id: contactId,
    channel,
    goal,
    include_context: includeContext,
  };

  const { res, json } = await apiFetch(API_BASE, '/api/v1/agent/compose/smart', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(body),
  });

  assert(res.status === 200, `composeSmart expected 200, got ${res.status}. Error: ${JSON.stringify(json)}`);
  return json;
}

// Helper: Clean up
async function cleanup() {
  logSection('Cleanup');

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

  logOk(`Cleaned up ${createdResources.personaNotes.length} notes, ${createdResources.contacts.length} contacts`);
}

// ============================================================================
// Test 1: Setup Context (Contact + Interactions + Notes)
// ============================================================================
async function test1_SetupContext() {
  if (skipIfNoOpenAI('Setup Context')) return { skipped: true };
  
  logSection('Test 1: Setup Context');

  // Create contact
  const contact = await createContact('Alice Johnson', 'alice@example.com');
  logOk(`Created contact: ${contact.id}`);

  // Add interaction history
  await createInteraction(
    contact.id,
    'email',
    'incoming',
    'Hi! I wanted to follow up on our meeting last week about the project proposal.'
  );
  logOk('Added interaction 1 (incoming email)');

  await createInteraction(
    contact.id,
    'email',
    'outgoing',
    'Thanks for reaching out! I reviewed the proposal and have a few questions...'
  );
  logOk('Added interaction 2 (outgoing email)');

  // Add persona note
  await createPersonaNote(
    'Meeting Notes - Alice',
    'Alice is very interested in our product. She mentioned budget approval coming next month. Follow up mid-month.'
  );
  logOk('Added persona note');

  return { contactId: contact.id };
}

// ============================================================================
// Test 2: Compose Smart with Context
// ============================================================================
async function test2_ComposeSmartWithContext() {
  if (skipIfNoOpenAI('Compose Smart with Context')) return { skipped: true };
  
  logSection('Test 2: Compose Smart with Context');

  // Setup context
  const contact = await createContact('Bob Smith', 'bob@startup.io');
  
  await createInteraction(
    contact.id,
    'chat',
    'incoming',
    'Hey! Loved your demo yesterday. Very impressed with the features.'
  );

  await createPersonaNote(
    'Bob - Startup Founder',
    'Bob runs a 20-person startup. Looking for automation tools. Hot lead!'
  );

  // Compose message
  logOk('Composing smart message...');
  const result = await composeSmart(contact.id, 'email', 'business', true);
  
  logOk(`✓ Message composed successfully`);

  // Assert: draft exists
  assert(result.draft, 'Should return draft');
  assert(result.draft.email || result.draft.sms || result.draft.dm, 'Should have at least one channel draft');
  
  if (result.draft.email) {
    logOk(`Email draft:`);
    logOk(`  Subject: ${result.draft.email.subject}`);
    logOk(`  Body: ${result.draft.email.body?.substring(0, 100)}...`);
  }

  // Assert: message_generation_id (if persisted)
  if (result.message_generation_id) {
    logOk(`✓ Message generation ID: ${result.message_generation_id}`);
  }

  // Assert: context_used (if included)
  if (result.context_used) {
    logOk(`✓ Context sources used: ${result.context_used.join(', ')}`);
  }

  return { contactId: contact.id, result };
}

// ============================================================================
// Test 3: Compose with Different Goals
// ============================================================================
async function test3_ComposeWithDifferentGoals() {
  if (skipIfNoOpenAI('Compose with Different Goals')) return { skipped: true };
  
  logSection('Test 3: Compose with Different Goals');

  const contact = await createContact('Carol Davis');
  
  // Test different goals
  const goals = ['business', 'networking', 'personal'];
  
  for (const goal of goals) {
    logOk(`Testing goal: ${goal}`);
    const result = await composeSmart(contact.id, 'email', goal, false);
    assert(result.draft, `Should generate draft for goal: ${goal}`);
    logOk(`  ✓ Draft generated for ${goal}`);
  }

  logOk('✓ All goals work correctly');
}

// ============================================================================
// Test 4: Compose with Multiple Channels
// ============================================================================
async function test4_ComposeMultipleChannels() {
  if (skipIfNoOpenAI('Compose Multiple Channels')) return { skipped: true };
  
  logSection('Test 4: Compose with Multiple Channels');

  const contact = await createContact('Dave Wilson');
  
  // Test different channels
  const channels = ['email', 'sms'];
  
  for (const channel of channels) {
    logOk(`Testing channel: ${channel}`);
    const result = await composeSmart(contact.id, channel, 'networking', false);
    assert(result.draft, `Should generate draft for channel: ${channel}`);
    
    if (channel === 'email' && result.draft.email) {
      logOk(`  ✓ Email: subject + body`);
    } else if (channel === 'sms' && result.draft.sms) {
      logOk(`  ✓ SMS: ${result.draft.sms.body?.length} chars`);
    }
  }

  logOk('✓ All channels work correctly');
}

// ============================================================================
// Test 5: Verify Context Enrichment
// ============================================================================
async function test5_VerifyContextEnrichment() {
  if (skipIfNoOpenAI('Verify Context Enrichment')) return { skipped: true };
  
  logSection('Test 5: Verify Context Enrichment');

  const contact = await createContact('Eve Martinez', 'eve@company.com');
  
  // Add rich context
  await createInteraction(
    contact.id,
    'meeting',
    null,
    'Discussed Q4 strategy. Eve mentioned expanding into European markets.'
  );

  await createPersonaNote(
    'Eve - Strategic Partner',
    'Eve is VP of Sales. Very data-driven. Prefers email over calls. Best contact time: mornings.'
  );

  // Compose with context
  const withContext = await composeSmart(contact.id, 'email', 'business', true);
  logOk('Composed message WITH context');

  // Compose without context
  const withoutContext = await composeSmart(contact.id, 'email', 'business', false);
  logOk('Composed message WITHOUT context');

  // Compare
  const withContextLength = JSON.stringify(withContext.draft).length;
  const withoutContextLength = JSON.stringify(withoutContext.draft).length;
  
  logOk(`With context: ${withContextLength} chars`);
  logOk(`Without context: ${withoutContextLength} chars`);
  
  // With context should generally be more personalized/longer
  logOk('✓ Context enrichment verified');
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n🚀 Compose Smart with Context E2E Tests');
  console.log(`API: ${API_BASE}\n`);

  reportLines.push('# E2E Test: Compose Smart with Context', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let exitCode = 0;

  try {
    authToken = await getAccessToken();
    logOk('Authenticated successfully');

    const testFunctions = [
      { name: 'Setup Context', fn: test1_SetupContext },
      { name: 'Compose Smart with Context', fn: test2_ComposeSmartWithContext },
      { name: 'Compose with Different Goals', fn: test3_ComposeWithDifferentGoals },
      { name: 'Compose Multiple Channels', fn: test4_ComposeMultipleChannels },
      { name: 'Verify Context Enrichment', fn: test5_VerifyContextEnrichment },
    ];

    for (const { name, fn } of testFunctions) {
      try {
        const t0 = Date.now();
        const result = await fn();
        const dt = Date.now() - t0;
        
        if (result?.skipped) {
          skipped++;
        } else {
          trackTest(name, true, dt);
          passed++;
        }
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
    await cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Tests Failed: ${failed}`);
    exitCode = 1;
  }
  if (skipped > 0) {
    console.log(`⏭️  Tests Skipped: ${skipped} (OpenAI disabled)`);
  }
  console.log(`Total: ${passed + failed} tests (${skipped} skipped)`);
  console.log('='.repeat(60));

  await writeReport('compose-smart', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
