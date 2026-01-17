/**
 * Agent Test Runner (Legacy)
 * 
 * This runner has been replaced by run-all-unified.mjs which provides:
 * - Single comprehensive report with all test results
 * - Error logs and stack traces
 * - Performance metrics and success rates
 * - Better debugging experience
 * 
 * Usage:
 *   node ./test/agent/run-all-unified.mjs
 * 
 * Or to use this legacy runner:
 *   node ./test/agent/run-all.mjs
 */

import { spawn } from 'node:child_process';

console.log('⚠️  This is the legacy test runner.');
console.log('📊 For unified reporting with comprehensive error logs, use:');
console.log('   node ./test/agent/run-all-unified.mjs\n');
console.log('Redirecting to unified runner in 2 seconds...\n');

setTimeout(() => {
  const proc = spawn(process.execPath, ['test/agent/run-all-unified.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });
  
  proc.on('exit', (code) => process.exit(code));
}, 2000);
