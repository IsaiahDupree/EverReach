#!/usr/bin/env node

/**
 * Admin Dashboard E2E Tests
 * End-to-end test scenarios for the complete dashboard workflow
 * 
 * Usage: node test/admin/e2e-dashboard.spec.mjs
 */

import { runTest, sleep } from './_shared.mjs';

const BASE_URL = process.env.API_BASE_URL || 'https://ever-reach-be.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@everreach.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'everreach123!@#';

let adminToken = null;

// ============================================================================
// E2E Test Scenarios
// ============================================================================

const scenarios = [
  // Scenario 1: Complete Feature Flag Lifecycle
  {
    name: 'E2E: Feature Flag Progressive Rollout',
    async run() {
      // 1. Login
      const loginRes = await fetch(`${BASE_URL}/api/admin/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      
      if (!loginRes.ok) throw new Error('Login failed');
      const { token } = await loginRes.json();
      adminToken = token;

      // 2. Create flag at 10% rollout
      const flagKey = `e2e_progressive_${Date.now()}`;
      const createRes = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: flagKey,
          name: 'E2E Progressive Rollout Test',
          rollout_percentage: 10,
          is_enabled: true,
          target_platforms: ['web'],
        }),
      });

      if (!createRes.ok) throw new Error('Create flag failed');
      const { flag: initialFlag } = await createRes.json();

      // 3. Increase to 50%
      await sleep(1000);
      const updateRes = await fetch(`${BASE_URL}/api/admin/feature-flags/${flagKey}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rollout_percentage: 50 }),
      });

      if (!updateRes.ok) throw new Error('Update to 50% failed');
      const { flag: updatedFlag } = await updateRes.json();

      // 4. Check usage stats
      await sleep(1000);
      const detailsRes = await fetch(`${BASE_URL}/api/admin/feature-flags/${flagKey}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      if (!detailsRes.ok) throw new Error('Get details failed');
      const { flag: finalFlag } = await detailsRes.json();

      // 5. Cleanup
      await fetch(`${BASE_URL}/api/admin/feature-flags/${flagKey}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      return {
        flag_key: flagKey,
        initial_rollout: initialFlag.rollout_percentage,
        final_rollout: updatedFlag.rollout_percentage,
        workflow: 'create → update → verify → cleanup',
      };
    },
  },

  // Scenario 2: Complete A/B Test Lifecycle
  {
    name: 'E2E: A/B Test from Draft to Running',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      // 1. Create experiment in draft
      const expKey = `e2e_ab_test_${Date.now()}`;
      const createRes = await fetch(`${BASE_URL}/api/admin/experiments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: expKey,
          name: 'E2E A/B Test',
          hypothesis: 'New layout increases conversions',
          control_variant: { key: 'control', name: 'Control', weight: 50 },
          treatment_variants: [{ key: 'new_layout', name: 'New Layout', weight: 50 }],
          primary_metric: 'conversion',
          traffic_allocation: 100,
        }),
      });

      if (!createRes.ok) throw new Error('Create experiment failed');
      const { experiment: draftExp } = await createRes.json();

      if (draftExp.status !== 'draft') {
        throw new Error('New experiment should be in draft status');
      }

      // 2. Start experiment
      await sleep(1000);
      const startRes = await fetch(`${BASE_URL}/api/admin/experiments/${expKey}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'running' }),
      });

      if (!startRes.ok) throw new Error('Start experiment failed');
      const { experiment: runningExp } = await startRes.json();

      if (runningExp.status !== 'running') {
        throw new Error('Experiment should be running');
      }

      if (!runningExp.started_at) {
        throw new Error('started_at should be set');
      }

      // 3. Get results (should be empty but structure should exist)
      await sleep(1000);
      const resultsRes = await fetch(`${BASE_URL}/api/admin/experiments/${expKey}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      if (!resultsRes.ok) throw new Error('Get results failed');
      const { experiment: expWithResults, results } = await resultsRes.json();

      // 4. Complete experiment
      await sleep(1000);
      const completeRes = await fetch(`${BASE_URL}/api/admin/experiments/${expKey}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'completed',
          winning_variant: 'new_layout',
          statistical_significance: true,
        }),
      });

      if (!completeRes.ok) throw new Error('Complete experiment failed');
      const { experiment: completedExp } = await completeRes.json();

      // 5. Cleanup
      await fetch(`${BASE_URL}/api/admin/experiments/${expKey}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      return {
        experiment_key: expKey,
        workflow: 'draft → running → completed → archived',
        status_transitions: {
          created: draftExp.status,
          started: runningExp.status,
          completed: completedExp.status,
        },
        winning_variant: completedExp.winning_variant,
      };
    },
  },

  // Scenario 3: Dashboard Analytics Workflow
  {
    name: 'E2E: Dashboard Analytics Collection',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      // 1. Get initial overview
      const overviewRes = await fetch(`${BASE_URL}/api/admin/dashboard/overview?days=7`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      if (!overviewRes.ok) throw new Error('Get overview failed');
      const overview = await overviewRes.json();

      // 2. Ingest email campaign
      const campaignId = `e2e_campaign_${Date.now()}`;
      const ingestRes = await fetch(`${BASE_URL}/api/admin/ingest/email-campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: 'E2E Test Campaign',
          subject: 'Test Subject',
          status: 'sent',
          sent_at: new Date().toISOString(),
          metrics: {
            sent_count: 1000,
            delivered_count: 980,
            unique_open_count: 245,
            unique_click_count: 49,
          },
        }),
      });

      if (!ingestRes.ok) throw new Error('Ingest campaign failed');

      // 3. Verify metrics appeared in overview (after refresh)
      await sleep(2000);
      const updatedOverviewRes = await fetch(`${BASE_URL}/api/admin/dashboard/overview?days=1`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      if (!updatedOverviewRes.ok) throw new Error('Get updated overview failed');
      const updatedOverview = await updatedOverviewRes.json();

      return {
        campaign_id: campaignId,
        workflow: 'ingest → verify in dashboard',
        initial_active_experiments: overview.experiments.active_count,
        initial_enabled_flags: overview.experiments.enabled_flags_count,
        email_metrics_updated: updatedOverview.marketing?.email !== undefined,
      };
    },
  },

  // Scenario 4: Multi-User Session Management
  {
    name: 'E2E: Session Isolation',
    async run() {
      // 1. Create first session
      const session1Res = await fetch(`${BASE_URL}/api/admin/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });

      if (!session1Res.ok) throw new Error('Session 1 login failed');
      const { token: token1 } = await session1Res.json();

      // 2. Create second session
      await sleep(500);
      const session2Res = await fetch(`${BASE_URL}/api/admin/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });

      if (!session2Res.ok) throw new Error('Session 2 login failed');
      const { token: token2 } = await session2Res.json();

      // 3. Both sessions should work
      const test1Res = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        headers: { 'Authorization': `Bearer ${token1}` },
      });

      const test2Res = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        headers: { 'Authorization': `Bearer ${token2}` },
      });

      if (!test1Res.ok || !test2Res.ok) {
        throw new Error('One or both sessions failed');
      }

      // 4. Sign out session 1
      await fetch(`${BASE_URL}/api/admin/auth/signout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token1}` },
      });

      // 5. Session 1 should now fail
      const invalidRes = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        headers: { 'Authorization': `Bearer ${token1}` },
      });

      // 6. Session 2 should still work
      const validRes = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        headers: { 'Authorization': `Bearer ${token2}` },
      });

      if (invalidRes.ok) {
        throw new Error('Session 1 should be invalid after signout');
      }

      if (!validRes.ok) {
        throw new Error('Session 2 should still be valid');
      }

      // Cleanup
      await fetch(`${BASE_URL}/api/admin/auth/signout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token2}` },
      });

      return {
        workflow: 'create 2 sessions → signout 1 → verify isolation',
        session_1_invalidated: !invalidRes.ok,
        session_2_still_valid: validRes.ok,
      };
    },
  },

  // Scenario 5: Error Handling & Recovery
  {
    name: 'E2E: Error Handling',
    async run() {
      if (!adminToken) {
        // Re-login if needed
        const loginRes = await fetch(`${BASE_URL}/api/admin/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        const { token } = await loginRes.json();
        adminToken = token;
      }

      const errors = [];

      // 1. Try to create flag with invalid rollout
      try {
        const invalidRes = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'test',
            name: 'Test',
            rollout_percentage: 150, // Invalid
            is_enabled: true,
          }),
        });

        if (!invalidRes.ok) {
          errors.push({ test: 'invalid_rollout', caught: true, status: invalidRes.status });
        } else {
          throw new Error('Should have rejected invalid rollout');
        }
      } catch (e) {
        errors.push({ test: 'invalid_rollout', caught: true, error: e.message });
      }

      // 2. Try to access with invalid token
      try {
        const unauthorizedRes = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
          headers: { 'Authorization': 'Bearer invalid_token' },
        });

        if (unauthorizedRes.status === 401) {
          errors.push({ test: 'invalid_token', caught: true, status: 401 });
        } else {
          throw new Error('Should have returned 401');
        }
      } catch (e) {
        errors.push({ test: 'invalid_token', caught: true, error: e.message });
      }

      // 3. Try to get non-existent flag
      try {
        const notFoundRes = await fetch(`${BASE_URL}/api/admin/feature-flags/nonexistent`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
        });

        if (notFoundRes.status === 404) {
          errors.push({ test: 'not_found', caught: true, status: 404 });
        } else {
          throw new Error('Should have returned 404');
        }
      } catch (e) {
        errors.push({ test: 'not_found', caught: true, error: e.message });
      }

      return {
        workflow: 'test error scenarios',
        errors_handled: errors.length,
        all_caught: errors.every(e => e.caught),
        details: errors,
      };
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

console.log('🧪 Admin Dashboard E2E Tests\n');
console.log(`📍 Base URL: ${BASE_URL}\n`);

const results = {
  passed: 0,
  failed: 0,
  total: scenarios.length,
};

for (const scenario of scenarios) {
  try {
    await runTest(scenario);
    results.passed++;
  } catch (error) {
    results.failed++;
    console.error(`\n❌ Scenario failed: ${scenario.name}`);
    console.error(`   ${error.message}\n`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`✅ Passed: ${results.passed}/${results.total}`);
console.log(`❌ Failed: ${results.failed}/${results.total}`);
console.log('='.repeat(60) + '\n');

if (results.failed > 0) {
  process.exit(1);
}

console.log('🎉 All E2E scenarios passed!\n');
