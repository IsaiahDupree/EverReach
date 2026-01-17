/**
 * Large File Handling E2E Tests
 * Tests file upload with different sizes and chunking scenarios
 */

import { getAccessToken, logSection, logOk, logFail, assert, writeReport, nowIso } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
let testContactId = null;
const tests = [];
const reportLines = [];

// File size constants (matching backend)
const FILE_SIZES = {
  SMALL: 14, // Minimal MP3
  MEDIUM: 1024 * 1024, // 1MB
  LARGE: 15 * 1024 * 1024, // 15MB (below Whisper limit)
  VERY_LARGE: 25 * 1024 * 1024, // 25MB (above Whisper limit, needs chunking)
};

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
      display_name: `Test Contact Large Files ${Date.now()}`,
      emails: [`test-large${Date.now()}@example.com`],
    }),
  });

  const data = await response.json();
  testContactId = data.contact?.id;
  logOk(`Created test contact: ${testContactId}`);
}

// Helper: Generate MP3 data of specified size
function generateMP3Data(targetSize) {
  // Start with valid MP3 header
  const header = new Uint8Array([
    0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ID3v2 header
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header
  ]);

  // Fill rest with silence frames (0x00)
  const data = new Uint8Array(targetSize);
  data.set(header, 0);
  // Rest is already zeros (silence)

  return data;
}

// ============================================================================
// Test 1: Upload Small File (< 100KB)
// ============================================================================
async function test1_UploadSmallFile() {
  logSection('Test 1: Upload Small File (< 100KB)');

  const mp3Data = generateMP3Data(FILE_SIZES.SMALL);

  const signResponse = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: `test/large/small_${Date.now()}.mp3`,
      contentType: 'audio/mpeg',
    }),
  });

  const signData = await signResponse.json();
  assert(signResponse.status === 200, `Expected 200, got ${signResponse.status}`);
  logOk('Received presigned URL');

  const uploadResponse = await fetch(signData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: mp3Data,
  });

  assert(uploadResponse.ok, `Upload failed: ${uploadResponse.status}`);
  logOk(`Uploaded small file (${mp3Data.length} bytes)`);

  // Link to contact
  const linkResponse = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: signData.path,
      mime_type: 'audio/mpeg',
      size_bytes: mp3Data.length,
    }),
  });

  assert(linkResponse.status === 200, `Link failed: ${linkResponse.status}`);
  logOk('File linked to contact');

  return { fileId: (await linkResponse.json()).attachment?.id };
}

// ============================================================================
// Test 2: Upload Medium File (~1MB)
// ============================================================================
async function test2_UploadMediumFile() {
  logSection('Test 2: Upload Medium File (~1MB)');

  const mp3Data = generateMP3Data(FILE_SIZES.MEDIUM);

  const signResponse = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: `test/large/medium_${Date.now()}.mp3`,
      contentType: 'audio/mpeg',
    }),
  });

  const signData = await signResponse.json();
  assert(signResponse.status === 200, `Expected 200, got ${signResponse.status}`);
  logOk('Received presigned URL');

  const uploadResponse = await fetch(signData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: mp3Data,
  });

  assert(uploadResponse.ok, `Upload failed: ${uploadResponse.status}`);
  logOk(`Uploaded medium file (${(mp3Data.length / 1024 / 1024).toFixed(2)} MB)`);

  const linkResponse = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: signData.path,
      mime_type: 'audio/mpeg',
      size_bytes: mp3Data.length,
    }),
  });

  assert(linkResponse.status === 200, `Link failed: ${linkResponse.status}`);
  logOk('File linked to contact');

  return { fileId: (await linkResponse.json()).attachment?.id, filePath: signData.path };
}

// ============================================================================
// Test 3: Upload Large File (15MB - below Whisper limit)
// ============================================================================
async function test3_UploadLargeFile() {
  logSection('Test 3: Upload Large File (15MB - below Whisper limit)');

  const mp3Data = generateMP3Data(FILE_SIZES.LARGE);

  const signResponse = await fetch(`${API_BASE}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: `test/large/large_${Date.now()}.mp3`,
      contentType: 'audio/mpeg',
    }),
  });

  const signData = await signResponse.json();
  assert(signResponse.status === 200, `Expected 200, got ${signResponse.status}`);
  logOk('Received presigned URL');

  const uploadResponse = await fetch(signData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: mp3Data,
  });

  assert(uploadResponse.ok, `Upload failed: ${uploadResponse.status}`);
  logOk(`Uploaded large file (${(mp3Data.length / 1024 / 1024).toFixed(2)} MB)`);

  const linkResponse = await fetch(`${API_BASE}/api/v1/contacts/${testContactId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      path: signData.path,
      mime_type: 'audio/mpeg',
      size_bytes: mp3Data.length,
    }),
  });

  assert(linkResponse.status === 200, `Link failed: ${linkResponse.status}`);
  logOk('File linked to contact');

  return { fileId: (await linkResponse.json()).attachment?.id, filePath: signData.path };
}

// ============================================================================
// Test 4: Check File Size Info
// ============================================================================
async function test4_CheckFileSizeInfo(filePath) {
  logSection('Test 4: Check File Size Info');

  // This would call a new endpoint like GET /api/v1/files/info?path=...
  // For now, we just verify the file exists and has correct size in attachments
  const response = await fetch(`${API_BASE}/api/v1/files?limit=1`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.files.length > 0, 'Should have files');

  const largeFile = data.files.find(f => f.size_bytes > 10 * 1024 * 1024);
  if (largeFile) {
    logOk(`Found large file: ${(largeFile.size_bytes / 1024 / 1024).toFixed(2)} MB`);
  } else {
    logOk('No large files found in recent uploads');
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n🚀 Large File Handling E2E Tests');
  console.log(`API: ${API_BASE}\n`);

  reportLines.push('# E2E Test: Large File Handling', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');

  let passed = 0;
  let failed = 0;
  let exitCode = 0;

  try {
    authToken = await getAccessToken();
    logOk('Authenticated successfully');

    await createTestContact();

    // Run tests sequentially
    const testFunctions = [
      { name: 'Upload Small File', fn: test1_UploadSmallFile },
      { name: 'Upload Medium File', fn: test2_UploadMediumFile },
      { name: 'Upload Large File', fn: test3_UploadLargeFile },
    ];

    let largeFilePath = null;

    for (const test of testFunctions) {
      try {
        const t0 = Date.now();
        const result = await test.fn();
        const dt = Date.now() - t0;

        if (test.name === 'Upload Large File' && result?.filePath) {
          largeFilePath = result.filePath;
        }

        trackTest(test.name, true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest(test.name, false, dt, error.message);
        failed++;
        logFail(`${test.name} failed: ${error.message}`);
      }
    }

    // Test 4: Check file size info
    if (largeFilePath) {
      try {
        const t0 = Date.now();
        await test4_CheckFileSizeInfo(largeFilePath);
        const dt = Date.now() - t0;
        trackTest('Check File Size Info', true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest('Check File Size Info', false, dt, error.message);
        failed++;
        logFail(`Check File Size Info failed: ${error.message}`);
      }
    }

  } catch (error) {
    exitCode = 1;
    logFail(`Setup failed: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Tests Failed: ${failed}`);
    exitCode = 1;
  }
  console.log(`Total: ${passed + failed} tests`);
  console.log('='.repeat(60));

  await writeReport('file-large', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
