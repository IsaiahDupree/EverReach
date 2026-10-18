#!/usr/bin/env node
/**
 * Debug storage configuration and file upload
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://backend-vercel-mi779dy7d-isaiahduprees-projects.vercel.app';

console.log('🔍 Storage Debug Test');
console.log('API Base:', API_BASE);
console.log('===================\n');

async function main() {
  const token = await getAccessToken();
  
  // Create a test contact
  console.log('1️⃣ Creating test contact...');
  const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: 'Storage Test',
      emails: ['storage@test.com']
    })
  });
  
  const { contact } = await contactRes.json();
  console.log(`✅ Contact: ${contact.id}\n`);

  // Get upload URL
  console.log('2️⃣ Getting upload URL...');
  const path = `test-storage/${Date.now()}-test.txt`;
  const signRes = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path,
      contentType: 'text/plain'
    })
  });
  
  const signData = await signRes.json();
  console.log('Upload URL received');
  console.log('Path:', signData.path);
  console.log('URL domain:', new URL(signData.url).origin);
  console.log();

  // Upload file
  console.log('3️⃣ Uploading file...');
  const content = 'Test file content';
  const uploadRes = await fetch(signData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content
  });
  
  console.log('Upload status:', uploadRes.status);
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.log('Upload error:', errorText);
  } else {
    console.log('✅ File uploaded\n');
  }

  // Commit to database
  console.log('4️⃣ Committing to database...');
  const commitRes = await fetch(`${API_BASE}/api/files/commit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: signData.path,
      mime_type: 'text/plain',
      size_bytes: content.length,
      contact_id: contact.id
    })
  });
  
  if (!commitRes.ok) {
    console.log('Commit failed:', commitRes.status);
    const errorText = await commitRes.text();
    console.log('Error:', errorText);
    return;
  }
  
  const { attachment } = await commitRes.json();
  console.log('✅ Attachment ID:', attachment.id);
  console.log('   Path:', attachment.file_path);
  console.log();

  // Try to get signed URL
  console.log('5️⃣ Getting signed URL...');
  const urlRes = await fetch(`${API_BASE}/api/v1/attachments/${attachment.id}/url`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('Signed URL status:', urlRes.status);
  
  if (urlRes.ok) {
    const urlData = await urlRes.json();
    console.log('✅ Signed URL generated');
    console.log('   URL:', urlData.url.substring(0, 100) + '...');
    console.log('   Expires:', urlData.expires_at);
    
    // Try to access it
    console.log('\n6️⃣ Testing file access...');
    const accessRes = await fetch(urlData.url);
    console.log('Access status:', accessRes.status);
    
    if (accessRes.ok) {
      const accessedContent = await accessRes.text();
      if (accessedContent === content) {
        console.log('✅ File accessed and content matches!');
      } else {
        console.log('⚠️ Content mismatch');
        console.log('   Expected:', content);
        console.log('   Got:', accessedContent.substring(0, 100));
      }
    } else {
      const errorText = await accessRes.text();
      console.log('❌ Cannot access file');
      console.log('   Error:', errorText.substring(0, 200));
    }
  } else {
    const errorData = await urlRes.json();
    console.log('❌ Signed URL failed');
    console.log('Error:', JSON.stringify(errorData, null, 2));
  }

  // Cleanup
  console.log('\n7️⃣ Cleaning up...');
  await fetch(`${API_BASE}/api/v1/contacts/${contact.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Done');
}

main();
