#!/usr/bin/env node

// Get JWT for test account via Supabase Auth API

const SUPABASE_URL = 'https://bvhqolnytimehzpwdiqd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aHFvbG55dGltZWh6cHdkaXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4ODEyMDAsImV4cCI6MjA0MzQ1NzIwMH0.YxVZretYJ6UPPiWoB4JgdYfKPBCFNNdLgOvqMh5kBEU';

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
