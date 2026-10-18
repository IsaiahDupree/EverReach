/**
 * Subscription System - Complete Test Runner
 * 
 * Runs all subscription system tests in sequence
 * 
 * Run with:
 * node test/backend/subscription-test-all.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

const testFiles = [
  'subscription-enhanced-statuses.mjs',
];

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Running: ${testFile}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    const testPath = resolve(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✓ ${testFile} passed${colors.reset}`);
        resolve({ file: testFile, passed: true });
      } else {
        console.log(`${colors.red}✗ ${testFile} failed with code ${code}${colors.reset}`);
        resolve({ file: testFile, passed: false, code });
      }
    });

    child.on('error', (err) => {
      console.log(`${colors.red}✗ ${testFile} error: ${err.message}${colors.reset}`);
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Subscription System - Complete Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`Running ${testFiles.length} test suite(s)...`);

  const results = [];
  
  for (const testFile of testFiles) {
    try {
      const result = await runTest(testFile);
      results.push(result);
    } catch (err) {
      results.push({ file: testFile, passed: false, error: err.message });
    }
  }

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const icon = r.passed ? colors.green + '✓' : colors.red + '✗';
    const status = r.passed ? colors.green + 'PASS' : colors.red + 'FAIL';
    console.log(`${icon} ${r.file} ${status}${colors.reset}`);
  });

  console.log(`\n${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.blue}Total: ${results.length}${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
