/**
 * Shared utilities for agent integration tests
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file if it exists
try {
  const envPath = resolve(__dirname, '../../.env');
  const envFile = readFileSync(envPath, 'utf-8');
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (!key) return;
    
    let value = valueParts.join('=');
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Force set from .env (override any existing values)
    process.env[key.trim()] = value;
    if (key.trim() === 'TEST_PASSWORD' || key.trim() === 'TEST_EMAIL') {
      console.log(`  DEBUG: Set ${key.trim()} = "${value}" (${value.length} chars)`);
    }
  });
  console.log('✓ Environment variables loaded from .env');
  console.log(`  Final TEST_PASSWORD: "${process.env.TEST_PASSWORD}" (${process.env.TEST_PASSWORD?.length || 0} chars)`);
} catch (err) {
  console.warn('⚠ Could not load .env file:', err.message);
}

export async function getEnv(name, required = true, def) {
  const v = process.env[name] ?? def;
  if (required && (!v || String(v).trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
export const TEST_EMAIL = process.env.TEST_EMAIL;
export const TEST_PASSWORD = process.env.TEST_PASSWORD;

/**
 * Get Supabase access token for test user
 */
export async function getAccessToken() {
  if (process.env.ACCESS_TOKEN) return process.env.ACCESS_TOKEN;
  
  const SUPABASE_URL = await getEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  
  console.log(`Attempting auth with email: ${TEST_EMAIL}`);
  console.log(`Password length: ${TEST_PASSWORD?.length || 0} chars`);
  console.log(`Password first 3 chars: ${TEST_PASSWORD?.substring(0, 3) || 'undefined'}`);
  
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
  
  let json;
  try {
    json = await res.json();
  } catch (e) {
    console.error('Failed to parse JSON response:', e.message);
    throw new Error(`Supabase sign-in failed: ${res.status} ${res.statusText} - Invalid JSON response`);
  }
  
  if (!res.ok) {
    const msg = json?.error_description || json?.error || res.statusText;
    console.error('Supabase error response:', JSON.stringify(json, null, 2));
    throw new Error(`Supabase sign-in failed: ${res.status} ${msg}`);
  }
  
  const token = json?.access_token;
  if (!token) {
    console.error('No access_token in response:', JSON.stringify(json, null, 2));
    throw new Error('No access_token from Supabase REST');
  }
  
  return token;
}

/**
 * Make authenticated API request
 */
export async function makeAuthRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Set up test user and return auth token
 */
export async function setupTestUser() {
  const token = await getAccessToken();
  
  // Get user ID from token or /me endpoint
  const userResponse = await makeAuthRequest(`${API_BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return {
    token,
    userId: userResponse.id || userResponse.user?.id,
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userId) {
  // Placeholder for cleanup logic
  // In production, this could delete test contacts, feature requests, etc.
  console.log(`Cleanup completed for user: ${userId}`);
}

/**
 * General API fetch helper
 */
export async function apiFetch(base, path, { method = 'GET', headers = {}, body, token, origin } = {}) {
  const url = `${base}${path}`;
  const hdrs = {
    'Content-Type': 'application/json',
    'Origin': origin,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...headers,
  };
  
  const t0 = Date.now();
  const res = await fetch(url, { method, headers: hdrs, body });
  const dt = Date.now() - t0;
  
  let json = null;
  try { 
    json = await res.json(); 
  } catch {}
  
  return { res, json, ms: dt };
}
