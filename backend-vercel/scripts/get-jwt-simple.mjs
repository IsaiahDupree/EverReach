#!/usr/bin/env node

// Get JWT for test account via Supabase Auth API

const SUPABASE_URL = 'https://bvhqolnytimehzpwdiqd.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY);

const email = process.argv[2] || 'isaiahdupree33@gmail.com';
const password = process.argv[3] || 'frogger12';

console.log(`[Auth] Getting JWT for ${email}...`);

try {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Auth failed:', data);
    process.exit(1);
  }

  console.log('\n✅ JWT obtained!\n');
  console.log('Access Token:');
  console.log(data.access_token);
  console.log('\nTo use:');
  console.log(`$env:TEST_JWT = "${data.access_token}"`);
  console.log('node test/profile-smoke.mjs');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
