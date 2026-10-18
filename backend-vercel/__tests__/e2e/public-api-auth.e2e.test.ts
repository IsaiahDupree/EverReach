/**
 * Public API Authentication E2E Tests
 * 
 * Tests real HTTP requests to deployed API endpoints
 * Requires TEST_BASE_URL, TEST_EMAIL, TEST_PASSWORD environment variables
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { E2EClient, shouldSkipE2E, getTestConfig } from '../helpers/e2e-client';

// Skip all tests if E2E is disabled
const describeE2E = shouldSkipE2E() ? describe.skip : describe;

describeE2E('Public API Authentication E2E', () => {
  let client: E2EClient;
  let supabase: any;
  let testOrgId: string;
  let testUserId: string;
  let testContactId: string;
  let testApiKeyId: string;
  let testApiKey: string;
  let testApiKeyHash: string;

  beforeAll(async () => {
    const config = getTestConfig();
    client = new E2EClient(config);
    
    // Get Supabase admin client for test setup
    const supabaseUrl = config.supabaseUrl;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY required for E2E tests');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create test org
    const { data: org } = await supabase.from('organizations').insert({
      name: 'E2E Test Org - Public API',
    }).select().single();
    testOrgId = org!.id;

    // Create test user
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `e2e-publicapi-${Date.now()}@example.com`,
      password: 'testpass123',
      email_confirm: true,
    });
    testUserId = user!.id;

    // Create test contact
    const { data: contact } = await supabase.from('contacts').insert({
      org_id: testOrgId,
      name: 'E2E Test Contact',
      email: 'e2e-test@example.com',
      created_by: testUserId,
    }).select().single();
    testContactId = contact!.id;

    // Generate API key (mimicking the lib function)
    const crypto = require('crypto');
    testApiKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
    testApiKeyHash = crypto.createHash('sha256').update(testApiKey).digest('hex');
    
    const keyPrefix = testApiKey.substring(0, 12);

    // Create API key in database
    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: keyPrefix,
      key_hash: testApiKeyHash,
      name: 'E2E Test API Key',
      environment: 'test',
      scopes: ['contacts:read', 'contacts:write', 'warmth:read'],
      created_by: testUserId,
    }).select().single();
    testApiKeyId = apiKey!.id;

    console.log(`[E2E Setup] Base URL: ${config.baseUrl}`);
    console.log(`[E2E Setup] Test API Key: ${keyPrefix}...`);
  });

  afterAll(async () => {
    // Cleanup
    if (supabase && testApiKeyId) {
      await supabase.from('api_keys').delete().eq('id', testApiKeyId);
      await supabase.from('contacts').delete().eq('id', testContactId);
      await supabase.from('organizations').delete().eq('id', testOrgId);
      if (testUserId) {
        await supabase.auth.admin.deleteUser(testUserId);
      }
    }
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('Authentication', () => {
    test('should authenticate with valid API key', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
    });

    test('should reject request without authorization header', async () => {
      const response = await client.requestUnauth('GET', '/api/v1/contacts');

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
    });

    test('should reject invalid API key format', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        'invalid_key_format'
      );

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
    });

    test('should reject non-existent API key', async () => {
      const crypto = require('crypto');
      const fakeKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        fakeKey
      );

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
    });

    test('should reject revoked API key', async () => {
      // Create and immediately revoke a key
      const crypto = require('crypto');
      const revokedKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const revokedKeyHash = crypto.createHash('sha256').update(revokedKey).digest('hex');
      
      const { data: apiKey } = await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: revokedKey.substring(0, 12),
        key_hash: revokedKeyHash,
        name: 'Revoked Test Key',
        environment: 'test',
        scopes: ['contacts:read'],
        created_by: testUserId,
        revoked_at: new Date().toISOString(),
        revoked_reason: 'test',
      }).select().single();

      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        revokedKey
      );

      expect(response.status).toBe(401);
      
      // Cleanup
      await supabase.from('api_keys').delete().eq('id', apiKey!.id);
    });

    test('should reject expired API key', async () => {
      // Create an expired key
      const crypto = require('crypto');
      const expiredKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const expiredKeyHash = crypto.createHash('sha256').update(expiredKey).digest('hex');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: apiKey } = await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: expiredKey.substring(0, 12),
        key_hash: expiredKeyHash,
        name: 'Expired Test Key',
        environment: 'test',
        scopes: ['contacts:read'],
        created_by: testUserId,
        expires_at: yesterday.toISOString(),
      }).select().single();

      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        expiredKey
      );

      expect(response.status).toBe(401);
      
      // Cleanup
      await supabase.from('api_keys').delete().eq('id', apiKey!.id);
    });
  });

  // ============================================================================
  // AUTHORIZATION & SCOPES TESTS
  // ============================================================================

  describe('Authorization & Scopes', () => {
    test('should allow access with correct scope', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    test('should deny access without required scope', async () => {
      // Create key without contacts:write scope
      const crypto = require('crypto');
      const limitedKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const limitedKeyHash = crypto.createHash('sha256').update(limitedKey).digest('hex');
      
      const { data: apiKey } = await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: limitedKey.substring(0, 12),
        key_hash: limitedKeyHash,
        name: 'Limited Scope Key',
        environment: 'test',
        scopes: ['contacts:read'], // No write scope
        created_by: testUserId,
      }).select().single();

      const response = await client.requestWithApiKey(
        'POST',
        '/api/v1/contacts',
        limitedKey,
        {
          body: {
            name: 'Test Contact',
            email: 'test@example.com',
          },
        }
      );

      expect(response.status).toBe(403);
      
      // Cleanup
      await supabase.from('api_keys').delete().eq('id', apiKey!.id);
    });

    test('should support wildcard scope (contacts:*)', async () => {
      // Create key with wildcard scope
      const crypto = require('crypto');
      const wildcardKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const wildcardKeyHash = crypto.createHash('sha256').update(wildcardKey).digest('hex');
      
      const { data: apiKey } = await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: wildcardKey.substring(0, 12),
        key_hash: wildcardKeyHash,
        name: 'Wildcard Scope Key',
        environment: 'test',
        scopes: ['contacts:*'], // Wildcard
        created_by: testUserId,
      }).select().single();

      // Test read
      const readResponse = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        wildcardKey
      );
      expect(readResponse.status).toBe(200);

      // Test write
      const writeResponse = await client.requestWithApiKey(
        'POST',
        '/api/v1/contacts',
        wildcardKey,
        {
          body: {
            name: 'Wildcard Test',
            email: 'wildcard@example.com',
          },
        }
      );
      expect([200, 201]).toContain(writeResponse.status);
      
      // Cleanup
      if (writeResponse.data && (writeResponse.data as any).id) {
        await supabase.from('contacts').delete().eq('id', (writeResponse.data as any).id);
      }
      await supabase.from('api_keys').delete().eq('id', apiKey!.id);
    });

    test('should support full wildcard scope (*)', async () => {
      // Create key with full wildcard
      const crypto = require('crypto');
      const fullWildcardKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const fullWildcardKeyHash = crypto.createHash('sha256').update(fullWildcardKey).digest('hex');
      
      const { data: apiKey } = await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: fullWildcardKey.substring(0, 12),
        key_hash: fullWildcardKeyHash,
        name: 'Full Wildcard Key',
        environment: 'test',
        scopes: ['*'], // Full access
        created_by: testUserId,
      }).select().single();

      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        fullWildcardKey
      );
      expect(response.status).toBe(200);
      
      // Cleanup
      await supabase.from('api_keys').delete().eq('id', apiKey!.id);
    });
  });

  // ============================================================================
  // TENANT ISOLATION TESTS
  // ============================================================================

  describe('Tenant Isolation', () => {
    test('should only access contacts from own organization', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      if (response.data && Array.isArray((response.data as any).data)) {
        const contacts = (response.data as any).data;
        // All contacts should belong to test org
        contacts.forEach((contact: any) => {
          expect(contact.org_id).toBe(testOrgId);
        });
      }
    });

    test('should deny access to contact from different org', async () => {
      // Create another org with a contact
      const { data: otherOrg } = await supabase.from('organizations').insert({
        name: 'Other Org',
      }).select().single();

      const { data: otherContact } = await supabase.from('contacts').insert({
        org_id: otherOrg!.id,
        name: 'Other Contact',
        email: 'other@example.com',
        created_by: testUserId,
      }).select().single();

      // Try to access with our API key
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${otherContact!.id}`,
        testApiKey
      );

      expect(response.status).toBe(404); // Should not find (not 403, to avoid leaking existence)
      
      // Cleanup
      await supabase.from('contacts').delete().eq('id', otherContact!.id);
      await supabase.from('organizations').delete().eq('id', otherOrg!.id);
    });
  });

  // ============================================================================
  // RATE LIMIT HEADERS TESTS
  // ============================================================================

  describe('Rate Limit Headers', () => {
    test('should include rate limit headers in response', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    test('should include request ID header', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        '/api/v1/contacts',
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_[a-f0-9]+$/);
    });
  });
});
