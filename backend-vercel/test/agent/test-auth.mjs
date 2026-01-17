/**
 * Quick test to verify Supabase authentication
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file
try {
  const envPath = resolve(__dirname, '../../.env');
  const envFile = readFileSync(envPath, 'utf-8');
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (!key) return;
    
    let value = valueParts.join('=');
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  });
  console.log('✓ Environment variables loaded');
} catch (err) {
  console.error('Failed to load .env:', err.message);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

console.log('\nTesting Supabase Authentication...');
console.log(`SUPABASE_URL: ${SUPABASE_URL?.substring(0, 40)}...`);
console.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY?.substring(0, 40)}...`);
console.log(`TEST_EMAIL: ${TEST_EMAIL}`);
console.log(`TEST_PASSWORD: ${TEST_PASSWORD.substring(0, 3)}***\n`);

const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;

console.log(`Auth URL: ${url}\n`);

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'apikey': SUPABASE_ANON_KEY 
    },
    body: JSON.stringify({ 
      email: TEST_EMAIL, 
      password: TEST_PASSWORD 
    })
  });
  
  const data = await response.json();
  
  console.log(`Response Status: ${response.status} ${response.statusText}`);
  console.log('\nResponse Body:');
  console.log(JSON.stringify(data, null, 2));
  
  if (response.ok && data.access_token) {
    console.log('\n✅ Authentication SUCCESSFUL!');
    console.log(`Access Token: ${data.access_token.substring(0, 50)}...`);
  } else {
    console.log('\n❌ Authentication FAILED');
    console.log(`Error: ${data.error_description || data.error || 'Unknown error'}`);
  }
} catch (err) {
  console.error('\n❌ Request failed:', err.message);
  process.exit(1);
}
