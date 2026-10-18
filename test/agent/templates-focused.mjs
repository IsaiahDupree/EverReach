/**
 * Focused Templates Test
 * Tests the message templates CRUD endpoints
 */

import { getAccessToken, ensureReportsDir } from './_shared.mjs';
import { strict as assert } from 'node:assert';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://ever-reach-be.vercel.app';

const tests = [];
let templateId = null;

// Test 1: Create template
tests.push({
  name: 'Create message template',
  run: async (token) => {
    const response = await fetch(`${BASE_URL}/api/v1/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'email',
        name: 'Test Follow-up Template',
        description: 'A test template for following up',
        subject_tmpl: 'Following up on {{topic}}',
        body_tmpl: 'Hi {{first_name}},\n\nJust wanted to follow up on {{topic}}. Let me know your thoughts!\n\nBest,',
        closing_tmpl: 'Looking forward to hearing from you',
        variables: ['first_name', 'topic'],
        visibility: 'private',
      }),
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 201, `Expected 201, got ${response.status}: ${JSON.stringify(json)}`);
    assert.ok(json.template, 'Should return template object');
    assert.ok(json.template.id, 'Template should have ID');
    assert.strictEqual(json.template.channel, 'email', 'Channel should match');
    
    templateId = json.template.id;
    return { template_id: templateId, name: json.template.name };
  }
});

// Test 2: Get template
tests.push({
  name: 'Get template by ID',
  run: async (token) => {
    assert.ok(templateId, 'Requires template_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/templates/${templateId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.ok(json.template, 'Should return template object');
    assert.strictEqual(json.template.id, templateId, 'Should return correct template ID');
    assert.ok(json.template.body_tmpl, 'Should have body template');
    
    return { id: json.template.id, channel: json.template.channel };
  }
});

// Test 3: List templates
tests.push({
  name: 'List user templates',
  run: async (token) => {
    const response = await fetch(`${BASE_URL}/api/v1/templates?limit=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.ok(json.templates || json.items, 'Should return templates or items array');
    
    const templates = json.templates || json.items;
    assert.ok(Array.isArray(templates), 'Templates should be an array');
    assert.ok(templates.length >= 0, 'Should return templates array');
    
    // Find our created template
    const found = templates.find(t => t.id === templateId);
    if (templateId && templates.length > 0) {
      assert.ok(found, 'Should include recently created template');
    }
    
    return { count: templates.length };
  }
});

// Test 4: Update template
tests.push({
  name: 'Update template',
  run: async (token) => {
    assert.ok(templateId, 'Requires template_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/templates/${templateId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Updated test template description',
        variables: ['first_name', 'topic', 'company'],
      }),
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.ok(json.template, 'Should return template object');
    assert.strictEqual(json.template.id, templateId, 'Should return same template ID');
    
    return { updated: true, id: json.template.id };
  }
});

// Test 5: List by channel filter
tests.push({
  name: 'List templates filtered by channel',
  run: async (token) => {
    const response = await fetch(`${BASE_URL}/api/v1/templates?channel=email&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    const templates = json.templates || json.items;
    assert.ok(Array.isArray(templates), 'Should return array');
    
    // Verify all returned templates match the filter
    if (templates.length > 0) {
      const allEmail = templates.every(t => t.channel === 'email');
      assert.ok(allEmail, 'All templates should be email channel');
    }
    
    return { count: templates.length, channel: 'email' };
  }
});

// Test 6: Delete template
tests.push({
  name: 'Delete template',
  run: async (token) => {
    assert.ok(templateId, 'Requires template_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const json = await response.json();
    
    assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
    assert.strictEqual(json.deleted, true, 'Should confirm deletion');
    
    return { deleted: true, id: json.id };
  }
});

// Test 7: Verify 404 after delete
tests.push({
  name: 'Verify template is deleted (404)',
  run: async (token) => {
    assert.ok(templateId, 'Requires template_id from previous test');
    
    const response = await fetch(`${BASE_URL}/api/v1/templates/${templateId}`, {
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
  console.log('🧪 Templates Focused Test\n');
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
  const reportPath = `${reportsDir}/templates_focused${runTag}_${timestamp}.md`;

  const lines = [
    '# Templates Focused Test Report',
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

  await writeFile(reportPath, lines.join('\n'), 'utf-8');
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
    console.log('\n❌ Templates tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All templates tests passed!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
