/**
 * Focused Screenshot Analysis Test
 * Tests the newly deployed screenshot analysis endpoints
 */

import { getAccessToken, apiFetch, getEnv, ensureReportsDir } from './_shared.mjs';
import { strict as assert } from 'node:assert';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://ever-reach-be.vercel.app';

// Test image (base64 encoded 1x1 PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const tests = [];
let screenshotId = null;

// Test 1: Upload screenshot
tests.push({
  name: 'Upload screenshot with business_card context',
  run: async (token) => {
    const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
    
    // Create form data with boundary
    const boundary = '----WebKitFormBoundary' + Date.now().toString(36);
    const CRLF = '\r\n';
    
    // Build multipart body parts
    const pre = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.png"',
      'Content-Type: image/png',
      '',
      ''
    ].join(CRLF);
    
    const post = [
      '',
      `--${boundary}`,
      'Content-Disposition: form-data; name="context"',
      '',
      'business_card',
      `--${boundary}--`
    ].join(CRLF);
    
    // Combine into single buffer
    const body = Buffer.concat([
      Buffer.from(pre, 'utf-8'),
      imageBuffer,
      Buffer.from(post, 'utf-8')
    ]);

    const response = await fetch(`${BASE_URL}/api/v1/screenshots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 201, `Expected 201, got ${response.status}: ${JSON.stringify(json)}`);
    assert.ok(json.screenshot_id, 'Should return screenshot_id');
    assert.ok(json.analysis_id, 'Should return analysis_id');
    assert.strictEqual(json.status, 'queued', 'Initial status should be queued');
    
    screenshotId = json.screenshot_id;
    return { screenshot_id: screenshotId, status: json.status };
  }
});

// Test 2: Get screenshot
tests.push({
  name: 'Get screenshot details',
  run: async (token) => {
    assert.ok(screenshotId, 'Requires screenshot_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/screenshots/${screenshotId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.strictEqual(json.id, screenshotId, 'Should return correct screenshot ID');
    assert.ok(json.storage_key, 'Should have storage_key');
    
    return { id: json.id, status: json.analysis?.status || 'unknown' };
  }
});

// Test 3: List screenshots
tests.push({
  name: 'List user screenshots',
  run: async (token) => {
    const response = await fetch(`${BASE_URL}/api/v1/screenshots?limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.ok(json.screenshots, 'Should return screenshots property');
    assert.ok(Array.isArray(json.screenshots), 'Screenshots should be an array');
    assert.ok(json.screenshots.length >= 0, 'Should return screenshots array');
    
    return { count: json.screenshots.length, total: json.total };
  }
});

// Test 4: Trigger manual analysis
tests.push({
  name: 'Trigger manual analysis',
  run: async (token) => {
    assert.ok(screenshotId, 'Requires screenshot_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/screenshots/${screenshotId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.ok(json.screenshot_id, 'Should return screenshot_id');
    assert.strictEqual(json.status, 'analyzed', 'Status should be analyzed');
    assert.ok(json.analysis, 'Should return analysis object');
    
    return { screenshot_id: json.screenshot_id, status: json.status };
  }
});

// Test 5: Delete screenshot
tests.push({
  name: 'Delete screenshot',
  run: async (token) => {
    assert.ok(screenshotId, 'Requires screenshot_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/screenshots/${screenshotId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.strictEqual(json.success, true, 'Should return success');
    
    return { deleted: true };
  }
});

// Test 6: Verify 404 after delete
tests.push({
  name: 'Verify screenshot is deleted (404)',
  run: async (token) => {
    assert.ok(screenshotId, 'Requires screenshot_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/screenshots/${screenshotId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    assert.strictEqual(response.status, 404, `Expected 404, got ${response.status}`);
    
    return { verified: true };
  }
});

// Main test runner
async function main() {
  console.log('🧪 Screenshot Analysis Focused Test\n');
  console.log(`Backend: ${BASE_URL}\n`);

  const token = await getAccessToken();
  console.log('✅ Authenticated\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const testNum = results.length + 1;
    console.log(`[${testNum}/${tests.length}] Running: ${test.name}...`);
    
    const startTime = Date.now();
    try {
      const result = await test.run(token);
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ PASSED (${duration}ms)`);
      if (result) console.log(`     ${JSON.stringify(result)}`);
      
      results.push({ name: test.name, status: 'passed', duration, result });
      passed++;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`  ❌ FAILED (${duration}ms)`);
      console.log(`     ${error.message}`);
      
      results.push({ name: test.name, status: 'failed', duration, error: error.message });
      failed++;
    }
    console.log();
  }

  // Generate report
  const reportsDir = await ensureReportsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runTag = process.env.TEST_RUN_ID ? `_run-${process.env.TEST_RUN_ID}` : '';
  const reportPath = `${reportsDir}/screenshot_focused${runTag}_${timestamp}.md`;

  const lines = [
    '# Screenshot Analysis Focused Test Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    `**Backend**: ${BASE_URL}`,
    '',
    '## Summary',
    '',
    `- **Total Tests**: ${tests.length}`,
    `- **Passed**: ✅ ${passed}`,
    `- **Failed**: ❌ ${failed}`,
    `- **Success Rate**: ${((passed / tests.length) * 100).toFixed(1)}%`,
    '',
    '## Test Results',
    '',
    '| Test | Status | Duration |',
    '|------|--------|----------|',
  ];

  for (const result of results) {
    const status = result.status === 'passed' ? '✅ PASS' : '❌ FAIL';
    lines.push(`| ${result.name} | ${status} | ${result.duration}ms |`);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');

  for (const result of results) {
    lines.push(`### ${result.status === 'passed' ? '✅' : '❌'} ${result.name}`);
    lines.push('');
    lines.push(`- **Duration**: ${result.duration}ms`);
    
    if (result.result) {
      lines.push('- **Result**: `' + JSON.stringify(result.result) + '`');
    }
    
    if (result.error) {
      lines.push('- **Error**: ' + result.error);
    }
    
    lines.push('');
  }

  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`📄 Report saved: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:   ${tests.length}`);
  console.log(`Passed:  ✅ ${passed}`);
  console.log(`Failed:  ❌ ${failed}`);
  console.log(`Success: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Screenshot analysis tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All screenshot analysis tests passed!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
