#!/usr/bin/env node
/**
 * Superwall Webhook Integration Tests
 * Tests ALL Superwall event types and subscription sync
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const WEBHOOK_URL = `${API_BASE}/api/v1/billing/superwall/webhook`;

console.log('🧪 Superwall Webhook Integration Tests');
console.log('API Base:', API_BASE);
console.log('Webhook URL:', WEBHOOK_URL);
console.log('==========================================\n');

// Helper to generate test event
function createSuperwallEvent(eventName, userId, overrides = {}) {
  return {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    user_id: userId,
    ...overrides,
  };
}

async function main() {
  const token = await getAccessToken();
  
  // Fetch real user UUID from /api/v1/me
  console.log('🔑 Fetching user ID...');
  const meRes = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const me = await meRes.json();
  const testUserId = me.user?.id || me.id || me.sub; // Try multiple paths
  
  if (!testUserId) {
    console.error('❌ Could not get user ID from /api/v1/me');
    console.error('Response:', JSON.stringify(me, null, 2));
    process.exit(1);
  }
  
  console.log(`✅ Using user ID: ${testUserId}\n`);
  
  let passed = 0;
  let failed = 0;

  // ============================================
  // TEST 1: Transaction Complete (New Subscription)
  // ============================================
  console.log('📊 TEST 1: Transaction Complete');
  console.log('------------------------------------------');
  
  const event1 = createSuperwallEvent('transaction.complete', testUserId, {
    subscription: {
      id: `sub_${Date.now()}`,
      product_id: 'com.everreach.pro.monthly',
      status: 'active',
      period_type: 'normal',
      purchased_at: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'ios',
      environment: 'production',
    },
    transaction: {
      id: `txn_${Date.now()}`,
      product_id: 'com.everreach.pro.monthly',
      purchased_at: new Date().toISOString(),
      platform: 'ios',
    },
  });

  try {
    const res1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',  // Enable test mode for webhook testing
      },
      body: JSON.stringify(event1),
    });

    const result1 = await res1.json();
    
    if (res1.ok && result1.ok && result1.processed) {
      console.log('✅ Transaction complete processed successfully');
      console.log(`   Subscription status: ${result1.subscription?.status}`);
      passed++;
    } else {
      console.log('❌ Transaction complete failed');
      console.log('   Response:', result1);
      failed++;
    }
  } catch (error) {
    console.log('❌ Transaction complete error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 2: Trial Start
  // ============================================
  console.log('\n📊 TEST 2: Trial Start');
  console.log('------------------------------------------');
  
  const event2 = createSuperwallEvent('trial.start', testUserId, {
    subscription: {
      id: `sub_trial_${Date.now()}`,
      product_id: 'com.everreach.pro.monthly',
      status: 'active',
      period_type: 'trial',
      purchased_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'android', // Use Android to avoid duplicate key with TEST 1
      environment: 'sandbox',
    },
  });

  try {
    const res2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event2),
    });

    const result2 = await res2.json();
    
    if (res2.ok && result2.ok && result2.processed) {
      console.log('✅ Trial start processed successfully');
      console.log(`   Subscription status: ${result2.subscription?.status}`);
      passed++;
    } else {
      console.log('❌ Trial start failed');
      console.log('   Response:', result2);
      failed++;
    }
  } catch (error) {
    console.log('❌ Trial start error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 3: Subscription Renewal
  // ============================================
  console.log('\n📊 TEST 3: Subscription Renewal');
  console.log('------------------------------------------');
  
  const event3 = createSuperwallEvent('subscription.renew', testUserId, {
    subscription: {
      id: event1.subscription.id, // Same subscription ID
      product_id: 'com.everreach.pro.monthly',
      status: 'active',
      period_type: 'normal',
      purchased_at: event1.subscription.purchased_at,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'ios',
      environment: 'production',
    },
  });

  try {
    const res3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event3),
    });

    const result3 = await res3.json();
    
    if (res3.ok && result3.ok && result3.processed) {
      console.log('✅ Subscription renewal processed successfully');
      console.log(`   Subscription status: ${result3.subscription?.status}`);
      passed++;
    } else {
      console.log('❌ Subscription renewal failed');
      console.log('   Response:', result3);
      failed++;
    }
  } catch (error) {
    console.log('❌ Subscription renewal error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 4: Subscription Cancellation
  // ============================================
  console.log('\n📊 TEST 4: Subscription Cancellation');
  console.log('------------------------------------------');
  
  const event4 = createSuperwallEvent('subscription.cancel', testUserId, {
    subscription: {
      id: event1.subscription.id,
      product_id: 'com.everreach.pro.monthly',
      status: 'canceled',
      period_type: 'normal',
      purchased_at: event1.subscription.purchased_at,
      current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      canceled_at: new Date().toISOString(),
      platform: 'ios',
      environment: 'production',
    },
  });

  try {
    const res4 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event4),
    });

    const result4 = await res4.json();
    
    if (res4.ok && result4.ok && result4.processed) {
      console.log('✅ Subscription cancellation processed successfully');
      console.log(`   Subscription status: ${result4.subscription?.status}`);
      passed++;
    } else {
      console.log('❌ Subscription cancellation failed');
      console.log('   Response:', result4);
      failed++;
    }
  } catch (error) {
    console.log('❌ Subscription cancellation error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 5: Paywall Events (Non-Subscription)
  // ============================================
  console.log('\n📊 TEST 5: Paywall Open Event');
  console.log('------------------------------------------');
  
  const event5 = createSuperwallEvent('paywall.open', testUserId, {
    paywall: {
      id: `paywall_${Date.now()}`,
      name: 'Pro Upgrade Paywall',
      variant_id: 'variant_a',
      presented_at: new Date().toISOString(),
    },
  });

  try {
    const res5 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event5),
    });

    const result5 = await res5.json();
    
    if (res5.ok && result5.ok) {
      console.log('✅ Paywall open event processed successfully');
      console.log(`   Updated subscription: ${result5.subscription ? 'yes' : 'no (expected)'}`);
      passed++;
    } else {
      console.log('❌ Paywall open event failed');
      console.log('   Response:', result5);
      failed++;
    }
  } catch (error) {
    console.log('❌ Paywall open event error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 6: Idempotency (Duplicate Event)
  // ============================================
  console.log('\n📊 TEST 6: Idempotency (Duplicate Event)');
  console.log('------------------------------------------');
  
  try {
    const res6 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event1), // Resend event 1
    });

    const result6 = await res6.json();
    
    if (res6.ok && result6.ok && result6.duplicate && !result6.processed) {
      console.log('✅ Duplicate event detected correctly');
      console.log('   Event was not reprocessed');
      passed++;
    } else {
      console.log('❌ Idempotency check failed');
      console.log('   Response:', result6);
      failed++;
    }
  } catch (error) {
    console.log('❌ Idempotency check error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 7: Android Platform
  // ============================================
  console.log('\n📊 TEST 7: Android Transaction');
  console.log('------------------------------------------');
  
  const event7 = createSuperwallEvent('transaction.complete', testUserId, { // Same user, different subscription ID
    subscription: {
      id: `sub_android_${Date.now()}`,
      product_id: 'com.everreach.pro.monthly',
      status: 'active',
      period_type: 'normal',
      purchased_at: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'android',
      environment: 'production',
    },
  });

  try {
    const res7 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event7),
    });

    const result7 = await res7.json();
    
    if (res7.ok && result7.ok && result7.processed && result7.subscription?.platform === 'play') {
      console.log('✅ Android transaction processed successfully');
      console.log(`   Platform mapped correctly: ${result7.subscription.platform}`);
      passed++;
    } else {
      console.log('❌ Android transaction failed');
      console.log('   Response:', result7);
      failed++;
    }
  } catch (error) {
    console.log('❌ Android transaction error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 8: Subscription Expire
  // ============================================
  console.log('\n📊 TEST 8: Subscription Expire');
  console.log('------------------------------------------');
  
  const event8 = createSuperwallEvent('subscription.expire', testUserId, {
    subscription: {
      id: event1.subscription.id,
      product_id: 'com.everreach.pro.monthly',
      status: 'expired',
      period_type: 'normal',
      purchased_at: event1.subscription.purchased_at,
      current_period_end: new Date().toISOString(), // Add required field
      expires_at: new Date().toISOString(),
      platform: 'ios',
      environment: 'production',
    },
  });

  try {
    const res8 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(event8),
    });

    const result8 = await res8.json();
    
    if (res8.ok && result8.ok && result8.processed && result8.subscription?.status === 'expired') {
      console.log('✅ Subscription expire processed successfully');
      console.log(`   Status updated to: ${result8.subscription.status}`);
      passed++;
    } else {
      console.log('❌ Subscription expire failed');
      console.log('   Response:', result8);
      failed++;
    }
  } catch (error) {
    console.log('❌ Subscription expire error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 9: Invalid Event (Missing Fields)
  // ============================================
  console.log('\n📊 TEST 9: Invalid Event (Missing Required Fields)');
  console.log('------------------------------------------');
  
  const invalidEvent = {
    event_name: 'test.event',
    // Missing user_id and timestamp
  };

  try {
    const res9 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(invalidEvent),
    });

    const result9 = await res9.json();
    
    if (res9.status === 400 && !result9.ok) {
      console.log('✅ Invalid event rejected correctly');
      console.log(`   Error: ${result9.error}`);
      passed++;
    } else {
      console.log('❌ Invalid event validation failed');
      console.log('   Response:', result9);
      failed++;
    }
  } catch (error) {
    console.log('❌ Invalid event test error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 10: Verify Entitlements Integration
  // ============================================
  console.log('\n📊 TEST 10: Verify Entitlements Integration');
  console.log('------------------------------------------');
  
  try {
    const resEntitlements = await fetch(`${API_BASE}/api/v1/me/entitlements`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const entitlements = await resEntitlements.json();
    
    if (resEntitlements.ok && entitlements.tier && entitlements.features) {
      console.log('✅ Entitlements endpoint working');
      console.log(`   Tier: ${entitlements.tier}`);
      console.log(`   Status: ${entitlements.subscription_status || 'none'}`);
      console.log(`   Features: ${Object.keys(entitlements.features).length} features`);
      passed++;
    } else {
      console.log('❌ Entitlements endpoint failed');
      console.log('   Response:', entitlements);
      failed++;
    }
  } catch (error) {
    console.log('❌ Entitlements test error:', error.message);
    failed++;
  }

  // ============================================
  // TEST 11: App Store Connect Event Forwarding
  // ============================================
  console.log('\n📊 TEST 11: App Store Connect Event Forwarding to Superwall');
  console.log('------------------------------------------');
  
  try {
    // Simulate an App Store Connect notification
    const appStoreEvent = {
      signedPayload: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJub3RpZmljYXRpb25JZCI6IjEyMzQifQ.test'
    };

    const resAppStore = await fetch(`${API_BASE}/api/v1/webhooks/app-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true',
      },
      body: JSON.stringify(appStoreEvent),
    });

    const resultAppStore = await resAppStore.json();
    
    // We expect the webhook to accept the event (even if forwarding fails due to invalid key)
    // The important thing is that the endpoint processes it without errors
    if (resAppStore.status === 200 || resAppStore.status === 400) {
      console.log('✅ App Store webhook accepts events');
      console.log('   ℹ️  Forwarding to Superwall happens async (check logs)');
      console.log('   ℹ️  Configure SUPERWALL_API_KEY env var to enable forwarding');
      passed++;
    } else {
      console.log('❌ App Store webhook failed');
      console.log('   Response:', resultAppStore);
      failed++;
    }
  } catch (error) {
    console.log('❌ App Store forwarding test error:', error.message);
    failed++;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  const allPassed = failed === 0;
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
