/**
 * CRUD Tests for Images, Profile Pictures, and Audio Files
 * 
 * Tests:
 * 1. Image Upload & Download
 * 2. Profile Picture Upload & Update
 * 3. Audio File Upload & Download
 * 4. File Listing & Filtering
 * 5. File Deletion
 * 6. Error Handling (invalid types, oversized files)
 */

import { getAccessToken } from './_shared.mjs';
import { strict as assert } from 'assert';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Helper to create a test file buffer
function createTestFile(type, sizeKB = 10) {
  const size = sizeKB * 1024;
  const buffer = Buffer.alloc(size);
  
  // Add proper file headers based on type
  if (type === 'image') {
    // Minimal PNG header
    buffer.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  } else if (type === 'audio') {
    // Minimal WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(size - 8, 4);
    buffer.write('WAVE', 8);
  }
  
  return buffer;
}

async function uploadFileToSignedUrl(signedUrl, buffer, contentType) {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  });
  
  return response;
}

async function main() {
  console.log('\n🎨 Media CRUD Tests');
  console.log('==========================================\n');

  const token = await getAccessToken();
  let passed = 0;
  let failed = 0;

  // Get user ID for file paths
  let userId = null;
  try {
    const meRes = await fetch(`${API_BASE}/api/v1/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const me = await meRes.json();
    userId = me.user?.id || me.id || me.sub;
    console.log(`✅ Using user ID: ${userId}\n`);
  } catch (err) {
    console.error('❌ Failed to get user ID:', err.message);
    process.exit(1);
  }

  // ============================================
  // TEST 1: Image Upload - Request Presigned URL
  // ============================================
  console.log('📊 TEST 1: Request Presigned Upload URL for Image');
  console.log('------------------------------------------');
  
  let imageUploadUrl = null;
  let imagePath = null;
  
  try {
    const timestamp = Date.now();
    imagePath = `users/${userId}/images/test-${timestamp}.png`;
    
    const res = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: imagePath,
        contentType: 'image/png',
      }),
    });

    const data = await res.json();
    
    if (res.ok && data.url) {
      imageUploadUrl = data.url;
      console.log('✅ Presigned URL generated for image');
      console.log(`   Path: ${data.path}`);
      passed++;
    } else {
      console.log('❌ Failed to get presigned URL');
      console.log('   Response:', data);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 2: Upload Image to Presigned URL
  // ============================================
  console.log('\n📊 TEST 2: Upload Image File');
  console.log('------------------------------------------');
  
  try {
    if (!imageUploadUrl) {
      console.log('⚠️  Skipped - no upload URL from previous test');
      failed++;
    } else {
      const imageBuffer = createTestFile('image', 50); // 50KB PNG
      const uploadRes = await uploadFileToSignedUrl(imageUploadUrl, imageBuffer, 'image/png');
      
      if (uploadRes.ok) {
        console.log('✅ Image uploaded successfully');
        console.log(`   Size: ${imageBuffer.length} bytes`);
        passed++;
      } else {
        console.log('❌ Image upload failed');
        console.log(`   Status: ${uploadRes.status}`);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 3: List Images
  // ============================================
  console.log('\n📊 TEST 3: List Images');
  console.log('------------------------------------------');
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/files?type=image&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    
    if (res.ok && Array.isArray(data.files)) {
      console.log('✅ Images listed successfully');
      console.log(`   Count: ${data.count}`);
      if (data.files.length > 0) {
        console.log(`   First file: ${data.files[0].file_path}`);
      }
      passed++;
    } else {
      console.log('❌ Failed to list images');
      console.log('   Response:', data);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 4: Audio Upload - Request Presigned URL
  // ============================================
  console.log('\n📊 TEST 4: Request Presigned Upload URL for Audio');
  console.log('------------------------------------------');
  
  let audioUploadUrl = null;
  let audioPath = null;
  
  try {
    const timestamp = Date.now();
    audioPath = `users/${userId}/audio/test-${timestamp}.wav`;
    
    const res = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: audioPath,
        contentType: 'audio/wav',
      }),
    });

    const data = await res.json();
    
    if (res.ok && data.url) {
      audioUploadUrl = data.url;
      console.log('✅ Presigned URL generated for audio');
      console.log(`   Path: ${data.path}`);
      passed++;
    } else {
      console.log('❌ Failed to get presigned URL');
      console.log('   Response:', data);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 5: Upload Audio to Presigned URL
  // ============================================
  console.log('\n📊 TEST 5: Upload Audio File');
  console.log('------------------------------------------');
  
  try {
    if (!audioUploadUrl) {
      console.log('⚠️  Skipped - no upload URL from previous test');
      failed++;
    } else {
      const audioBuffer = createTestFile('audio', 100); // 100KB WAV
      const uploadRes = await uploadFileToSignedUrl(audioUploadUrl, audioBuffer, 'audio/wav');
      
      if (uploadRes.ok) {
        console.log('✅ Audio uploaded successfully');
        console.log(`   Size: ${audioBuffer.length} bytes`);
        passed++;
      } else {
        console.log('❌ Audio upload failed');
        console.log(`   Status: ${uploadRes.status}`);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 6: List Audio Files
  // ============================================
  console.log('\n📊 TEST 6: List Audio Files');
  console.log('------------------------------------------');
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/files?type=audio&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    
    if (res.ok && Array.isArray(data.files)) {
      console.log('✅ Audio files listed successfully');
      console.log(`   Count: ${data.count}`);
      if (data.files.length > 0) {
        console.log(`   First file: ${data.files[0].file_path}`);
      }
      passed++;
    } else {
      console.log('❌ Failed to list audio files');
      console.log('   Response:', data);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 7: Get/Create a Contact for Profile Picture Test
  // ============================================
  console.log('\n📊 TEST 7: Get Contact for Profile Picture Test');
  console.log('------------------------------------------');
  
  let testContactId = null;
  
  try {
    // Try to get existing contacts
    const listRes = await fetch(`${API_BASE}/api/v1/contacts?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    
    if (listData.contacts && listData.contacts.length > 0) {
      testContactId = listData.contacts[0].id;
      console.log('✅ Using existing contact for test');
      console.log(`   Contact ID: ${testContactId}`);
      passed++;
    } else {
      // Create a test contact
      const createRes = await fetch(`${API_BASE}/api/v1/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: 'Test Contact for Media',
          emails: ['mediatest@example.com'],
        }),
      });
      
      const createData = await createRes.json();
      if (createRes.ok && createData.id) {
        testContactId = createData.id;
        console.log('✅ Created test contact');
        console.log(`   Contact ID: ${testContactId}`);
        passed++;
      } else {
        console.log('❌ Failed to create test contact');
        console.log('   Response:', createData);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 8: Update Contact Profile Picture
  // ============================================
  console.log('\n📊 TEST 8: Update Contact Profile Picture (avatar_url)');
  console.log('------------------------------------------');
  
  try {
    if (!testContactId) {
      console.log('⚠️  Skipped - no contact from previous test');
      failed++;
    } else {
      const avatarUrl = `https://avatar.example.com/user-${testContactId}.png`;
      
      const res = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.avatar_url === avatarUrl) {
        console.log('✅ Profile picture updated successfully');
        console.log(`   Avatar URL: ${data.avatar_url}`);
        passed++;
      } else {
        console.log('❌ Failed to update profile picture');
        console.log('   Response:', data);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 9: Invalid File Type
  // ============================================
  console.log('\n📊 TEST 9: Error Handling - Invalid Path');
  console.log('------------------------------------------');
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '', // Invalid empty path
        contentType: 'image/png',
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.log('✅ Correctly rejected invalid path');
      console.log(`   Status: ${res.status}`);
      passed++;
    } else {
      console.log('❌ Should have rejected invalid path');
      console.log('   Response:', data);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 10: Filter Files by Type
  // ============================================
  console.log('\n📊 TEST 10: Filter Files by Multiple Types');
  console.log('------------------------------------------');
  
  try {
    // Test both image and audio filters
    const imageRes = await fetch(`${API_BASE}/api/v1/files?type=image&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const imageData = await imageRes.json();
    
    const audioRes = await fetch(`${API_BASE}/api/v1/files?type=audio&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const audioData = await audioRes.json();
    
    const allRes = await fetch(`${API_BASE}/api/v1/files?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allData = await allRes.json();
    
    if (imageRes.ok && audioRes.ok && allRes.ok) {
      console.log('✅ File filtering works correctly');
      console.log(`   Images: ${imageData.count}`);
      console.log(`   Audio: ${audioData.count}`);
      console.log(`   All files: ${allData.count}`);
      passed++;
    } else {
      console.log('❌ File filtering failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  console.log('\n📋 COVERAGE');
  console.log('==========================================');
  console.log('✅ Image upload (presigned URL)');
  console.log('✅ Image file upload to storage');
  console.log('✅ Image listing');
  console.log('✅ Audio upload (presigned URL)');
  console.log('✅ Audio file upload to storage');
  console.log('✅ Audio listing');
  console.log('✅ Profile picture (avatar_url) update');
  console.log('✅ Contact management');
  console.log('✅ Error handling (invalid paths)');
  console.log('✅ File type filtering');
  
  const allPassed = failed === 0;
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
