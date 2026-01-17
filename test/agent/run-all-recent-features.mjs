/**
 * Test Runner for Recently Developed Backend Features
 * 
 * Runs comprehensive tests for:
 * - Developer Notifications API
 * - Campaign Automation System
 * - Paywall Analytics
 * 
 * Usage:
 *   node test/agent/run-all-recent-features.mjs
 */

import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const tests = [
  {
    name: 'Developer Notifications API',
    file: 'test/agent/dev-notifications-api.mjs',
    description: 'Tests activity stats, subscriptions, and email digest'
  },
  {
    name: 'Campaign Automation E2E',
    file: 'test/agent/campaign-automation-e2e.mjs',
    description: 'Tests campaigns, templates, segments, and deliveries'
  },
  {
    name: 'Paywall Analytics API',
    file: 'test/agent/paywall-analytics-api.mjs',
    description: 'Tests impact summary, usage tracking, and AI recommendations'
  },
  {
    name: 'Backend Tracking Events',
    file: 'test/agent/backend-tracking-events.mjs',
    description: 'Tests event logging and batch tracking'
  },
  {
    name: 'Backend Tracking Identify',
    file: 'test/agent/backend-tracking-identify.mjs',
    description: 'Tests user identification and trait updates'
  },
];

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  EverReach Backend - Recent Features Test Suite          ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`Running ${tests.length} test suites...\n`);

const results = [];
const startTime = Date.now();

async function runTest(test, index) {
  return new Promise((resolve) => {
    const testStart = Date.now();
    console.log(`\n[${ index + 1}/${tests.length}] Running: ${test.name}`);
    console.log(`    ${test.description}`);
    console.log(`    File: ${test.file}`);
    
    const proc = spawn(process.execPath, [test.file], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      const duration = Date.now() - testStart;
      const success = code === 0;
      
      // Extract report path from stdout
      const reportMatch = stdout.match(/test\/agent\/reports\/.*\.md/);
      const reportPath = reportMatch ? reportMatch[0] : null;
      
      results.push({
        name: test.name,
        file: test.file,
        success,
        code,
        duration,
        reportPath,
        error: code !== 0 ? stderr : null,
      });
      
      if (success) {
        console.log(`    ✅ PASSED (${duration}ms)`);
        if (reportPath) {
          console.log(`    📄 Report: ${reportPath}`);
        }
      } else {
        console.log(`    ❌ FAILED (exit code ${code})`);
        if (stderr) {
          console.log(`    Error: ${stderr.split('\n')[0]}`);
        }
      }
      
      resolve();
    });
  });
}

// Run tests sequentially
(async () => {
  for (let i = 0; i < tests.length; i++) {
    await runTest(tests[i], i);
  }
  
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.error) {
        console.log(`     ${r.error.split('\n')[0]}`);
      }
    });
    console.log('');
  }
  
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    duration_ms: totalDuration,
    total: tests.length,
    passed,
    failed,
    tests: results,
  };
  
  const summaryDir = 'test/agent/reports';
  await mkdir(summaryDir, { recursive: true });
  
  const summaryFile = `${summaryDir}/recent_features_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log(`📊 Summary report: ${summaryFile}\n`);
  
  // Generate markdown report
  const mdLines = [
    '# Recent Features Test Suite - Summary Report',
    '',
    `**Timestamp**: ${new Date().toISOString()}`,
    `**Duration**: ${(totalDuration / 1000).toFixed(2)}s`,
    `**Total Tests**: ${tests.length}`,
    `**Passed**: ${passed} ✅`,
    `**Failed**: ${failed} ❌`,
    '',
    '## Test Results',
    '',
  ];
  
  results.forEach(r => {
    mdLines.push(`### ${r.name} ${r.success ? '✅' : '❌'}`);
    mdLines.push('');
    mdLines.push(`- **File**: \`${r.file}\``);
    mdLines.push(`- **Duration**: ${r.duration}ms`);
    mdLines.push(`- **Exit Code**: ${r.code}`);
    if (r.reportPath) {
      mdLines.push(`- **Report**: [${r.reportPath}](../../${r.reportPath})`);
    }
    if (r.error) {
      mdLines.push('');
      mdLines.push('**Error:**');
      mdLines.push('```');
      mdLines.push(r.error);
      mdLines.push('```');
    }
    mdLines.push('');
  });
  
  mdLines.push('## Features Tested');
  mdLines.push('');
  mdLines.push('1. **Developer Notifications**');
  mdLines.push('   - Activity stats API (`/api/admin/dev-notifications`)');
  mdLines.push('   - Email subscription management');
  mdLines.push('   - Daily digest cron job');
  mdLines.push('');
  mdLines.push('2. **Campaign Automation**');
  mdLines.push('   - Campaign configuration (5 campaigns)');
  mdLines.push('   - A/B template variants (10 templates)');
  mdLines.push('   - Segment views (5 views)');
  mdLines.push('   - Delivery tracking');
  mdLines.push('   - Cron workers (run-campaigns, send-email, send-sms)');
  mdLines.push('');
  mdLines.push('3. **Paywall Analytics**');
  mdLines.push('   - Impact summary (`/api/me/impact-summary`)');
  mdLines.push('   - Usage tracking (`/api/me/usage-summary`)');
  mdLines.push('   - AI plan recommendations (`/api/me/plan-recommendation`)');
  mdLines.push('   - Paywall rollup cron');
  mdLines.push('');
  mdLines.push('4. **Event Tracking**');
  mdLines.push('   - Event logging (`/api/tracking/events`)');
  mdLines.push('   - User identification (`/api/tracking/identify`)');
  mdLines.push('   - Batch event processing');
  mdLines.push('');
  
  const mdFile = `${summaryDir}/recent_features_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  await writeFile(mdFile, mdLines.join('\n'));
  
  console.log(`📄 Markdown report: ${mdFile}\n`);
  
  process.exit(failed > 0 ? 1 : 0);
})();
