#!/usr/bin/env node
/**
 * Backend Comparison Test Suite
 * Runs tests against both LOCAL and DEPLOYED backends
 */

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';

const LOCAL_URL = 'http://localhost:3001';
const DEPLOYED_URL = 'https://ever-reach-be.vercel.app';

const TEST_FILES = [
  'agent/e2e-contacts-crud.mjs',
  'agent/e2e-interactions.mjs',
  'agent/e2e-warmth-tracking.mjs',
  'agent/e2e-billing.mjs',
  'agent/e2e-user-system.mjs',
  'agent/frontend_api_smoke.mjs',
];

function runTest(file, baseUrl) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      TEST_BASE_URL: baseUrl,
      NEXT_PUBLIC_API_URL: baseUrl,
      TEST_EMAIL: 'isaiahdupree33@gmail.com',
      TEST_PASSWORD: 'frogger12',
    };

    const proc = spawn('node', [file], {
      cwd: process.cwd(),
      env,
      stdio: 'pipe',
    });

    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr?.on('data', (data) => {
      output += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: 'TIMEOUT (60s)', duration: 60000 });
    }, 60000);

    const startTime = Date.now();
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      resolve({
        success: code === 0,
        code,
        output,
        duration,
      });
    });
  });
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🔬 Backend Comparison Test Suite                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 LOCAL:    ${LOCAL_URL}`);
  console.log(`📍 DEPLOYED: ${DEPLOYED_URL}\n`);
  console.log('═'.repeat(70));
  console.log('');

  const results = {
    local: [],
    deployed: [],
  };

  for (const testFile of TEST_FILES) {
    const testName = testFile.split('/').pop().replace('.mjs', '');
    console.log(`\n🧪 Testing: ${testName}`);
    console.log('─'.repeat(70));

    // Test LOCAL
    process.stdout.write('   LOCAL...    ');
    const localResult = await runTest(testFile, LOCAL_URL);
    const localStatus = localResult.success ? '✅ PASS' : '❌ FAIL';
    const localTime = `${(localResult.duration / 1000).toFixed(1)}s`;
    console.log(`${localStatus} (${localTime})`);
    results.local.push({ testName, ...localResult });

    // Test DEPLOYED
    process.stdout.write('   DEPLOYED... ');
    const deployedResult = await runTest(testFile, DEPLOYED_URL);
    const deployedStatus = deployedResult.success ? '✅ PASS' : '❌ FAIL';
    const deployedTime = `${(deployedResult.duration / 1000).toFixed(1)}s`;
    console.log(`${deployedStatus} (${deployedTime})`);
    results.deployed.push({ testName, ...deployedResult });

    // Show difference
    if (localResult.success !== deployedResult.success) {
      console.log('   ⚠️  MISMATCH DETECTED');
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 SUMMARY\n');

  const localPassed = results.local.filter(r => r.success).length;
  const deployedPassed = results.deployed.filter(r => r.success).length;
  const total = TEST_FILES.length;

  console.log('LOCAL Backend:');
  console.log(`   ✅ Passed: ${localPassed}/${total}`);
  console.log(`   ❌ Failed: ${total - localPassed}/${total}`);
  console.log(`   📈 Success Rate: ${((localPassed / total) * 100).toFixed(1)}%\n`);

  console.log('DEPLOYED Backend:');
  console.log(`   ✅ Passed: ${deployedPassed}/${total}`);
  console.log(`   ❌ Failed: ${total - deployedPassed}/${total}`);
  console.log(`   📈 Success Rate: ${((deployedPassed / total) * 100).toFixed(1)}%\n`);

  // Show discrepancies
  const discrepancies = [];
  for (let i = 0; i < results.local.length; i++) {
    const local = results.local[i];
    const deployed = results.deployed[i];
    if (local.success !== deployed.success) {
      discrepancies.push({
        test: local.testName,
        local: local.success ? 'PASS' : 'FAIL',
        deployed: deployed.success ? 'PASS' : 'FAIL',
      });
    }
  }

  if (discrepancies.length > 0) {
    console.log('⚠️  DISCREPANCIES FOUND:\n');
    discrepancies.forEach(d => {
      console.log(`   ${d.test}`);
      console.log(`      Local:    ${d.local}`);
      console.log(`      Deployed: ${d.deployed}\n`);
    });
  } else {
    console.log('✅ No discrepancies - Both backends behave identically!\n');
  }

  // Failed tests details
  const localFailed = results.local.filter(r => !r.success);
  const deployedFailed = results.deployed.filter(r => !r.success);

  if (localFailed.length > 0) {
    console.log('❌ LOCAL Failed Tests:');
    localFailed.forEach(r => {
      console.log(`   - ${r.testName}`);
      if (r.output.includes('ERROR') || r.output.includes('FAIL')) {
        const errorLine = r.output.split('\n').find(line => 
          line.includes('ERROR') || line.includes('FAIL')
        );
        if (errorLine) console.log(`     ${errorLine.trim().slice(0, 60)}`);
      }
    });
    console.log('');
  }

  if (deployedFailed.length > 0) {
    console.log('❌ DEPLOYED Failed Tests:');
    deployedFailed.forEach(r => {
      console.log(`   - ${r.testName}`);
      if (r.output.includes('ERROR') || r.output.includes('FAIL')) {
        const errorLine = r.output.split('\n').find(line => 
          line.includes('ERROR') || line.includes('FAIL')
        );
        if (errorLine) console.log(`     ${errorLine.trim().slice(0, 60)}`);
      }
    });
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('');

  // Exit with appropriate code
  const allPassed = localPassed === total && deployedPassed === total;
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  process.exit(1);
});
