#!/usr/bin/env node
/**
 * Run all warmth modes tests
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  {
    name: 'Warmth Modes - Core Functionality',
    file: resolve(__dirname, 'warmth-modes.mjs')
  },
  {
    name: 'Warmth Modes - API Endpoints',
    file: resolve(__dirname, 'warmth-modes-api.mjs')
  }
];

let totalPassed = 0;
let totalFailed = 0;

async function runTest(test) {
  return new Promise((resolvePromise, reject) => {
    console.log('\n' + '='.repeat(70));
    console.log(`🧪 Running: ${test.name}`);
    console.log('='.repeat(70));
    
    const proc = spawn('node', [test.file], {
      stdio: 'inherit',
      env: process.env
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        totalPassed++;
        console.log(`\n✅ ${test.name} PASSED\n`);
        resolvePromise({ passed: true });
      } else {
        totalFailed++;
        console.log(`\n❌ ${test.name} FAILED (exit code: ${code})\n`);
        resolvePromise({ passed: false, code });
      }
    });
    
    proc.on('error', (err) => {
      totalFailed++;
      console.error(`\n❌ ${test.name} ERROR:`, err.message, '\n');
      resolvePromise({ passed: false, error: err.message });
    });
  });
}

async function main() {
  console.log('🚀 Warmth Modes Test Suite');
  console.log(`Running ${tests.length} test files...\n`);
  
  const startTime = Date.now();
  
  for (const test of tests) {
    await runTest(test);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n✅ Passed: ${totalPassed}/${tests.length}`);
  console.log(`❌ Failed: ${totalFailed}/${tests.length}`);
  console.log(`⏱️  Duration: ${duration}s\n`);
  
  if (totalFailed > 0) {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED');
    console.log('\n🎉 Warmth modes system fully tested and working!\n');
  }
}

main().catch(err => {
  console.error('\n❌ Test runner failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
