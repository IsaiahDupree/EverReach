/**
 * Performance Benchmarks
 * 
 * Measures response times for critical operations with defined SLAs:
 * - Message Generation: < 3s (critical for UX)
 * - Contact Operations: < 500ms
 * - Search: < 1s
 * - Analysis: < 5s
 */

import { randomUUID } from 'crypto';
import { apiFetch, getAccessToken, getEnv, ensureContact, writeReport } from './_shared.mjs';

const rid = randomUUID();

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  CRITICAL: {
    message_generation: 3000,      // Message gen must be < 3s
    compose_prepare: 2000,         // Compose prep < 2s
  },
  HIGH: {
    contact_create: 500,           // Contact CRUD < 500ms
    contact_get: 500,
    contact_update: 500,
    contact_list: 1000,
    search: 1000,                  // Search < 1s
  },
  MEDIUM: {
    analysis_quick: 5000,          // Quick analysis < 5s
    warmth_recompute: 2000,        // Warmth < 2s
    interaction_create: 500,
  },
  LOW: {
    analysis_full: 10000,          // Full analysis < 10s
    templates_list: 1000,
  },
};

function evaluatePerformance(operation, duration, threshold) {
  const percentage = (duration / threshold) * 100;
  if (duration <= threshold) {
    return {
      status: 'pass',
      rating: duration <= threshold * 0.5 ? 'excellent' : duration <= threshold * 0.75 ? 'good' : 'acceptable',
      message: `✅ ${duration}ms (${percentage.toFixed(0)}% of threshold)`,
    };
  } else {
    return {
      status: 'fail',
      rating: 'slow',
      message: `⚠️ ${duration}ms (${percentage.toFixed(0)}% of threshold) - EXCEEDS LIMIT`,
    };
  }
}

async function runBenchmark(name, fn, threshold, priority) {
  const iterations = priority === 'CRITICAL' ? 3 : 1; // Run critical ops multiple times
  const timings = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      timings.push(duration);
    } catch (error) {
      return {
        name,
        priority,
        threshold,
        error: error.message,
        passed: false,
      };
    }
  }
  
  // Calculate statistics
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const p95 = timings.length > 1 ? timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)] : avg;
  
  const evaluation = evaluatePerformance(name, avg, threshold);
  
  return {
    name,
    priority,
    threshold,
    timings: {
      avg: Math.round(avg),
      min,
      max,
      p95: Math.round(p95),
      iterations,
    },
    evaluation,
    passed: evaluation.status === 'pass',
  };
}

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();

  const benchmarks = [];
  let exitCode = 0;

  console.log('\n🔬 Performance Benchmarks Starting...\n');
  console.log('Testing critical operations with defined SLAs:');
  console.log(`  - Message Generation: < ${THRESHOLDS.CRITICAL.message_generation}ms (CRITICAL)`);
  console.log(`  - Contact Operations: < ${THRESHOLDS.HIGH.contact_create}ms (HIGH)`);
  console.log(`  - Search: < ${THRESHOLDS.HIGH.search}ms (HIGH)`);
  console.log(`  - Analysis: < ${THRESHOLDS.MEDIUM.analysis_quick}ms (MEDIUM)\n`);

  // Setup: Create test contact
  let testContactId = null;
  try {
    const { id } = await ensureContact({ base: BASE, token, origin: ORIGIN, name: `Perf Test ${rid.slice(0, 8)}` });
    testContactId = id;
    console.log(`✅ Test contact created: ${id}\n`);
  } catch (setupError) {
    console.error(`❌ Setup failed: ${setupError.message}`);
    process.exit(1);
  }

  // === CRITICAL OPERATIONS (Must be fast for UX) ===
  console.log('🔴 CRITICAL Operations (UX-blocking):\n');

  // Benchmark 1: Message Generation (MOST CRITICAL)
  const msgBenchmark = await runBenchmark(
    'Message Generation (POST /v1/agent/compose/smart)',
    async () => {
      const payload = {
        contact_id: testContactId,
        goal: 're_engage',
        channel: 'email',
        context: 'Quick follow-up message',
      };
      await apiFetch(BASE, '/v1/agent/compose/smart', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
    },
    THRESHOLDS.CRITICAL.message_generation,
    'CRITICAL'
  );
  benchmarks.push(msgBenchmark);
  console.log(`  ${msgBenchmark.evaluation.message} - ${msgBenchmark.name}`);
  if (!msgBenchmark.passed) exitCode = 1;

  // Benchmark 2: Compose Prepare
  const composeBenchmark = await runBenchmark(
    'Compose Prepare (POST /v1/compose)',
    async () => {
      const payload = {
        contact_id: testContactId,
        goal: 'follow_up',
        channel: 'email',
      };
      await apiFetch(BASE, '/v1/compose', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
    },
    THRESHOLDS.CRITICAL.compose_prepare,
    'CRITICAL'
  );
  benchmarks.push(composeBenchmark);
  console.log(`  ${composeBenchmark.evaluation.message} - ${composeBenchmark.name}\n`);
  if (!composeBenchmark.passed) exitCode = 1;

  // === HIGH PRIORITY OPERATIONS ===
  console.log('🟠 HIGH Priority Operations (Frequent user actions):\n');

  // Benchmark 3: Contact Create
  const contactCreateBenchmark = await runBenchmark(
    'Contact Create (POST /v1/contacts)',
    async () => {
      const payload = {
        name: `Perf Contact ${randomUUID().slice(0, 8)}`,
        emails: [`perf-${randomUUID().slice(0, 8)}@example.com`],
        tags: ['perf_test'],
      };
      await apiFetch(BASE, '/v1/contacts', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
    },
    THRESHOLDS.HIGH.contact_create,
    'HIGH'
  );
  benchmarks.push(contactCreateBenchmark);
  console.log(`  ${contactCreateBenchmark.evaluation.message} - ${contactCreateBenchmark.name}`);
  if (!contactCreateBenchmark.passed) exitCode = 1;

  // Benchmark 4: Contact Get
  const contactGetBenchmark = await runBenchmark(
    'Contact Get (GET /v1/contacts/:id)',
    async () => {
      await apiFetch(BASE, `/v1/contacts/${testContactId}`, { token, origin: ORIGIN });
    },
    THRESHOLDS.HIGH.contact_get,
    'HIGH'
  );
  benchmarks.push(contactGetBenchmark);
  console.log(`  ${contactGetBenchmark.evaluation.message} - ${contactGetBenchmark.name}`);
  if (!contactGetBenchmark.passed) exitCode = 1;

  // Benchmark 5: Contact List
  const contactListBenchmark = await runBenchmark(
    'Contact List (GET /v1/contacts)',
    async () => {
      await apiFetch(BASE, '/v1/contacts?limit=20', { token, origin: ORIGIN });
    },
    THRESHOLDS.HIGH.contact_list,
    'HIGH'
  );
  benchmarks.push(contactListBenchmark);
  console.log(`  ${contactListBenchmark.evaluation.message} - ${contactListBenchmark.name}`);
  if (!contactListBenchmark.passed) exitCode = 1;

  // Benchmark 6: Search
  const searchBenchmark = await runBenchmark(
    'Search (POST /v1/search)',
    async () => {
      await apiFetch(BASE, '/v1/search', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({ q: 'test' }),
      });
    },
    THRESHOLDS.HIGH.search,
    'HIGH'
  );
  benchmarks.push(searchBenchmark);
  console.log(`  ${searchBenchmark.evaluation.message} - ${searchBenchmark.name}\n`);
  if (!searchBenchmark.passed) exitCode = 1;

  // === MEDIUM PRIORITY OPERATIONS ===
  console.log('🟡 MEDIUM Priority Operations (Background tasks):\n');

  // Benchmark 7: Quick Analysis
  const analysisQuickBenchmark = await runBenchmark(
    'Quick Analysis (POST /v1/agent/analyze/contact)',
    async () => {
      await apiFetch(BASE, '/v1/agent/analyze/contact', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({ contact_id: testContactId, mode: 'quick' }),
      });
    },
    THRESHOLDS.MEDIUM.analysis_quick,
    'MEDIUM'
  );
  benchmarks.push(analysisQuickBenchmark);
  console.log(`  ${analysisQuickBenchmark.evaluation.message} - ${analysisQuickBenchmark.name}`);
  if (!analysisQuickBenchmark.passed) exitCode = 1;

  // Benchmark 8: Warmth Recompute
  const warmthBenchmark = await runBenchmark(
    'Warmth Recompute (POST /v1/warmth/recompute)',
    async () => {
      await apiFetch(BASE, '/v1/warmth/recompute', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({ contact_ids: [testContactId] }),
      });
    },
    THRESHOLDS.MEDIUM.warmth_recompute,
    'MEDIUM'
  );
  benchmarks.push(warmthBenchmark);
  console.log(`  ${warmthBenchmark.evaluation.message} - ${warmthBenchmark.name}\n`);
  if (!warmthBenchmark.passed) exitCode = 1;

  // Generate detailed report
  const lines = [
    '# Performance Benchmark Report',
    '',
    `- **Run ID**: ${rid}`,
    `- **Timestamp**: ${new Date().toISOString()}`,
    `- **Backend**: ${BASE}`,
    '',
    '## Executive Summary',
    '',
  ];

  const criticalTests = benchmarks.filter(b => b.priority === 'CRITICAL');
  const criticalPassed = criticalTests.filter(b => b.passed).length;
  const allPassed = benchmarks.filter(b => b.passed).length;

  lines.push(`- **Overall Pass Rate**: ${allPassed}/${benchmarks.length} (${((allPassed / benchmarks.length) * 100).toFixed(1)}%)`);
  lines.push(`- **Critical Operations**: ${criticalPassed}/${criticalTests.length} passing`);
  lines.push('');

  if (criticalPassed < criticalTests.length) {
    lines.push('## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED');
    lines.push('');
    lines.push('**Action Required**: The following critical operations exceed performance thresholds:');
    lines.push('');
    criticalTests.filter(b => !b.passed).forEach(b => {
      lines.push(`- **${b.name}**: ${b.timings.avg}ms (threshold: ${b.threshold}ms)`);
    });
    lines.push('');
  }

  lines.push('## Performance Thresholds');
  lines.push('');
  lines.push('| Priority | Operation | Threshold |');
  lines.push('|----------|-----------|-----------|');
  lines.push(`| 🔴 CRITICAL | Message Generation | < ${THRESHOLDS.CRITICAL.message_generation}ms |`);
  lines.push(`| 🔴 CRITICAL | Compose Prepare | < ${THRESHOLDS.CRITICAL.compose_prepare}ms |`);
  lines.push(`| 🟠 HIGH | Contact Operations | < ${THRESHOLDS.HIGH.contact_create}ms |`);
  lines.push(`| 🟠 HIGH | Search | < ${THRESHOLDS.HIGH.search}ms |`);
  lines.push(`| 🟡 MEDIUM | Analysis (Quick) | < ${THRESHOLDS.MEDIUM.analysis_quick}ms |`);
  lines.push('');

  lines.push('## Detailed Results');
  lines.push('');
  lines.push('| Operation | Priority | Avg | Min | Max | P95 | Threshold | Status |');
  lines.push('|-----------|----------|-----|-----|-----|-----|-----------|--------|');

  for (const b of benchmarks) {
    if (b.error) {
      lines.push(`| ${b.name} | ${b.priority} | ERROR | - | - | - | ${b.threshold}ms | ❌ |`);
    } else {
      const status = b.passed ? '✅' : '❌';
      const { avg, min, max, p95 } = b.timings;
      lines.push(`| ${b.name} | ${b.priority} | ${avg}ms | ${min}ms | ${max}ms | ${p95}ms | ${b.threshold}ms | ${status} |`);
    }
  }

  lines.push('');
  lines.push('## Performance Ratings');
  lines.push('');
  lines.push('- **Excellent**: < 50% of threshold');
  lines.push('- **Good**: 50-75% of threshold');
  lines.push('- **Acceptable**: 75-100% of threshold');
  lines.push('- **Slow**: > 100% of threshold (FAILING)');
  lines.push('');

  for (const b of benchmarks) {
    if (!b.error) {
      const icon = b.evaluation.rating === 'excellent' ? '🟢' : 
                   b.evaluation.rating === 'good' ? '🟡' : 
                   b.evaluation.rating === 'acceptable' ? '🟠' : '🔴';
      lines.push(`- ${icon} **${b.name}**: ${b.timings.avg}ms (${b.evaluation.rating})`);
    }
  }

  lines.push('');
  lines.push('## Recommendations');
  lines.push('');

  const slowOps = benchmarks.filter(b => !b.passed);
  if (slowOps.length > 0) {
    lines.push('### Operations Needing Optimization');
    lines.push('');
    slowOps.forEach(b => {
      lines.push(`- **${b.name}** (${b.timings.avg}ms)`);
      if (b.name.includes('Message Generation')) {
        lines.push('  - Consider caching OpenAI responses');
        lines.push('  - Implement streaming responses');
        lines.push('  - Optimize prompt size');
      } else if (b.name.includes('Contact')) {
        lines.push('  - Add database indexes');
        lines.push('  - Optimize RLS policies');
        lines.push('  - Implement query result caching');
      } else if (b.name.includes('Search')) {
        lines.push('  - Implement full-text search indexes');
        lines.push('  - Add pagination and limits');
        lines.push('  - Consider Elasticsearch/Algolia');
      }
    });
  } else {
    lines.push('✅ All operations meet performance requirements!');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);

  await writeReport(lines, 'test/agent/reports', 'performance_benchmarks');
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 PERFORMANCE BENCHMARK SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Benchmarks:     ${benchmarks.length}`);
  console.log(`Passing:              ✅ ${allPassed}`);
  console.log(`Failing:              ❌ ${benchmarks.length - allPassed}`);
  console.log(`Critical Operations:  ${criticalPassed}/${criticalTests.length} passing`);
  console.log('='.repeat(70));

  if (exitCode !== 0) {
    console.log('\n❌ Performance benchmarks FAILED');
    console.log('Some operations exceed performance thresholds.');
  } else {
    console.log('\n✅ All performance benchmarks PASSED');
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
