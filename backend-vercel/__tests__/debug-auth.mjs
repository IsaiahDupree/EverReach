/**
 * Debug authentication issues
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env.test') });

const BACKEND_URL = 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN;

console.log('🔍 Debugging Authentication\n');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Token (first 50 chars): ${TEST_TOKEN?.substring(0, 50)}...\n`);

// Test 1: Call without auth
console.log('Test 1: GET without auth token');
const response1 = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`);
const text1 = await response1.text();
console.log(`Status: ${response1.status}`);
console.log(`Response: ${text1.substring(0, 200)}\n`);

// Test 2: Call with auth
console.log('Test 2: GET with auth token');
const response2 = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
  },
});
const text2 = await response2.text();
console.log(`Status: ${response2.status}`);
console.log(`Response: ${text2.substring(0, 500)}`);
console.log(`Full response: ${text2}\n`);

// Test 3: Check if endpoint exists
console.log('Test 3: OPTIONS request');
const response3 = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
  method: 'OPTIONS',
});
console.log(`Status: ${response3.status}`);
console.log(`Headers:`, response3.headers.raw());
