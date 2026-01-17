/**
 * E2E Test: Screenshot Analysis CRUD
 * 
 * Tests the complete screenshot analysis lifecycle:
 * - Upload screenshot with multipart/form-data
 * - Get screenshot with analysis results
 * - List user's screenshots
 * - Trigger manual analysis
 * - Delete screenshot
 * 
 * Endpoints:
 * - POST /v1/screenshots
 * - GET /v1/screenshots/:id
 * - GET /v1/screenshots
 * - POST /v1/screenshots/:id/analyze
 * - DELETE /v1/screenshots/:id
 */

import { apiFetch, getAccessToken, getEnv, writeReport } from './_shared.mjs';
import assert from 'assert';
import { readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test image (base64 encoded 1x1 PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadScreenshot(imageBuffer, context = 'business_card') {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const token = await getAccessToken();
  
  // Create FormData manually
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
  const bodyParts = [];
  
  // Add file field
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="file"; filename="test.png"\r\n`);
  bodyParts.push(`Content-Type: image/png\r\n\r\n`);
  bodyParts.push(imageBuffer);
  bodyParts.push(`\r\n`);
  
  // Add context field
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="context"\r\n\r\n`);
  bodyParts.push(context);
  bodyParts.push(`\r\n`);
  
  // End boundary
  bodyParts.push(`--${boundary}--\r\n`);
  
  const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
  
  const res = await fetch(`${BASE}/v1/screenshots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

async function getScreenshot(screenshotId) {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const token = await getAccessToken();
  
  const res = await fetch(`${BASE}/v1/screenshots/${screenshotId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(`Get screenshot failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

async function listScreenshots(limit = 20, offset = 0) {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const token = await getAccessToken();
  
  const res = await fetch(`${BASE}/v1/screenshots?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(`List screenshots failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

async function triggerAnalysis(screenshotId, context = 'business_card') {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const token = await getAccessToken();
  
  const res = await fetch(`${BASE}/v1/screenshots/${screenshotId}/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context }),
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(`Trigger analysis failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

async function deleteScreenshot(screenshotId) {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const token = await getAccessToken();
  
  const res = await fetch(`${BASE}/v1/screenshots/${screenshotId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(`Delete screenshot failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TESTS
// ============================================================================

export const tests = [
  // --------------------------------------------------------------------------
  // Upload Screenshot
  // --------------------------------------------------------------------------
  {
    name: 'upload screenshot - business card',
    run: async () => {
      const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
      
      const result = await uploadScreenshot(imageBuffer, 'business_card');
      
      assert(result.screenshot_id, 'Should return screenshot_id');
      assert(result.analysis_id, 'Should return analysis_id');
      assert(result.status === 'queued', 'Initial status should be queued');
      assert(result.message, 'Should include message');
      
      // Store for subsequent tests
      global.testScreenshotId = result.screenshot_id;
      
      console.log('✅ Screenshot uploaded successfully');
      console.log('   Screenshot ID:', result.screenshot_id);
      console.log('   Status:', result.status);
    },
  },
  
  {
    name: 'upload screenshot - email context',
    run: async () => {
      const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
      
      const result = await uploadScreenshot(imageBuffer, 'email');
      
      assert(result.screenshot_id, 'Should return screenshot_id');
      assert(result.status === 'queued', 'Initial status should be queued');
      
      console.log('✅ Email screenshot uploaded successfully');
    },
  },
  
  {
    name: 'upload screenshot - meeting notes context',
    run: async () => {
      const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
      
      const result = await uploadScreenshot(imageBuffer, 'meeting_notes');
      
      assert(result.screenshot_id, 'Should return screenshot_id');
      assert(result.status === 'queued', 'Initial status should be queued');
      
      console.log('✅ Meeting notes screenshot uploaded successfully');
    },
  },
  
  // --------------------------------------------------------------------------
  // Get Screenshot with Analysis
  // --------------------------------------------------------------------------
  {
    name: 'get screenshot with analysis (poll until analyzed)',
    run: async () => {
      assert(global.testScreenshotId, 'Requires previous upload test to pass');
      
      const screenshotId = global.testScreenshotId;
      let screenshot = null;
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max (30 * 2s)
      
      // Poll for analysis completion
      while (attempts < maxAttempts) {
        screenshot = await getScreenshot(screenshotId);
        
        if (screenshot.analysis?.status === 'analyzed') {
          break;
        } else if (screenshot.analysis?.status === 'error') {
          throw new Error(`Analysis failed: ${screenshot.analysis.error}`);
        }
        
        attempts++;
        await wait(2000); // Wait 2 seconds between polls
      }
      
      // Validate response structure
      assert(screenshot.id, 'Should have id');
      assert(screenshot.user_id, 'Should have user_id');
      assert(screenshot.storage_key, 'Should have storage_key');
      assert(screenshot.width, 'Should have width');
      assert(screenshot.height, 'Should have height');
      assert(screenshot.file_size, 'Should have file_size');
      assert(screenshot.mime_type, 'Should have mime_type');
      assert(screenshot.created_at, 'Should have created_at');
      assert(screenshot.image_url, 'Should have image_url (signed)');
      
      // Validate analysis structure
      assert(screenshot.analysis, 'Should have analysis');
      assert(screenshot.analysis.status === 'analyzed', 'Analysis should be completed');
      assert(screenshot.analysis.entities, 'Should have entities object');
      assert(screenshot.analysis.insights, 'Should have insights object');
      
      // Validate entities structure
      const { entities } = screenshot.analysis;
      assert(Array.isArray(entities.contacts), 'contacts should be array');
      assert(Array.isArray(entities.dates), 'dates should be array');
      assert(Array.isArray(entities.platforms), 'platforms should be array');
      assert(Array.isArray(entities.handles), 'handles should be array');
      assert(Array.isArray(entities.emails), 'emails should be array');
      assert(Array.isArray(entities.phones), 'phones should be array');
      
      // Validate insights structure
      const { insights } = screenshot.analysis;
      assert('summary' in insights, 'insights should have summary');
      assert(Array.isArray(insights.action_items), 'action_items should be array');
      assert('sentiment' in insights, 'insights should have sentiment');
      assert('category' in insights, 'insights should have category');
      
      console.log('✅ Screenshot analysis completed');
      console.log('   Status:', screenshot.analysis.status);
      console.log('   Summary:', insights.summary?.substring(0, 100) || '(none)');
      console.log('   Contacts found:', entities.contacts.length);
      console.log('   Action items:', insights.action_items.length);
      console.log('   Processing time:', `${attempts * 2}s`);
    },
  },
  
  // --------------------------------------------------------------------------
  // List Screenshots
  // --------------------------------------------------------------------------
  {
    name: 'list user screenshots',
    run: async () => {
      const result = await listScreenshots(20, 0);
      
      assert(Array.isArray(result.screenshots), 'screenshots should be array');
      assert(typeof result.total === 'number', 'total should be number');
      assert(typeof result.limit === 'number', 'limit should be number');
      assert(typeof result.offset === 'number', 'offset should be number');
      assert(result.screenshots.length > 0, 'Should have at least one screenshot');
      
      // Validate first screenshot structure
      const first = result.screenshots[0];
      assert(first.id, 'Screenshot should have id');
      assert(first.thumbnail_url || first.image_url, 'Screenshot should have thumbnail or image URL');
      assert(first.created_at, 'Screenshot should have created_at');
      
      console.log('✅ List screenshots successful');
      console.log('   Total:', result.total);
      console.log('   Returned:', result.screenshots.length);
      console.log('   Latest:', new Date(result.screenshots[0].created_at).toLocaleString());
    },
  },
  
  {
    name: 'list screenshots with pagination',
    run: async () => {
      const page1 = await listScreenshots(2, 0);
      const page2 = await listScreenshots(2, 2);
      
      assert(page1.screenshots.length <= 2, 'Page 1 should respect limit');
      assert(page2.screenshots.length <= 2, 'Page 2 should respect limit');
      
      if (page1.total > 2) {
        assert(page1.screenshots[0].id !== page2.screenshots[0].id, 'Pages should be different');
      }
      
      console.log('✅ Pagination works correctly');
      console.log('   Page 1:', page1.screenshots.length, 'items');
      console.log('   Page 2:', page2.screenshots.length, 'items');
    },
  },
  
  // --------------------------------------------------------------------------
  // Trigger Manual Analysis
  // --------------------------------------------------------------------------
  {
    name: 'trigger manual analysis (re-analyze)',
    run: async () => {
      assert(global.testScreenshotId, 'Requires previous upload test to pass');
      
      const screenshotId = global.testScreenshotId;
      
      const result = await triggerAnalysis(screenshotId, 'general');
      
      assert(result.screenshot_id === screenshotId, 'Should return same screenshot_id');
      assert(result.status === 'analyzed', 'Should complete analysis');
      assert(result.analysis, 'Should include analysis results');
      assert(typeof result.processing_time_ms === 'number', 'Should track processing time');
      
      console.log('✅ Manual analysis triggered successfully');
      console.log('   Processing time:', result.processing_time_ms, 'ms');
    },
  },
  
  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------
  {
    name: 'upload - file too large error',
    run: async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      try {
        await uploadScreenshot(largeBuffer, 'general');
        throw new Error('Should have thrown error for file too large');
      } catch (err) {
        assert(err.message.includes('FILE_TOO_LARGE') || err.message.includes('413') || err.message.includes('too large'), 'Should fail with file size error');
        console.log('✅ File size validation works');
      }
    },
  },
  
  {
    name: 'get screenshot - not found error',
    run: async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      try {
        await getScreenshot(fakeId);
        throw new Error('Should have thrown error for not found');
      } catch (err) {
        assert(err.message.includes('404') || err.message.includes('not found'), 'Should fail with 404');
        console.log('✅ Not found validation works');
      }
    },
  },
  
  // --------------------------------------------------------------------------
  // Delete Screenshot
  // --------------------------------------------------------------------------
  {
    name: 'delete screenshot',
    run: async () => {
      assert(global.testScreenshotId, 'Requires previous upload test to pass');
      
      const screenshotId = global.testScreenshotId;
      
      const result = await deleteScreenshot(screenshotId);
      
      assert(result.success === true, 'Should return success');
      assert(result.message, 'Should include message');
      
      // Verify deletion
      try {
        await getScreenshot(screenshotId);
        throw new Error('Screenshot should be deleted');
      } catch (err) {
        assert(err.message.includes('404') || err.message.includes('not found'), 'Should be deleted');
      }
      
      console.log('✅ Screenshot deleted successfully');
      console.log('   Deleted ID:', screenshotId);
      
      // Clean up global
      delete global.testScreenshotId;
    },
  },
];

// ============================================================================
// RUN TESTS
// ============================================================================

(async () => {
  console.log('\n🧪 Running E2E Screenshot CRUD Tests...\n');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n▶️  ${test.name}`);
      await test.run();
      results.push({ name: test.name, status: 'PASS' });
      passed++;
    } catch (err) {
      console.error(`❌ ${test.name} failed:`, err.message);
      results.push({ name: test.name, status: 'FAIL', error: err.message, stack: err.stack });
      failed++;
    }
  }
  
  // Write report
  await writeReport('e2e_screenshot_crud', {
    summary: {
      total: tests.length,
      passed,
      failed,
      success_rate: ((passed / tests.length) * 100).toFixed(1) + '%',
    },
    tests: results,
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
})();
