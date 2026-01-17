/**
 * Master Integration Test Runner
 * Runs all integration tests in sequence and generates summary report
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test suite configuration
const TEST_SUITES = [
  { name: 'RevenueCat', file: 'revenuecat.test.mjs', critical: true },
  { name: 'Stripe', file: 'stripe.test.mjs', critical: true },
  { name: 'Supabase', file: 'supabase.test.mjs', critical: true },
  { name: 'OpenAI', file: 'openai.test.mjs', critical: true },
  { name: 'PostHog', file: 'posthog.test.mjs', critical: false },
  { name: 'Superwall', file: 'superwall.test.mjs', critical: false },
  { name: 'Resend', file: 'resend.test.mjs', critical: true },
  { name: 'Twilio', file: 'twilio.test.mjs', critical: true },
  { name: 'Meta', file: 'meta.test.mjs', critical: false },
];

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: []
};

function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, testFile);
    const start = Date.now();
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🧪 Running: ${testFile}`);
    console.log('═'.repeat(70));
    
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - start;
      resolve({ code, duration });
    });
    
    child.on('error', (error) => {
      console.error(`Failed to start test: ${error.message}`);
      resolve({ code: 1, duration: 0, error: error.message });
    });
  });
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         EverReach Backend Integration Test Suite                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nRunning ${TEST_SUITES.length} test suites...\n`);
  
  for (const suite of TEST_SUITES) {
    results.total++;
    
    const result = await runTest(suite.file);
    
    const suiteResult = {
      name: suite.name,
      file: suite.file,
      passed: result.code === 0,
      duration: result.duration,
      critical: suite.critical,
      error: result.error
    };
    
    results.suites.push(suiteResult);
    
    if (result.code === 0) {
      results.passed++;
      console.log(`\n✅ ${suite.name} - PASSED (${result.duration}ms)`);
    } else {
      results.failed++;
      console.log(`\n❌ ${suite.name} - FAILED (${result.duration}ms)`);
      
      if (suite.critical) {
        console.log(`   ⚠️  This is a CRITICAL service - investigate immediately`);
      }
    }
  }
  
  // Generate summary report
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 FINAL TEST REPORT');
  console.log('═'.repeat(70));
  console.log(`\nTotal Suites: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  console.log('-'.repeat(70));
  results.suites.forEach(suite => {
    const status = suite.passed ? '✅' : '❌';
    const critical = suite.critical ? '[CRITICAL]' : '[NON-CRITICAL]';
    const duration = `${suite.duration}ms`;
    console.log(`${status} ${suite.name.padEnd(20)} ${critical.padEnd(18)} ${duration.padStart(10)}`);
  });
  
  // Critical failures
  const criticalFailures = results.suites.filter(s => !s.passed && s.critical);
  if (criticalFailures.length > 0) {
    console.log('\n⚠️  CRITICAL FAILURES:');
    console.log('-'.repeat(70));
    criticalFailures.forEach(suite => {
      console.log(`❌ ${suite.name}`);
      console.log(`   File: ${suite.file}`);
      if (suite.error) {
        console.log(`   Error: ${suite.error}`);
      }
    });
  }
  
  // Non-critical failures
  const nonCriticalFailures = results.suites.filter(s => !s.passed && !s.critical);
  if (nonCriticalFailures.length > 0) {
    console.log('\n⚡ NON-CRITICAL FAILURES:');
    console.log('-'.repeat(70));
    nonCriticalFailures.forEach(suite => {
      console.log(`⚠️  ${suite.name} (can be addressed later)`);
    });
  }
  
  // Recommendations
  console.log('\n💡 NEXT STEPS:');
  console.log('-'.repeat(70));
  
  if (criticalFailures.length > 0) {
    console.log('1. Fix critical service failures immediately');
    console.log('2. Run individual tests to diagnose: node test/integration/<service>.test.mjs');
    console.log('3. Check environment variables and API keys');
    console.log('4. Verify network connectivity to external services');
  } else if (nonCriticalFailures.length > 0) {
    console.log('1. Review non-critical failures');
    console.log('2. Plan fixes for next maintenance window');
    console.log('3. Monitor dashboard for service degradation');
  } else {
    console.log('✅ All tests passed! Backend integrations are healthy.');
    console.log('📝 Regular testing recommended: Run weekly or after config changes');
  }
  
  console.log('\n' + '═'.repeat(70));
  
  // Exit with appropriate code
  const exitCode = criticalFailures.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Handle signals
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Tests interrupted by user');
  process.exit(130);
});

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error running test suite:', error);
  process.exit(1);
});
