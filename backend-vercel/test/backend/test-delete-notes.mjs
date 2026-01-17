#!/usr/bin/env node
/**
 * Test DELETE endpoints for Contact Notes and Persona Notes
 * 
 * Usage: node test-delete-notes.mjs
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function getTestToken() {
  return await getAccessToken();
}

async function testDeleteContactNote() {
  console.log('\n📝 Testing Contact Note DELETE...\n');

  const token = await getTestToken();
  
  try {
    // Step 1: Create a test contact
    console.log('1️⃣ Creating test contact...');
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'Delete Test Contact',
        emails: ['deletetest@example.com']
      })
    });
    
    if (!contactRes.ok) {
      const error = await contactRes.text();
      throw new Error(`Failed to create contact: ${error}`);
    }
    
    const { contact } = await contactRes.json();
    console.log(`✅ Contact created: ${contact.id}`);

    // Step 2: Create a note
    console.log('\n2️⃣ Creating note...');
    const noteRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'This is a test note that will be deleted',
        metadata: { test: true }
      })
    });
    
    if (!noteRes.ok) {
      const error = await noteRes.text();
      throw new Error(`Failed to create note: ${error}`);
    }
    
    const { note } = await noteRes.json();
    console.log(`✅ Note created: ${note.id}`);

    // Step 3: Delete the note
    console.log('\n3️⃣ Deleting note...');
    const deleteRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes/${note.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!deleteRes.ok) {
      const error = await deleteRes.text();
      throw new Error(`Failed to delete note: ${error}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log(`✅ Note deleted: ${deleteData.id}`);

    // Step 4: Verify deletion
    console.log('\n4️⃣ Verifying deletion...');
    const verifyRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes/${note.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyRes.status === 404) {
      console.log('✅ Note successfully deleted (404 confirmed)');
    } else {
      console.log(`⚠️ Expected 404, got ${verifyRes.status}`);
    }

    // Cleanup: Delete test contact
    console.log('\n5️⃣ Cleaning up test contact...');
    await fetch(`${API_BASE}/api/v1/contacts/${contact.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Test contact cleaned up');

    return { success: true };
  } catch (error) {
    console.error('❌ Contact Note DELETE test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDeletePersonaNote() {
  console.log('\n📔 Testing Persona Note DELETE...\n');

  const token = await getTestToken();
  
  try {
    // Step 1: Create a persona note
    console.log('1️⃣ Creating persona note...');
    const noteRes = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'text',
        title: 'Delete Test Persona Note',
        body_text: 'This note will be deleted',
        tags: ['test', 'delete']
      })
    });
    
    if (!noteRes.ok) {
      const error = await noteRes.text();
      throw new Error(`Failed to create persona note: ${error}`);
    }
    
    const { note } = await noteRes.json();
    console.log(`✅ Persona note created: ${note.id}`);

    // Step 2: Delete the note
    console.log('\n2️⃣ Deleting persona note...');
    const deleteRes = await fetch(`${API_BASE}/api/v1/me/persona-notes/${note.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!deleteRes.ok) {
      const error = await deleteRes.text();
      throw new Error(`Failed to delete persona note: ${error}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log(`✅ Persona note deleted: ${deleteData.id}`);

    // Step 3: Verify deletion
    console.log('\n3️⃣ Verifying deletion...');
    const verifyRes = await fetch(`${API_BASE}/api/v1/me/persona-notes/${note.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyRes.status === 404) {
      console.log('✅ Persona note successfully deleted (404 confirmed)');
    } else {
      console.log(`⚠️ Expected 404, got ${verifyRes.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Persona Note DELETE test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Testing DELETE endpoints for notes');
  console.log('=====================================');
  
  const results = {
    contactNote: await testDeleteContactNote(),
    personaNote: await testDeletePersonaNote()
  };

  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Contact Note DELETE: ${results.contactNote.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Persona Note DELETE: ${results.personaNote.success ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = results.contactNote.success && results.personaNote.success;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

main();
