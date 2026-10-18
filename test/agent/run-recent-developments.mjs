/**
 * Recent Developments - Comprehensive Test Suite
 * 
 * Tests all recent feature developments organized by category:
 * 1. Marketing Intelligence & Analytics
 * 2. Campaign Automation & Lifecycle
 * 3. SMS/Communication Integration
 * 4. Backend Infrastructure
 * 
 * Run: node test/agent/run-recent-developments.mjs
 */

import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const runId = () => Math.random().toString(36).substring(2, 10);
const nowIso = () => new Date().toISOString();
const rid = runId();

const results = {
  testId: rid,
  startTime: nowIso(),
  endTime: null,
  buckets: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0
  }
};

const lines = [
  '# Recent Developments - Comprehensive Test Report',
  `**Test ID**: \`${rid}\``,
  `**Started**: ${nowIso()}`,
  '',
  '---',
  ''
];

// Test buckets organized by feature area
const TEST_BUCKETS = [
  {
    name: 'Marketing Intelligence & Analytics',
    description: 'Attribution, Magnetism, Personas, Enrichment, Funnel, Analytics Dashboard',
    tests: [
      { file: 'marketing-intelligence-comprehensive.mjs', name: 'Marketing Intelligence APIs', critical: true },
      { file: 'backend-tracking-events.mjs', name: 'Event Tracking', critical: true },
      { file: 'backend-tracking-identify.mjs', name: 'User Identification', critical: true },
      { file: 'lifecycle-posthog-webhook.mjs', name: 'PostHog Webhook Processing', critical: false },
    ]
  },
  {
    name: 'Campaign Automation & Lifecycle',
    description: 'Campaign management, email/SMS delivery, lifecycle automation',
    tests: [
      { file: 'lifecycle-campaigns.mjs', name: 'Campaign Management', critical: true },
      { file: 'lifecycle-email-worker.mjs', name: 'Email Worker (Resend)', critical: true },
      { file: 'lifecycle-sms-worker.mjs', name: 'SMS Worker (Twilio)', critical: true },
      { file: 'lifecycle-end-to-end.mjs', name: 'End-to-End Lifecycle', critical: false },
    ]
  },
  {
    name: 'Communication Integration',
    description: 'Real SMS delivery, multi-channel campaigns',
    tests: [
      { file: 'integration-sms.mjs', name: 'SMS Integration (Real Delivery)', critical: false },
      { file: 'e2e-multi-channel-campaigns.mjs', name: 'Multi-Channel Campaigns', critical: false },
    ]
  },
  {
    name: 'Backend Infrastructure',
    description: 'Cron jobs, performance, billing, warmth tracking',
    tests: [
      { file: 'backend-cron-jobs.mjs', name: 'Cron Jobs', critical: true },
      { file: 'e2e-billing.mjs', name: 'Billing System', critical: true },
      { file: 'e2e-warmth-tracking.mjs', name: 'Warmth Tracking', critical: false },
      { file: 'performance-benchmarks.mjs', name: 'Performance Benchmarks', critical: false },
    ]
  }
];

async function runTest(testFile) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testPath = join('test', 'agent', testFile);
    
    const child = spawn('node', [testPath], {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        passed: code === 0,
        exitCode: code,
        duration,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        passed: false,
        exitCode: -1,
        duration,
        stdout,
        stderr: error.message
      });
    });
  });
}

async function runBucket(bucket, bucketIndex) {
  const bucketResults = {
    name: bucket.name,
    description: bucket.description,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  };

  lines.push(`## Bucket ${bucketIndex + 1}: ${bucket.name}`);
  lines.push(`**Description**: ${bucket.description}`);
  lines.push(`**Tests**: ${bucket.tests.length}`);
  lines.push('');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📦 BUCKET ${bucketIndex + 1}/${TEST_BUCKETS.length}: ${bucket.name}`);
  console.log(`${'='.repeat(70)}\n`);

  for (let i = 0; i < bucket.tests.length; i++) {
    const test = bucket.tests[i];
    const testNum = i + 1;
    
    console.log(`  [${testNum}/${bucket.tests.length}] Running: ${test.name}...`);
    lines.push(`### Test ${testNum}: ${test.name}`);
    lines.push(`**File**: \`${test.file}\``);
    lines.push(`**Critical**: ${test.critical ? '🔴 Yes' : '⚪ No'}`);
    lines.push('');

    const startTime = Date.now();
    const result = await runTest(test.file);
    const duration = Date.now() - startTime;

    const testResult = {
      name: test.name,
      file: test.file,
      critical: test.critical,
      passed: result.passed,
      exitCode: result.exitCode,
      duration: result.duration
    };

    bucketResults.tests.push(testResult);
    bucketResults.duration += duration;
    results.summary.totalDuration += duration;

    if (result.passed) {
      bucketResults.passed++;
      results.summary.passed++;
      console.log(`  ✅ PASSED (${(duration / 1000).toFixed(2)}s)\n`);
      lines.push(`**Result**: ✅ **PASSED**`);
      lines.push(`**Duration**: ${(duration / 1000).toFixed(2)}s`);
    } else {
      bucketResults.failed++;
      results.summary.failed++;
      console.log(`  ❌ FAILED (${(duration / 1000).toFixed(2)}s)`);
      console.log(`  Exit Code: ${result.exitCode}\n`);
      lines.push(`**Result**: ❌ **FAILED**`);
      lines.push(`**Duration**: ${(duration / 1000).toFixed(2)}s`);
      lines.push(`**Exit Code**: ${result.exitCode}`);
      
      if (result.stderr) {
        lines.push('');
        lines.push('**Error Output**:');
        lines.push('```');
        lines.push(result.stderr.slice(0, 500)); // Limit error output
        lines.push('```');
      }

      // Stop if critical test fails
      if (test.critical) {
        console.log(`  🛑 CRITICAL TEST FAILED - Stopping bucket execution\n`);
        lines.push('');
        lines.push('> 🛑 **Critical test failed - remaining tests in bucket skipped**');
        
        // Mark remaining tests as skipped
        for (let j = i + 1; j < bucket.tests.length; j++) {
          bucketResults.tests.push({
            name: bucket.tests[j].name,
            file: bucket.tests[j].file,
            critical: bucket.tests[j].critical,
            passed: false,
            exitCode: null,
            duration: 0,
            skipped: true
          });
          bucketResults.skipped++;
          results.summary.skipped++;
        }
        break;
      }
    }
    lines.push('');
  }

  lines.push(`**Bucket Summary**: ${bucketResults.passed}/${bucket.tests.length} passed, ${bucketResults.failed} failed, ${bucketResults.skipped} skipped`);
  lines.push(`**Bucket Duration**: ${(bucketResults.duration / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return bucketResults;
}

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🚀 RECENT DEVELOPMENTS - COMPREHENSIVE TEST SUITE');
  console.log(`${'='.repeat(70)}`);
  console.log(`Test ID: ${rid}`);
  console.log(`Started: ${results.startTime}\n`);

  // Run all buckets
  for (let i = 0; i < TEST_BUCKETS.length; i++) {
    const bucketResults = await runBucket(TEST_BUCKETS[i], i);
    results.buckets.push(bucketResults);
    results.summary.totalTests += TEST_BUCKETS[i].tests.length;
  }

  // Generate summary
  results.endTime = nowIso();
  const totalDurationSec = results.summary.totalDuration / 1000;

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 FINAL SUMMARY');
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);
  console.log(`⏱️  Total Duration: ${totalDurationSec.toFixed(2)}s (${(totalDurationSec / 60).toFixed(2)} min)`);
  console.log('');

  // Add summary to report
  lines.push('## 📊 Final Summary');
  lines.push('');
  lines.push(`**Total Tests**: ${results.summary.totalTests}`);
  lines.push(`**Passed**: ✅ ${results.summary.passed}`);
  lines.push(`**Failed**: ❌ ${results.summary.failed}`);
  lines.push(`**Skipped**: ⏭️ ${results.summary.skipped}`);
  lines.push(`**Total Duration**: ${totalDurationSec.toFixed(2)}s (${(totalDurationSec / 60).toFixed(2)} min)`);
  lines.push(`**Completed**: ${results.endTime}`);
  lines.push('');

  // Bucket breakdown
  lines.push('### Bucket Breakdown');
  lines.push('');
  results.buckets.forEach((bucket, idx) => {
    const passRate = bucket.tests.length > 0 
      ? ((bucket.passed / bucket.tests.length) * 100).toFixed(1)
      : '0.0';
    lines.push(`**${idx + 1}. ${bucket.name}**: ${bucket.passed}/${bucket.tests.length} passed (${passRate}%) - ${(bucket.duration / 1000).toFixed(2)}s`);
  });
  lines.push('');

  // Critical failures
  const criticalFailures = results.buckets.flatMap(b => 
    b.tests.filter(t => t.critical && !t.passed && !t.skipped)
  );
  
  if (criticalFailures.length > 0) {
    lines.push('### 🔴 Critical Failures');
    lines.push('');
    criticalFailures.forEach(test => {
      lines.push(`- **${test.name}** (\`${test.file}\`) - Exit Code: ${test.exitCode}`);
    });
    lines.push('');
  }

  // Success message or failure warning
  if (results.summary.failed === 0) {
    lines.push('## ✅ All Tests Passed!');
    lines.push('');
    lines.push('All recent development features are working correctly. Ready for deployment! 🚀');
    console.log('✅ All tests passed! Ready for deployment! 🚀\n');
  } else {
    lines.push('## ⚠️ Some Tests Failed');
    lines.push('');
    lines.push('Please review the failed tests above and fix any issues before deployment.');
    console.log('⚠️ Some tests failed. Please review the results.\n');
  }

  // Write report
  const reportPath = join('test', 'agent', 'reports', `recent_developments_${rid}.md`);
  await writeFile(reportPath, lines.join('\n'), 'utf-8');
  console.log(`📝 Report saved: ${reportPath}\n`);

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
