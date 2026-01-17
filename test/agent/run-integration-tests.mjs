#!/usr/bin/env node
/**
 * Integration Tests Runner
 * 
 * Runs all integration tests in sequence:
 * 1. Environment validation
 * 2. Email integration
 * 3. SMS integration
 */

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const TEST_SUITES = [
  {
    name: 'Environment Validation',
    file: 'test/agent/env-validation.mjs',
    description: 'Validates all required environment variables',
    critical: true,
  },
  {
    name: 'Email Integration (Resend)',
    file: 'test/agent/integration-email.mjs',
    description: 'Tests email sending functionality',
    critical: false,
  },
  {
    name: 'SMS Integration (Twilio)',
    file: 'test/agent/integration-sms.mjs',
    description: 'Tests SMS sending functionality',
    critical: false,
  },
];

function runTest(testSuite) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    console.log(`\n[${TEST_SUITES.indexOf(testSuite) + 1}/${TEST_SUITES.length}] Running: ${testSuite.name}`);
    console.log(`    ${testSuite.description}`);
    console.log(`    File: ${testSuite.file}`);

    const proc = spawn(process.execPath, [testSuite.file], {
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('exit', (code) => {
      const duration = Date.now() - startTime;
      const result = {
        name: testSuite.name,
        file: testSuite.file,
        success: code === 0,
        code,
        duration,
        critical: testSuite.critical,
      };

      if (code === 0) {
        console.log(`    ✅ PASSED (${duration}ms)`);
      } else {
        console.log(`    ❌ FAILED (exit code ${code})`);
      }

      resolve(result);
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  EverReach Backend - Integration Tests                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\nRunning ${TEST_SUITES.length} test suites...\n`);

  const startTime = Date.now();
  const results = [];

  for (const testSuite of TEST_SUITES) {
    const result = await runTest(testSuite);
    results.push(result);

    // Stop if critical test fails
    if (testSuite.critical && !result.success) {
      console.log('\n⚠️  Critical test failed. Stopping test suite.');
      console.log('   Fix the environment variables before running integration tests.');
      break;
    }
  }

  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = TEST_SUITES.length - results.length;

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${TEST_SUITES.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  if (skipped > 0) {
    console.log(`Skipped: ${skipped} ⚠️`);
  }
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ❌ ${r.name}`);
    });
  }

  // Write summary
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryPath = `test/agent/reports/integration_summary_${timestamp}.json`;
  
  await writeFile(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    total: TEST_SUITES.length,
    passed,
    failed,
    skipped,
    tests: results,
  }, null, 2));

  console.log(`\n📊 Summary report: ${summaryPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
