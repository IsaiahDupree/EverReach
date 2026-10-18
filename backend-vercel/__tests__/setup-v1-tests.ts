/**
 * Shared V1 Test Setup
 * 
 * Provides centralized configuration and resources for all V1 endpoint tests.
 * Generates fresh access token and shares test user/org across all test suites.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app/api';
const TEST_ORIGIN = process.env.TEST_ORIGIN || 'https://everreach.app';
const VERCEL_BYPASS = process.env.VERCEL_PROTECTION_BYPASS || process.env.X_VERCEL_PROTECTION_BYPASS;

// Test user credentials (use your actual account)
const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const TEST_LOG = ((process.env.TEST_LOG || '').toLowerCase() === 'true') || process.env.TEST_LOG === '1';

if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env file');
}

// ============================================================================
// SHARED TEST STATE
// ============================================================================

interface TestContext {
  supabase: any;
  apiUrl: string;
  accessToken: string;
  userId: string;
  orgId: string;
  email: string;
}

let sharedContext: TestContext | null = null;

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Initialize shared test context
 * - Generates fresh access token
 * - Gets user and org info
 * - Caches for all tests
 */
export async function initializeTestContext(): Promise<TestContext> {
  if (sharedContext) {
    return sharedContext;
  }

  console.log('🔧 Initializing V1 test context...');

  // Sign in to get fresh access token (with simple retries)
  let lastErr: any;
  let accessToken: string | null = null;
  let userId: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (signInError || !session?.session) throw new Error(signInError?.message || 'No session');
      accessToken = session.session.access_token;
      userId = session.user.id;
      break;
    } catch (e: any) {
      lastErr = e;
      const backoff = 250 * attempt;
      if (TEST_LOG) console.warn(`Auth attempt ${attempt} failed: ${e?.message}. Retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  if (!accessToken || !userId) {
    throw new Error(`Failed to sign in after retries: ${lastErr?.message || 'unknown error'}`);
  }

  if (TEST_LOG) {
    console.log(`✅ Signed in as: ${TEST_EMAIL}`);
    console.log(`✅ User ID: ${userId}`);
    console.log(`✅ Token length: ${accessToken.length}`);
  }

  // Get user's org
  const { data: userOrg, error: orgError } = await supabase
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (orgError || !userOrg) {
    throw new Error(`Failed to get user org: ${orgError?.message}`);
  }

  const orgId = userOrg.org_id;
  if (TEST_LOG) console.log(`✅ Org ID: ${orgId}`);

  // Save token to file for manual testing
  const tokenPath = path.join(__dirname, '../test-token.txt');
  fs.writeFileSync(tokenPath, accessToken, 'utf8');
  if (TEST_LOG) console.log(`✅ Token saved to: test-token.txt`);

  sharedContext = {
    supabase,
    apiUrl,
    accessToken,
    userId,
    orgId,
    email: TEST_EMAIL,
  };

  return sharedContext;
}

/**
 * Get shared test context (must call initializeTestContext first)
 */
export function getTestContext(): TestContext {
  if (!sharedContext) {
    throw new Error('Test context not initialized. Call initializeTestContext() first.');
  }
  return sharedContext;
}

/**
 * Cleanup test data (call in afterAll)
 */
export async function cleanupTestData(resourceType: string, filters: Record<string, any>) {
  const context = getTestContext();
  
  try {
    await context.supabase
      .from(resourceType)
      .delete()
      .match(filters);
    
    console.log(`🧹 Cleaned up ${resourceType}:`, filters);
  } catch (error: any) {
    console.warn(`⚠️  Cleanup failed for ${resourceType}:`, error.message);
  }
}

/**
 * Create test contact
 */
export async function createTestContact(data: {
  display_name: string;
  emails?: string[];
  phones?: string[];
  tags?: string[];
  company?: string;
  warmth?: number;
  [key: string]: any;
}) {
  const context = getTestContext();
  
  const { data: contact, error } = await context.supabase
    .from('contacts')
    .insert({
      org_id: context.orgId,
      user_id: context.userId,
      emails: data.emails || [],
      phones: data.phones || [],
      tags: data.tags || [],
      ...data, // Spread first so explicit fields can override
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test contact: ${error.message}`);
  }

  return contact;
}

/**
 * Create test interaction
 */
export async function createTestInteraction(data: {
  contact_id: string;
  kind: string;
  content?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}) {
  const context = getTestContext();
  
  const { data: interaction, error } = await context.supabase
    .from('interactions')
    .insert({
      org_id: context.orgId,
      contact_id: data.contact_id,
      kind: data.kind,
      content: data.content || null,
      metadata: data.metadata || {},
      created_at: data.created_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test interaction: ${error.message}`);
  }

  return interaction;
}

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const context = getTestContext();
  
  const url = `${context.apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json',
    'Origin': TEST_ORIGIN,
    ...(VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : {}),
    ...(options.headers as any),
  };

  const ctrl = new AbortController();
  const timeout = (options as any).timeoutMs ?? 20000;
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    if (TEST_LOG) console.log(`[test] ${options.method || 'GET'} ${url}`);
    const res = await fetch(url, {
      ...options,
      headers,
      signal: ctrl.signal,
    });
    if (TEST_LOG) console.log(`[test] <= ${res.status} ${options.method || 'GET'} ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Return whether destructive cleanup should run (default true). */
export function shouldCleanup(): boolean {
  const v = (process.env.CLEANUP ?? process.env.TEST_CLEANUP ?? '1').toString().trim();
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * Log detailed response info for debugging test failures
 */
export async function logResponseDetails(
  endpoint: string,
  method: string,
  response: Response,
  requestBody?: any
): Promise<void> {
  const clonedRes = response.clone();
  let bodyText = '';
  try {
    bodyText = await clonedRes.text();
  } catch {
    bodyText = '<unable to read body>';
  }

  const bodyExcerpt = bodyText.length > 500 ? bodyText.slice(0, 500) + '...' : bodyText;
  let parsedBody: any;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    parsedBody = null;
  }

  console.error('\n❌ Test Failure Details:');
  console.error(`   Endpoint: ${method} ${endpoint}`);
  console.error(`   Status: ${response.status} ${response.statusText}`);
  console.error(`   Headers:`);
  console.error(`     x-request-id: ${response.headers.get('x-request-id') || 'N/A'}`);
  console.error(`     x-vercel-id: ${response.headers.get('x-vercel-id') || 'N/A'}`);
  console.error(`     content-type: ${response.headers.get('content-type') || 'N/A'}`);
  if (requestBody) {
    const reqExcerpt = typeof requestBody === 'string' ? requestBody.slice(0, 500) : JSON.stringify(requestBody).slice(0, 500);
    console.error(`   Request Body: ${reqExcerpt}`);
  }
  console.error(`   Response Body: ${parsedBody ? JSON.stringify(parsedBody, null, 2).slice(0, 500) : bodyExcerpt}`);
  console.error('');
}

/**
 * Expect response status to be one of allowed codes; log details and throw if not
 */
export async function expectStatusOrLog(
  response: Response,
  allowed: number[],
  context: { endpoint: string; method: string; requestBody?: any }
): Promise<void> {
  if (!allowed.includes(response.status)) {
    await logResponseDetails(context.endpoint, context.method, response, context.requestBody);
    throw new Error(
      `Expected status ${allowed.join(' or ')}, got ${response.status} for ${context.method} ${context.endpoint}`
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  supabase,
  apiUrl,
  TEST_EMAIL,
  TEST_PASSWORD,
};
