#!/usr/bin/env node
/**
 * Master Test Runner - Combines ALL test types
 * 
 * Runs:
 * 1. Jest Unit/Integration Tests (300+ tests)
 * 2. E2E Smoke Tests (API endpoints)
 * 
 * Generates unified markdown report
 * 
 * Usage:
 *   node backend-vercel/tests/run-all.mjs
 * 
 * Options:
 *   --skip-unit      Skip Jest tests
 *   --skip-e2e       Skip smoke tests
 *   --skip-deployed  Skip deployed backend tests
 *   --verbose        Show detailed output
 * 
 * Environment:
 *   TEST_BACKEND_URL  Run deployed tests against this backend URL
 *   TEST_BASE_URL     Alternative env var for backend URL
 */

import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const SKIP_UNIT = args.includes('--skip-unit');
const SKIP_E2E = args.includes('--skip-e2e');
const SKIP_DEPLOYED = args.includes('--skip-deployed');
const VERBOSE = args.includes('--verbose');

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${cmd} ${args.join(' ')}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Windows compatibility: use npx or direct executable
    const isWindows = process.platform === 'win32';
    let finalCmd = cmd;
    let finalArgs = args;
    
    if (isWindows && cmd === 'npm') {
      // On Windows, use npm.cmd directly
      finalCmd = 'npm.cmd';
    } else if (isWindows && cmd === 'node') {
      // Use current node process
      finalCmd = process.execPath;
    }
    
    const proc = spawn(finalCmd, finalArgs, {
      cwd,
      stdio: VERBOSE ? 'inherit' : 'pipe',
      shell: false,  // Don't use shell
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    if (!VERBOSE) {
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Show progress dots
        process.stdout.write('.');
      });
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('exit', (code) => {
      if (!VERBOSE) console.log(''); // New line after dots
      resolve({ code, stdout, stderr });
    });
  });
}

function parseJestOutput(output) {
  const lines = output.split('\n');
  let testSuites = { total: 0, passed: 0, failed: 0 };
  let tests = { total: 0, passed: 0, failed: 0 };
  let duration = 0;

  for (const line of lines) {
    // Test Suites: 18 failed, 1 passed, 19 total
    if (line.includes('Test Suites:')) {
      const match = line.match(/(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
      if (match) {
        testSuites = { failed: parseInt(match[1]), passed: parseInt(match[2]), total: parseInt(match[3]) };
      }
    }
    // Tests: 167 failed, 87 passed, 254 total
    if (line.includes('Tests:')) {
      const match = line.match(/(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
      if (match) {
        tests = { failed: parseInt(match[1]), passed: parseInt(match[2]), total: parseInt(match[3]) };
      }
    }
    // Time: 23.777 s
    if (line.includes('Time:')) {
      const match = line.match(/Time:\s+([\d.]+)\s*s/);
      if (match) duration = parseFloat(match[1]);
    }
  }

  return { testSuites, tests, duration };
}

function parseSmokeOutput(output) {
  const lines = output.split('\n');
  let passed = 0;
  let failed = 0;
  let total = 0;

  for (const line of lines) {
    // [api-smoke] Results: 15/18 passed, 3 failed
    if (line.includes('Results:')) {
      const match = line.match(/(\d+)\/(\d+)\s+passed.*?(\d+)\s+failed/);
      if (match) {
        passed = parseInt(match[1]);
        total = parseInt(match[2]);
        failed = parseInt(match[3]);
      }
    }
  }

  return { passed, failed, total };
}

async function generateReport(results) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = `backend-vercel/tests/reports/unified-test-report-${ts}.md`;
  
  const lines = [];
  lines.push('# 🧪 Unified Test Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Summary
  lines.push('## 📊 Summary');
  lines.push('');
  
  const totalPassed = (results.unit?.tests.passed || 0) + (results.smoke?.passed || 0);
  const totalFailed = (results.unit?.tests.failed || 0) + (results.smoke?.failed || 0);
  const totalTests = totalPassed + totalFailed;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  lines.push(`- **Total Tests:** ${totalTests}`);
  lines.push(`- **Passed:** ✅ ${totalPassed}`);
  lines.push(`- **Failed:** ❌ ${totalFailed}`);
  lines.push(`- **Pass Rate:** ${passRate}%`);
  lines.push('');
  
  // Unit Tests
  if (results.unit) {
    lines.push('## 🔬 Unit/Integration Tests (Jest)');
    lines.push('');
    lines.push(`- **Test Suites:** ${results.unit.testSuites.passed}/${results.unit.testSuites.total} passed`);
    lines.push(`- **Tests:** ${results.unit.tests.passed}/${results.unit.tests.total} passed`);
    lines.push(`- **Failed:** ${results.unit.tests.failed}`);
    lines.push(`- **Duration:** ${results.unit.duration}s`);
    lines.push(`- **Exit Code:** ${results.unit.exitCode}`);
    lines.push('');
    lines.push('**What was tested:**');
    lines.push('- Public API (authentication, rate limiting, webhooks, context bundles)');
    lines.push('- Custom Fields system');
    lines.push('- Ad Pixel tracking');
    lines.push('- Warmth scores');
    lines.push('- Message generation');
    lines.push('- Integration tests');
    lines.push('- Database functions');
    lines.push('');
    if (results.unit.junitXml) {
      lines.push(`**Detailed Report:** \`tests/reports/test-report.xml\``);
      lines.push('');
    }
  }
  
  // Smoke Tests
  if (results.smoke) {
    lines.push('## 🌐 E2E Smoke Tests (API Endpoints)');
    lines.push('');
    lines.push(`- **Tests:** ${results.smoke.passed}/${results.smoke.total} passed`);
    lines.push(`- **Failed:** ${results.smoke.failed}`);
    lines.push(`- **Exit Code:** ${results.smoke.exitCode}`);
    lines.push('');
    lines.push('**What was tested:**');
    lines.push('- Health check');
    lines.push('- User authentication');
    lines.push('- Contacts CRUD operations');
    lines.push('- Interactions logging');
    lines.push('- V1 API endpoints');
    lines.push('- Configuration status');
    lines.push('');
    if (results.smoke.reportPath) {
      lines.push(`**Detailed Report:** \`${results.smoke.reportPath}\``);
      lines.push('');
    }
  }
  
  // Deployed Tests
  if (results.deployed) {
    lines.push('## 🚀 Deployed Backend Tests (Voice Notes)');
    lines.push('');
    lines.push(`- **Exit Code:** ${results.deployed.exitCode}`);
    lines.push(`- **Status:** ${results.deployed.exitCode === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');
    lines.push('**What was tested:**');
    lines.push('- Voice note creation with contact link');
    lines.push('- Auto-interaction creation with metadata');
    lines.push('- Interaction metadata includes audio_url');
    lines.push('- Contact detail endpoint returns metadata');
    lines.push('- Text note interaction creation');
    lines.push('');
  }
  
  // Overall Status
  lines.push('---');
  lines.push('');
  lines.push('## 🎯 Overall Status');
  lines.push('');
  
  if (totalFailed === 0) {
    lines.push('### ✅ ALL TESTS PASSED!');
    lines.push('');
    lines.push('The codebase is healthy and ready for deployment.');
  } else {
    lines.push('### ⚠️ SOME TESTS FAILED');
    lines.push('');
    lines.push(`**Action Required:** Fix ${totalFailed} failing test(s) before deployment.`);
    lines.push('');
    lines.push('**Check detailed reports above for specific failures.**');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📝 Test Commands');
  lines.push('');
  lines.push('```bash');
  lines.push('# Run all tests');
  lines.push('node backend-vercel/tests/run-all.mjs');
  lines.push('');
  lines.push('# Run only unit tests');
  lines.push('npm run test:unified --prefix backend-vercel');
  lines.push('');
  lines.push('# Run only smoke tests');
  lines.push('node backend-vercel/tests/e2e/api-smoke.mjs');
  lines.push('');
  lines.push('# Skip specific test types');
  lines.push('node backend-vercel/tests/run-all.mjs --skip-e2e    # Skip smoke tests');
  lines.push('node backend-vercel/tests/run-all.mjs --skip-unit   # Skip Jest tests');
  lines.push('```');
  lines.push('');
  
  await mkdir('backend-vercel/tests/reports', { recursive: true });
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  
  return reportPath;
}

async function main() {
  console.log('\n🧪 EverReach Unified Test Suite\n');
  console.log('Running all test types...\n');
  
  const results = {};
  const startTime = Date.now();
  
  // Run Jest tests
  if (!SKIP_UNIT) {
    const jestResult = await runCommand(
      'npm',
      ['run', 'test:unified'],
      'backend-vercel'
    );
    
    const parsed = parseJestOutput(jestResult.stdout + jestResult.stderr);
    results.unit = {
      ...parsed,
      exitCode: jestResult.code,
      junitXml: 'tests/reports/test-report.xml',
    };
    
    console.log(`\n✅ Unit tests completed`);
    console.log(`   Suites: ${parsed.testSuites.passed}/${parsed.testSuites.total}`);
    console.log(`   Tests: ${parsed.tests.passed}/${parsed.tests.total}`);
  }
  
  // Run E2E smoke tests
  if (!SKIP_E2E) {
    const smokeResult = await runCommand(
      'node',
      ['backend-vercel/tests/e2e/api-smoke.mjs'],
      '.'
    );
    
    const parsed = parseSmokeOutput(smokeResult.stdout + smokeResult.stderr);
    results.smoke = {
      ...parsed,
      exitCode: smokeResult.code,
      reportPath: 'tests/reports/smoke-test-*.md',
    };
    
    console.log(`\n✅ Smoke tests completed`);
    console.log(`   Tests: ${parsed.passed}/${parsed.total}`);
  }
  
  // Run deployed voice-note tests (if TEST_BACKEND_URL or TEST_BASE_URL is set)
  if (!SKIP_DEPLOYED && (process.env.TEST_BACKEND_URL || process.env.TEST_BASE_URL)) {
    const deployedResult = await runCommand(
      'node',
      ['backend-vercel/tests/run-voice-note-test.mjs'],
      '.'
    );
    
    results.deployed = {
      exitCode: deployedResult.code,
      output: deployedResult.stdout + deployedResult.stderr,
    };
    
    console.log(`\n✅ Deployed tests completed`);
    console.log(`   Exit code: ${deployedResult.code}`);
  }
  
  // Generate unified report
  const reportPath = await generateReport(results);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 All tests completed!');
  console.log(`⏱️  Total time: ${duration}s`);
  console.log(`📄 Report: ${reportPath}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Exit with error if any tests failed
  const anyFailed = (results.unit?.exitCode !== 0) || (results.smoke?.exitCode !== 0) || (results.deployed?.exitCode !== 0);
  if (anyFailed) {
    console.error('❌ Some tests failed. Check the report for details.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Master test runner error:', err.message);
  process.exit(1);
});
