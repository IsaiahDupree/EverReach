/**
 * Developer Dashboard - End-to-End Tests
 * 
 * Tests the complete flow:
 * 1. Stripe Adapter health check
 * 2. Health Check API endpoint
 * 3. Metrics Query API endpoint
 * 
 * Run with:
 * node test/backend/dashboard-e2e.mjs
 */

import { getEnv, getAccessToken, apiFetch } from './_shared.mjs';

// Colors for test output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

let passedTests = 0;
let failedTests = 0;

/**
 * Test helper
 */
function test(description, testFn) {
  return async () => {
    try {
      await testFn();
      passedTests++;
      console.log(`${colors.green}✓${colors.reset} ${description}`);
    } catch (error) {
      failedTests++;
      console.log(`${colors.red}✗${colors.reset} ${description}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
      if (error.details) {
        console.log(`  ${colors.yellow}Details: ${JSON.stringify(error.details, null, 2)}${colors.reset}`);
      }
    }
  };
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

/**
 * Test Suite
 */
const tests = [
  // ============================================================================
  // Health Check API Tests
  // ============================================================================
  test('Health Check API: Returns 200 OK', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json, ms } = await apiFetch(apiBase, '/api/integrations/health', {
      method: 'GET',
      token,
    });

    assert(res.ok, `Health check failed: ${res.status}`, json);
    assert(json.workspace_id, 'workspace_id should be present', json);
    assert(Array.isArray(json.results), 'results should be an array', json);
    
    console.log(`  ${colors.cyan}Response time: ${ms}ms${colors.reset}`);
    console.log(`  ${colors.cyan}Services checked: ${json.results.length}${colors.reset}`);
  }),

  test('Health Check API: Returns service status', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json } = await apiFetch(apiBase, '/api/integrations/health', {
      method: 'GET',
      token,
    });

    assert(res.ok, `Health check failed: ${res.status}`, json);
    
    if (json.results.length > 0) {
      const firstResult = json.results[0];
      assert(firstResult.service, 'Service name should be present', firstResult);
      assert(firstResult.status, 'Status should be present', firstResult);
      assert(firstResult.last_check, 'Last check timestamp should be present', firstResult);
      
      console.log(`  ${colors.cyan}First service: ${firstResult.service}${colors.reset}`);
      console.log(`  ${colors.cyan}Status: ${firstResult.status}${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}No services configured yet${colors.reset}`);
    }
  }),

  test('Health Check API: Can filter by service', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json } = await apiFetch(apiBase, '/api/integrations/health?services=stripe', {
      method: 'GET',
      token,
    });

    assert(res.ok, `Health check failed: ${res.status}`, json);
    assert(Array.isArray(json.results), 'results should be an array', json);
    
    if (json.results.length > 0) {
      const stripeResult = json.results.find(r => r.service === 'stripe');
      assert(stripeResult, 'Stripe result should be present', json.results);
      console.log(`  ${colors.cyan}Stripe status: ${stripeResult.status}${colors.reset}`);
    }
  }),

  test('Health Check API: Rejects unauthenticated requests', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');

    const { res } = await apiFetch(apiBase, '/api/integrations/health', {
      method: 'GET',
    });

    assert(res.status === 401, 'Should return 401 for unauthenticated', { status: res.status });
  }),

  // ============================================================================
  // Metrics Query API Tests
  // ============================================================================
  test('Metrics Query API: Returns 200 OK', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json, ms } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      token,
      body: JSON.stringify({
        queries: [
          {
            metric_name: 'stripe.mrr_usd',
            from: 'now-30d',
            to: 'now',
            interval: '1d',
            agg: 'avg',
          },
        ],
      }),
    });

    assert(res.ok, `Metrics query failed: ${res.status}`, json);
    assert(Array.isArray(json.results), 'results should be an array', json);
    
    console.log(`  ${colors.cyan}Response time: ${ms}ms${colors.reset}`);
    console.log(`  ${colors.cyan}Queries executed: ${json.results.length}${colors.reset}`);
  }),

  test('Metrics Query API: Returns metric points', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      token,
      body: JSON.stringify({
        queries: [
          {
            metric_name: 'stripe.mrr_usd',
            from: 'now-7d',
            to: 'now',
            interval: '1d',
          },
        ],
      }),
    });

    assert(res.ok, `Metrics query failed: ${res.status}`, json);
    assert(json.results.length > 0, 'Should have at least one result', json);
    
    const firstResult = json.results[0];
    assert(firstResult.metric_name === 'stripe.mrr_usd', 'Metric name should match', firstResult);
    assert(Array.isArray(firstResult.points), 'Points should be an array', firstResult);
    
    console.log(`  ${colors.cyan}Data points: ${firstResult.points.length}${colors.reset}`);
  }),

  test('Metrics Query API: Supports multiple queries', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      token,
      body: JSON.stringify({
        queries: [
          {
            metric_name: 'stripe.mrr_usd',
            from: 'now-7d',
            to: 'now',
          },
          {
            metric_name: 'stripe.arr_usd',
            from: 'now-7d',
            to: 'now',
          },
        ],
      }),
    });

    assert(res.ok, `Metrics query failed: ${res.status}`, json);
    assert(json.results.length === 2, 'Should have 2 results', json);
    
    console.log(`  ${colors.cyan}Result 1: ${json.results[0].metric_name}${colors.reset}`);
    console.log(`  ${colors.cyan}Result 2: ${json.results[1].metric_name}${colors.reset}`);
  }),

  test('Metrics Query API: Supports relative time ranges', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res, json } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      token,
      body: JSON.stringify({
        queries: [
          {
            metric_name: 'stripe.mrr_usd',
            from: 'now-30d',
            to: 'now',
            interval: '1w',
          },
        ],
      }),
    });

    assert(res.ok, `Metrics query failed: ${res.status}`, json);
    console.log(`  ${colors.cyan}Data points for 30 days: ${json.results[0].points.length}${colors.reset}`);
  }),

  test('Metrics Query API: Supports aggregation types', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const aggregations = ['sum', 'avg', 'min', 'max'];
    
    for (const agg of aggregations) {
      const { res, json } = await apiFetch(apiBase, '/api/metrics/query', {
        method: 'POST',
        token,
        body: JSON.stringify({
          queries: [
            {
              metric_name: 'stripe.mrr_usd',
              from: 'now-7d',
              to: 'now',
              agg,
            },
          ],
        }),
      });

      assert(res.ok, `Metrics query with ${agg} failed: ${res.status}`, json);
    }
    
    console.log(`  ${colors.cyan}Tested aggregations: ${aggregations.join(', ')}${colors.reset}`);
  }),

  test('Metrics Query API: Rejects unauthenticated requests', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');

    const { res } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      body: JSON.stringify({
        queries: [{ metric_name: 'test', from: 'now-1d', to: 'now' }],
      }),
    });

    assert(res.status === 401, 'Should return 401 for unauthenticated', { status: res.status });
  }),

  test('Metrics Query API: Validates request body', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const token = await getAccessToken();

    const { res } = await apiFetch(apiBase, '/api/metrics/query', {
      method: 'POST',
      token,
      body: JSON.stringify({ invalid: 'body' }),
    });

    assert(res.status === 400, 'Should return 400 for invalid body', { status: res.status });
  }),
];

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Developer Dashboard - End-to-End Tests${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  for (const testFn of tests) {
    await testFn();
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}  Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}  Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
