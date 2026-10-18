#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Runs all test types: Functional, Integration, E2E, Security, Performance, System
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const testResults = {
  startTime: new Date(),
  endTime: null,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(80) + '\n', 'cyan');
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    log(`Running: ${command} ${args.join(' ')}`, 'blue');
    
    const proc = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });

    let output = '';
    if (options.silent && proc.stdout) {
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
    }

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      if (success) {
        log(`✅ Passed (${(duration / 1000).toFixed(2)}s)`, 'green');
      } else {
        log(`❌ Failed with code ${code} (${(duration / 1000).toFixed(2)}s)`, 'red');
      }
      
      resolve({
        success,
        code,
        duration,
        output: options.silent ? output : '',
      });
    });

    proc.on('error', (err) => {
      log(`❌ Error: ${err.message}`, 'red');
      resolve({
        success: false,
        code: 1,
        duration: Date.now() - startTime,
        error: err.message,
      });
    });
  });
}

async function runTestSuite(name, description, command, args, options = {}) {
  logSection(`${name}: ${description}`);
  
  const result = await runCommand(command, args, options);
  
  testResults.tests.push({
    name,
    description,
    ...result,
    timestamp: new Date(),
  });
  
  testResults.summary.total++;
  if (result.success) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  
  return result;
}

async function checkServerHealth(maxRetries = 30, retryDelay = 2000) {
  log('Checking backend server health...', 'yellow');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        log('✅ Backend server is healthy', 'green');
        return true;
      }
    } catch (err) {
      if (i < maxRetries - 1) {
        log(`Waiting for server... (attempt ${i + 1}/${maxRetries})`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  log('❌ Backend server health check failed', 'red');
  return false;
}

function generateReport() {
  logSection('TEST RESULTS SUMMARY');
  
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2);
  
  log(`Total Tests: ${testResults.summary.total}`, 'bright');
  log(`Passed: ${testResults.summary.passed}`, 'green');
  log(`Failed: ${testResults.summary.failed}`, testResults.summary.failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  log(`Total Duration: ${duration.toFixed(2)}s`, 'blue');
  
  log('\n' + 'Test Details:', 'bright');
  testResults.tests.forEach((test, idx) => {
    const status = test.success ? '✅' : '❌';
    const color = test.success ? 'green' : 'red';
    log(`  ${idx + 1}. ${status} ${test.name} (${(test.duration / 1000).toFixed(2)}s)`, color);
    log(`     ${test.description}`, 'reset');
  });
  
  // Save report to file
  const reportPath = join(process.cwd(), 'test-results', `comprehensive-test-report-${Date.now()}.json`);
  try {
    const reportData = {
      ...testResults,
      summary: {
        ...testResults.summary,
        passRate: parseFloat(passRate),
        totalDuration: duration,
      },
    };
    
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');
  } catch (err) {
    log(`Warning: Could not save report: ${err.message}`, 'yellow');
  }
  
  return testResults.summary.failed === 0;
}

async function main() {
  log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     EVERREACH BACKEND - COMPREHENSIVE TEST SUITE                  ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const args = process.argv.slice(2);
  const skipServer = args.includes('--skip-server');
  const skipE2E = args.includes('--skip-e2e');
  const skipPerf = args.includes('--skip-performance');
  const onlyQuick = args.includes('--quick');
  
  let serverProcess = null;
  
  try {
    // 1. Start Backend Server (unless skipped)
    if (!skipServer) {
      logSection('Starting Backend Server');
      log('Starting Next.js backend on port 3001...', 'yellow');
      
      serverProcess = spawn('npm', ['start'], {
        stdio: 'pipe',
        shell: true,
        detached: false,
      });
      
      serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready') || output.includes('started')) {
          log('✅ Backend server started', 'green');
        }
      });
      
      // Wait for server to be healthy
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        throw new Error('Backend server failed to start properly');
      }
    } else {
      log('Skipping server startup (--skip-server flag)', 'yellow');
      const isHealthy = await checkServerHealth(5, 1000);
      if (!isHealthy) {
        throw new Error('Backend server is not running. Start it first or remove --skip-server flag.');
      }
    }
    
    // 2. FUNCTIONAL TESTS (Unit + API Tests)
    await runTestSuite(
      'Functional Tests',
      'Unit tests, API endpoints, business logic',
      'npm',
      ['run', 'test:all'],
      { silent: false }
    );
    
    if (onlyQuick) {
      log('\n⚡ Quick mode enabled, skipping remaining tests', 'yellow');
    } else {
      // 3. INTEGRATION TESTS
      await runTestSuite(
        'Integration Tests',
        'Cross-system integrations, data flow, cascading effects',
        'npm',
        ['run', 'test:integration'],
        { silent: false }
      );
      
      // 4. E2E TESTS (unless skipped)
      if (!skipE2E) {
        await runTestSuite(
          'E2E Tests',
          'End-to-end user journeys, OAuth flows, webhooks',
          'npm',
          ['run', 'test:e2e'],
          { silent: false }
        );
      } else {
        log('Skipping E2E tests (--skip-e2e flag)', 'yellow');
        testResults.summary.skipped++;
      }
      
      // 5. SECURITY TESTS
      await runTestSuite(
        'Security Tests',
        'Authentication, authorization, injection attacks, XSS',
        'npm',
        ['run', 'test:security'],
        { silent: false }
      );
      
      // 6. PERFORMANCE TESTS (unless skipped)
      if (!skipPerf) {
        await runTestSuite(
          'Performance Tests',
          'Load testing, stress testing, rate limiting',
          'npm',
          ['run', 'test:perf:vitest'],
          { silent: false }
        );
      } else {
        log('Skipping performance tests (--skip-performance flag)', 'yellow');
        testResults.summary.skipped++;
      }
      
      // 7. SYSTEM-LEVEL TESTS (Service Integration)
      await runTestSuite(
        'System Tests',
        'Third-party services: Stripe, Supabase, OpenAI, etc.',
        'npm',
        ['run', 'test:services'],
        { silent: false }
      );
      
      // 8. MARKETING TESTS
      await runTestSuite(
        'Marketing Tests',
        'Analytics, attribution, enrichment, admin endpoints',
        'npm',
        ['run', 'test:marketing'],
        { silent: false }
      );
      
      // 9. CONTRACT TESTS
      await runTestSuite(
        'Contract Tests',
        'API contract validation, breaking change detection',
        'npm',
        ['run', 'test:contract'],
        { silent: false }
      );
    }
    
    // Generate and display results
    testResults.endTime = new Date();
    const allPassed = generateReport();
    
    // Cleanup
    if (serverProcess) {
      log('\n🛑 Stopping backend server...', 'yellow');
      serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    
    if (serverProcess) {
      serverProcess.kill('SIGKILL');
    }
    
    testResults.endTime = new Date();
    generateReport();
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  log('\n\n⚠️  Test suite interrupted by user', 'yellow');
  testResults.endTime = new Date();
  generateReport();
  process.exit(130);
});

main();
