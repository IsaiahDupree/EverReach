/**
 * Run All E2E Tests
 * 
 * Executes all E2E test suites in sequence and generates a summary report.
 */

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const E2E_TESTS = [
  // Core functionality
  { name: 'Contacts CRUD', file: 'e2e-contacts-crud.mjs', priority: 1 },
  { name: 'Interactions', file: 'e2e-interactions.mjs', priority: 1 },
  { name: 'User System', file: 'e2e-user-system.mjs', priority: 1 },
  
  // Feature-specific
  { name: 'Templates, Warmth, Pipelines', file: 'e2e-templates-warmth-pipelines.mjs', priority: 2 },
  { name: 'Advanced Features', file: 'e2e-advanced-features.mjs', priority: 2 },
  { name: 'Billing & Payments', file: 'e2e-billing.mjs', priority: 2 },
  
  // Campaign & Automation
  { name: 'Campaign Automation', file: 'campaign-automation-e2e.mjs', priority: 2 },
  { name: 'Contact Files', file: 'e2e-contact-files.mjs', priority: 3 },
  
  // New comprehensive tests
  { name: 'Warmth Tracking (Before/After)', file: 'e2e-warmth-tracking.mjs', priority: 1 },
  { name: 'Complete Contact Lifecycle', file: 'e2e-contact-lifecycle-complete.mjs', priority: 1 },
  { name: 'Trial Expiration & Billing', file: 'e2e-trial-expiration.mjs', priority: 2 },
  { name: 'Multi-Channel Campaigns', file: 'e2e-multi-channel-campaigns.mjs', priority: 2 },
  { name: 'Screenshot Analysis', file: 'e2e-screenshot-analysis.mjs', priority: 3 },

  // Social media integrations
  { name: 'Social Platform Integrations', file: 'integration-social-platforms.mjs', priority: 2 },
  { name: 'Instagram Post Publishing', file: 'e2e-instagram-post.mjs', priority: 2 },
];

const results = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(test) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`\n🧪 Running: ${test.name}...`);
    
    const child = spawn('node', [resolve(__dirname, test.file)], {
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const passed = code === 0;
      
      if (passed) {
        console.log(`✅ ${test.name} - PASSED (${(duration / 1000).toFixed(2)}s)`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name} - FAILED (${(duration / 1000).toFixed(2)}s)`);
        failedTests++;
      }

      results.push({
        name: test.name,
        file: test.file,
        priority: test.priority,
        passed,
        duration_ms: duration,
        exit_code: code,
        output: output.substring(0, 1000), // Truncate for summary
      });

      totalTests++;
      resolve();
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 EverReach E2E Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Running ${E2E_TESTS.length} test suites...`);
  console.log('');

  const startTime = Date.now();

  // Run tests in priority order
  const sortedTests = [...E2E_TESTS].sort((a, b) => a.priority - b.priority);

  for (const test of sortedTests) {
    await runTest(test);
  }

  const totalDuration = Date.now() - startTime;

  // Generate summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('');

  // Group by priority
  console.log('By Priority:');
  for (let p = 1; p <= 3; p++) {
    const priorityTests = results.filter(r => r.priority === p);
    const priorityPassed = priorityTests.filter(r => r.passed).length;
    console.log(`  Priority ${p}: ${priorityPassed}/${priorityTests.length} passed`);
  }
  console.log('');

  // Failed tests detail
  if (failedTests > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name} (${r.file})`);
    });
    console.log('');
  }

  // Write summary JSON
  const summary = {
    timestamp: new Date().toISOString(),
    total_tests: totalTests,
    passed: passedTests,
    failed: failedTests,
    success_rate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
    duration_ms: totalDuration,
    results,
  };

  const summaryPath = resolve(__dirname, 'reports', `e2e_all_tests_${Date.now()}.json`);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📄 Summary saved: ${summaryPath}`);
  console.log('');

  // Create markdown report
  const lines = [
    '# E2E Test Suite - Complete Report',
    '',
    `**Run Date**: ${new Date().toISOString()}`,
    `**Duration**: ${(totalDuration / 1000).toFixed(2)}s`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Tests | ${totalTests} |`,
    `| Passed | ✅ ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%) |`,
    `| Failed | ❌ ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%) |`,
    '',
    '## Test Results',
    '',
    '| Test | Status | Duration | Priority |',
    '|------|--------|----------|----------|',
  ];

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const duration = (r.duration_ms / 1000).toFixed(2) + 's';
    lines.push(`| ${r.name} | ${status} | ${duration} | P${r.priority} |`);
  });

  lines.push('');
  lines.push('## New E2E Tests Added');
  lines.push('');
  lines.push('1. **Warmth Tracking**: Before/after message send verification');
  lines.push('2. **Complete Contact Lifecycle**: All features (profile, voice, screenshot, custom fields, etc.)');
  lines.push('3. **Trial Expiration**: Subscription & billing flow testing');
  lines.push('4. **Multi-Channel Campaigns**: Email + SMS campaign automation');
  lines.push('5. **Screenshot Analysis**: AI vision → contact extraction → analysis');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);

  const mdPath = resolve(__dirname, 'reports', `e2e_all_tests_${Date.now()}.md`);
  await writeFile(mdPath, lines.join('\n'));
  console.log(`📄 Report saved: ${mdPath}`);
  console.log('');

  // Exit with appropriate code
  const exitCode = failedTests > 0 ? 1 : 0;
  console.log(failedTests === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(exitCode);
}

main().catch(err => {
  console.error('❌ Fatal error running E2E test suite:', err);
  process.exit(1);
});
