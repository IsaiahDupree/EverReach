#!/usr/bin/env node
/**
 * Get a fresh Supabase auth token for testing
 */

import { readFile } from 'fs/promises';

// Load .env file
let SUPABASE_URL, SUPABASE_ANON_KEY;
try {
  const envContent = await readFile('.env', 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    }
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=') || line.startsWith('EXPO_PUBLIC_SUPABASE_KEY=')) {
      SUPABASE_ANON_KEY = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('Could not read .env file:', error.message);
}

// Allow override from environment
SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_URL;
SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

const EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!PASSWORD) {
  console.error('❌ Missing TEST_PASSWORD environment variable');
  console.error('Set it with: $env:TEST_PASSWORD="your-password"; node get-fresh-token.mjs');
  process.exit(1);
}

console.log('🔐 Signing in to Supabase...');
console.log('Email:', EMAIL);

try {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Sign in failed:', response.status, error);
    process.exit(1);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    console.error('❌ No access token in response');
    process.exit(1);
  }

  console.log('✅ Successfully signed in!');
  console.log('\n📋 Copy this token:\n');
  console.log(data.access_token);
  console.log('\n🔧 To use with test:');
  console.log(`$env:TEST_TOKEN="${data.access_token}"; node test-production-deploy.mjs`);
  console.log('\nToken expires at:', new Date(data.expires_at * 1000).toISOString());
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
