/**
 * Master Test Runner
 * 
 * Runs all backend tests in sequence and reports results
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_TOKEN = process.env.TEST_TOKEN;
const INGEST_SERVER_KEY = process.env.INGEST_SERVER_KEY;
const ADMIN_TEST_TOKEN = process.env.ADMIN_TEST_TOKEN;

console.log('🚀 Running All Backend Tests\n');
console.log(`API Base: ${API_BASE}`);
console.log(`Test Token: ${TEST_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`Ingest Key: ${INGEST_SERVER_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`Admin Token: ${ADMIN_TEST_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log('\n' + '='.repeat(60) + '\n');

const tests = [
  {
    name: 'Profile Pictures',
    file: 'test-user-profile-picture.mjs',
    required: ['TEST_TOKEN'],
  },
  {
    name: 'Onboarding Status',
    file: 'test-onboarding-status.mjs',
    required: ['TEST_TOKEN'],
  },
  {
    name: 'Events Ingest',
    file: 'test-events-ingest.mjs',
    required: ['INGEST_SERVER_KEY'],
  },
];

const results = [];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`📝 Running: ${test.name}`);
    console.log(`   File: ${test.file}\n`);

    // Check required env vars
    const missing = test.required.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.log(`   ⚠️  Skipping (missing: ${missing.join(', ')})\n`);
      results.push({ name: test.name, status: 'skipped', reason: `Missing: ${missing.join(', ')}` });
      resolve();
      return;
    }

    const child = spawn('node', [join(__dirname, test.file)], {
      env: process.env,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n   ✅ ${test.name} passed\n`);
        results.push({ name: test.name, status: 'passed' });
      } else {
        console.log(`\n   ❌ ${test.name} failed (exit code: ${code})\n`);
        results.push({ name: test.name, status: 'failed', code });
      }
      console.log('='.repeat(60) + '\n');
      resolve();
    });

    child.on('error', (error) => {
      console.log(`\n   ❌ ${test.name} error: ${error.message}\n`);
      results.push({ name: test.name, status: 'error', error: error.message });
      resolve();
    });
  });
}

async function runAllTests() {
  for (const test of tests) {
    await runTest(test);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  results.forEach(result => {
    const icon = {
      passed: '✅',
      failed: '❌',
      skipped: '⚠️ ',
      error: '❌',
    }[result.status];

    console.log(`${icon} ${result.name}: ${result.status.toUpperCase()}`);
    if (result.reason) console.log(`   ${result.reason}`);
    if (result.error) console.log(`   ${result.error}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');

  if (failed > 0 || errors > 0) {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  } else if (passed === 0) {
    console.log('⚠️  No tests ran\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

runAllTests();
