import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://backend-vercel-ozkif4pug-isaiahduprees-projects.vercel.app';

async function testEventTracking() {
  console.log('🧪 Testing Event Tracking Endpoint\n');

  // Test 1: Health check
  console.log('1️⃣  Health Check...');
  const healthResponse = await fetch(`${BASE_URL}/api/tracking/events`);
  const health = await healthResponse.json();
  console.log('   Status:', healthResponse.status);
  console.log('   Response:', health);

  // Test 2: Track single event
  console.log('\n2️⃣  Tracking Single Event...');
  const singleEventResponse = await fetch(`${BASE_URL}/api/tracking/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'test_event',
      user_id: 'e5eaa347-9c72-4190-bace-ec7a2063f69a',
      properties: {
        source: 'test',
        test_run: new Date().toISOString()
      }
    })
  });

  console.log('   Status:', singleEventResponse.status);
  const singleResult = await singleEventResponse.json();
  console.log('   Response:', JSON.stringify(singleResult, null, 2));

  // Test 3: Track batch events
  console.log('\n3️⃣  Tracking Batch Events...');
  const batchResponse = await fetch(`${BASE_URL}/api/tracking/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          event: 'page_view',
          user_id: 'e5eaa347-9c72-4190-bace-ec7a2063f69a',
          properties: { page: '/dashboard' }
        },
        {
          event: 'button_click',
          user_id: 'e5eaa347-9c72-4190-bace-ec7a2063f69a',
          properties: { button: 'save' }
        }
      ]
    })
  });

  console.log('   Status:', batchResponse.status);
  const batchResult = await batchResponse.json();
  console.log('   Response:', JSON.stringify(batchResult, null, 2));

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 EVENT TRACKING SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log('Health Check:', healthResponse.ok ? '✅' : '❌');
  console.log('Single Event:', singleEventResponse.ok ? '✅' : '❌');
  console.log('Batch Events:', batchResponse.ok ? '✅' : '❌');
  console.log('═══════════════════════════════════════════════\n');
}

testEventTracking().catch(console.error);
