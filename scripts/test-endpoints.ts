/**
 * Endpoint Test Script
 * 
 * Tests all API endpoints against local or production environment.
 * 
 * Usage:
 *   npx ts-node scripts/test-endpoints.ts local     # Test localhost:3000
 *   npx ts-node scripts/test-endpoints.ts prod      # Test ever-reach-be.vercel.app
 *   npx ts-node scripts/test-endpoints.ts           # Defaults to production
 */

const ENVIRONMENTS = {
  local: {
    api: 'http://localhost:3000',
    web: 'http://localhost:8081',
  },
  prod: {
    api: 'https://ever-reach-be.vercel.app',
    web: 'https://www.everreach.app',
  },
};

// All endpoints to test
const ENDPOINTS = {
  // Health & Version (no auth)
  health: { path: '/api/health', method: 'GET', auth: false },
  version: { path: '/api/version', method: 'GET', auth: false },
  
  // User & Auth (requires auth)
  me: { path: '/api/v1/me', method: 'GET', auth: true },
  entitlements: { path: '/api/v1/me/entitlements', method: 'GET', auth: true },
  composeSettings: { path: '/api/v1/me/compose-settings', method: 'GET', auth: true },
  onboardingStatus: { path: '/api/v1/me/onboarding-status', method: 'GET', auth: true },
  personaNotes: { path: '/api/v1/me/persona-notes', method: 'GET', auth: true },
  
  // Contacts (requires auth)
  contacts: { path: '/api/v1/contacts', method: 'GET', auth: true },
  contactsImportHealth: { path: '/api/v1/contacts/import/health', method: 'GET', auth: true },
  contactsImportList: { path: '/api/v1/contacts/import/list', method: 'GET', auth: true },
  
  // Pipelines & Templates (requires auth)
  pipelines: { path: '/api/v1/pipelines', method: 'GET', auth: true },
  templates: { path: '/api/v1/templates', method: 'GET', auth: true },
  
  // Interactions & Goals (requires auth)
  interactions: { path: '/api/v1/interactions', method: 'GET', auth: true },
  goals: { path: '/api/v1/goals', method: 'GET', auth: true },
  
  // Config (mixed auth)
  paywallLive: { path: '/api/v1/config/paywall-live', method: 'GET', auth: true },
  paywallStrategy: { path: '/api/v1/config/paywall-strategy', method: 'GET', auth: false },
  warmthModes: { path: '/api/v1/warmth/modes', method: 'GET', auth: false },
  
  // POST endpoints (requires auth + body)
  billingRestore: { path: '/api/v1/billing/restore', method: 'POST', auth: true, body: {} },
  files: { path: '/api/v1/files', method: 'POST', auth: true, body: { path: 'test/health-check.txt', contentType: 'text/plain' } },
  search: { path: '/api/v1/search', method: 'POST', auth: true, body: { query: 'test' } },
  eventsTrack: { path: '/api/v1/events/track', method: 'POST', auth: true, body: { event_type: 'health_check', metadata: { source: 'test-script' } } },
  featureRequests: { path: '/api/v1/feature-requests', method: 'POST', auth: true, body: { type: 'feature', title: 'Test', description: 'Health check test' } },
  agentChat: { path: '/api/v1/agent/chat', method: 'POST', auth: true, body: { message: 'Health check' } },
};

interface TestResult {
  endpoint: string;
  path: string;
  method: string;
  status: number | null;
  ok: boolean;
  reachable: boolean;
  durationMs: number;
  error?: string;
}

async function testEndpoint(
  baseUrl: string,
  name: string,
  config: { path: string; method: string; auth: boolean; body?: any },
  authToken?: string
): Promise<TestResult> {
  const start = Date.now();
  const url = `${baseUrl}${config.path}`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (config.auth && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options: RequestInit = {
      method: config.method,
      headers,
    };
    
    if (config.body && (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH')) {
      options.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    
    return {
      endpoint: name,
      path: config.path,
      method: config.method,
      status: response.status,
      ok: response.ok,
      reachable: true,
      durationMs: duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      endpoint: name,
      path: config.path,
      method: config.method,
      status: null,
      ok: false,
      reachable: false,
      durationMs: duration,
      error: error.message,
    };
  }
}

async function runTests(env: 'local' | 'prod', authToken?: string) {
  const config = ENVIRONMENTS[env];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing against: ${env.toUpperCase()}`);
  console.log(`📍 API Base: ${config.api}`);
  console.log(`🔐 Auth Token: ${authToken ? 'Provided' : 'Not provided (auth endpoints will fail)'}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results: TestResult[] = [];
  
  for (const [name, endpointConfig] of Object.entries(ENDPOINTS)) {
    const result = await testEndpoint(config.api, name, endpointConfig, authToken);
    results.push(result);
    
    const statusIcon = result.ok ? '✅' : result.reachable ? '⚠️' : '❌';
    const statusText = result.status !== null ? result.status.toString() : 'ERR';
    console.log(`${statusIcon} ${result.method.padEnd(6)} ${result.path.padEnd(40)} ${statusText.padEnd(5)} ${result.durationMs}ms`);
  }
  
  // Summary
  const passed = results.filter(r => r.ok).length;
  const reachable = results.filter(r => r.reachable && !r.ok).length;
  const failed = results.filter(r => !r.reachable).length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`   ✅ Passed:    ${passed}`);
  console.log(`   ⚠️  Reachable: ${reachable} (validation errors expected)`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`   📈 Total:     ${results.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  return results;
}

// Main
const args = process.argv.slice(2);
const env = (args[0] === 'local' ? 'local' : 'prod') as 'local' | 'prod';
const authToken = args[1] || process.env.SUPABASE_AUTH_TOKEN;

runTests(env, authToken).then(results => {
  const failedCount = results.filter(r => !r.reachable).length;
  process.exit(failedCount > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

