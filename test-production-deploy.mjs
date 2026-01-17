#!/usr/bin/env node

const BACKEND_URL = 'https://ever-reach-be.vercel.app';
const TOKEN = process.env.TEST_TOKEN || '';

console.log('\n🧪 Testing Production Deployment\n');
console.log('Backend URL:', BACKEND_URL);
console.log('━'.repeat(60));

// Test 1: Warmth Summary
console.log('\n📊 Test 1: GET /api/v1/warmth/summary');
try {
  const response = await fetch(`${BACKEND_URL}/api/v1/warmth/summary`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Origin': 'https://example.com', // Test CORS
    }
  });
  
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Vary': response.headers.get('Vary'),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Warmth Summary:', {
      total: data.total_contacts,
      hot: data.by_band?.hot,
      warm: data.by_band?.warm,
      cooling: data.by_band?.cooling,
      cold: data.by_band?.cold,
    });
  } else {
    const error = await response.text();
    console.log('❌ Error:', error);
  }
} catch (err) {
  console.error('❌ Request failed:', err.message);
}

// Test 2: Interactions
console.log('\n📝 Test 2: GET /api/v1/interactions');
try {
  const response = await fetch(`${BACKEND_URL}/api/v1/interactions?limit=3&sort=created_at:desc`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Origin': 'https://example.com', // Test CORS
    }
  });
  
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Vary': response.headers.get('Vary'),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Interactions:', {
      count: data.items?.length,
      first: data.items?.[0] ? {
        contact_name: data.items[0].contact_name,
        content: data.items[0].content?.substring(0, 50),
        created_at: data.items[0].created_at,
      } : null,
    });
  } else {
    const error = await response.text();
    console.log('❌ Error:', error);
  }
} catch (err) {
  console.error('❌ Request failed:', err.message);
}

console.log('\n' + '━'.repeat(60));
console.log('✅ Test Complete!\n');
