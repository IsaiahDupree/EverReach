/**
 * Shared Test Configuration
 * 
 * This file provides shared resources for all V1 endpoint tests:
 * - Access token (from test-token.txt or env)
 * - User ID and Org ID (fetched once, cached)
 * - Supabase client
 * - API URL
 * 
 * All tests import from here to ensure consistency.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// ENVIRONMENT & CLIENTS
// ============================================================================

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app/api';

// ============================================================================
// SHARED TEST STATE
// ============================================================================

let cachedAccessToken: string | null = null;
let cachedUserId: string | null = null;
let cachedOrgId: string | null = null;

/**
 * Get access token from test-token.txt or environment
 */
export function getAccessToken(): string {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // Try test-token.txt first
  const tokenPath = path.join(__dirname, '../test-token.txt');
  if (fs.existsSync(tokenPath)) {
    cachedAccessToken = fs.readFileSync(tokenPath, 'utf8').trim();
    return cachedAccessToken;
  }

  // Try environment variable
  if (process.env.TEST_ACCESS_TOKEN) {
    cachedAccessToken = process.env.TEST_ACCESS_TOKEN;
    return cachedAccessToken;
  }

  throw new Error(
    'No access token found. Please create test-token.txt with your JWT token or set TEST_ACCESS_TOKEN env var.'
  );
}

/**
 * Get user ID from token
 */
export async function getUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const token = getAccessToken();
  
  // Decode JWT to get user ID (without verification, just for testing)
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  cachedUserId = payload.sub;
  
  if (!cachedUserId) {
    throw new Error('Could not extract user ID from token');
  }

  return cachedUserId;
}

/**
 * Get org ID for the test user
 */
export async function getOrgId(): Promise<string> {
  if (cachedOrgId) {
    return cachedOrgId;
  }

  const userId = await getUserId();
  
  // Get user's org
  const { data: userOrg, error } = await supabase
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !userOrg) {
    throw new Error(`Could not find org for user ${userId}: ${error?.message}`);
  }

  cachedOrgId = userOrg.org_id;
  return cachedOrgId;
}

/**
 * Initialize test environment (call once in global setup)
 */
export async function initTestEnvironment() {
  const token = getAccessToken();
  const userId = await getUserId();
  const orgId = await getOrgId();

  console.log('✅ Test environment initialized:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Token length: ${token.length} chars`);

  return { token, userId, orgId };
}

/**
 * Make authenticated request to API
 */
export async function makeAuthRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  
  return fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Cleanup helper - delete test entities
 */
export async function cleanupTestData(table: string, filters: Record<string, any>) {
  let query = supabase.from(table).delete();
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  await query;
}
