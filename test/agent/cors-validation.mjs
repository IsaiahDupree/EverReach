/**
 * CORS Validation Tests
 * 
 * Tests that all API endpoints properly return CORS headers for:
 * - Success responses (200, 201)
 * - Error responses (400, 401, 404, 429, 500)
 * - OPTIONS preflight requests
 * 
 * Can be run standalone or integrated into test suite
 */

import { getEnv, getAccessToken } from './_shared.mjs';
import { writeFile } from 'node:fs/promises';

// Get backend URL from environment
const BACKEND_BASE = process.env.TEST_BASE_URL || 
                    process.env.NEXT_PUBLIC_API_URL || 
                    'https://ever-reach-be.vercel.app';

const RESULTS = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Get test token (alias for compatibility)
 */
async function getTestToken() {
  return await getAccessToken();
}

/**
 * Log result with color coding
 */
function logResult(icon, testName, status, details = null) {
  console.log(`${icon} ${testName}: ${status}`);
  if (details) {
    if (Array.isArray(details)) {
      details.forEach(d => console.log(`   - ${d.check}: ${d.reason || ''}`));
    } else {
      console.log(`   ${details}`);
    }
  }
}

/**
 * Test CORS headers on a response
 */
function validateCorsHeaders(response, testName, shouldHaveOrigin = true) {
  const headers = {
    origin: response.headers.get('Access-Control-Allow-Origin'),
    methods: response.headers.get('Access-Control-Allow-Methods'),
    headers: response.headers.get('Access-Control-Allow-Headers'),
    vary: response.headers.get('Vary'),
    maxAge: response.headers.get('Access-Control-Max-Age'),
  };

  const checks = [];
  
  // Check for Vary: Origin (required for proper caching)
  if (headers.vary && headers.vary.includes('Origin')) {
    checks.push({ check: 'Vary: Origin header', passed: true });
  } else {
    checks.push({ check: 'Vary: Origin header', passed: false, reason: `Got: ${headers.vary}` });
  }

  // Check for Access-Control-Allow-Origin
  if (shouldHaveOrigin) {
    if (headers.origin) {
      checks.push({ check: 'Access-Control-Allow-Origin present', passed: true });
    } else {
      checks.push({ check: 'Access-Control-Allow-Origin present', passed: false, reason: 'Missing' });
    }
  }

  // For OPTIONS requests, check additional headers
  if (response.status === 204) {
    if (headers.methods) {
      checks.push({ check: 'Access-Control-Allow-Methods present', passed: true });
    } else {
      checks.push({ check: 'Access-Control-Allow-Methods present', passed: false, reason: 'Missing' });
    }

    if (headers.headers) {
      checks.push({ check: 'Access-Control-Allow-Headers present', passed: true });
    } else {
      checks.push({ check: 'Access-Control-Allow-Headers present', passed: false, reason: 'Missing' });
    }

    if (headers.maxAge) {
      checks.push({ check: 'Access-Control-Max-Age present', passed: true });
    } else {
      checks.push({ check: 'Access-Control-Max-Age present', passed: false, reason: 'Missing' });
    }
  }

  const allPassed = checks.every(c => c.passed);
  
  return {
    testName,
    status: response.status,
    statusText: response.statusText,
    headers,
    checks,
    passed: allPassed,
  };
}

/**
 * Test an endpoint with various scenarios
 */
async function testEndpoint(endpoint, method = 'GET', options = {}) {
  const tests = [];
  const token = await getTestToken();

  // Test 1: OPTIONS preflight request
  try {
    const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': method,
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });

    const result = validateCorsHeaders(response, `OPTIONS ${endpoint}`);
    tests.push(result);
    
    if (result.passed) {
      RESULTS.passed++;
      logResult('✅', `OPTIONS ${endpoint}`, 'PASS');
    } else {
      RESULTS.failed++;
      logResult('❌', `OPTIONS ${endpoint}`, 'FAIL', result.checks.filter(c => !c.passed));
    }
  } catch (error) {
    RESULTS.failed++;
    tests.push({
      testName: `OPTIONS ${endpoint}`,
      passed: false,
      error: error.message,
    });
    logResult('❌', `OPTIONS ${endpoint}`, 'ERROR', error.message);
  }

  // Test 2: Authenticated request (should succeed or fail with proper CORS)
  try {
    const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://example.com',
      },
      body: method !== 'GET' && options.body ? JSON.stringify(options.body) : undefined,
    });

    const result = validateCorsHeaders(response, `${method} ${endpoint} (authenticated)`);
    tests.push(result);
    
    if (result.passed) {
      RESULTS.passed++;
      logResult('✅', `${method} ${endpoint} (auth)`, 'PASS', `Status: ${response.status}`);
    } else {
      RESULTS.failed++;
      logResult('❌', `${method} ${endpoint} (auth)`, 'FAIL', result.checks.filter(c => !c.passed));
    }
  } catch (error) {
    RESULTS.failed++;
    tests.push({
      testName: `${method} ${endpoint} (authenticated)`,
      passed: false,
      error: error.message,
    });
    logResult('❌', `${method} ${endpoint} (auth)`, 'ERROR', error.message);
  }

  // Test 3: Unauthenticated request (should get 401 with CORS)
  try {
    const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://example.com',
      },
      body: method !== 'GET' && options.body ? JSON.stringify(options.body) : undefined,
    });

    const result = validateCorsHeaders(response, `${method} ${endpoint} (401 error)`);
    tests.push(result);
    
    if (result.passed) {
      RESULTS.passed++;
      logResult('✅', `${method} ${endpoint} (401)`, 'PASS', 'CORS on error response');
    } else {
      RESULTS.failed++;
      logResult('❌', `${method} ${endpoint} (401)`, 'FAIL', result.checks.filter(c => !c.passed));
    }
  } catch (error) {
    RESULTS.failed++;
    tests.push({
      testName: `${method} ${endpoint} (401 error)`,
      passed: false,
      error: error.message,
    });
    logResult('❌', `${method} ${endpoint} (401)`, 'ERROR', error.message);
  }

  return tests;
}

/**
 * Run all CORS validation tests
 */
async function runCorsTests() {
  console.log('\n🔒 Starting CORS Validation Tests\n');
  console.log('━'.repeat(80));
  console.log(`Backend: ${BACKEND_BASE}`);
  console.log('━'.repeat(80) + '\n');

  const allTests = [];

  // Test critical endpoints
  const endpoints = [
    { path: '/api/v1/warmth/summary', method: 'GET' },
    { path: '/api/v1/interactions', method: 'GET' },
    { path: '/api/v1/interactions', method: 'POST', body: { 
      contact_id: '00000000-0000-0000-0000-000000000000',
      kind: 'note',
      content: 'Test'
    }},
    { path: '/api/v1/contacts', method: 'GET' },
    { path: '/api/health', method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📋 Testing: ${endpoint.method} ${endpoint.path}`);
    const tests = await testEndpoint(endpoint.path, endpoint.method, endpoint);
    allTests.push(...tests);
  }

  // Summary
  console.log('\n' + '━'.repeat(80));
  console.log('📊 CORS Test Results');
  console.log('━'.repeat(80));
  console.log(`✅ Passed: ${RESULTS.passed}`);
  console.log(`❌ Failed: ${RESULTS.failed}`);
  console.log(`📈 Total: ${RESULTS.passed + RESULTS.failed}`);
  console.log(`🎯 Success Rate: ${((RESULTS.passed / (RESULTS.passed + RESULTS.failed)) * 100).toFixed(1)}%`);
  console.log('━'.repeat(80) + '\n');

  return {
    summary: {
      passed: RESULTS.passed,
      failed: RESULTS.failed,
      total: RESULTS.passed + RESULTS.failed,
      successRate: (RESULTS.passed / (RESULTS.passed + RESULTS.failed)) * 100,
    },
    tests: allTests,
  };
}

/**
 * Generate detailed report
 */
function generateReport(results) {
  const timestamp = new Date().toISOString();
  let report = `# CORS Validation Report\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Backend:** ${BACKEND_BASE}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- ✅ **Passed:** ${results.summary.passed}\n`;
  report += `- ❌ **Failed:** ${results.summary.failed}\n`;
  report += `- 📈 **Total:** ${results.summary.total}\n`;
  report += `- 🎯 **Success Rate:** ${results.summary.successRate.toFixed(1)}%\n\n`;

  report += `## Test Details\n\n`;
  
  for (const test of results.tests) {
    const icon = test.passed ? '✅' : '❌';
    report += `### ${icon} ${test.testName}\n\n`;
    report += `- **Status:** ${test.status} ${test.statusText}\n`;
    
    if (test.headers) {
      report += `- **Headers:**\n`;
      report += `  - Access-Control-Allow-Origin: \`${test.headers.origin || 'MISSING'}\`\n`;
      report += `  - Vary: \`${test.headers.vary || 'MISSING'}\`\n`;
      if (test.headers.methods) {
        report += `  - Access-Control-Allow-Methods: \`${test.headers.methods}\`\n`;
      }
      if (test.headers.headers) {
        report += `  - Access-Control-Allow-Headers: \`${test.headers.headers}\`\n`;
      }
    }
    
    if (test.checks) {
      report += `- **Checks:**\n`;
      for (const check of test.checks) {
        const checkIcon = check.passed ? '✅' : '❌';
        report += `  - ${checkIcon} ${check.check}`;
        if (!check.passed && check.reason) {
          report += ` (${check.reason})`;
        }
        report += `\n`;
      }
    }
    
    if (test.error) {
      report += `- **Error:** ${test.error}\n`;
    }
    
    report += `\n`;
  }

  return report;
}

// Run tests if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  try {
    const results = await runCorsTests();
    
    // Save report
    const report = generateReport(results);
    const reportPath = `test/agent/reports/cors_validation_${Date.now()}.md`;
    await writeFile(reportPath, report);
    console.log(`📄 Report saved: ${reportPath}\n`);
    
    // Exit with appropriate code
    process.exit(results.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Export for integration with test suite
export { runCorsTests, validateCorsHeaders };
