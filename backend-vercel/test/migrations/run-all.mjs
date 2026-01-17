#!/usr/bin/env node

/**
 * Run all migration tests
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  'test-occurred-at-migration.mjs',
];

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = join(__dirname, testFile);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testFile}`);
    console.log('='.repeat(60));
    
    const proc = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${testFile} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function runAll() {
  console.log('🧪 Running All Migration Tests\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await runTest(test);
      passed++;
    } catch (error) {
      console.error(`\n❌ ${test} failed:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    process.exit(1);
  }

  console.log('✅ All migration tests passed!\n');
}

runAll().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
