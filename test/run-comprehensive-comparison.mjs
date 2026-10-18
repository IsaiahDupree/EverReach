#!/usr/bin/env node
/**
 * Run comprehensive E2E tests against both LOCAL and DEPLOYED backends
 */

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://localhost:3000';
const DEPLOYED_URL = 'https://ever-reach-be.vercel.app';
const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY);
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

// E2E test files to run
const E2E_TESTS = [
  'e2e-contacts-crud.mjs',
  'e2e-interactions.mjs',
  'e2e-warmth-tracking.mjs',
  'e2e-billing.mjs',
  'e2e-user-system.mjs',
  'e2e-templates-warmth-pipelines.mjs',
  'e2e-advanced-features.mjs',
  'frontend_api_smoke.mjs',
  'agent-compose-prepare-send.mjs',
  'agent-analyze-contact.mjs',
  'agent-contact-details.mjs',
  'agent-interactions-summary.mjs',
  'agent-message-goals.mjs',
  'cors-validation.mjs',
  'backend-tracking-events.mjs',
];

async function getAuthToken() {
  console.log('🔐 Getting authentication token...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  console.log(`   ✅ Token obtained (user: ${data.user.id})\n`);
  return data.session.access_token;
}

function runTest(file, baseUrl, environment, authToken) {
  return new Promise((resolve) => {
    // Tests expect BASE URL to include /api path
    const apiUrl = baseUrl.includes('/api') ? baseUrl : `${baseUrl}/api`;
    
    const env = {
      ...process.env,
      TEST_BASE_URL: baseUrl,
      NEXT_PUBLIC_API_URL: apiUrl,
      BACKEND_BASE: baseUrl,
      TEST_EMAIL: TEST_EMAIL,
      TEST_PASSWORD: TEST_PASSWORD,
      AUTH_TOKEN: authToken,
      ACCESS_TOKEN: authToken,
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    };

    const proc = spawn('node', [join('agent', file)], {
      cwd: process.cwd(),
      env,
      stdio: 'pipe',
    });

    let output = '';
    let hasError = false;

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      output += data.toString();
      hasError = true;
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ 
        success: false, 
        output: 'TIMEOUT (60s)', 
        duration: 60000,
        environment,
      });
    }, 60000);

    const startTime = Date.now();
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      // Check for success indicators in output
      const hasPass = output.includes('✅') || output.includes('PASS') || output.includes('All tests passed');
      const hasFail = output.includes('❌') || output.includes('FAIL') || output.includes('ERROR') || hasError;
      
      resolve({
        success: code === 0 || (hasPass && !hasFail),
        code,
        output,
        duration,
        environment,
      });
    });
  });
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 Comprehensive E2E Test Suite - Local vs Deployed         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 LOCAL:    ${LOCAL_URL}`);
  console.log(`📍 DEPLOYED: ${DEPLOYED_URL}`);
  console.log(`📋 Running ${E2E_TESTS.length} test suites\n`);

  // Get auth token
  const authToken = await getAuthToken();

  console.log('═'.repeat(70));
  console.log('');

  const results = {
    local: [],
    deployed: [],
  };

  let testNumber = 0;

  for (const testFile of E2E_TESTS) {
    testNumber++;
    const testName = testFile.replace('.mjs', '');
    
    console.log(`\n[${testNumber}/${E2E_TESTS.length}] 🧪 ${testName}`);
    console.log('─'.repeat(70));

    // Test LOCAL
    process.stdout.write('   LOCAL...    ');
    const startLocal = Date.now();
    const localResult = await runTest(testFile, LOCAL_URL, 'local', authToken);
    const localDuration = Date.now() - startLocal;
    const localStatus = localResult.success ? '✅ PASS' : '❌ FAIL';
    const localTime = `${(localDuration / 1000).toFixed(1)}s`;
    console.log(`${localStatus} (${localTime})`);
    results.local.push({ testName, ...localResult });

    // Test DEPLOYED
    process.stdout.write('   DEPLOYED... ');
    const startDeployed = Date.now();
    const deployedResult = await runTest(testFile, DEPLOYED_URL, 'deployed', authToken);
    const deployedDuration = Date.now() - startDeployed;
    const deployedStatus = deployedResult.success ? '✅ PASS' : '❌ FAIL';
    const deployedTime = `${(deployedDuration / 1000).toFixed(1)}s`;
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
  const total = E2E_TESTS.length;

  console.log('LOCAL Backend:');
  console.log(`   URL:      ${LOCAL_URL}`);
  console.log(`   ✅ Passed: ${localPassed}/${total}`);
  console.log(`   ❌ Failed: ${total - localPassed}/${total}`);
  console.log(`   📈 Success Rate: ${((localPassed / total) * 100).toFixed(1)}%\n`);

  console.log('DEPLOYED Backend:');
  console.log(`   URL:      ${DEPLOYED_URL}`);
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
    console.log('✅ Perfect Match - Both backends behave identically!\n');
  }

  // Performance comparison
  const localAvg = results.local.reduce((sum, r) => sum + r.duration, 0) / total;
  const deployedAvg = results.deployed.reduce((sum, r) => sum + r.duration, 0) / total;
  
  console.log('⚡ PERFORMANCE:\n');
  console.log(`   Local Avg:    ${(localAvg / 1000).toFixed(1)}s`);
  console.log(`   Deployed Avg: ${(deployedAvg / 1000).toFixed(1)}s`);
  
  if (localAvg < deployedAvg) {
    console.log(`   Winner:       🏆 LOCAL (${((deployedAvg - localAvg) / 1000).toFixed(1)}s faster)\n`);
  } else {
    console.log(`   Winner:       🏆 DEPLOYED (${((localAvg - deployedAvg) / 1000).toFixed(1)}s faster)\n`);
  }

  // Failed tests details
  const localFailed = results.local.filter(r => !r.success);
  const deployedFailed = results.deployed.filter(r => !r.success);

  if (localFailed.length > 0) {
    console.log('❌ LOCAL Failed Tests:');
    localFailed.forEach(r => {
      console.log(`   - ${r.testName}`);
      // Look for error patterns
      const errorMatch = r.output.match(/ERROR:?\s*(.+)/i);
      if (errorMatch) {
        console.log(`     ${errorMatch[1].substring(0, 70)}`);
      }
    });
    console.log('');
  }

  if (deployedFailed.length > 0) {
    console.log('❌ DEPLOYED Failed Tests:');
    deployedFailed.forEach(r => {
      console.log(`   - ${r.testName}`);
      const errorMatch = r.output.match(/ERROR:?\s*(.+)/i);
      if (errorMatch) {
        console.log(`     ${errorMatch[1].substring(0, 70)}`);
      }
    });
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('');

  // Exit with appropriate code
  const bothPerfect = localPassed === total && deployedPassed === total;
  const sameBehavior = discrepancies.length === 0;
  
  if (bothPerfect) {
    console.log('🎉 Perfect! All tests passed on both backends!\n');
    process.exit(0);
  } else if (sameBehavior) {
    console.log('✅ Consistent behavior across both backends (some tests failed identically)\n');
    process.exit(0);
  } else {
    console.log('⚠️  Inconsistent behavior detected between backends\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  process.exit(1);
});
