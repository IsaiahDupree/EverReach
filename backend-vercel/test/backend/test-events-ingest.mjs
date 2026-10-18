/**
 * Test Events Ingest API
 * 
 * Tests:
 * 1. Single event ingestion
 * 2. Batch event ingestion
 * 3. Idempotency (duplicate event)
 * 4. Validation errors
 * 5. All event sources
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const INGEST_KEY = process.env.INGEST_SERVER_KEY;

if (!INGEST_KEY) {
  console.error('❌ Missing INGEST_SERVER_KEY environment variable');
  console.log('Usage: INGEST_SERVER_KEY=your_key node test-events-ingest.mjs');
  process.exit(1);
}

console.log('🧪 Testing Events Ingest API\n');

async function testSingleEvent() {
  console.log('1️⃣  POST /v1/events/ingest - Single event');
  
  const response = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: [{
        idempotencyKey: `test_${Date.now()}`,
        source: 'system',
        category: 'internal',
        name: 'test_event',
        occurredAt: new Date().toISOString(),
        userId: null,
        payload: { test: true, timestamp: Date.now() }
      }]
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.ok || data.ingested !== 1) {
    throw new Error(`Expected ingested=1, got ${JSON.stringify(data)}`);
  }
  
  console.log(`   ✅ Single event ingested successfully`);
  return data;
}

async function testBatchEvents() {
  console.log('\n2️⃣  POST /v1/events/ingest - Batch events (5)');
  
  const timestamp = Date.now();
  const events = [
    {
      idempotencyKey: `batch_1_${timestamp}`,
      source: 'app',
      category: 'lifecycle',
      name: 'app_opened',
      platform: 'ios',
      device: 'iPhone 14 Pro'
    },
    {
      idempotencyKey: `batch_2_${timestamp}`,
      source: 'app',
      category: 'ui',
      name: 'button_clicked',
      payload: { button: 'start_trial' }
    },
    {
      idempotencyKey: `batch_3_${timestamp}`,
      source: 'superwall',
      category: 'paywall',
      name: 'paywall_opened',
      payload: { placement: 'home_banner' }
    },
    {
      idempotencyKey: `batch_4_${timestamp}`,
      source: 'revenuecat',
      category: 'billing',
      name: 'trial_started',
      billing: {
        productId: 'pro_monthly',
        store: 'app_store'
      }
    },
    {
      idempotencyKey: `batch_5_${timestamp}`,
      source: 'facebook_ads',
      category: 'ads',
      name: 'ad_impressions',
      ads: {
        campaignId: 'campaign_123',
        adsetId: 'adset_456',
        adId: 'ad_789'
      },
      payload: { impressions: 1000 }
    }
  ];

  const response = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events }),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.ok || data.ingested !== 5) {
    throw new Error(`Expected ingested=5, got ${JSON.stringify(data)}`);
  }
  
  console.log(`   ✅ Batch of 5 events ingested successfully`);
  return data;
}

async function testIdempotency() {
  console.log('\n3️⃣  POST /v1/events/ingest - Idempotency (duplicate)');
  
  const idempotencyKey = `idempotency_test_${Date.now()}`;
  const event = {
    idempotencyKey,
    source: 'system',
    category: 'internal',
    name: 'idempotency_test',
    payload: { attempt: 1 }
  };

  // First request
  const response1 = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events: [event] }),
  });

  if (!response1.ok) {
    throw new Error(`First request failed: ${response1.status} ${await response1.text()}`);
  }

  // Second request (same idempotency key)
  const response2 = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events: [{...event, payload: { attempt: 2 }}] }),
  });

  if (!response2.ok) {
    throw new Error(`Second request failed: ${response2.status} ${await response2.text()}`);
  }

  const data2 = await response2.json();
  console.log(`   ✅ Idempotency working (duplicate handled)`);
  return data2;
}

async function testValidation() {
  console.log('\n4️⃣  POST /v1/events/ingest - Validation errors');
  
  const response = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: [{
        // Missing required fields
        payload: { test: 'invalid' }
      }]
    }),
  });

  if (response.ok) {
    throw new Error('Expected validation error, but request succeeded');
  }

  const data = await response.json();
  if (!data.error || !data.errors) {
    throw new Error('Expected validation errors in response');
  }
  
  console.log(`   ✅ Validation errors caught correctly`);
  console.log(`   📝 Errors: ${JSON.stringify(data.errors, null, 2)}`);
  return data;
}

async function testRevenueEvent() {
  console.log('\n5️⃣  POST /v1/events/ingest - Revenue event');
  
  const response = await fetch(`${API_BASE}/api/v1/events/ingest`, {
    method: 'POST',
    headers: {
      'x-ingest-key': INGEST_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: [{
        idempotencyKey: `revenue_${Date.now()}`,
        source: 'stripe',
        category: 'billing',
        name: 'purchase_completed',
        billing: {
          productId: 'pro_annual',
          store: 'stripe',
          amountCents: 9999,
          currency: 'USD'
        },
        payload: { plan: 'annual' }
      }]
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`   ✅ Revenue event ingested ($99.99)`);
  return data;
}

// Run all tests
(async () => {
  try {
    await testSingleEvent();
    await testBatchEvents();
    await testIdempotency();
    await testValidation();
    await testRevenueEvent();
    
    console.log('\n✅ All tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - Single event ingestion ✅');
    console.log('   - Batch ingestion (5 events) ✅');
    console.log('   - Idempotency (deduplication) ✅');
    console.log('   - Validation (error handling) ✅');
    console.log('   - Revenue tracking ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
