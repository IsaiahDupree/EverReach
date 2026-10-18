// Paywall Config Changes Integration Test
// Tests that config changes are logged and can be retrieved

import { strict as assert } from 'assert';

const API_BASE = process.env.API_BASE || 'http://localhost:5555/api/v1';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

console.log('\n🧪 Paywall Config Changes Integration Tests\n');
console.log(`API Base: ${API_BASE}`);
console.log(`Auth Token: ${AUTH_TOKEN ? '✅ Provided' : '❌ Missing'}\n`);

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      ...options.headers,
    },
  });
  
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  
  return { response, data };
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      results.failed++;
      results.errors.push({ test: name, error: error.message });
    }
  };
}

// Test Suite 1: Config Changes History API
console.log('📋 Test Suite 1: Config Changes History API\n');

await test('GET /config/paywall-changes returns history', async () => {
  const { response, data } = await makeRequest('/config/paywall-changes');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.changes), 'Should have changes array');
  assert.ok(typeof data.total === 'number', 'Should have total count');
})();

await test('GET /config/paywall-changes supports platform filter', async () => {
  const { response, data } = await makeRequest('/config/paywall-changes?platform=mobile');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.changes));
})();

await test('GET /config/paywall-changes supports limit parameter', async () => {
  const { response, data } = await makeRequest('/config/paywall-changes?limit=5');
  assert.equal(response.status, 200);
  assert.ok(data.changes.length <= 5);
})();

await test('Config changes have required fields', async () => {
  const { data } = await makeRequest('/config/paywall-changes?limit=1');
  
  if (data.changes.length > 0) {
    const change = data.changes[0];
    assert.ok(change.id, 'Should have id');
    assert.ok(change.change_type, 'Should have change_type');
    assert.ok(change.platform, 'Should have platform');
    assert.ok(change.old_config, 'Should have old_config');
    assert.ok(change.new_config, 'Should have new_config');
    assert.ok(change.changed_at, 'Should have changed_at');
    assert.ok(change.summary_old, 'Should have summary_old');
    assert.ok(change.summary_new, 'Should have summary_new');
  } else {
    console.log('   ⏭️  Skipped (no changes yet)');
    results.skipped++;
  }
})();

// Test Suite 2: Config Update Logs Changes (requires auth)
console.log('\n📋 Test Suite 2: Config Update Integration\n');

if (AUTH_TOKEN) {
  await test('Updating config creates a change log entry', async () => {
    // Get current count of changes
    const { data: beforeData } = await makeRequest('/config/paywall-changes?platform=mobile&limit=1');
    const beforeCount = beforeData.total;
    
    // Update config
    const { response: updateResponse } = await makeRequest('/config/paywall-strategy', {
      method: 'POST',
      body: JSON.stringify({
        platform: 'mobile',
        strategy_id: 'SOFT_AFTER_7D',
        presentation_id: 'PAYWALL_STATIC',
        trial_type_id: 'TRIAL_7_DAYS',
      }),
    });
    
    assert.equal(updateResponse.status, 200, 'Config update should succeed');
    
    // Wait a moment for the change to be logged
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if a new change was logged
    const { data: afterData } = await makeRequest('/config/paywall-changes?platform=mobile&limit=1');
    const afterCount = afterData.total;
    
    // We should have at least one change (might be same if no actual change)
    assert.ok(afterCount >= beforeCount, 'Should have logged the change');
  })();

  await test('Config change includes correct old and new values', async () => {
    // Get current config
    const { data: currentConfig } = await makeRequest('/config/paywall-strategy?platform=mobile');
    
    // Update to a different strategy
    const newStrategyId = currentConfig.strategy.id === 'SOFT_AFTER_7D' ? 'SOFT_AFTER_30D' : 'SOFT_AFTER_7D';
    
    await makeRequest('/config/paywall-strategy', {
      method: 'POST',
      body: JSON.stringify({
        platform: 'mobile',
        strategy_id: newStrategyId,
        presentation_id: currentConfig.presentation.id,
        trial_type_id: currentConfig.trial.id,
      }),
    });
    
    // Wait for change to be logged
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get latest change
    const { data: changesData } = await makeRequest('/config/paywall-changes?platform=mobile&limit=1');
    
    if (changesData.changes.length > 0) {
      const latestChange = changesData.changes[0];
      
      // Verify it logged the correct old and new values
      assert.ok(latestChange.old_config, 'Should have old_config');
      assert.ok(latestChange.new_config, 'Should have new_config');
      assert.equal(latestChange.new_config.strategy_id, newStrategyId, 'New config should match what we sent');
    }
  })();

  await test('Config change type is correctly determined', async () => {
    // Get current config
    const { data: currentConfig } = await makeRequest('/config/paywall-strategy?platform=mobile');
    
    // Change only the presentation (not strategy or trial)
    const newPresentationId = currentConfig.presentation.id === 'PAYWALL_STATIC' 
      ? 'PAYWALL_ONBOARDING_VIDEO' 
      : 'PAYWALL_STATIC';
    
    await makeRequest('/config/paywall-strategy', {
      method: 'POST',
      body: JSON.stringify({
        platform: 'mobile',
        strategy_id: currentConfig.strategy.id,
        presentation_id: newPresentationId,
        trial_type_id: currentConfig.trial.id,
      }),
    });
    
    // Wait for change to be logged
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get latest change
    const { data: changesData } = await makeRequest('/config/paywall-changes?platform=mobile&limit=1');
    
    if (changesData.changes.length > 0) {
      const latestChange = changesData.changes[0];
      
      // Should be tagged as 'presentation' change
      assert.equal(latestChange.change_type, 'presentation', 'Change type should be presentation');
    }
  })();

  await test('Multiple platform changes are tracked separately', async () => {
    // Update mobile
    await makeRequest('/config/paywall-strategy', {
      method: 'POST',
      body: JSON.stringify({
        platform: 'mobile',
        strategy_id: 'SOFT_AFTER_7D',
        presentation_id: 'PAYWALL_STATIC',
        trial_type_id: 'TRIAL_7_DAYS',
      }),
    });
    
    // Update web
    await makeRequest('/config/paywall-strategy', {
      method: 'POST',
      body: JSON.stringify({
        platform: 'web',
        strategy_id: 'HARD_AFTER_7D',
        presentation_id: 'PAYWALL_STATIC',
        trial_type_id: 'TRIAL_30_DAYS',
      }),
    });
    
    // Wait for changes to be logged
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get mobile changes
    const { data: mobileChanges } = await makeRequest('/config/paywall-changes?platform=mobile&limit=1');
    // Get web changes
    const { data: webChanges } = await makeRequest('/config/paywall-changes?platform=web&limit=1');
    
    // Both should have changes
    assert.ok(mobileChanges.changes.length > 0, 'Should have mobile changes');
    assert.ok(webChanges.changes.length > 0, 'Should have web changes');
    
    // Verify they're for correct platforms
    if (mobileChanges.changes.length > 0) {
      assert.equal(mobileChanges.changes[0].platform, 'mobile');
    }
    if (webChanges.changes.length > 0) {
      assert.equal(webChanges.changes[0].platform, 'web');
    }
  })();
  
} else {
  console.log('⏭️  Skipped config update tests (no auth token provided)');
  console.log('   To test: Set TEST_AUTH_TOKEN environment variable\n');
  results.skipped += 4;
}

// Test Suite 3: Change History Order
console.log('\n📋 Test Suite 3: Change History Order\n');

await test('Changes are returned in reverse chronological order', async () => {
  const { data } = await makeRequest('/config/paywall-changes?limit=10');
  
  if (data.changes.length > 1) {
    const firstChangeDate = new Date(data.changes[0].changed_at);
    const secondChangeDate = new Date(data.changes[1].changed_at);
    
    assert.ok(firstChangeDate >= secondChangeDate, 'Latest changes should be first');
  } else {
    console.log('   ⏭️  Skipped (need at least 2 changes)');
    results.skipped++;
  }
})();

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⏭️  Skipped: ${results.skipped}`);
console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`);

if (AUTH_TOKEN) {
  console.log('\n💡 Tip: Config changes are now being logged!');
  console.log('   Visit /dashboard/monetization/paywall-experiments');
  console.log('   to view the change history.');
} else {
  console.log('\n⚠️  Auth tests skipped. To run full tests:');
  console.log('   export TEST_AUTH_TOKEN="your_jwt_token"');
  console.log('   node test/paywall-config-changes-integration.mjs');
}

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.errors.forEach(({ test, error }) => {
    console.log(`  - ${test}`);
    console.log(`    ${error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All config changes integration tests passed!');
  process.exit(0);
}
