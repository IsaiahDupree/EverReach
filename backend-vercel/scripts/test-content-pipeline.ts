/**
 * End-to-End Content Pipeline Test
 *
 * Calls each API endpoint in order and reports results
 * Run: npx ts-node scripts/test-content-pipeline.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(name: string, endpoint: string, method: string = 'GET', body?: any): Promise<TestResult> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n[${name}] Testing ${method} ${endpoint}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_TOKEN || 'test-token'}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      console.log(`✅ PASS (${response.status})`);
      results.push({ name, status: 'PASS', statusCode: response.status, data });
      return { name, status: 'PASS', statusCode: response.status };
    } else {
      console.log(`❌ FAIL (${response.status}): ${data.error || JSON.stringify(data)}`);
      results.push({ name, status: 'FAIL', statusCode: response.status, error: data.error });
      return { name, status: 'FAIL', statusCode: response.status, error: data.error };
    }
  } catch (error) {
    console.log(`❌ FAIL (Error): ${String(error)}`);
    results.push({ name, status: 'FAIL', error: String(error) });
    return { name, status: 'FAIL', error: String(error) };
  }
}

async function runTests() {
  console.log('=== Content Pipeline E2E Test ===\n');

  // 1. Health check
  await test('Health Check', '/api/v1/content/health');

  // 2. Signals sync
  await test('Signals Sync', '/api/cron/signals-sync');

  // 3. Strategy generation
  await test('Strategy Generate', '/api/cron/strategy-generate');

  // 4. Candidates generation
  await test('Candidates Generate', '/api/cron/candidates-generate');

  // 5. Candidates scoring
  await test('Candidates Score', '/api/cron/candidates-score');

  // 6. Copy and assets
  await test('Copy and Assets', '/api/cron/copy-and-assets');

  // 7. QA and queue fill
  await test('QA and Queue Fill', '/api/cron/qa-and-queue-fill');

  // 8. Dashboard
  await test('Dashboard', '/api/v1/content/dashboard');

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n=== Test Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
