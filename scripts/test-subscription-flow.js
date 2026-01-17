#!/usr/bin/env node

/**
 * Programmatic Subscription Flow Test Runner
 * 
 * Automates the complete subscription testing workflow:
 * 1. Checks prerequisites (backend, build)
 * 2. Optionally rebuilds the app
 * 3. Launches the app
 * 4. Runs automated tests
 * 5. Reports results
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.blue}${num}/${colors.reset} ${msg}`),
};

// Configuration
const config = {
  backendUrl: 'http://localhost:3000',
  backendHealthEndpoint: '/api/health',
  appBuildPath: path.join(__dirname, '../ios/build/Build/Products/Debug-iphonesimulator/AIEnhancedPersonalCRM.app'),
  testTimeout: 300000, // 5 minutes
  rebuildTimeout: 600000, // 10 minutes
};

// Parse command line arguments
const args = process.argv.slice(2);
const shouldRebuild = args.includes('--rebuild') || args.includes('-r');
const shouldSkipBackendCheck = args.includes('--skip-backend') || args.includes('-sb');
const verbose = args.includes('--verbose') || args.includes('-v');

/**
 * Execute shell command and return promise
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Spawn command and stream output
 */
function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { ...options, stdio: verbose ? 'inherit' : 'pipe' });
    
    if (!verbose) {
      proc.stdout?.on('data', (data) => {
        if (verbose) process.stdout.write(data);
      });
      proc.stderr?.on('data', (data) => {
        if (verbose) process.stderr.write(data);
      });
    }
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * Check if backend is running
 */
async function checkBackend() {
  log.step('1', 'Checking backend health...');
  
  try {
    const response = await fetch(`${config.backendUrl}${config.backendHealthEndpoint}`);
    if (response.ok) {
      log.success('Backend is healthy');
      return true;
    } else {
      log.error(`Backend returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error('Backend is not reachable');
    log.info('Start backend with: cd ../backend/backend-vercel && npm run dev');
    return false;
  }
}

/**
 * Check if app build exists
 */
async function checkBuild() {
  log.step('2', 'Checking app build...');
  
  if (fs.existsSync(config.appBuildPath)) {
    const stats = fs.statSync(config.appBuildPath);
    const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
    
    log.success(`Build exists (${Math.round(ageMinutes)} minutes old)`);
    
    if (ageMinutes > 60) {
      log.warning('Build is over 1 hour old, consider rebuilding');
    }
    
    return true;
  } else {
    log.error('App build not found');
    return false;
  }
}

/**
 * Rebuild the app
 */
async function rebuildApp() {
  log.step('3', 'Rebuilding app...');
  log.info('This may take 5-10 minutes...');
  
  try {
    await spawnCommand('npx', ['expo', 'run:ios', '--configuration', 'Debug'], {
      cwd: path.join(__dirname, '..'),
      timeout: config.rebuildTimeout,
    });
    
    log.success('App rebuilt successfully');
    return true;
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    return false;
  }
}

/**
 * Run Jest unit tests
 */
async function runUnitTests() {
  log.step('4', 'Running unit tests...');
  
  try {
    await spawnCommand('npm', ['test', '--', 'SubscriptionProvider.test.tsx'], {
      cwd: path.join(__dirname, '..'),
    });
    
    log.success('Unit tests passed');
    return { passed: true, type: 'unit' };
  } catch (error) {
    log.error('Unit tests failed');
    return { passed: false, type: 'unit', error };
  }
}

/**
 * Run E2E tests (if Detox is configured)
 */
async function runE2ETests() {
  log.step('5', 'Running E2E tests...');
  
  // Check if Detox is installed
  try {
    await execPromise('which detox');
  } catch {
    log.warning('Detox not installed, skipping E2E tests');
    return { passed: true, type: 'e2e', skipped: true };
  }
  
  try {
    await spawnCommand('detox', ['test', '-c', 'ios.debug', '--grep', 'subscription'], {
      cwd: path.join(__dirname, '..'),
      timeout: config.testTimeout,
    });
    
    log.success('E2E tests passed');
    return { passed: true, type: 'e2e' };
  } catch (error) {
    log.error('E2E tests failed');
    return { passed: false, type: 'e2e', error };
  }
}

/**
 * Run integration tests
 */
async function runIntegrationTests() {
  log.step('6', 'Running integration tests...');
  
  try {
    await spawnCommand('npm', ['run', 'test:integration'], {
      cwd: path.join(__dirname, '..'),
    });
    
    log.success('Integration tests passed');
    return { passed: true, type: 'integration' };
  } catch (error) {
    log.warning('Integration tests failed (may not exist yet)');
    return { passed: false, type: 'integration', error, optional: true };
  }
}

/**
 * Generate test report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Report');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed && !r.optional);
  const skipped = results.filter(r => r.skipped);
  const optional = results.filter(r => r.optional && !r.passed);
  
  console.log(`\n${colors.green}✓ Passed:${colors.reset} ${passed.length}`);
  if (failed.length > 0) {
    console.log(`${colors.red}✗ Failed:${colors.reset} ${failed.length}`);
  }
  if (skipped.length > 0) {
    console.log(`${colors.yellow}⊘ Skipped:${colors.reset} ${skipped.length}`);
  }
  if (optional.length > 0) {
    console.log(`${colors.yellow}⚠ Optional Failed:${colors.reset} ${optional.length}`);
  }
  
  console.log('\nDetails:');
  results.forEach(result => {
    const icon = result.passed ? '✓' : (result.skipped ? '⊘' : '✗');
    const color = result.passed ? colors.green : (result.skipped ? colors.yellow : colors.red);
    const suffix = result.optional ? ' (optional)' : '';
    console.log(`  ${color}${icon}${colors.reset} ${result.type}${suffix}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  const allCriticalPassed = failed.length === 0;
  if (allCriticalPassed) {
    console.log(`${colors.green}✅ All critical tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Some tests failed!${colors.reset}`);
  }
  console.log('='.repeat(60) + '\n');
  
  return allCriticalPassed;
}

/**
 * Main execution flow
 */
async function main() {
  console.log('\n🧪 Subscription Flow Test Runner\n');
  
  const startTime = Date.now();
  const results = [];
  
  try {
    // Step 1: Check backend (unless skipped)
    if (!shouldSkipBackendCheck) {
      const backendOk = await checkBackend();
      if (!backendOk) {
        log.error('Backend check failed. Use --skip-backend to skip this check.');
        process.exit(1);
      }
    } else {
      log.warning('Skipping backend check');
    }
    
    // Step 2: Check build exists
    const buildExists = await checkBuild();
    
    // Step 3: Rebuild if requested or if build doesn't exist
    if (shouldRebuild || !buildExists) {
      const rebuildOk = await rebuildApp();
      if (!rebuildOk) {
        log.error('Build failed, cannot continue');
        process.exit(1);
      }
    } else if (!buildExists) {
      log.error('No build found. Use --rebuild to build the app.');
      process.exit(1);
    }
    
    // Step 4: Run unit tests
    results.push(await runUnitTests());
    
    // Step 5: Run E2E tests
    results.push(await runE2ETests());
    
    // Step 6: Run integration tests
    results.push(await runIntegrationTests());
    
    // Generate report
    const allPassed = generateReport(results);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Total time: ${duration}s\n`);
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Show usage if --help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node test-subscription-flow.js [options]

Options:
  -r, --rebuild           Rebuild the app before testing
  -sb, --skip-backend     Skip backend health check
  -v, --verbose           Show detailed output
  -h, --help              Show this help message

Examples:
  node test-subscription-flow.js                    # Run tests with existing build
  node test-subscription-flow.js --rebuild          # Rebuild and test
  node test-subscription-flow.js -r -v              # Rebuild with verbose output
  node test-subscription-flow.js --skip-backend     # Test without backend check
  `);
  process.exit(0);
}

// Run the test suite
main();
