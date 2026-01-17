/**
 * Dashboard → Backend Integration Tests for Feature Requests
 * 
 * Simulates the exact flow from the dashboard UI to the backend API:
 * 1. User creates a feature request from the dashboard
 * 2. Dashboard sends POST request to backend
 * 3. User votes on features
 * 4. Dashboard fetches and displays feature requests with stats
 * 5. Admin updates feature status
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestUser, makeAuthRequest, API_BASE_URL } from './_shared.mjs';

const ENDPOINT = `${API_BASE_URL}/api/v1/feature-requests`;

describe('Dashboard ↔ Backend: Feature Requests', () => {
  let authToken;
  let testUserId;
  let createdFeatureIds = [];

  before(async () => {
    console.log('\n🚀 Setting up dashboard test environment...');
    console.log(`   API: ${API_BASE_URL}`);
    
    const setup = await setupTestUser();
    authToken = setup.token;
    testUserId = setup.userId;
    console.log(`   ✓ Authenticated as: ${testUserId}\n`);
  });

  after(async () => {
    console.log('\n🧹 Cleaning up test data...');
    for (const id of createdFeatureIds) {
      try {
        await makeAuthRequest(`${ENDPOINT}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log(`   ✓ Deleted feature: ${id}`);
      } catch (err) {
        console.warn(`   ⚠ Could not delete ${id}: ${err.message}`);
      }
    }
    console.log('   ✓ Cleanup complete\n');
  });

  describe('📝 Dashboard: Submit Feature Request Form', () => {
    it('should create feature from dashboard form submission', async () => {
      console.log('\n   📋 Simulating dashboard form submission...');
      
      // This simulates the exact payload the dashboard sends
      const dashboardPayload = {
        type: 'feature',
        title: 'Dark Mode Support',
        description: 'Add dark mode theme to improve user experience during night-time usage.',
        priority: 'high',
        tags: ['ui', 'accessibility', 'user-experience']
      };

      const response = await makeAuthRequest(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(dashboardPayload),
      });

      console.log(`   ✓ Feature created: ${response.id}`);
      createdFeatureIds.push(response.id);

      // Validate response matches dashboard expectations
      assert.ok(response.id, 'Response should have id');
      assert.strictEqual(response.title, dashboardPayload.title);
      assert.strictEqual(response.type, dashboardPayload.type);
      assert.strictEqual(response.status, 'pending'); // Default status
      assert.strictEqual(response.votes_count, 0); // Starts at 0
      assert.ok(response.created_at, 'Should have timestamp');
    });

    it('should validate required fields like dashboard form', async () => {
      console.log('\n   ❌ Testing form validation...');
      
      // Dashboard should prevent this, but backend should also validate
      const invalidPayload = {
        type: 'feature',
        // Missing title - should fail
        description: 'Test'
      };

      try {
        await makeAuthRequest(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(invalidPayload),
        });
        assert.fail('Should have thrown validation error');
      } catch (error) {
        console.log(`   ✓ Validation working: ${error.message}`);
        assert.ok(error.message.includes('400') || error.message.includes('title'));
      }
    });
  });

  describe('👍 Dashboard: Voting System', () => {
    let testFeatureId;

    before(async () => {
      // Create a feature to vote on
      const response = await makeAuthRequest(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          type: 'feature',
          title: 'Export to CSV',
          description: 'Allow exporting data to CSV format',
          priority: 'medium'
        }),
      });
      testFeatureId = response.id;
      createdFeatureIds.push(testFeatureId);
      console.log(`\n   ✓ Created test feature: ${testFeatureId}`);
    });

    it('should handle vote button click from dashboard', async () => {
      console.log('\n   👆 Simulating vote button click...');
      
      const voteResponse = await makeAuthRequest(`${ENDPOINT}/${testFeatureId}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Vote registered`);
      assert.strictEqual(voteResponse.success, true);
      assert.strictEqual(voteResponse.votes_count, 1);
      assert.strictEqual(voteResponse.user_has_voted, true);
    });

    it('should show "You voted" state in dashboard', async () => {
      console.log('\n   🔍 Checking vote state for UI...');
      
      // Dashboard fetches feature to show vote state
      const feature = await makeAuthRequest(`${ENDPOINT}/${testFeatureId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Vote count: ${feature.votes_count}`);
      console.log(`   ✓ User voted: ${feature.user_has_voted}`);
      
      assert.strictEqual(feature.user_has_voted, true);
      assert.strictEqual(feature.votes_count, 1);
    });

    it('should handle unvote (remove vote) from dashboard', async () => {
      console.log('\n   👎 Simulating unvote button click...');
      
      const unvoteResponse = await makeAuthRequest(`${ENDPOINT}/${testFeatureId}/vote`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Vote removed`);
      assert.strictEqual(unvoteResponse.success, true);
      assert.strictEqual(unvoteResponse.votes_count, 0);
      assert.strictEqual(unvoteResponse.user_has_voted, false);
    });
  });

  describe('📊 Dashboard: Feature List Display', () => {
    before(async () => {
      // Create sample features that match the UI mockup
      const sampleFeatures = [
        { title: 'Stripe Integration', description: 'Payment processing', status: 'shipped', votes: 23 },
        { title: 'Mobile App', description: 'iOS and Android apps', status: 'in_progress', votes: 15 },
        { title: 'API Webhooks', description: 'Real-time notifications', status: 'planned', votes: 12 },
      ];

      console.log('\n   📦 Creating sample features for dashboard...');
      for (const feature of sampleFeatures) {
        const response = await makeAuthRequest(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            type: 'feature',
            title: feature.title,
            description: feature.description,
            status: feature.status,
            priority: 'medium'
          }),
        });
        createdFeatureIds.push(response.id);
        console.log(`   ✓ Created: ${feature.title} (${feature.status})`);
      }
    });

    it('should fetch features for dashboard list', async () => {
      console.log('\n   📋 Fetching feature list for dashboard...');
      
      const features = await makeAuthRequest(ENDPOINT, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Loaded ${features.length} features`);
      assert.ok(Array.isArray(features));
      assert.ok(features.length >= 3);

      // Validate dashboard data structure
      features.forEach(feature => {
        assert.ok(feature.id);
        assert.ok(feature.title);
        assert.ok(feature.status);
        assert.ok(typeof feature.votes_count === 'number');
        assert.ok(typeof feature.user_has_voted === 'boolean');
      });
    });

    it('should filter by status for dashboard tabs', async () => {
      console.log('\n   🔍 Testing status filter (dashboard tabs)...');
      
      const shippedFeatures = await makeAuthRequest(`${ENDPOINT}?status=shipped`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Shipped features: ${shippedFeatures.length}`);
      assert.ok(Array.isArray(shippedFeatures));
      shippedFeatures.forEach(feature => {
        assert.strictEqual(feature.status, 'shipped');
      });
    });

    it('should sort by votes for dashboard ranking', async () => {
      console.log('\n   🏆 Testing vote sorting (dashboard ranking)...');
      
      const features = await makeAuthRequest(`${ENDPOINT}?sort=votes&order=desc`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log(`   ✓ Sorted ${features.length} features by votes`);
      
      // Verify descending vote order
      for (let i = 1; i < features.length; i++) {
        assert.ok(
          features[i - 1].votes_count >= features[i].votes_count,
          `Features should be sorted by votes (${features[i-1].votes_count} >= ${features[i].votes_count})`
        );
      }
    });
  });

  describe('📈 Dashboard: Statistics Display', () => {
    it('should calculate stats for dashboard summary', async () => {
      console.log('\n   📊 Calculating dashboard statistics...');
      
      const features = await makeAuthRequest(ENDPOINT, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      // Calculate stats like the dashboard would
      const stats = {
        total: features.length,
        shipped: features.filter(f => f.status === 'shipped').length,
        in_progress: features.filter(f => f.status === 'in_progress').length,
        planned: features.filter(f => f.status === 'planned').length,
        backlog: features.filter(f => f.status === 'pending').length,
        total_votes: features.reduce((sum, f) => sum + f.votes_count, 0),
      };

      console.log(`   ✓ Total: ${stats.total}`);
      console.log(`   ✓ Shipped: ${stats.shipped}`);
      console.log(`   ✓ In Progress: ${stats.in_progress}`);
      console.log(`   ✓ Planned: ${stats.planned}`);
      console.log(`   ✓ Total Votes: ${stats.total_votes}`);

      assert.ok(stats.total > 0);
      assert.strictEqual(
        stats.total,
        stats.shipped + stats.in_progress + stats.planned + stats.backlog
      );
    });
  });

  describe('⚙️ Dashboard: Admin Actions', () => {
    let adminFeatureId;

    before(async () => {
      const response = await makeAuthRequest(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          type: 'feature',
          title: 'Admin Test Feature',
          description: 'For testing admin updates',
          status: 'pending'
        }),
      });
      adminFeatureId = response.id;
      createdFeatureIds.push(adminFeatureId);
    });

    it('should update status from admin dashboard', async () => {
      console.log('\n   🔧 Simulating admin status update...');
      
      const updateResponse = await makeAuthRequest(`${ENDPOINT}/${adminFeatureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: 'in_progress'
        }),
      });

      console.log(`   ✓ Status updated: pending → in_progress`);
      assert.strictEqual(updateResponse.status, 'in_progress');
    });
  });
});

console.log('\n' + '='.repeat(60));
console.log('🎯 Dashboard → Backend Integration Tests');
console.log('='.repeat(60));
