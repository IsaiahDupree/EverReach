#!/usr/bin/env node
/**
 * Comprehensive test for latest endpoints
 * - Warmth score recompute (before/after)
 * - DELETE interactions
 * - DELETE notes
 * - Attachment signed URLs
 * - Contact files with URLs
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

console.log('🧪 Latest Endpoints Comprehensive Test');
console.log('API Base:', API_BASE);
console.log('==========================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const token = await getAccessToken();
  
  // ============================================
  // 1. WARMTH SCORE RECOMPUTE TEST
  // ============================================
  console.log('📊 TEST 1: Warmth Score Recompute');
  console.log('------------------------------------------');
  
  // Create a test contact
  console.log('1️⃣ Creating test contact...');
  const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: 'Warmth Test Contact',
      primary_email: `warmth-test-${Date.now()}@example.com`
    })
  });
  
  if (!contactRes.ok) {
    const error = await contactRes.text();
    throw new Error(`Failed to create contact: ${contactRes.status} - ${error}`);
  }
  
  const contact = await contactRes.json();
  const contactId = contact.id || contact.contact?.id;
  
  if (!contactId) {
    console.error('Contact response:', JSON.stringify(contact, null, 2));
    throw new Error('No contact ID in response');
  }
  
  console.log(`✅ Contact created: ${contactId}`);
  console.log(`   Initial warmth: ${contact.warmth || contact.contact?.warmth || 'null'}`);
  
  // Add some interactions to affect warmth
  console.log('\n2️⃣ Adding interactions...');
  const interactionIds = [];
  
  for (let i = 0; i < 3; i++) {
    const interRes = await fetch(`${API_BASE}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: contactId,
        kind: 'email',
        direction: 'outbound',
        occurred_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(), // Spread over 3 days
        summary: `Test interaction ${i + 1}`
      })
    });
    
    if (!interRes.ok) {
      const error = await interRes.text();
      console.error(`Failed to create interaction: ${error}`);
      continue;
    }
    
    const interaction = await interRes.json();
    const interId = interaction.id || interaction.interaction?.id;
    if (interId) {
      interactionIds.push(interId);
    }
  }
  console.log(`✅ Added ${interactionIds.length} interactions`);
  
  // Get warmth BEFORE recompute
  console.log('\n3️⃣ Getting warmth score BEFORE recompute...');
  const beforeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const before = await beforeRes.json();
  const beforeContact = before.contact || before;
  console.log(`   Warmth BEFORE: ${beforeContact.warmth || 'null'}`);
  console.log(`   Warmth band BEFORE: ${beforeContact.warmth_band || 'null'}`);
  console.log(`   Last interaction: ${beforeContact.last_interaction_at || 'null'}`);
  
  // Recompute warmth
  console.log('\n4️⃣ Recomputing warmth score...');
  const recomputeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  let recomputeData = {};
  if (!recomputeRes.ok) {
    try {
      const errorData = await recomputeRes.json();
      console.log(`   ❌ Recompute failed: ${recomputeRes.status}`);
      console.log(`   Error: ${JSON.stringify(errorData).substring(0, 200)}`);
      recomputeData = errorData;
    } catch (e) {
      console.log(`   ❌ Recompute failed: ${recomputeRes.status} (parse error)`);
    }
  } else {
    recomputeData = await recomputeRes.json();
    console.log(`   Recompute status: ${recomputeRes.status}`);
    console.log(`   New warmth: ${recomputeData.warmth_score || recomputeData.contact?.warmth}`);
  }
  
  // Get warmth AFTER recompute
  console.log('\n5️⃣ Getting warmth score AFTER recompute...');
  const afterRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const after = await afterRes.json();
  const afterContact = after.contact || after;
  console.log(`   Warmth AFTER: ${afterContact.warmth || 'null'}`);  
  console.log(`   Warmth band AFTER: ${afterContact.warmth_band || 'null'}`);  
  
  // Show comparison
  const warmthChange = (afterContact.warmth || 0) - (beforeContact.warmth || 0);
  console.log('\n📈 WARMTH SCORE CHANGE (INCREASE):');
  console.log(`   Before: ${beforeContact.warmth || 0}`);
  console.log(`   After:  ${afterContact.warmth || 0}`);
  console.log(`   Change: ${warmthChange > 0 ? '+' : ''}${warmthChange}`);
  console.log(`   Band:   ${beforeContact.warmth_band || 'none'} → ${afterContact.warmth_band || 'none'}`);
  
  const warmthIncreased = warmthChange > 0;
  console.log(`   ${warmthIncreased ? '✅' : '❌'} Warmth increased: ${warmthIncreased ? 'PASS' : 'FAIL'}`);
  
  // ============================================
  // TEST WARMTH DECREASE (Simulate time passing without deleting interactions)
  // ============================================
  console.log('\n6️⃣ Testing warmth DECREASE by simulating time passing...');
  // Use time-travel header to simulate now+60 days without modifying interactions
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const simulatedNow = new Date(Date.now() + sixtyDaysMs).toISOString();
  console.log(`   Simulated current time → ${simulatedNow}`);
  
  // Recompute warmth (should be lower due to time decay)
  console.log('\n7️⃣ Recomputing warmth with simulated future now...');
  const recompute2Res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-allow-test': 'true',
      'x-warmth-now': simulatedNow
    }
  });
  
  let recompute2Data = {};
  if (!recompute2Res.ok) {
    try {
      const errorData = await recompute2Res.json();
      console.log(`   ❌ Recompute failed: ${recompute2Res.status}`);
      console.log(`   Error: ${JSON.stringify(errorData).substring(0, 200)}`);
    } catch (e) {
      console.log(`   ❌ Recompute failed: ${recompute2Res.status} (parse error)`);
    }
  } else {
    recompute2Data = await recompute2Res.json();
    console.log(`   Recompute status: ${recompute2Res.status}`);
    console.log(`   New warmth: ${recompute2Data.warmth_score || recompute2Data.contact?.warmth}`);
  }
  
  // Get final warmth score
  console.log('\n8️⃣ Getting final warmth score...');
  const finalRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const final = await finalRes.json();
  const finalContact = final.contact || final;
  console.log(`   Final warmth: ${finalContact.warmth || 'null'}`);
  console.log(`   Final band: ${finalContact.warmth_band || 'null'}`);
  
  const warmthDecreaseChange = (finalContact.warmth || 0) - (afterContact.warmth || 0);
  console.log('\n📉 WARMTH SCORE CHANGE (DECREASE):');
  console.log(`   After first recompute: ${afterContact.warmth || 0}`);
  console.log(`   After simulating 60 days without contact: ${finalContact.warmth || 0}`);
  console.log(`   Change: ${warmthDecreaseChange > 0 ? '+' : ''}${warmthDecreaseChange}`);
  console.log(`   Band: ${afterContact.warmth_band || 'none'} → ${finalContact.warmth_band || 'none'}`);
  
  const warmthDecreased = warmthDecreaseChange < 0;
  console.log(`   ${warmthDecreased ? '✅' : '❌'} Warmth decreased: ${warmthDecreased ? 'PASS' : 'FAIL'}`);
  
  const warmthTest = recomputeRes.status === 200 && 
                     afterContact.warmth != null && 
                     warmthIncreased &&
                     recompute2Res.status === 200 &&
                     warmthDecreased;
  console.log(`\n${warmthTest ? '✅' : '❌'} Warmth Recompute (Increase & Decrease): ${warmthTest ? 'PASS' : 'FAIL'}`);
  
  // ============================================
  // 2. DELETE INTERACTION TEST
  // ============================================
  console.log('\n\n📝 TEST 2: Delete Interaction');
  console.log('------------------------------------------');
  
  // Create a new interaction to test deletion
  console.log('1️⃣ Creating interaction to delete...');
  const newInterRes = await fetch(`${API_BASE}/api/v1/interactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_id: contactId,
      kind: 'email',
      direction: 'outbound',
      occurred_at: new Date().toISOString(),
      summary: 'Test interaction for deletion'
    })
  });
  
  const newInter = await newInterRes.json();
  const newInterId = newInter.id || newInter.interaction?.id;
  console.log(`   Created interaction: ${newInterId}`);
  
  // Delete it
  console.log('\n2️⃣ Deleting interaction...');
  const deleteInterRes = await fetch(`${API_BASE}/api/v1/interactions/${newInterId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const deleteInterData = await deleteInterRes.json();
  console.log(`   Delete status: ${deleteInterRes.status}`);
  console.log(`   Deleted: ${deleteInterData.deleted}`);
  console.log(`   ID: ${deleteInterData.id}`);
  
  // Verify it's gone
  console.log('\n3️⃣ Verifying deletion...');
  const verifyInterRes = await fetch(`${API_BASE}/api/v1/interactions?contact_id=${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const interactionsData = await verifyInterRes.json();
  const interactions = Array.isArray(interactionsData) ? interactionsData : (interactionsData.interactions || []);
  const stillExists = interactions.some(i => i.id === newInterId);
  console.log(`   Interaction still exists: ${stillExists ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`   Remaining interactions: ${interactions.length}`);
  
  const deleteInterTest = newInterRes.ok && deleteInterRes.status === 200 && !stillExists;
  console.log(`\n${deleteInterTest ? '✅' : '❌'} Delete Interaction: ${deleteInterTest ? 'PASS' : 'FAIL'}`);
  
  // ============================================
  // 3. CONTACT NOTES (CREATE, GET, DELETE)
  // ============================================
  console.log('\n\n📔 TEST 3: Contact Notes CRUD');
  console.log('------------------------------------------');
  
  // Create a note
  console.log('1️⃣ Creating contact note...');
  const createNoteRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'This is a test note for deletion',
      metadata: { type: 'general' }
    })
  });
  
  let note = {};
  if (!createNoteRes.ok) {
    try {
      const errorData = await createNoteRes.json();
      console.log(`   ❌ Note creation failed: ${createNoteRes.status}`);
      console.log(`   Error: ${JSON.stringify(errorData).substring(0, 200)}`);
      note = errorData;
    } catch (e) {
      console.log(`   ❌ Note creation failed: ${createNoteRes.status} (parse error)`);
    }
  } else {
    note = await createNoteRes.json();
  }
  const noteId = note.id || note.note?.id;
  console.log(`   Note created: ${noteId}`);
  console.log(`   Text: "${note.note_text || note.note?.note_text}"`);
  
  // Get the note
  console.log('\n2️⃣ Getting note...');
  const getNoteRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/notes/${noteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const fetchedNote = await getNoteRes.json();
  console.log(`   Fetched note: ${fetchedNote.id}`);
  console.log(`   Matches: ${fetchedNote.id === note.id ? 'YES' : 'NO'}`);
  
  // Delete the note
  console.log('\n3️⃣ Deleting note...');
  const deleteNoteRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/notes/${noteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const deleteNoteData = await deleteNoteRes.json();
  console.log(`   Delete status: ${deleteNoteRes.status}`);
  console.log(`   Deleted: ${deleteNoteData.deleted}`);
  
  // Verify deletion
  console.log('\n4️⃣ Verifying note deletion...');
  const verifyNoteRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/notes/${noteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   Verify status: ${verifyNoteRes.status} (should be 404)`);
  
  const noteTest = createNoteRes.status === 201 && 
                   getNoteRes.status === 200 && 
                   deleteNoteRes.status === 200 && 
                   verifyNoteRes.status === 404;
  console.log(`\n${noteTest ? '✅' : '❌'} Contact Notes CRUD: ${noteTest ? 'PASS' : 'FAIL'}`);
  
  // ============================================
  // 4. FILE ATTACHMENT & SIGNED URL TEST
  // ============================================
  console.log('\n\n📎 TEST 4: File Attachments & Signed URLs');
  console.log('------------------------------------------');
  
  // Get upload URL
  console.log('1️⃣ Getting upload URL...');
  const uploadUrlRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_name: 'test-file.txt',
      mime_type: 'text/plain',
      size_bytes: 100
    })
  });
  
  let uploadData = {};
  if (!uploadUrlRes.ok) {
    try {
      const errorData = await uploadUrlRes.json();
      console.log(`   ❌ Upload URL request failed: ${uploadUrlRes.status}`);
      console.log(`   Error: ${JSON.stringify(errorData).substring(0, 200)}`);
      throw new Error('Upload URL failed');
    } catch (e) {
      console.log(`   ❌ Upload URL failed: ${uploadUrlRes.status} (parse error)`);
      throw e;
    }
  } else {
    uploadData = await uploadUrlRes.json();
  }
  console.log(`   Upload URL received: ${uploadData.upload_url ? 'YES' : 'NO'}`);
  console.log(`   File path: ${uploadData.file_path}`);
  
  // Upload file
  console.log('\n2️⃣ Uploading file...');
  const fileContent = 'This is a test file for signed URL generation';
  const uploadRes = await fetch(uploadData.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
      'x-amz-acl': 'private'
    },
    body: fileContent
  });
  console.log(`   Upload status: ${uploadRes.status}`);
  
  // Commit to database
  console.log('\n3️⃣ Committing to database...');
  const commitRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/files/commit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_path: uploadData.file_path,
      mime_type: 'text/plain',
      size_bytes: fileContent.length
    })
  });
  
  const attachment = await commitRes.json();
  const attachmentId = attachment.id || attachment.attachment?.id;
  console.log(`   Attachment ID: ${attachmentId}`);
  
  // Get signed URL
  console.log('\n4️⃣ Getting signed URL...');
  const signedUrlRes = await fetch(`${API_BASE}/api/v1/attachments/${attachmentId}/url`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const signedUrlData = await signedUrlRes.json();
  console.log(`   Signed URL received: ${signedUrlData.url ? 'YES' : 'NO'}`);
  console.log(`   Expires at: ${signedUrlData.expires_at}`);
  console.log(`   File name: ${signedUrlData.attachment.file_name}`);
  
  // Test file access
  console.log('\n5️⃣ Accessing file via signed URL...');
  const accessRes = await fetch(signedUrlData.url);
  const accessedContent = await accessRes.text();
  console.log(`   Access status: ${accessRes.status}`);
  console.log(`   Content matches: ${accessedContent === fileContent ? 'YES' : 'NO'}`);
  
  // Get contact files with URLs
  console.log('\n6️⃣ Getting contact files list with URLs...');
  const filesRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/files`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const filesData = await filesRes.json();
  console.log(`   Files returned: ${filesData.files.length}`);
  console.log(`   First file has URL: ${filesData.files[0]?.url ? 'YES' : 'NO'}`);
  console.log(`   URL expires at: ${filesData.files[0]?.expires_at}`);
  
  const fileTest = uploadUrlRes.status === 200 && 
                   uploadRes.status === 200 && 
                   commitRes.status === 200 && 
                   signedUrlRes.status === 200 && 
                   accessRes.status === 200 && 
                   accessedContent === fileContent &&
                   filesRes.status === 200;
  console.log(`\n${fileTest ? '✅' : '❌'} File Attachments & URLs: ${fileTest ? 'PASS' : 'FAIL'}`);
  
  // ============================================
  // CLEANUP
  // ============================================
  console.log('\n\n🧹 Cleanup');
  console.log('------------------------------------------');
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Test contact deleted');
  
  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`Warmth Recompute:         ${warmthTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Delete Interaction:       ${deleteInterTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Contact Notes CRUD:       ${noteTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`File Attachments & URLs:  ${fileTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = warmthTest && deleteInterTest && noteTest && fileTest;
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
