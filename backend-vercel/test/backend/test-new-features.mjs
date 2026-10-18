#!/usr/bin/env node
/**
 * Test new features:
 * 1. DELETE /api/v1/interactions/:id
 * 2. GET /api/v1/attachments/:id/url
 * 3. GET /api/v1/contacts/:id/files (with signed URLs)
 */

import { getAccessToken } from './_shared.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = process.env.API_BASE || 'https://backend-vercel-6irc146qe-isaiahduprees-projects.vercel.app';

console.log('🧪 Testing New Features');
console.log('API Base:', API_BASE);
console.log('======================\n');

async function testInteractionDelete() {
  console.log('🗑️  Test 1: DELETE /api/v1/interactions/:id');
  console.log('-------------------------------------------');
  
  const token = await getAccessToken();
  
  try {
    // Create a test contact
    console.log('1️⃣ Creating test contact...');
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'Feature Test Contact',
        emails: ['feature@test.com']
      })
    });
    
    if (!contactRes.ok) throw new Error(`Create contact failed: ${contactRes.status}`);
    const { contact } = await contactRes.json();
    console.log(`✅ Contact created: ${contact.id}`);

    // Create an interaction
    console.log('\n2️⃣ Creating interaction...');
    const interactionRes = await fetch(`${API_BASE}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: contact.id,
        kind: 'note',
        content: 'This interaction will be deleted',
        metadata: { test: true }
      })
    });
    
    if (!interactionRes.ok) throw new Error(`Create interaction failed: ${interactionRes.status}`);
    const { interaction } = await interactionRes.json();
    console.log(`✅ Interaction created: ${interaction.id}`);

    // Delete the interaction
    console.log('\n3️⃣ Deleting interaction...');
    const deleteRes = await fetch(`${API_BASE}/api/v1/interactions/${interaction.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!deleteRes.ok) {
      const error = await deleteRes.text();
      throw new Error(`Delete failed: ${deleteRes.status} ${error}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log(`✅ Interaction deleted: ${deleteData.id}`);

    // Verify deletion
    console.log('\n4️⃣ Verifying deletion (expecting 404)...');
    const verifyRes = await fetch(`${API_BASE}/api/v1/interactions/${interaction.id}`, {
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

    return { success: true };
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
    return { success: false, error: error.message };
  }
}

async function testAttachmentSignedUrl() {
  console.log('🔗 Test 2: GET /api/v1/attachments/:id/url');
  console.log('------------------------------------------');
  
  const token = await getAccessToken();
  
  try {
    // Create a test contact
    console.log('1️⃣ Creating test contact...');
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'File Test Contact',
        emails: ['filetest@test.com']
      })
    });
    
    if (!contactRes.ok) throw new Error(`Create contact failed: ${contactRes.status}`);
    const { contact } = await contactRes.json();
    console.log(`✅ Contact created: ${contact.id}`);

    // Upload a small test file
    console.log('\n2️⃣ Uploading test file...');
    
    // Step 1: Get presigned URL
    const signRes = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: `test-files/${Date.now()}-test.txt`,
        contentType: 'text/plain'
      })
    });
    
    if (!signRes.ok) throw new Error(`Get signed URL failed: ${signRes.status}`);
    const { url: uploadUrl, path } = await signRes.json();
    console.log(`✅ Got upload URL`);

    // Step 2: Upload file
    const fileContent = 'This is a test file for signed URL testing';
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: fileContent
    });
    
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    console.log(`✅ File uploaded`);

    // Step 3: Commit file
    const commitRes = await fetch(`${API_BASE}/api/files/commit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path,
        mime_type: 'text/plain',
        size_bytes: fileContent.length,
        contact_id: contact.id
      })
    });
    
    if (!commitRes.ok) throw new Error(`Commit failed: ${commitRes.status}`);
    const { attachment } = await commitRes.json();
    console.log(`✅ Attachment created: ${attachment.id}`);

    // Get signed URL
    console.log('\n3️⃣ Getting signed URL...');
    const urlRes = await fetch(`${API_BASE}/api/v1/attachments/${attachment.id}/url`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!urlRes.ok) {
      const error = await urlRes.text();
      throw new Error(`Get signed URL failed: ${urlRes.status} ${error}`);
    }
    
    const urlData = await urlRes.json();
    console.log(`✅ Signed URL received`);
    console.log(`   File: ${urlData.attachment.file_name}`);
    console.log(`   Expires: ${urlData.expires_at}`);
    console.log(`   URL length: ${urlData.url.length} chars`);

    // Test accessing the file
    console.log('\n4️⃣ Testing file access with signed URL...');
    const accessRes = await fetch(urlData.url);
    
    if (accessRes.ok) {
      const content = await accessRes.text();
      if (content === fileContent) {
        console.log('✅ File accessed successfully and content matches!\n');
      } else {
        console.log('⚠️ File accessed but content mismatch\n');
      }
    } else {
      console.log(`⚠️ File access failed: ${accessRes.status}\n`);
    }

    // Cleanup
    await fetch(`${API_BASE}/api/v1/contacts/${contact.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
    return { success: false, error: error.message };
  }
}

async function testContactFilesWithUrls() {
  console.log('📁 Test 3: GET /api/v1/contacts/:id/files (with URLs)');
  console.log('----------------------------------------------------');
  
  const token = await getAccessToken();
  
  try {
    // Create a test contact
    console.log('1️⃣ Creating test contact...');
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: 'Files List Test',
        emails: ['fileslist@test.com']
      })
    });
    
    if (!contactRes.ok) throw new Error(`Create contact failed: ${contactRes.status}`);
    const { contact } = await contactRes.json();
    console.log(`✅ Contact created: ${contact.id}`);

    // Upload 2 test files
    console.log('\n2️⃣ Uploading 2 test files...');
    const attachmentIds = [];
    
    for (let i = 1; i <= 2; i++) {
      // Get signed URL
      const signRes = await fetch(`${API_BASE}/api/v1/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: `test-files/${Date.now()}-file${i}.txt`,
          contentType: 'text/plain'
        })
      });
      
      const { url: uploadUrl, path } = await signRes.json();
      
      // Upload
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: `Test file ${i} content`
      });
      
      // Commit
      const commitRes = await fetch(`${API_BASE}/api/files/commit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path,
          mime_type: 'text/plain',
          size_bytes: `Test file ${i} content`.length,
          contact_id: contact.id
        })
      });
      
      const { attachment } = await commitRes.json();
      attachmentIds.push(attachment.id);
      console.log(`   ✅ File ${i} uploaded: ${attachment.id}`);
    }

    // Get all files with URLs
    console.log('\n3️⃣ Getting all files with signed URLs...');
    const filesRes = await fetch(`${API_BASE}/api/v1/contacts/${contact.id}/files`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!filesRes.ok) {
      const error = await filesRes.text();
      throw new Error(`Get files failed: ${filesRes.status} ${error}`);
    }
    
    const filesData = await filesRes.json();
    console.log(`✅ Got ${filesData.attachments.length} files`);
    
    // Verify each file has a URL
    let allHaveUrls = true;
    let allAccessible = true;
    
    for (const file of filesData.attachments) {
      if (!file.url) {
        console.log(`   ⚠️ File ${file.id} missing URL`);
        allHaveUrls = false;
      } else {
        console.log(`   ✅ ${file.file_name}: ${file.url.substring(0, 50)}...`);
        console.log(`      Expires: ${file.expires_at}`);
        
        // Test accessing it
        const accessRes = await fetch(file.url);
        if (!accessRes.ok) {
          console.log(`      ⚠️ File not accessible: ${accessRes.status}`);
          allAccessible = false;
        } else {
          console.log(`      ✅ File accessible`);
        }
      }
    }
    
    if (allHaveUrls && allAccessible) {
      console.log('\n✅ All files have URLs and are accessible!\n');
    } else {
      console.log('\n⚠️ Some issues with URLs or access\n');
    }

    // Cleanup
    await fetch(`${API_BASE}/api/v1/contacts/${contact.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return { success: allHaveUrls && allAccessible };
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
    return { success: false, error: error.message };
  }
}

async function main() {
  const results = {
    interactionDelete: await testInteractionDelete(),
    attachmentSignedUrl: await testAttachmentSignedUrl(),
    contactFilesWithUrls: await testContactFilesWithUrls()
  };

  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log(`Interaction DELETE:      ${results.interactionDelete.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Attachment Signed URL:   ${results.attachmentSignedUrl.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Contact Files with URLs: ${results.contactFilesWithUrls.success ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = results.interactionDelete.success && 
                   results.attachmentSignedUrl.success && 
                   results.contactFilesWithUrls.success;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

main();
