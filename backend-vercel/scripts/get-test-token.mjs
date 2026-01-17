#!/usr/bin/env node
/**
 * Generate a test JWT token for E2E testing
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function main() {
  // Load .env.local
  try {
    const envContent = await readFile(resolve(rootDir, '.env.local'), 'utf-8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (err) {
    console.error('Failed to load .env.local:', err.message);
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const TEST_EMAIL = process.env.TEST_EMAIL;
  const TEST_PASSWORD = process.env.TEST_PASSWORD;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD');
    process.exit(1);
  }

  console.log('🔐 Authenticating with Supabase...');
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
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

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error_description || json?.error || res.statusText;
    console.error(`❌ Authentication failed: ${res.status} ${msg}`);
    process.exit(1);
  }

  const token = json?.access_token;
  if (!token) {
    console.error('❌ No access_token in response');
    process.exit(1);
  }

  // Write to test-token.txt
  await writeFile(resolve(rootDir, 'test-token.txt'), token, 'utf8');
  console.log('✅ JWT token saved to test-token.txt');
  console.log(`Token (first 50 chars): ${token.substring(0, 50)}...`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
