#!/usr/bin/env node
/**
 * Diagnose failing tests and provide specific fix recommendations
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';
const BASE_URL = 'http://localhost:3000/api';

async function getAuthToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return { token: data.session.access_token, userId: data.user.id };
}

async function testEndpoint(name, method, path, token, body = null) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n🔬 Testing: ${name}`);
  console.log(`   ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://everreach.app',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      console.log(`   Body: ${JSON.stringify(body, null, 2).substring(0, 200)}...`);
    }

    const response = await fetch(url, options);
    const status = response.status;
    
    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {}
    
    console.log(`   Status: ${status}`);
    if (status >= 400) {
      console.log(`   ❌ Error: ${JSON.stringify(data?.error || data?.message || data, null, 2)}`);
    } else {
      console.log(`   ✅ Success`);
      if (data) {
        const preview = JSON.stringify(data, null, 2).substring(0, 300);
        console.log(`   Data preview: ${preview}...`);
      }
    }
    
    return { status, ok: status < 400, data };
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 Diagnosing Failing Tests                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('🔐 Authenticating...');
  const { token, userId } = await getAuthToken();
  console.log(`   ✅ Authenticated as: ${userId}`);

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Test 1: e2e-interactions Issues\n');
  
  // Create a contact first
  const contactResult = await testEndpoint(
    'Create Test Contact',
    'POST',
    '/v1/contacts',
    token,
    {
      display_name: 'Diagnosis Test Contact',
      emails: ['diagnosis@example.com'],
      tags: ['diagnosis_test'],
    }
  );
  
  const contactId = contactResult.data?.contact?.id;
  console.log(`\n   📌 Contact ID: ${contactId}`);
  
  if (contactId) {
    // Create an interaction
    const interactionResult = await testEndpoint(
      'Create Interaction',
      'POST',
      '/v1/interactions',
      token,
      {
        contact_id: contactId,
        kind: 'note',
        content: 'Test note',
        occurred_at: new Date().toISOString(),
      }
    );
    
    const interactionId = interactionResult.data?.interaction?.id;
    console.log(`\n   📌 Interaction ID: ${interactionId}`);
    
    // List interactions
    await testEndpoint('List All Interactions', 'GET', '/v1/interactions', token);
    
    // List interactions by contact
    if (contactId) {
      await testEndpoint(
        'List Interactions by Contact',
        'GET',
        `/v1/interactions?contact_id=${contactId}`,
        token
      );
    }
    
    // Update interaction
    if (interactionId) {
      await testEndpoint(
        'Update Interaction',
        'PATCH',
        `/v1/interactions/${interactionId}`,
        token,
        { content: 'Updated note' }
      );
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Test 2: e2e-user-system Issues\n');
  
  // Test persona notes
  const personaNoteResult = await testEndpoint(
    'Create Persona Note',
    'POST',
    '/v1/me/persona-notes',
    token,
    {
      content: 'Test persona note',
      tags: ['test'],
    }
  );
  
  await testEndpoint('List Persona Notes', 'GET', '/v1/me/persona-notes', token);
  
  // Test custom fields
  await testEndpoint('List Custom Fields', 'GET', '/v1/custom-fields', token);

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Test 3: agent-compose-prepare-send Issues\n');
  
  // Test agent compose endpoint
  if (contactId) {
    await testEndpoint(
      'Agent Smart Compose',
      'POST',
      '/v1/agent/compose/smart',
      token,
      {
        contact_id: contactId,
        goal_type: 'business',
        channel: 'email',
        tone: 'concise',
      }
    );
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Test 4: Agent Endpoints\n');
  
  if (contactId) {
    await testEndpoint(
      'Agent Analyze Contact',
      'POST',
      '/v1/agent/analyze',
      token,
      { contact_id: contactId }
    );
    
    await testEndpoint(
      'Agent Contact Details',
      'POST',
      '/v1/agent/contact/details',
      token,
      { contact_id: contactId }
    );
    
    await testEndpoint(
      'Agent Interactions Summary',
      'POST',
      '/v1/agent/interactions/summary',
      token,
      { contact_id: contactId }
    );
    
    await testEndpoint(
      'Agent Message Goals',
      'POST',
      '/v1/agent/goals/suggest',
      token,
      { contact_id: contactId }
    );
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Test 5: backend-tracking-events\n');
  
  await testEndpoint(
    'Track Event',
    'POST',
    '/v1/events/track',
    token,
    {
      event: 'test_event',
      properties: { test: true },
    }
  );

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 DIAGNOSIS COMPLETE\n');
  console.log('Check the output above for specific error messages and status codes.');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
