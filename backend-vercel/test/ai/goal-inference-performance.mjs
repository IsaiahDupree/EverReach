// Performance Test: Goal Inference System
// Target: Complete inference cycle in < 2000ms
import { getEnv, getAccessToken, apiFetch, runId, writeReport, nowIso } from './_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true, 'https://ever-reach-be.vercel.app');
  const TEST_ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');

  const token = await getAccessToken();
  const id = runId();
  const testName = `GoalPerf-${id.slice(0, 8)}`;

  const benchmarks = [];
  let passed = false;

  try {
    // ============================================
    // BENCHMARK 1: Profile Goal Update
    // Target: < 200ms
    // ============================================
    const profileStart = Date.now();
    const goalsPayload = {
      business_goal: 'Close 10 deals',
      networking_goal: 'Expand network',
      personal_goal: 'Learn AI'
    };

    await apiFetch(BACKEND_BASE, '/api/v1/me/profile', {
      method: 'PATCH',
      token,
      origin: TEST_ORIGIN,
      body: JSON.stringify(goalsPayload)
    });

    const profileDuration = Date.now() - profileStart;
    benchmarks.push({
      name: 'Profile Goal Update',
      duration: profileDuration,
      target: 200,
      passed: profileDuration < 200
    });

    // ============================================
    // BENCHMARK 2: Create Test Contact
    // Target: < 300ms
    // ============================================
    const contactStart = Date.now();
    const contactPayload = {
      display_name: `${testName} Test`,
      email: `${testName}@test.com`
    };

    const contactRes = await apiFetch(BACKEND_BASE, '/api/v1/contacts', {
      method: 'POST',
      token,
      origin: TEST_ORIGIN,
      body: JSON.stringify(contactPayload)
    });

    const contactDuration = Date.now() - contactStart;
    const testContact = contactRes.json;
    
    benchmarks.push({
      name: 'Contact Creation',
      duration: contactDuration,
      target: 300,
      passed: contactDuration < 300
    });

    // ============================================
    // BENCHMARK 3: Message Composition with Goals
    // Target: < 2000ms
    // ============================================
    const composeStart = Date.now();
    const composePayload = {
      contact_id: testContact.id,
      channel: 'email',
      goal: 'business',
      context: 'Quick follow-up message'
    };

    await apiFetch(BACKEND_BASE, '/api/v1/compose', {
      method: 'POST',
      token,
      origin: TEST_ORIGIN,
      body: JSON.stringify(composePayload)
    });

    const composeDuration = Date.now() - composeStart;
    benchmarks.push({
      name: 'Message Composition (with goal context)',
      duration: composeDuration,
      target: 2000,
      passed: composeDuration < 2000
    });

    // ============================================
    // BENCHMARK 4: Persona Note Creation
    // Target: < 300ms
    // ============================================
    const noteStart = Date.now();
    const notePayload = {
      type: 'text',
      title: 'Goals Update',
      body_text: 'Working on enterprise partnerships',
      tags: ['goals']
    };

    await apiFetch(BACKEND_BASE, '/api/v1/me/persona-notes', {
      method: 'POST',
      token,
      origin: TEST_ORIGIN,
      body: JSON.stringify(notePayload)
    });

    const noteDuration = Date.now() - noteStart;
    benchmarks.push({
      name: 'Persona Note Creation',
      duration: noteDuration,
      target: 300,
      passed: noteDuration < 300
    });

    // ============================================
    // BENCHMARK 5: Multiple Rapid Compose Requests
    // Target: Average < 1500ms
    // ============================================
    const rapidStart = Date.now();
    const rapidRequests = [];

    for (let i = 0; i < 3; i++) {
      const reqStart = Date.now();
      await apiFetch(BACKEND_BASE, '/api/v1/compose', {
        method: 'POST',
        token,
        origin: TEST_ORIGIN,
        body: JSON.stringify({
          contact_id: testContact.id,
          channel: 'email',
          goal: 'business',
          context: `Follow-up message ${i + 1}`
        })
      });
      rapidRequests.push(Date.now() - reqStart);
    }

    const avgDuration = rapidRequests.reduce((sum, d) => sum + d, 0) / rapidRequests.length;
    benchmarks.push({
      name: 'Rapid Compose Requests (3x avg)',
      duration: Math.round(avgDuration),
      target: 1500,
      passed: avgDuration < 1500,
      details: `Individual: ${rapidRequests.map(d => `${d}ms`).join(', ')}`
    });

    // Cleanup test contact
    if (testContact?.id) {
      try {
        await apiFetch(BACKEND_BASE, `/api/v1/contacts/${testContact.id}`, {
          method: 'DELETE',
          token,
          origin: TEST_ORIGIN
        });
      } catch (e) {
        console.warn('[cleanup] Failed to delete contact:', e.message);
      }
    }

    // ============================================
    // Assessment
    // ============================================
    const allPassed = benchmarks.every(b => b.passed);
    const totalDuration = Date.now() - profileStart;
    passed = allPassed;

    const lines = [
      '# Performance Test: Goal Inference System',
      '',
      `**Test ID**: ${testName}`,
      `**Total Test Duration**: ${totalDuration}ms`,
      `**Timestamp**: ${nowIso()}`,
      '',
      '## Performance Benchmarks',
      '',
      '| Operation | Duration | Target | Status | Details |',
      '|-----------|----------|--------|--------|---------|',
      ...benchmarks.map(b => {
        const status = b.passed ? '✅ PASS' : '❌ FAIL';
        const percentage = ((b.duration / b.target) * 100).toFixed(0);
        const details = b.details || `${percentage}% of target`;
        return `| ${b.name} | ${b.duration}ms | < ${b.target}ms | ${status} | ${details} |`;
      }),
      '',
      '## Summary',
      `- **Tests Run**: ${benchmarks.length}`,
      `- **Passed**: ${benchmarks.filter(b => b.passed).length}`,
      `- **Failed**: ${benchmarks.filter(b => !b.passed).length}`,
      `- **Success Rate**: ${((benchmarks.filter(b => b.passed).length / benchmarks.length) * 100).toFixed(0)}%`,
      '',
      '## Performance Analysis',
      '',
      '### Slowest Operations',
      ...benchmarks
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .map((b, i) => `${i + 1}. **${b.name}**: ${b.duration}ms (target: ${b.target}ms)`),
      '',
      '### Recommendations',
      benchmarks.some(b => !b.passed)
        ? [
            '**⚠️ Performance Issues Detected**',
            '',
            ...benchmarks.filter(b => !b.passed).map(b => 
              `- **${b.name}** took ${b.duration}ms (target: ${b.target}ms) - Consider optimization`
            ),
          ].join('\n')
        : '**✅ All performance targets met!**',
      '',
      '## Overall Result',
      `**Status**: ${passed ? '✅ PASS' : '❌ FAIL'}`,
    ];

    await writeReport(lines, 'test/ai/reports', 'goal_inference_performance');

  } catch (err) {
    const errorMsg = err?.message || String(err);
    const lines = [
      '# Performance Test: Goal Inference System',
      '',
      `**Test ID**: ${testName}`,
      `**Status**: ❌ ERROR`,
      '',
      '## Error',
      '```',
      errorMsg,
      '```',
      '',
      '## Completed Benchmarks',
      ...benchmarks.map(b => `- ${b.name}: ${b.duration}ms (${b.passed ? '✅' : '❌'})`),
    ];
    await writeReport(lines, 'test/ai/reports', 'goal_inference_performance');
  }

  if (!passed) {
    console.error(`[goal-inference-performance] FAILED`);
    process.exit(1);
  }

  console.log('[goal-inference-performance] ✅ PASSED');
}

main().catch(err => {
  console.error('[goal-inference-performance] Fatal error:', err?.message || err);
  process.exit(1);
});
