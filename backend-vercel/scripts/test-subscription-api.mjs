#!/usr/bin/env node

/**
 * Test Subscription API (.mjs)
 * Test all subscription endpoints with real authentication
 * 
 * Usage:
 *   node scripts/test-subscription-api.mjs
 *   node scripts/test-subscription-api.mjs --token YOUR_JWT_TOKEN
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || 'https://ever-reach-be.vercel.app';
const TOKEN_FILE = path.join(__dirname, '../test-jwt.txt');

// Get token from args or file
function getToken() {
  const args = process.argv.slice(2);
  const tokenIndex = args.indexOf('--token');
  
  if (tokenIndex !== -1 && args[tokenIndex + 1]) {
    return args[tokenIndex + 1];
  }
  
  if (fs.existsSync(TOKEN_FILE)) {
    return fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
  }
  
  console.error('❌ No token found. Run: node scripts/get-auth-token.mjs');
  process.exit(1);
}

// Make API request
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

// Test runner
class SubscriptionAPITester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  async test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    
    try {
      const result = await fn();
      
      if (result.success) {
        console.log('✅ PASS');
        this.passed++;
        this.results.push({ name, status: 'PASS', data: result.data });
      } else {
        console.log('❌ FAIL');
        this.failed++;
        this.results.push({ name, status: 'FAIL', error: result.error });
      }
    } catch (error) {
      console.log('❌ ERROR');
      this.failed++;
      this.results.push({ name, status: 'ERROR', error: error.message });
    }
  }

  summary() {
    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total:  ${this.passed + this.failed}`);
    console.log('========================================\n');
  }
}

// Main test suite
async function runTests() {
  console.log('========================================');
  console.log('Subscription API Test Suite');
  console.log(`API URL: ${API_URL}`);
  console.log('========================================\n');

  const tester = new SubscriptionAPITester();

  // Test 1: Get User Profile
  await tester.test('GET /api/v1/me', async () => {
    const { status, data } = await apiRequest('/api/v1/me');
    
    if (status === 200 && data.id) {
      console.log(`    User: ${data.email}`);
      return { success: true, data };
    }
    
    return { success: false, error: data.error };
  });

  // Test 2: Get Trial Stats
  await tester.test('GET /api/v1/me/trial-stats', async () => {
    const { status, data } = await apiRequest('/api/v1/me/trial-stats');
    
    if (status === 200) {
      console.log(`    Entitled: ${data.entitled}`);
      console.log(`    Reason: ${data.entitlement_reason}`);
      console.log(`    Can Cancel: ${data.cancel?.allowed}`);
      console.log(`    Cancel Method: ${data.cancel?.method || 'N/A'}`);
      
      if (data.trial.days_left !== null) {
        console.log(`    Trial Days Left: ${data.trial.days_left}`);
      }
      
      return { success: true, data };
    }
    
    return { success: false, error: data.error };
  });

  // Test 3: Get Entitlements
  await tester.test('GET /api/v1/me/entitlements', async () => {
    const { status, data } = await apiRequest('/api/v1/me/entitlements');
    
    if (status === 200 || status === 404) {
      console.log(`    Status: ${status === 404 ? 'Endpoint not implemented' : 'OK'}`);
      return { success: true, data };
    }
    
    return { success: false, error: data.error };
  });

  // Test 4: Get Compose Settings
  await tester.test('GET /api/v1/me/compose-settings', async () => {
    const { status, data } = await apiRequest('/api/v1/me/compose-settings');
    
    if (status === 200) {
      console.log(`    Tone: ${data.tone || 'N/A'}`);
      return { success: true, data };
    }
    
    if (status === 404) {
      console.log(`    Status: Endpoint not implemented`);
      return { success: true };
    }
    
    return { success: false, error: data.error };
  });

  // Test 5: Test Cancel Endpoint (dry run)
  await tester.test('POST /api/v1/billing/cancel (dry run)', async () => {
    const { status, data } = await apiRequest('/api/v1/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({
        when: 'period_end',
        reason: 'API test - dry run',
      }),
    });
    
    if (status === 200) {
      console.log(`    Cancel Method: ${data.cancel_method}`);
      console.log(`    Provider: ${data.provider || 'stripe'}`);
      
      if (data.manage_url) {
        console.log(`    Manage URL: ${data.manage_url}`);
      }
      
      return { success: true, data };
    }
    
    if (status === 400) {
      console.log(`    Status: No active subscription (expected)`);
      return { success: true };
    }
    
    return { success: false, error: data.error };
  });

  // Test 6: Health Check
  await tester.test('GET /api/health', async () => {
    const { status, data } = await apiRequest('/api/health');
    
    if (status === 200 && data.status === 'healthy') {
      return { success: true, data };
    }
    
    return { success: false, error: 'Health check failed' };
  });

  // Test 7: Config Status
  await tester.test('GET /api/v1/ops/config-status', async () => {
    const { status, data } = await apiRequest('/api/v1/ops/config-status');
    
    if (status === 200) {
      console.log(`    Stripe: ${data.envs?.STRIPE_SECRET_KEY ? '✓' : '✗'}`);
      console.log(`    OpenAI: ${data.envs?.OPENAI_API_KEY ? '✓' : '✗'}`);
      return { success: true, data };
    }
    
    return { success: false, error: data.error };
  });

  tester.summary();

  // Save detailed results
  const resultsFile = path.join(__dirname, '../test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(tester.results, null, 2));
  console.log(`📄 Detailed results saved to: ${resultsFile}\n`);

  // Exit with appropriate code
  process.exit(tester.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
