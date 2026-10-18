/**
 * Screenshot Upload & Analysis E2E Tests
 * Tests complete screenshot flow: upload → analyze → status transitions → security
 */

import { getAccessToken, logSection, logOk, logFail, assert, writeReport, nowIso, skipIfNoOpenAI } from './_shared.mjs';

// Configuration
const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

// Global state
let authToken = null;
const tests = [];
const reportLines = [];

// Helper: Track test results
function trackTest(name, passed, duration, error = null) {
  tests.push({ name, passed, duration, error });
  if (!passed && error) {
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${error}`, '');
  }
}

// Helper: Generate valid PNG data (1x1 red pixel)
function generatePNGData() {
  // Minimal valid PNG: 1x1 red pixel
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // Red pixel data
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
}

// Helper: Generate large PNG data
function generateLargePNGData(sizeInMB) {
  // Start with valid PNG header
  const basePNG = generatePNGData();
  // Pad with zeros to reach target size
  const targetSize = sizeInMB * 1024 * 1024;
  const paddedData = new Uint8Array(targetSize);
  paddedData.set(basePNG, 0);
  return paddedData;
}

// ============================================================================
// Test 1: Upload Screenshot
// ============================================================================
async function test1_UploadScreenshot() {
  logSection('Test 1: Upload Screenshot');

  const imageData = generatePNGData();
  const blob = new Blob([imageData], { type: 'image/png' });
  
  const formData = new FormData();
  formData.append('file', blob, 'test-screenshot.png');
  formData.append('context', 'business_card');

  const response = await fetch(`${API_BASE}/api/v1/screenshots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  assert(response.status === 201, `Expected 201, got ${response.status}. Error: ${JSON.stringify(data)}`);
  assert(data.screenshot_id, 'Should receive screenshot_id');
  assert(data.analysis_id, 'Should receive analysis_id');
  assert(data.status === 'queued', `Expected status=queued, got ${data.status}`);
  logOk(`Screenshot uploaded: ${data.screenshot_id}`);
  logOk(`Analysis queued: ${data.analysis_id}`);

  return { screenshotId: data.screenshot_id, analysisId: data.analysis_id };
}

// ============================================================================
// Test 2: Analyze Screenshot (OpenAI-gated)
// ============================================================================
async function test2_AnalyzeScreenshot(screenshotId) {
  if (skipIfNoOpenAI('Analyze Screenshot')) {
    return { skipped: true };
  }

  logSection('Test 2: Analyze Screenshot');

  const response = await fetch(`${API_BASE}/api/v1/screenshots/${screenshotId}/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context: 'test' }),
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}. Error: ${JSON.stringify(data)}`);
  assert(data.status === 'analyzed', `Expected status=analyzed, got ${data.status}`);
  assert(data.analysis, 'Should have analysis object');
  assert(data.analysis.ocr_text !== undefined, 'Should have ocr_text (can be empty)');
  assert(data.analysis.entities, 'Should have entities object');
  assert(data.analysis.insights, 'Should have insights object');
  assert(data.processing_time_ms, 'Should have processing_time_ms');
  assert(data.processing_time_ms < 30000, `Processing took ${data.processing_time_ms}ms (should be < 30s)`);

  logOk(`Analysis completed in ${data.processing_time_ms}ms`);
  logOk(`Entities extracted: ${JSON.stringify(data.analysis.entities).length} chars`);
  logOk(`Insights: ${JSON.stringify(data.analysis.insights).length} chars`);

  return { analysis: data.analysis };
}

// ============================================================================
// Test 3: Get Screenshot with Analysis
// ============================================================================
async function test3_GetScreenshotWithAnalysis(screenshotId, expectAnalysis = true) {
  logSection('Test 3: Get Screenshot with Analysis');

  const response = await fetch(`${API_BASE}/api/v1/screenshots/${screenshotId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.id === screenshotId, 'Should return correct screenshot ID');
  assert(data.storage_key, 'Should have storage_key');
  assert(data.image_url, 'Should have image_url (signed URL)');
  assert(data.thumbnail_url, 'Should have thumbnail_url (signed URL)');
  assert(data.width, 'Should have width');
  assert(data.height, 'Should have height');
  assert(data.file_size, 'Should have file_size');
  assert(data.mime_type, 'Should have mime_type');
  
  if (expectAnalysis) {
    assert(Array.isArray(data.analysis), 'Should have analysis array');
    if (data.analysis.length > 0) {
      const analysis = data.analysis[0];
      assert(analysis.status, 'Analysis should have status');
      logOk(`Analysis status: ${analysis.status}`);
    }
  }

  logOk(`Retrieved screenshot with signed URLs`);
  logOk(`Image URL: ${data.image_url.substring(0, 50)}...`);
  logOk(`Thumbnail URL: ${data.thumbnail_url.substring(0, 50)}...`);
}

// ============================================================================
// Test 4: List Screenshots
// ============================================================================
async function test4_ListScreenshots() {
  logSection('Test 4: List Screenshots');

  const response = await fetch(`${API_BASE}/api/v1/screenshots?limit=10&offset=0`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(Array.isArray(data.screenshots), 'Should return screenshots array');
  assert(data.screenshots.length > 0, 'Should have at least one screenshot');
  assert(data.total !== undefined, 'Should have total count');
  assert(data.limit === 10, 'Should respect limit parameter');
  assert(data.offset === 0, 'Should respect offset parameter');

  // Verify each screenshot has required fields
  const screenshot = data.screenshots[0];
  assert(screenshot.id, 'Screenshot should have id');
  assert(screenshot.image_url, 'Screenshot should have image_url');
  assert(screenshot.thumbnail_url, 'Screenshot should have thumbnail_url');
  assert(screenshot.created_at, 'Screenshot should have created_at');

  logOk(`Listed ${data.screenshots.length} screenshots`);
  logOk(`Total count: ${data.total}`);
}

// ============================================================================
// Test 5: Security - Unauthorized Access
// ============================================================================
async function test5_SecurityUnauthorized() {
  logSection('Test 5: Security - Unauthorized Access');

  // Try to upload without auth
  const imageData = generatePNGData();
  const blob = new Blob([imageData], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'unauth.png');

  const uploadResponse = await fetch(`${API_BASE}/api/v1/screenshots`, {
    method: 'POST',
    body: formData,
    // No Authorization header
  });

  assert(uploadResponse.status === 401, `Upload without auth should return 401, got ${uploadResponse.status}`);
  logOk('Upload rejected without auth (401)');

  // Try to list without auth
  const listResponse = await fetch(`${API_BASE}/api/v1/screenshots`);
  assert(listResponse.status === 401, `List without auth should return 401, got ${listResponse.status}`);
  logOk('List rejected without auth (401)');
}

// ============================================================================
// Test 6: Delete Screenshot
// ============================================================================
async function test6_DeleteScreenshot(screenshotId) {
  logSection('Test 6: Delete Screenshot');

  const response = await fetch(`${API_BASE}/api/v1/screenshots/${screenshotId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  assert(response.status === 200, `Expected 200, got ${response.status}`);
  assert(data.success === true, 'Should return success=true');
  logOk(`Screenshot ${screenshotId} deleted`);

  // Verify it's gone
  const getResponse = await fetch(`${API_BASE}/api/v1/screenshots/${screenshotId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  assert(getResponse.status === 404, `Deleted screenshot should return 404, got ${getResponse.status}`);
  logOk('Verified screenshot no longer accessible (404)');
}

// ============================================================================
// Test 7: Edge Case - File Too Large
// ============================================================================
async function test7_EdgeCase_FileTooLarge() {
  logSection('Test 7: Edge Case - File Too Large');

  const largeImageData = generateLargePNGData(11); // 11MB (> 10MB limit)
  const blob = new Blob([largeImageData], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'large.png');

  const response = await fetch(`${API_BASE}/api/v1/screenshots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  // Large files may be rejected by proxy/CDN (413) or app (400)
  const isRejected = response.status === 400 || response.status === 413;
  assert(isRejected, `Expected 400 or 413 for large file, got ${response.status}`);
  
  let data;
  try {
    data = await response.json();
    if (data.error) {
      logOk(`Large file rejected: ${data.error}`);
    }
  } catch {
    // Response might be HTML from proxy/CDN
    logOk(`Large file rejected with status ${response.status} (proxy/CDN level)`);
  }
}

// ============================================================================
// Test 8: Edge Case - Invalid File Type
// ============================================================================
async function test8_EdgeCase_InvalidFileType() {
  logSection('Test 8: Edge Case - Invalid File Type');

  // Try to upload a text file as image
  const textBlob = new Blob(['Not an image'], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', textBlob, 'test.txt');

  const response = await fetch(`${API_BASE}/api/v1/screenshots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  assert(response.status === 400, `Expected 400 for invalid type, got ${response.status}`);
  assert(data.error, 'Should have error message');
  logOk(`Invalid file type rejected: ${data.error}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n🚀 Screenshot Upload & Analysis E2E Tests');
  console.log(`API: ${API_BASE}\n`);

  reportLines.push('# E2E Test: Screenshots Upload & Analysis', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let exitCode = 0;

  try {
    authToken = await getAccessToken();
    logOk('Authenticated successfully');

    // Test 1: Upload Screenshot
    let screenshotId, analysisId, analysis;
    try {
      const t0 = Date.now();
      const result = await test1_UploadScreenshot();
      screenshotId = result.screenshotId;
      analysisId = result.analysisId;
      const dt = Date.now() - t0;
      trackTest('Upload Screenshot', true, dt);
      passed++;
    } catch (error) {
      const dt = Date.now();
      trackTest('Upload Screenshot', false, dt, error.message);
      failed++;
      logFail(`Upload Screenshot failed: ${error.message}`);
    }

    // Test 2: Analyze Screenshot (OpenAI-gated)
    if (screenshotId) {
      try {
        const t0 = Date.now();
        const result = await test2_AnalyzeScreenshot(screenshotId);
        if (result.skipped) {
          skipped++;
        } else {
          analysis = result.analysis;
          const dt = Date.now() - t0;
          trackTest('Analyze Screenshot', true, dt);
          passed++;
        }
      } catch (error) {
        const dt = Date.now();
        trackTest('Analyze Screenshot', false, dt, error.message);
        failed++;
        logFail(`Analyze Screenshot failed: ${error.message}`);
      }
    }

    // Test 3: Get Screenshot with Analysis
    if (screenshotId) {
      try {
        const t0 = Date.now();
        await test3_GetScreenshotWithAnalysis(screenshotId, !!analysis);
        const dt = Date.now() - t0;
        trackTest('Get Screenshot with Analysis', true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest('Get Screenshot with Analysis', false, dt, error.message);
        failed++;
        logFail(`Get Screenshot with Analysis failed: ${error.message}`);
      }
    }

    // Test 4: List Screenshots
    try {
      const t0 = Date.now();
      await test4_ListScreenshots();
      const dt = Date.now() - t0;
      trackTest('List Screenshots', true, dt);
      passed++;
    } catch (error) {
      const dt = Date.now();
      trackTest('List Screenshots', false, dt, error.message);
      failed++;
      logFail(`List Screenshots failed: ${error.message}`);
    }

    // Test 5: Security - Unauthorized
    try {
      const t0 = Date.now();
      await test5_SecurityUnauthorized();
      const dt = Date.now() - t0;
      trackTest('Security - Unauthorized', true, dt);
      passed++;
    } catch (error) {
      const dt = Date.now();
      trackTest('Security - Unauthorized', false, dt, error.message);
      failed++;
      logFail(`Security - Unauthorized failed: ${error.message}`);
    }

    // Test 6: Delete Screenshot
    if (screenshotId) {
      try {
        const t0 = Date.now();
        await test6_DeleteScreenshot(screenshotId);
        const dt = Date.now() - t0;
        trackTest('Delete Screenshot', true, dt);
        passed++;
      } catch (error) {
        const dt = Date.now();
        trackTest('Delete Screenshot', false, dt, error.message);
        failed++;
        logFail(`Delete Screenshot failed: ${error.message}`);
      }
    }

    // Test 7: Edge Case - File Too Large
    try {
      const t0 = Date.now();
      await test7_EdgeCase_FileTooLarge();
      const dt = Date.now() - t0;
      trackTest('Edge Case - File Too Large', true, dt);
      passed++;
    } catch (error) {
      const dt = Date.now();
      trackTest('Edge Case - File Too Large', false, dt, error.message);
      failed++;
      logFail(`Edge Case - File Too Large failed: ${error.message}`);
    }

    // Test 8: Edge Case - Invalid File Type
    try {
      const t0 = Date.now();
      await test8_EdgeCase_InvalidFileType();
      const dt = Date.now() - t0;
      trackTest('Edge Case - Invalid File Type', true, dt);
      passed++;
    } catch (error) {
      const dt = Date.now();
      trackTest('Edge Case - Invalid File Type', false, dt, error.message);
      failed++;
      logFail(`Edge Case - Invalid File Type failed: ${error.message}`);
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
  if (skipped > 0) {
    console.log(`⏭️  Tests Skipped: ${skipped} (OpenAI disabled)`);
  }
  console.log(`Total: ${passed + failed} tests (${skipped} skipped)`);
  console.log('='.repeat(60));

  await writeReport('screenshots', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
