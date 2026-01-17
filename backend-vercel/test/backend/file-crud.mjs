/**
 * File CRUD E2E Tests
 * Tests complete CRUD operations for audio and image files
 */

import { getEnv, getAccessToken, apiFetch, logSection, logOk, logFail, assert, writeReport, nowIso } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
let testContactId = null;
const tests = [];
const reportLines = [];

// Helper: Track test results
function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

// Helper: Create test contact
async function createTestContact() {
  const response = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      display_name: `Test Contact ${Date.now()}`,
      emails: [`test${Date.now()}@example.com`],
    }),
  });

  const data = await response.json();
  testContactId = data.contact?.id;
  logOk(`Created test contact: ${testContactId}`);
}

// ============================================================================
// Test 1: Upload Audio File
// ============================================================================
async function test1_UploadAudioFile() {
  logSection('Test 1: Upload Audio File');

  // Step 1: Get presigned upload URL
  const signResponse = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: `test/audio_${Date.now()}.mp3`,
      contentType: 'audio/mpeg',
    }),
  });

  const signData = await signResponse.json();
  assert(signResponse.status === 200, `Expected 200, got ${signResponse.status}`);
  assert(signData.url, 'Should receive presigned URL');
  logOk('Received presigned upload URL');

  // Step 2: Actually upload file to storage
  // Create minimal valid MP3 data (ID3v2 header + silence)
  const mp3Data = new Uint8Array([
    0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ID3v2 header
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header
  ]);
  
  const uploadResponse = await fetch(signData.url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'audio/mpeg',
    },
    body: mp3Data,
  });
  
  assert(uploadResponse.ok, `Upload failed: ${uploadResponse.status}`);
  const testFilePath = signData.path;
  logOk(`File uploaded to storage: ${testFilePath}`);

  // Step 3: Link file to contact
  const linkResponse = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: testFilePath,
      mime_type: 'audio/mpeg',
      size_bytes: 14, // Actual size of uploaded MP3 data
    }),
  });

  const linkData = await linkResponse.json();
  assert(linkResponse.status === 200, `Expected 200, got ${linkResponse.status}`);
  assert(linkData.attachment?.id, 'Should receive attachment ID');
  logOk(`File linked to contact: ${linkData.attachment.id}`);

  return { fileId: linkData.attachment.id, filePath: testFilePath };
}

// ============================================================================
// Test 2: Upload Image File
// ============================================================================
async function test2_UploadImageFile() {
  logSection('Test 2: Upload Image File');

  const signResponse = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: `test/image_${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    }),
  });

  const imageSignData = await signResponse.json();
  assert(signResponse.status === 200, `Expected 200, got ${signResponse.status}`);
  assert(imageSignData.url, 'Should receive presigned URL');
  logOk('Received presigned upload URL for image');

  // Step 2: Actually upload image to storage
  // Create minimal valid JPEG data (JFIF header)
  const jpegData = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, // JPEG/JFIF header
    0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xD9, // End of image
  ]);
  
  const uploadResponse = await fetch(imageSignData.url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: jpegData,
  });
  
  assert(uploadResponse.ok, `Upload failed: ${uploadResponse.status}`);
  const testFilePath = imageSignData.path;
  logOk(`Image uploaded to storage: ${testFilePath}`);

  const linkResponse = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: testFilePath,
      mime_type: 'image/jpeg',
      size_bytes: 22, // Actual size of uploaded JPEG data
    }),
  });

  const linkData = await linkResponse.json();
  assert(linkResponse.status === 200, `Expected 200, got ${linkResponse.status}`);
  logOk(`Image file linked: ${linkData.attachment.id}`);

  return { fileId: linkData.attachment.id, filePath: testFilePath };
}

// ============================================================================
// Test 3: List All Files
// ============================================================================
async function test3_ListAllFiles() {
  logSection('Test 3: List All Files');

  const response = await fetch(`${API_BASE}/api/v1/files?limit=50`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}. Error: ${JSON.stringify(data)}`);
  assert(Array.isArray(data.files), 'Should return files array');
  assert(data.files.length > 0, 'Should have at least one file');
  logOk(`Listed ${data.files.length} files`);
}

// ============================================================================
// Test 4: List Audio Files Only
// ============================================================================
async function test4_ListAudioFiles() {
  logSection('Test 4: List Audio Files Only');

  const response = await fetch(`${API_BASE}/api/v1/files?type=audio`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}. Error: ${JSON.stringify(data)}`);
  assert(Array.isArray(data.files), 'Should return files array');
  
  // Verify all returned files are audio
  const allAudio = data.files.every(f => f.mime_type?.startsWith('audio/'));
  assert(allAudio, 'All files should have audio MIME types');
  logOk(`Listed ${data.files.length} audio files`);
}

// ============================================================================
// Test 5: List Image Files Only
// ============================================================================
async function test5_ListImageFiles() {
  logSection('Test 5: List Image Files Only');

  const response = await fetch(`${API_BASE}/api/v1/files?type=image`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}. Error: ${JSON.stringify(data)}`);
  assert(Array.isArray(data.files), 'Should return files array');
  
  const allImages = data.files.every(f => f.mime_type?.startsWith('image/'));
  assert(allImages, 'All files should have image MIME types');
  logOk(`Listed ${data.files.length} image files`);
}

// ============================================================================
// Test 6: Get File Details
// ============================================================================
async function test6_GetFileDetails(fileId) {
  logSection('Test 6: Get File Details');

  const response = await fetch(`${API_BASE}/api/v1/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.file?.id === fileId, 'Should return correct file ID');
  assert(data.file?.file_path, 'Should have file_path');
  assert(data.file?.download_url, 'Should have download_url since file was uploaded');
  logOk(`Retrieved file details with download URL`);
}

// ============================================================================
// Test 7: Update File Metadata
// ============================================================================
async function test7_UpdateFileMetadata(fileId) {
  logSection('Test 7: Update File Metadata');

  const response = await fetch(`${API_BASE}/api/v1/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      mime_type: 'audio/mp3',
      size_bytes: 150000,
    }),
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.file?.mime_type === 'audio/mp3', 'MIME type should be updated');
  logOk('File metadata updated successfully');
}

// ============================================================================
// Test 8: List Files for Contact
// ============================================================================
async function test8_ListFilesForContact() {
  logSection('Test 8: List Files for Contact');

  const response = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(Array.isArray(data.attachments), 'Should return attachments array');
  assert(data.attachments.length >= 2, 'Should have at least 2 files (audio + image)');
  logOk(`Contact has ${data.attachments.length} files`);
}

// ============================================================================
// Test 9: Delete File
// ============================================================================
async function test9_DeleteFile(fileId) {
  logSection('Test 9: Delete File');

  const response = await fetch(`${API_BASE}/api/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.success === true, 'Should return success');
  assert(data.deleted_file_id === fileId, 'Should return deleted file ID');
  logOk(`File ${fileId} deleted successfully`);
}

// ============================================================================
// Test 10: Verify File Deleted
// ============================================================================
async function test10_VerifyFileDeleted(fileId) {
  logSection('Test 10: Verify File Deleted');

  const response = await fetch(`${API_BASE}/api/v1/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  assert(response.status === 404, `Expected 404 for deleted file, got ${response.status}`);
  logOk('File is no longer accessible (404)');
}

// ============================================================================
// Test 11: Unauthorized Access
// ============================================================================
async function test11_UnauthorizedAccess() {
  logSection('Test 11: Unauthorized Access');

  const response = await fetch(`${API_BASE}/api/v1/files?type=audio`);
  assert(response.status === 401, `Expected 401 without auth, got ${response.status}`);
  logOk('Unauthorized access properly rejected');
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  const startTime = Date.now();
  
  reportLines.push(
    '# E2E Test: File CRUD Operations',
    '',
    `**Test Suite**: File CRUD (Audio/Images)`,
    `**Started**: ${nowIso()}`,
    `**API Base**: ${API_BASE}`,
    ''
  );

  console.log('\n🚀 File CRUD E2E Tests');
  console.log(`API: ${API_BASE}`);
  console.log('');

  let passed = 0;
  let failed = 0;
  let audioFileId = null;
  let imageFileId = null;

  try {
    // Setup - Get auth token
    authToken = await getAccessToken();
    logOk(`Authenticated successfully`);
    
    await createTestContact();

    // Run tests
    const tests = [
      { name: 'Upload Audio File', fn: test1_UploadAudioFile },
      { name: 'Upload Image File', fn: test2_UploadImageFile },
      { name: 'List All Files', fn: test3_ListAllFiles },
      { name: 'List Audio Files', fn: test4_ListAudioFiles },
      { name: 'List Image Files', fn: test5_ListImageFiles },
    ];

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (test.name === 'Upload Audio File') audioFileId = result?.fileId;
        if (test.name === 'Upload Image File') imageFileId = result?.fileId;
        passed++;
      } catch (error) {
        failed++;
        logFail(`${test.name} failed: ${error.message}`);
      }
    }

    // Tests that need file IDs
    if (audioFileId) {
      try {
        await test6_GetFileDetails(audioFileId);
        passed++;
      } catch (error) {
        failed++;
        logFail(`Get File Details failed: ${error.message}`);
      }

      try {
        await test7_UpdateFileMetadata(audioFileId);
        passed++;
      } catch (error) {
        failed++;
        logFail(`Update File Metadata failed: ${error.message}`);
      }
    }

    try {
      await test8_ListFilesForContact();
      passed++;
    } catch (error) {
      failed++;
      logFail(`List Files for Contact failed: ${error.message}`);
    }

    // Delete tests
    if (audioFileId) {
      try {
        await test9_DeleteFile(audioFileId);
        passed++;
      } catch (error) {
        failed++;
        logFail(`Delete File failed: ${error.message}`);
      }

      try {
        await test10_VerifyFileDeleted(audioFileId);
        passed++;
      } catch (error) {
        failed++;
        logFail(`Verify File Deleted failed: ${error.message}`);
      }
    }

    try {
      await test11_UnauthorizedAccess();
      passed++;
    } catch (error) {
      failed++;
      logFail(`Unauthorized Access test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('Setup failed:', error);
    reportLines.push('', `**Setup Error**: ${error.message}`, '');
    await writeReport('file-crud', reportLines, tests, 1);
    process.exit(1);
  }

  // Summary
  const duration = Date.now() - startTime;
  const exitCode = failed > 0 ? 1 : 0;
  
  reportLines.push(
    '',
    '## Summary',
    '',
    `- **Total Tests**: ${passed + failed}`,
    `- **Passed**: ✅ ${passed}`,
    `- **Failed**: ❌ ${failed}`,
    `- **Duration**: ${duration}ms`,
    `- **Completed**: ${nowIso()}`,
    ''
  );

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Tests Failed: ${failed}`);
  }
  console.log(`Total: ${passed + failed} tests`);
  console.log('='.repeat(60));

  // Write report
  await writeReport('file-crud', reportLines, tests, exitCode);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  reportLines.push('', `**Fatal Error**: ${error.message}`, '');
  await writeReport('file-crud', reportLines, tests, 1);
  process.exit(1);
});
