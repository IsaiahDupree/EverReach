#!/usr/bin/env node
/**
 * Quick manual test for DELETE endpoints
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://backend-vercel-pk85egc8k-isaiahduprees-projects.vercel.app';

async function main() {
  console.log('🧪 Quick DELETE Test');
  console.log('API Base:', API_BASE);
  console.log('==================\n');

  const token = await getAccessToken();
  console.log('✅ Got auth token\n');

  // Test 1: Contact Note Delete
  console.log('📝 Test 1: Contact Note DELETE');
  console.log('-------------------------------');
  
  try {
    // Create contact
    console.log('Creating test contact...');
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'Delete Test',
        emails: ['deletetest@example.com']
      })
    });
    
    if (!contactRes.ok) {
      throw new Error(`Create contact failed: ${contactRes.status} ${await contactRes.text()}`);
    }
    
    const { contact } = await contactRes.json();
    console.log(`✅ Contact created: ${contact.id}`);

    // Create note
    console.log('Creating note...');
    const noteRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'This note will be deleted'
      })
    });
    
    if (!noteRes.ok) {
      throw new Error(`Create note failed: ${noteRes.status} ${await noteRes.text()}`);
    }
    
    const { note } = await noteRes.json();
    console.log(`✅ Note created: ${note.id}`);

    // Delete note
    console.log('Deleting note...');
    const deleteRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes/${note.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${deleteRes.status} ${await deleteRes.text()}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log(`✅ Note deleted: ${deleteData.id}`);
    
    // Verify 404
    console.log('Verifying deletion (expecting 404)...');
    const verifyRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/notes/${note.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (verifyRes.status === 404) {
      console.log('✅ Deletion verified (404)\n');
    } else {
      console.log(`⚠️ Expected 404, got ${verifyRes.status}\n`);
    }

    // Cleanup
    await fetch(`${API_BASE}/api/v1/contacts/${contact.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
  } catch (error) {
    console.error('❌ Contact note test failed:', error.message);
  }

  // Test 2: Persona Note Delete
  console.log('📔 Test 2: Persona Note DELETE');
  console.log('-------------------------------');
  
  try {
    // Create persona note
    console.log('Creating persona note...');
    const noteRes = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'text',
        title: 'Delete Test Note',
        body_text: 'Will be deleted',
        tags: ['test']
      })
    });
    
    if (!noteRes.ok) {
      throw new Error(`Create persona note failed: ${noteRes.status} ${await noteRes.text()}`);
    }
    
    const { note } = await noteRes.json();
    console.log(`✅ Persona note created: ${note.id}`);

    // Delete note
    console.log('Deleting persona note...');
    const deleteRes = await fetch(`${API_BASE}/api/v1/me/persona-notes/${note.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${deleteRes.status} ${await deleteRes.text()}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log(`✅ Persona note deleted: ${deleteData.id}`);
    
    // Verify 404
    console.log('Verifying deletion (expecting 404)...');
    const verifyRes = await fetch(`${API_BASE}/api/v1/me/persona-notes/${note.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (verifyRes.status === 404) {
      console.log('✅ Deletion verified (404)\n');
    } else {
      console.log(`⚠️ Expected 404, got ${verifyRes.status}\n`);
    }
    
  } catch (error) {
    console.error('❌ Persona note test failed:', error.message);
  }

  console.log('🎉 Tests complete!');
}

main();
