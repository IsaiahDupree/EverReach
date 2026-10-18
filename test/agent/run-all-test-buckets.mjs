/**
 * Master Test Runner - All Backend Endpoint Buckets
 * 
 * Systematically tests all 88+ backend endpoints organized into 9 buckets:
 * 1. Marketing Intelligence & Analytics (11 endpoints)
 * 2. Event Tracking & Analytics (5 endpoints)
 * 3. Meta/Social Platform Integration (5 endpoints)
 * 4. Contacts & CRM Core (10 endpoints)
 * 5. Campaign Automation (12 endpoints)
 * 6. Admin & Dashboard (13 endpoints)
 * 7. Billing & Payments (2 endpoints)
 * 8. Cron Jobs & Background Tasks (19 endpoints)
 * 9. Infrastructure & Health (3 endpoints)
 * 
 * Run: node test/agent/run-all-test-buckets.mjs
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
    totalEndpoints: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0
  }
};

const lines = [
  '# Backend API Testing - Complete Coverage Report',
  `**Test ID**: \`${rid}\``,
  `**Started**: ${nowIso()}`,
  `**Coverage Goal**: 100% of 88+ endpoints`,
  '',
  '---',
  ''
];

// Test buckets for ALL backend endpoints
const TEST_BUCKETS = [
  {
    name: 'Bucket 1: Marketing Intelligence & Analytics',
    description: '11 endpoints - Attribution, Magnetism, Personas, Funnel, Analytics',
    priority: 'CRITICAL',
    coverage: '45%',
    tests: [
      { file: 'bucket-1-marketing-intelligence.mjs', name: 'Marketing Intelligence (11 endpoints)', critical: true, endpoints: 11 },
    ]
  },
  {
    name: 'Bucket 2: Event Tracking & Analytics',
    description: '5 endpoints - Client events, PostHog sync, embeddings',
    priority: 'CRITICAL',
    coverage: '0%',
    tests: [
      { file: 'bucket-2-event-tracking.mjs', name: 'Event Tracking (5 endpoints)', critical: true, endpoints: 5 },
    ]
  },
  {
    name: 'Bucket 3: Meta/Social Platform Integration',
    description: '5 endpoints - Messenger, Instagram, WhatsApp, Conversions API, Webhooks',
    priority: 'HIGH',
    coverage: '0%',
    tests: [
      { file: 'bucket-3-meta-platforms.mjs', name: 'Meta Platforms (5 endpoints)', critical: true, endpoints: 5 },
    ]
  },
  {
    name: 'Bucket 4: Contacts & CRM Core',
    description: '10 endpoints - CRUD operations, search, interactions, files',
    priority: 'CRITICAL',
    coverage: '0%',
    tests: [
      { file: 'bucket-4-contacts-crm.mjs', name: 'Contacts & CRM (10 endpoints)', critical: true, endpoints: 10 },
    ]
  },
  {
    name: 'Bucket 5: Campaign Automation',
    description: '12 endpoints - Email/SMS delivery, campaign management, lifecycle',
    priority: 'HIGH',
    coverage: '17%',
    tests: [
      { file: 'bucket-5-campaigns.mjs', name: 'Campaign Automation (12 endpoints)', critical: true, endpoints: 12 },
    ]
  },
  {
    name: 'Bucket 6: Admin & Dashboard',
    description: '13 endpoints - Auth, feature flags, experiments, overview',
    priority: 'MEDIUM',
    coverage: '0%',
    tests: [
      { file: 'bucket-6-admin.mjs', name: 'Admin & Dashboard (13 endpoints)', critical: false, endpoints: 13 },
    ]
  },
  {
    name: 'Bucket 7: Billing & Payments',
    description: '2 endpoints - Stripe checkout and portal',
    priority: 'CRITICAL',
    coverage: '50%',
    tests: [
      { file: 'bucket-7-billing.mjs', name: 'Billing & Payments (2 endpoints)', critical: true, endpoints: 2 },
    ]
  },
  {
    name: 'Bucket 8: Cron Jobs & Background Tasks',
    description: '19 endpoints - Scheduled jobs, workers, data sync',
    priority: 'MEDIUM',
    coverage: '5%',
    tests: [
      { file: 'bucket-8-cron-jobs.mjs', name: 'Cron Jobs (19 endpoints)', critical: false, endpoints: 19 },
    ]
  },
  {
    name: 'Bucket 9: Infrastructure & Health',
    description: '3 endpoints - Health checks, examples, performance',
    priority: 'LOW',
    coverage: '33%',
    tests: [
      { file: 'bucket-9-infrastructure.mjs', name: 'Infrastructure (3 endpoints)', critical: false, endpoints: 3 },
    ]
  },
  {
    name: 'Bucket 10: Webhooks & Bidirectional Integrations',
    description: '8+ endpoints - Meta, Stripe, Resend, Twilio, Clay, PostHog, App Store, Play webhooks',
    priority: 'CRITICAL',
    coverage: '0%',
    tests: [
      { file: 'bucket-10-webhooks.mjs', name: 'Webhooks (8+ endpoints)', critical: true, endpoints: 8 },
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
        exitCode: code,
        stdout,
        stderr,
        duration
      });
    });
  });
}

async function runBucket(bucket, bucketIndex) {
  const bucketResults = {
    name: bucket.name,
    description: bucket.description,
    priority: bucket.priority,
    coverage: bucket.coverage,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  };

  console.log('');
  console.log('═'.repeat(70));
  console.log(`📦 ${bucket.name.toUpperCase()}`);
  console.log('═'.repeat(70));
  console.log(`Priority: ${bucket.priority} | Coverage: ${bucket.coverage}`);
  console.log(bucket.description);
  console.log('');

  lines.push(`## ${bucket.name}`);
  lines.push(`**Description**: ${bucket.description}`);
  lines.push(`**Priority**: ${bucket.priority}`);
  lines.push(`**Coverage**: ${bucket.coverage}`);
  lines.push(`**Tests**: ${bucket.tests.length}`);
  lines.push('');

  for (let i = 0; i < bucket.tests.length; i++) {
    const test = bucket.tests[i];
    const testNum = i + 1;
    
    console.log(`  [${testNum}/${bucket.tests.length}] Running: ${test.name}...`);

    const result = await runTest(test.file);
    const passed = result.exitCode === 0;
    const icon = passed ? '✅' : '❌';
    
    console.log(`  ${icon} ${passed ? 'PASSED' : 'FAILED'} (${(result.duration / 1000).toFixed(2)}s)`);
    
    if (!passed && test.critical) {
      console.log(`  🛑 CRITICAL TEST FAILED - Stopping bucket execution`);
    }

    const testResult = {
      name: test.name,
      file: test.file,
      passed,
      critical: test.critical,
      endpoints: test.endpoints,
      exitCode: result.exitCode,
      duration: result.duration,
      stdout: result.stdout,
      stderr: result.stderr
    };

    bucketResults.tests.push(testResult);
    bucketResults.duration += result.duration;

    if (passed) {
      bucketResults.passed++;
      results.summary.passed++;
    } else {
      bucketResults.failed++;
      results.summary.failed++;
    }

    // Add to markdown
    lines.push(`### Test ${testNum}: ${test.name}`);
    lines.push(`**File**: \`${test.file}\``);
    lines.push(`**Endpoints**: ${test.endpoints}`);
    lines.push(`**Critical**: ${test.critical ? '🔴 Yes' : '🟢 No'}`);
    lines.push('');
    lines.push(`**Result**: ${icon} **${passed ? 'PASSED' : 'FAILED'}**`);
    lines.push(`**Duration**: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push(`**Exit Code**: ${result.exitCode}`);
    lines.push('');

    if (!passed) {
      lines.push('**Error Output**:');
      lines.push('```');
      lines.push(result.stderr || result.stdout || 'No output captured');
      lines.push('```');
      lines.push('');
    }

    // Stop bucket if critical test failed
    if (!passed && test.critical) {
      bucketResults.skipped = bucket.tests.length - (i + 1);
      results.summary.skipped += bucketResults.skipped;
      
      lines.push('> 🛑 **Critical test failed - remaining tests in bucket skipped**');
      
      // Count skipped endpoints
      for (let j = i + 1; j < bucket.tests.length; j++) {
        results.summary.totalEndpoints += bucket.tests[j].endpoints;
      }
      
      break;
    }
  }

  results.summary.totalEndpoints += bucket.tests.reduce((sum, t) => sum + (t.endpoints || 0), 0);
  
  lines.push(`**Bucket Summary**: ${bucketResults.passed}/${bucket.tests.length} passed, ${bucketResults.failed} failed, ${bucketResults.skipped} skipped`);
  lines.push(`**Bucket Duration**: ${(bucketResults.duration / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return bucketResults;
}

async function main() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('🧪 BACKEND API TESTING - COMPLETE COVERAGE');
  console.log('═'.repeat(70));
  console.log(`Test ID: ${rid}`);
  console.log(`Started: ${nowIso()}`);
  console.log(`Goal: Test all 88+ backend endpoints`);
  console.log('');

  const startTime = Date.now();

  // Run all buckets
  for (let i = 0; i < TEST_BUCKETS.length; i++) {
    const bucket = TEST_BUCKETS[i];
    const bucketResult = await runBucket(bucket, i);
    results.buckets.push(bucketResult);
    results.summary.totalTests += bucket.tests.length;
    results.summary.totalDuration = Date.now() - startTime;
  }

  results.endTime = nowIso();

  // Final summary
  console.log('');
  console.log('═'.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`Total Buckets: ${TEST_BUCKETS.length}`);
  console.log(`Total Test Files: ${results.summary.totalTests}`);
  console.log(`Total Endpoints: ${results.summary.totalEndpoints}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);
  console.log(`⏱️  Total Duration: ${(results.summary.totalDuration / 1000).toFixed(2)}s (${(results.summary.totalDuration / 60000).toFixed(2)} min)`);
  console.log('');

  const successRate = results.summary.totalTests > 0 
    ? Math.round((results.summary.passed / results.summary.totalTests) * 100)
    : 0;
  
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log('');

  if (results.summary.failed > 0) {
    console.log('⚠️  Some tests failed. Please review the results.');
  } else {
    console.log('🎉 All tests passed!');
  }

  // Add summary to markdown
  lines.push('## 📊 Final Summary');
  lines.push('');
  lines.push(`**Total Buckets**: ${TEST_BUCKETS.length}`);
  lines.push(`**Total Test Files**: ${results.summary.totalTests}`);
  lines.push(`**Total Endpoints Tested**: ${results.summary.totalEndpoints}`);
  lines.push(`**✅ Passed**: ${results.summary.passed}`);
  lines.push(`**❌ Failed**: ${results.summary.failed}`);
  lines.push(`**⏭️  Skipped**: ${results.summary.skipped}`);
  lines.push(`**⏱️  Total Duration**: ${(results.summary.totalDuration / 1000).toFixed(2)}s (${(results.summary.totalDuration / 60000).toFixed(2)} min)`);
  lines.push(`**📈 Success Rate**: ${successRate}%`);
  lines.push('');

  if (results.summary.failed > 0) {
    lines.push('⚠️  Some tests failed. Review the detailed results above.');
  } else {
    lines.push('🎉 All tests passed! The backend is production-ready.');
  }

  // Save report
  const reportPath = join('test', 'agent', 'reports', `all_buckets_${rid}.md`);
  await writeFile(reportPath, lines.join('\n'));
  
  console.log(`📄 Report saved: ${reportPath}`);
  console.log('');

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
