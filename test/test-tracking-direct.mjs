#!/usr/bin/env node
/**
 * Direct test of tracking events endpoint
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY);
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';
const BASE_URL = 'http://localhost:3000/api';

async function main() {
  console.log('🔐 Getting auth token...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  const token = data.session.access_token;
  console.log('✅ Authenticated\n');

  console.log('📍 Testing:', `${BASE_URL}/v1/events/track`);
  console.log('');

  // Test 1: Track single event
  console.log('Test 1: Track Single Event');
  const response1 = await fetch(`${BASE_URL}/v1/events/track`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app',
    },
    body: JSON.stringify({
      event_type: 'test_single_event',
      metadata: {
        test_id: 'direct-test',
        source: 'direct_test',
        platform: 'test',
      },
    }),
  });

  console.log('  Status:', response1.status);
  const text1 = await response1.text();
  console.log('  Response:', text1 || '(empty)');
  
  let json1 = null;
  if (text1) {
    try {
      json1 = JSON.parse(text1);
      console.log('  Parsed:', JSON.stringify(json1, null, 2));
    } catch (e) {
      console.log('  Parse error:', e.message);
    }
  }
  
  if (response1.ok) {
    console.log('  ✅ PASS\n');
  } else {
    console.log('  ❌ FAIL\n');
  }

  // Test 2: Track with missing event_type
  console.log('Test 2: Missing event_type (should fail)');
  const response2 = await fetch(`${BASE_URL}/v1/events/track`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app',
    },
    body: JSON.stringify({
      metadata: { test: true },
    }),
  });

  console.log('  Status:', response2.status);
  const text2 = await response2.text();
  console.log('  Response:', text2 || '(empty)');
  
  if (response2.status === 400) {
    console.log('  ✅ PASS (correctly rejected)\n');
  } else {
    console.log('  ❌ FAIL (should return 400)\n');
  }

  console.log('═'.repeat(70));
  console.log('');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
