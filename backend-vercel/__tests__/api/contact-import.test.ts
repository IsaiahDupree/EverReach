/**
 * Contact Import API Tests
 * 
 * Tests the contacts import endpoints for Google and Microsoft:
 * - GET /v1/contacts/import/health - Provider status
 * - POST /v1/contacts/import/[provider]/start - Start OAuth flow
 * - GET /v1/contacts/import/list - List import jobs
 * - GET /v1/contacts/import/status/[id] - Job status
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  cleanupTestData,
  makeAuthenticatedRequest,
} from '../setup-v1-tests';

// ============================================================================
// SETUP
// ============================================================================

beforeAll(async () => {
  await initializeTestContext();
  console.log('✅ Contact Import tests initialized');
});

afterAll(async () => {
  const context = getTestContext();
  await cleanupTestData('contact_import_jobs', { user_id: context.userId });
  console.log('🧹 Contact Import tests cleaned up');
});

// ============================================================================
// TESTS: GET /v1/contacts/import/health
// ============================================================================

describe('GET /v1/contacts/import/health', () => {
  test('should return provider configuration status', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/health', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('providers');
    expect(data.providers).toHaveProperty('google');
    expect(data.providers).toHaveProperty('microsoft');
    
    console.log('📋 Provider status:', JSON.stringify(data, null, 2));
  });

  test('should show Google configuration status', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/health', {
      method: 'GET',
    });

    const data = await response.json();
    const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
    
    if (hasGoogleCreds) {
      expect(data.providers.google.configured).toBe(true);
      console.log('✅ Google OAuth is configured');
    } else {
      console.log('⚠️  Google OAuth not configured (this is OK for basic tests)');
    }
    
    expect(data.providers.google).toHaveProperty('configured');
    expect(data.providers.google).toHaveProperty('available');
  });
});

// ============================================================================
// TESTS: POST /v1/contacts/import/google/start
// ============================================================================

describe('POST /v1/contacts/import/google/start', () => {
  test('should create job and return authorization URL', async () => {
    const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
    
    if (!hasGoogleCreds) {
      console.log('⏭️  Skipping Google OAuth test - credentials not configured');
      return;
    }

    const response = await makeAuthenticatedRequest('/v1/contacts/import/google/start', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('job_id');
    expect(data).toHaveProperty('authorization_url');
    expect(data).toHaveProperty('provider', 'google');
    expect(data.authorization_url).toContain('accounts.google.com');
    expect(data.authorization_url).toContain('oauth2');
    
    console.log('✅ Created import job:', data.job_id);
    console.log('🔗 OAuth URL:', data.authorization_url.substring(0, 80) + '...');
  });

  test('should return helpful error when not configured', async () => {
    const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
    
    if (hasGoogleCreds) {
      console.log('⏭️  Skipping "not configured" test - Google OAuth IS configured');
      return;
    }

    const response = await makeAuthenticatedRequest('/v1/contacts/import/google/start', {
      method: 'POST',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data.error).toContain('Google OAuth not configured');
    console.log('✅ Returns helpful configuration error');
  });
});

// ============================================================================
// TESTS: POST /v1/contacts/import/microsoft/start
// ============================================================================

describe('POST /v1/contacts/import/microsoft/start', () => {
  test('should handle Microsoft OAuth flow', async () => {
    const hasMicrosoftCreds = process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET;
    
    const response = await makeAuthenticatedRequest('/v1/contacts/import/microsoft/start', {
      method: 'POST',
    });

    const data = await response.json();

    if (hasMicrosoftCreds) {
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('authorization_url');
      expect(data.authorization_url).toContain('login.microsoftonline.com');
      console.log('✅ Microsoft OAuth configured and working');
    } else {
      expect(response.status).toBe(400);
      expect(data.error).toContain('Microsoft OAuth not configured');
      console.log('⚠️  Microsoft OAuth not configured (expected)');
    }
  });
});

// ============================================================================
// TESTS: GET /v1/contacts/import/list
// ============================================================================

describe('GET /v1/contacts/import/list', () => {
  test('should return list of import jobs', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/list', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('jobs');
    expect(Array.isArray(data.jobs)).toBe(true);
    
    console.log(`📋 Found ${data.jobs.length} import jobs`);
  });

  test('should respect limit parameter', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/list?limit=5', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.jobs.length).toBeLessThanOrEqual(5);
    console.log('✅ Limit parameter working correctly');
  });

  test('should only return current user jobs', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/list', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    const context = getTestContext();
    
    // All jobs should belong to current user
    data.jobs.forEach((job: any) => {
      expect(job.user_id).toBe(context.userId);
    });
    
    console.log('✅ RLS policy working - only user jobs returned');
  });
});
