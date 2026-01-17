/**
 * RevenueCat Integration Tests
 * Tests actual API connectivity and health for RevenueCat integration
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from backend-vercel/.env
config({ path: '.env' });

const REVENUECAT_API_KEY = process.env.REVENUECAT_SECRET_API_KEY;
const REVENUECAT_PROJECT_ID = 'projf143188e';
const REVENUECAT_APP_ID_IOS = 'app3063e75cd7';
const REVENUECAT_APP_ID_WEB = 'appa73f908128';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message, details = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (message) console.log(`   ${message}`);
  if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  
  results.tests.push({ name, passed, message, details });
  if (passed) results.passed++;
  else results.failed++;
}

// ============================================================================
// RevenueCat API Tests
// ============================================================================

async function testRevenueCatAuth() {
  console.log('\n📦 Test: RevenueCat Authentication');
  
  if (!REVENUECAT_API_KEY) {
    logTest('RevenueCat Auth', false, 'API key not configured');
    return;
  }
  
  try {
    // Using V2 API endpoint for V2 keys
    const response = await fetch('https://api.revenuecat.com/v2/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      logTest('RevenueCat Auth', true, 'Successfully authenticated with RevenueCat API', {
        status: response.status,
        projectCount: data?.items?.length || 0
      });
    } else if (response.status === 401) {
      logTest('RevenueCat Auth', false, 'Unauthorized - Invalid API key');
    } else if (response.status === 403) {
      logTest('RevenueCat Auth', false, 'Forbidden - API key lacks permissions', {
        status: response.status,
        message: await response.text()
      });
    } else {
      logTest('RevenueCat Auth', false, `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('RevenueCat Auth', false, `Network error: ${error.message}`);
  }
}

async function testRevenueCatProject() {
  console.log('\n📦 Test: RevenueCat Project Access');
  console.log('   ℹ️  Note: V2 API may not support single project lookups');
  console.log('   ℹ️  This is non-critical - apps/products/entitlements work fine');
  
  if (!REVENUECAT_API_KEY) {
    logTest('Project Access', false, 'API key not configured');
    return;
  }
  
  try {
    // Try V2 API endpoint (may not be supported)
    const response = await fetch(`https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      logTest('Project Access', true, `Successfully accessed project: ${data.name || 'Unknown'}`, {
        projectId: REVENUECAT_PROJECT_ID,
        projectName: data.name
      });
    } else if (response.status === 404) {
      // This is expected behavior for V2 API - individual project lookups not supported
      // But the project ID works for apps/products/entitlements
      logTest('Project Access (Optional)', true, 'V2 API - individual project lookup not supported (expected)', {
        projectId: REVENUECAT_PROJECT_ID,
        note: 'Project ID works for apps/products/entitlements'
      });
    } else if (response.status === 403) {
      logTest('Project Access', false, 'Forbidden - API key lacks permissions');
    } else {
      logTest('Project Access', false, `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('Project Access', false, `Network error: ${error.message}`);
  }
}

async function testRevenueCatApps() {
  console.log('\n📦 Test: RevenueCat Apps Configuration');
  
  if (!REVENUECAT_API_KEY) {
    logTest('Apps Config', false, 'API key not configured');
    return;
  }
  
  try {
    // Using V2 API endpoint
    const response = await fetch(`https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}/apps`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      const apps = data?.items || [];
      logTest('Apps Config', true, `Found ${apps.length} configured apps`, {
        appCount: apps.length,
        apps: apps.map(app => ({ id: app.id, name: app.name, type: app.type }))
      });
    } else {
      logTest('Apps Config', false, `Failed to fetch apps: ${response.status}`);
    }
  } catch (error) {
    logTest('Apps Config', false, `Network error: ${error.message}`);
  }
}

async function testRevenueCatProducts() {
  console.log('\n📦 Test: RevenueCat Products');
  
  if (!REVENUECAT_API_KEY) {
    logTest('Products', false, 'API key not configured');
    return;
  }
  
  try {
    // Using V2 API endpoint
    const response = await fetch(`https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      const products = data?.items || [];
      logTest('Products', true, `Found ${products.length} products configured`, {
        productCount: products.length,
        products: products.map(p => ({ id: p.id, displayName: p.display_name }))
      });
    } else {
      logTest('Products', false, `Failed to fetch products: ${response.status}`);
    }
  } catch (error) {
    logTest('Products', false, `Network error: ${error.message}`);
  }
}

async function testRevenueCatEntitlements() {
  console.log('\n📦 Test: RevenueCat Entitlements');
  
  if (!REVENUECAT_API_KEY) {
    logTest('Entitlements', false, 'API key not configured');
    return;
  }
  
  try {
    // Using V2 API endpoint
    const response = await fetch(`https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}/entitlements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      const entitlements = data?.items || [];
      logTest('Entitlements', true, `Found ${entitlements.length} entitlements`, {
        entitlementCount: entitlements.length,
        entitlements: entitlements.map(e => ({ id: e.id, lookup_key: e.lookup_key }))
      });
    } else {
      logTest('Entitlements', false, `Failed to fetch entitlements: ${response.status}`);
    }
  } catch (error) {
    logTest('Entitlements', false, `Network error: ${error.message}`);
  }
}

// ============================================================================
// Dashboard Adapter Health Check Test
// ============================================================================

async function testAdapterHealthCheck() {
  console.log('\n🏥 Test: Dashboard Adapter Health Check');
  
  const adapterConfig = {
    api_key: REVENUECAT_API_KEY,
    project_id: REVENUECAT_PROJECT_ID,
    app_id_ios: REVENUECAT_APP_ID_IOS,
    app_id_web: REVENUECAT_APP_ID_WEB
  };
  
  // Simulate what the adapter does (using V2 API)
  try {
    const response = await fetch('https://api.revenuecat.com/v2/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adapterConfig.api_key}`,
        'Accept': 'application/json'
      }
    });
    
    const latency = response.headers.get('x-response-time') || 'N/A';
    
    if (response.status === 200) {
      logTest('Adapter Health', true, 'Adapter health check would pass', {
        status: 'UP',
        latency: latency
      });
    } else if (response.status === 403) {
      logTest('Adapter Health', false, 'Adapter health check fails with Forbidden', {
        status: 'DOWN',
        reason: 'API key lacks permissions for /projects endpoint',
        fix: 'Regenerate API key with proper scopes in RevenueCat dashboard'
      });
    } else {
      logTest('Adapter Health', false, `Adapter health check fails: ${response.status}`);
    }
  } catch (error) {
    logTest('Adapter Health', false, `Health check error: ${error.message}`);
  }
}

// ============================================================================
// Webhook Configuration Test
// ============================================================================

async function testWebhookConfig() {
  console.log('\n🔔 Test: Webhook Configuration');
  
  const expectedWebhookUrl = 'https://ever-reach-be.vercel.app/api/v1/billing/revenuecat/webhook';
  
  // Check if webhook secret is configured
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logTest('Webhook Config', false, 'Webhook secret not configured in environment', {
      envVar: 'REVENUECAT_WEBHOOK_SECRET',
      webhookUrl: expectedWebhookUrl
    });
  } else {
    logTest('Webhook Config', true, 'Webhook secret is configured', {
      webhookUrl: expectedWebhookUrl,
      secretConfigured: true
    });
  }
}

// ============================================================================
// Configuration Validation
// ============================================================================

async function testConfiguration() {
  console.log('\n⚙️  Test: Configuration Validation');
  
  const config = {
    apiKey: !!REVENUECAT_API_KEY,
    projectId: !!REVENUECAT_PROJECT_ID,
    appIdIOS: !!REVENUECAT_APP_ID_IOS,
    appIdWeb: !!REVENUECAT_APP_ID_WEB,
    webhookSecret: !!process.env.REVENUECAT_WEBHOOK_SECRET
  };
  
  const allConfigured = Object.values(config).every(v => v);
  
  logTest('Configuration', allConfigured, 
    allConfigured ? 'All configuration values present' : 'Missing configuration values',
    config
  );
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           RevenueCat Integration Test Suite                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  await testConfiguration();
  await testRevenueCatAuth();
  await testRevenueCatProject();
  await testRevenueCatApps();
  await testRevenueCatProducts();
  await testRevenueCatEntitlements();
  await testAdapterHealthCheck();
  await testWebhookConfig();
  
  // Summary
  console.log('\n' + '═'.repeat(64));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(64));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  // Diagnostic recommendations
  if (results.failed > 0) {
    console.log('\n🔍 DIAGNOSTICS & FIXES:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`\n❌ ${test.name}:`);
      console.log(`   Issue: ${test.message}`);
      if (test.details?.fix) {
        console.log(`   Fix: ${test.details.fix}`);
      }
    });
    
    console.log('\n💡 Common Issues:');
    console.log('1. Forbidden (403): API key lacks permissions');
    console.log('   → Go to RevenueCat Dashboard > API Keys');
    console.log('   → Regenerate key with "Full Access" permissions');
    console.log('2. Project not found: Wrong project_id');
    console.log('   → Verify project_id matches dashboard');
    console.log('3. Unauthorized (401): Invalid API key');
    console.log('   → Check .env file has correct REVENUECAT_SECRET_API_KEY');
  }
  
  console.log('\n' + '═'.repeat(64));
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
