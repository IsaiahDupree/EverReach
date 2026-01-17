#!/usr/bin/env node

/**
 * Admin Dashboard API Tests
 * Runs all admin API tests in sequence
 * 
 * Usage: node test/admin/run-all.mjs
 */

import { runTest } from './_shared.mjs';

const BASE_URL = process.env.API_BASE_URL || 'https://ever-reach-be.vercel.app';

// Test admin credentials (should be created in setup)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@everreach.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'everreach123!@#';

let adminToken = null;
let testFlagKey = null;
let testExperimentKey = null;

// ============================================================================
// Test Suite
// ============================================================================

const tests = [
  // Auth Tests
  {
    name: 'Admin: Sign In',
    async run() {
      const res = await fetch(`${BASE_URL}/api/admin/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Sign in failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      
      if (!data.user || !data.token) {
        throw new Error('Missing user or token in response');
      }

      if (data.user.email !== ADMIN_EMAIL) {
        throw new Error(`Wrong email: ${data.user.email}`);
      }

      if (data.user.role !== 'super_admin' && data.user.role !== 'admin') {
        throw new Error(`Wrong role: ${data.user.role}`);
      }

      // Store token for subsequent tests
      adminToken = data.token;

      return {
        user_id: data.user.id,
        role: data.user.role,
        token_length: data.token.length,
      };
    },
  },

  {
    name: 'Admin: Request Password Reset',
    async run() {
      const res = await fetch(`${BASE_URL}/api/admin/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
        }),
      });

      if (!res.ok) {
        throw new Error(`Password reset request failed: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.success) {
        throw new Error('Password reset request did not return success');
      }

      return { success: true };
    },
  },

  // Dashboard Stats Tests
  {
    name: 'Dashboard: Get Overview',
    async run() {
      if (!adminToken) throw new Error('No admin token (sign in first)');

      const res = await fetch(`${BASE_URL}/api/admin/dashboard/overview?days=30`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Dashboard overview failed: ${res.status} ${text}`);
      }

      const data = await res.json();

      if (!data.period || !data.app_health || !data.user_growth || !data.experiments) {
        throw new Error('Missing required fields in dashboard response');
      }

      if (typeof data.app_health.total_requests !== 'number') {
        throw new Error('app_health.total_requests should be a number');
      }

      if (typeof data.app_health.success_rate !== 'number') {
        throw new Error('app_health.success_rate should be a number');
      }

      return {
        total_requests: data.app_health.total_requests,
        success_rate: data.app_health.success_rate,
        active_experiments: data.experiments.active_count,
        enabled_flags: data.experiments.enabled_flags_count,
      };
    },
  },

  // Feature Flags Tests
  {
    name: 'Feature Flags: List',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      const res = await fetch(`${BASE_URL}/api/admin/feature-flags?environment=production`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`List flags failed: ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data.flags)) {
        throw new Error('flags should be an array');
      }

      return {
        count: data.flags.length,
        first_flag: data.flags[0]?.key || null,
      };
    },
  },

  {
    name: 'Feature Flags: Create',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      testFlagKey = `test_flag_${Date.now()}`;

      const res = await fetch(`${BASE_URL}/api/admin/feature-flags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: testFlagKey,
          name: 'Test Feature Flag',
          description: 'Created by automated test',
          rollout_percentage: 25,
          target_platforms: ['web'],
          is_enabled: true,
          environment: 'production',
          tags: ['test'],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create flag failed: ${res.status} ${text}`);
      }

      const data = await res.json();

      if (!data.flag || data.flag.key !== testFlagKey) {
        throw new Error('Flag not created correctly');
      }

      if (data.flag.rollout_percentage !== 25) {
        throw new Error('rollout_percentage not set correctly');
      }

      return {
        flag_key: data.flag.key,
        rollout_percentage: data.flag.rollout_percentage,
        is_enabled: data.flag.is_enabled,
      };
    },
  },

  {
    name: 'Feature Flags: Get Details',
    async run() {
      if (!adminToken || !testFlagKey) throw new Error('Prerequisites not met');

      const res = await fetch(`${BASE_URL}/api/admin/feature-flags/${testFlagKey}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Get flag details failed: ${res.status}`);
      }

      const data = await res.json();

      if (!data.flag || !data.usage) {
        throw new Error('Missing flag or usage data');
      }

      if (data.flag.key !== testFlagKey) {
        throw new Error('Wrong flag returned');
      }

      return {
        flag_key: data.flag.key,
        total_evaluations: data.usage.daily_stats?.length || 0,
      };
    },
  },

  {
    name: 'Feature Flags: Update',
    async run() {
      if (!adminToken || !testFlagKey) throw new Error('Prerequisites not met');

      const res = await fetch(`${BASE_URL}/api/admin/feature-flags/${testFlagKey}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollout_percentage: 50,
          description: 'Updated by automated test',
        }),
      });

      if (!res.ok) {
        throw new Error(`Update flag failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.flag.rollout_percentage !== 50) {
        throw new Error('rollout_percentage not updated');
      }

      return {
        new_rollout: data.flag.rollout_percentage,
      };
    },
  },

  // Experiments Tests
  {
    name: 'Experiments: List',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      const res = await fetch(`${BASE_URL}/api/admin/experiments`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`List experiments failed: ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data.experiments)) {
        throw new Error('experiments should be an array');
      }

      return {
        count: data.experiments.length,
      };
    },
  },

  {
    name: 'Experiments: Create',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      testExperimentKey = `test_experiment_${Date.now()}`;

      const res = await fetch(`${BASE_URL}/api/admin/experiments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: testExperimentKey,
          name: 'Test Experiment',
          description: 'Created by automated test',
          hypothesis: 'Test hypothesis',
          control_variant: {
            key: 'control',
            name: 'Control',
            weight: 50,
          },
          treatment_variants: [
            {
              key: 'variant_a',
              name: 'Variant A',
              weight: 50,
            },
          ],
          primary_metric: 'test_conversion',
          traffic_allocation: 100,
          minimum_sample_size: 100,
          tags: ['test'],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create experiment failed: ${res.status} ${text}`);
      }

      const data = await res.json();

      if (!data.experiment || data.experiment.key !== testExperimentKey) {
        throw new Error('Experiment not created correctly');
      }

      if (data.experiment.status !== 'draft') {
        throw new Error('New experiment should be in draft status');
      }

      return {
        experiment_key: data.experiment.key,
        status: data.experiment.status,
      };
    },
  },

  {
    name: 'Experiments: Get Details',
    async run() {
      if (!adminToken || !testExperimentKey) throw new Error('Prerequisites not met');

      const res = await fetch(`${BASE_URL}/api/admin/experiments/${testExperimentKey}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Get experiment details failed: ${res.status}`);
      }

      const data = await res.json();

      if (!data.experiment || !data.results) {
        throw new Error('Missing experiment or results data');
      }

      if (data.experiment.key !== testExperimentKey) {
        throw new Error('Wrong experiment returned');
      }

      return {
        experiment_key: data.experiment.key,
        results_count: data.results.length,
      };
    },
  },

  {
    name: 'Experiments: Update Status',
    async run() {
      if (!adminToken || !testExperimentKey) throw new Error('Prerequisites not met');

      const res = await fetch(`${BASE_URL}/api/admin/experiments/${testExperimentKey}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'running',
        }),
      });

      if (!res.ok) {
        throw new Error(`Update experiment failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.experiment.status !== 'running') {
        throw new Error('Status not updated');
      }

      if (!data.experiment.started_at) {
        throw new Error('started_at should be set when changing to running');
      }

      return {
        status: data.experiment.status,
        started_at: data.experiment.started_at,
      };
    },
  },

  // Data Ingestion Tests
  {
    name: 'Ingest: Email Campaign',
    async run() {
      if (!adminToken) throw new Error('No admin token');

      const campaignId = `test_campaign_${Date.now()}`;

      const res = await fetch(`${BASE_URL}/api/admin/ingest/email-campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: 'Test Campaign',
          subject: 'Test Subject',
          status: 'sent',
          sent_at: new Date().toISOString(),
          metrics: {
            sent_count: 1000,
            delivered_count: 980,
            unique_open_count: 245,
            unique_click_count: 49,
            revenue: 500,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ingest email campaign failed: ${res.status} ${text}`);
      }

      const data = await res.json();

      if (!data.success || !data.campaign) {
        throw new Error('Campaign not ingested correctly');
      }

      if (data.campaign.campaign_id !== campaignId) {
        throw new Error('Wrong campaign ID');
      }

      return {
        campaign_id: campaignId,
        success: true,
      };
    },
  },

  // Cleanup Tests
  {
    name: 'Cleanup: Delete Test Flag',
    async run() {
      if (!adminToken || !testFlagKey) {
        return { skipped: true };
      }

      const res = await fetch(`${BASE_URL}/api/admin/feature-flags/${testFlagKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        console.warn(`Warning: Could not delete test flag: ${res.status}`);
        return { deleted: false };
      }

      return { deleted: true };
    },
  },

  {
    name: 'Cleanup: Archive Test Experiment',
    async run() {
      if (!adminToken || !testExperimentKey) {
        return { skipped: true };
      }

      const res = await fetch(`${BASE_URL}/api/admin/experiments/${testExperimentKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        console.warn(`Warning: Could not archive test experiment: ${res.status}`);
        return { archived: false };
      }

      return { archived: true };
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

console.log('🧪 Admin Dashboard API Tests\n');
console.log(`📍 Base URL: ${BASE_URL}\n`);

const results = {
  passed: 0,
  failed: 0,
  total: tests.length,
};

for (const test of tests) {
  try {
    const result = await runTest(test);
    results.passed++;
  } catch (error) {
    results.failed++;
    console.error(`\n❌ Test failed: ${test.name}`);
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

console.log('🎉 All tests passed!\n');
