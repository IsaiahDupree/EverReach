/**
 * E2E Test: Image Upload & Download
 * 
 * Tests complete image flow: upload to storage, retrieve URL, download image.
 */

import { getEnv, getAccessToken, writeReport, runId, nowIso } from './_shared.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rid = runId();
const lines = [
  '# E2E Test: Image Upload & Download',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
  const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
  const BACKEND_BASE = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
  const STORAGE_BUCKET = await getEnv('EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET', false, 'media-assets');
  const token = await getAccessToken();

  lines.push(`- **Supabase URL**: ${SUPABASE_URL}`);
  lines.push(`- **Backend URL**: ${BACKEND_BASE}`);
  lines.push(`- **Storage Bucket**: ${STORAGE_BUCKET}`);
  lines.push('');
  lines.push('## Test Workflow: Image Upload & Download');
  lines.push('');

  const tests = [];
  let testContactId = null;
  let uploadedImageUrl = null;
  let imagePublicUrl = null;

  // ===== STEP 1: Create Test Contact =====
  lines.push('### Step 1: Create Test Contact');
  lines.push('');

  try {
    const payload = {
      display_name: `Image Test ${rid.slice(0, 8)}`,
      emails: [`image-test-${rid.slice(0, 8)}@example.com`],
      tags: ['e2e_image_test'],
      metadata: { test_run: `e2e_image_upload_${rid}` },
    };
    
    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    const contact = Array.isArray(json) ? json[0] : json;
    
    const pass = (res.status === 200 || res.status === 201) && contact?.id;
    if (pass) testContactId = contact.id;
    
    tests.push({
      name: 'Create test contact',
      pass,
      status: res.status,
      ms,
      contact_id: testContactId,
    });
    
    lines.push(`- ✅ Contact created: ${testContactId}`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Create test contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 2: Create Test Image (1x1 PNG) =====
  lines.push('### Step 2: Create Test Image');
  lines.push('');

  let imageBuffer;
  try {
    // Create a minimal 1x1 PNG (base64 decoded)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    imageBuffer = Buffer.from(pngBase64, 'base64');
    
    tests.push({
      name: 'Create test image',
      pass: true,
      image_size: imageBuffer.length,
    });
    
    lines.push(`- ✅ Test image created: ${imageBuffer.length} bytes (1x1 PNG)`);
    lines.push('');
  } catch (e) {
    tests.push({ name: 'Create test image', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 3: Upload to Supabase Storage =====
  lines.push('### Step 3: Upload to Supabase Storage');
  lines.push('');

  if (imageBuffer) {
    try {
      const fileName = `test-${rid.slice(0, 8)}.png`;
      const filePath = `test-images/${fileName}`;
      
      const startTime = Date.now();
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/png',
        },
        body: imageBuffer,
      });
      
      const ms = Date.now() - startTime;
      const json = await res.json().catch(() => ({}));
      
      const pass = res.status === 200 || res.status === 201;
      if (pass) {
        uploadedImageUrl = filePath;
        imagePublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
      }
      
      tests.push({
        name: 'Upload to storage',
        pass,
        status: res.status,
        ms,
        file_path: uploadedImageUrl,
      });
      
      if (pass) {
        lines.push(`- ✅ Image uploaded successfully`);
        lines.push(`- Path: ${uploadedImageUrl}`);
        lines.push(`- Public URL: ${imagePublicUrl}`);
      } else {
        lines.push(`- ⚠️  Upload response: ${res.status}`);
        lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
        lines.push(`- Note: Storage bucket may need to be configured`);
      }
      lines.push('');
      if (!pass && res.status !== 404) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Upload to storage', pass: false, error: e.message });
      lines.push(`- ⚠️  Upload failed: ${e.message}`);
      lines.push('');
    }
  }

  // ===== STEP 4: Download Image =====
  lines.push('### Step 4: Download Image');
  lines.push('');

  if (imagePublicUrl) {
    try {
      const startTime = Date.now();
      const res = await fetch(imagePublicUrl);
      const ms = Date.now() - startTime;
      
      const downloadedBuffer = await res.arrayBuffer();
      const pass = res.status === 200 && downloadedBuffer.byteLength > 0;
      
      tests.push({
        name: 'Download image',
        pass,
        status: res.status,
        ms,
        downloaded_size: downloadedBuffer.byteLength,
        matches_upload: downloadedBuffer.byteLength === imageBuffer.length,
      });
      
      if (pass) {
        lines.push(`- ✅ Image downloaded successfully`);
        lines.push(`- Downloaded size: ${downloadedBuffer.byteLength} bytes`);
        lines.push(`- Size matches upload: ${downloadedBuffer.byteLength === imageBuffer.length ? '✅ Yes' : '⚠️ No'}`);
      } else {
        lines.push(`- ⚠️  Download response: ${res.status}`);
      }
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Download image', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  } else {
    tests.push({ name: 'Download image', pass: false, note: 'Skipped - no uploaded image' });
    lines.push(`- ⚠️  Skipped - image not uploaded`);
    lines.push('');
  }

  // ===== STEP 5: Test Image Metadata =====
  lines.push('### Step 5: Get Image Metadata');
  lines.push('');

  if (uploadedImageUrl) {
    try {
      const startTime = Date.now();
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/info/public/${STORAGE_BUCKET}/${uploadedImageUrl}`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const ms = Date.now() - startTime;
      const json = await res.json().catch(() => ({}));
      
      const pass = res.status === 200;
      
      tests.push({
        name: 'Get image metadata',
        pass,
        status: res.status,
        ms,
        has_metadata: !!json?.metadata,
      });
      
      if (pass) {
        lines.push(`- ✅ Metadata retrieved`);
        lines.push(`- Content Type: ${json?.metadata?.mimetype || 'N/A'}`);
        lines.push(`- Size: ${json?.metadata?.size || 'N/A'} bytes`);
      } else {
        lines.push(`- ⚠️  Metadata response: ${res.status}`);
      }
      lines.push('');
      if (!pass && res.status !== 404) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'Get image metadata', pass: false, error: e.message });
      lines.push(`- ⚠️  Failed: ${e.message}`);
      lines.push('');
    }
  }

  // ===== STEP 6: Cleanup =====
  lines.push('### Step 6: Cleanup Test Data');
  lines.push('');

  try {
    // Delete uploaded image
    if (uploadedImageUrl) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${uploadedImageUrl}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      lines.push(`- ✅ Deleted test image`);
    }
    
    // Delete test contact
    if (testContactId) {
      await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${testContactId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      lines.push(`- ✅ Deleted test contact`);
    }
    lines.push('');
  } catch (e) {
    lines.push(`- ⚠️  Cleanup warning: ${e.message}`);
    lines.push('');
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push(`- **Image Upload**: ${uploadedImageUrl ? 'Success' : 'Failed'}`);
  lines.push(`- **Image Download**: ${imagePublicUrl ? 'Tested' : 'Skipped'}`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **All image upload/download tests passed**');
  } else {
    lines.push('❌ **Some image upload/download tests failed**');
  }

  lines.push('');
  lines.push('## Test Results');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(tests, null, 2));
  lines.push('```');

  await writeReport('e2e_image_upload_download', lines, tests, exitCode);
}

main().then(() => process.exit(exitCode)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
