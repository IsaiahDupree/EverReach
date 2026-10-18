/**
 * Public API Context Bundle E2E Tests
 * 
 * Tests the most important endpoint for AI agents
 * GET /v1/contacts/:id/context-bundle
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { E2EClient, shouldSkipE2E, getTestConfig } from '../helpers/e2e-client';

const describeE2E = shouldSkipE2E() ? describe.skip : describe;

describeE2E('Public API Context Bundle E2E', () => {
  let client: E2EClient;
  let supabase: any;
  let testOrgId: string;
  let testUserId: string;
  let testContactId: string;
  let testApiKey: string;

  beforeAll(async () => {
    const config = getTestConfig();
    client = new E2EClient(config);
    
    const supabaseUrl = config.supabaseUrl;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create test org
    const { data: org } = await supabase.from('organizations').insert({
      name: 'E2E Test Org - Context Bundle',
    }).select().single();
    testOrgId = org!.id;

    // Create test user
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `e2e-context-${Date.now()}@example.com`,
      password: 'testpass123',
      email_confirm: true,
    });
    testUserId = user!.id;

    // Create test contact with rich data
    const { data: contact } = await supabase.from('contacts').insert({
      org_id: testOrgId,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+15555555555',
      tags: ['vip', 'engineer'],
      warmth_score: 72,
      custom: {
        birthday: '1815-12-10',
        city: 'London',
      },
      created_by: testUserId,
    }).select().single();
    testContactId = contact!.id;

    // Create some interactions
    await supabase.from('interactions').insert([
      {
        contact_id: testContactId,
        org_id: testOrgId,
        kind: 'email',
        direction: 'outbound',
        content: 'Test email 1',
        summary: 'Sent introduction email',
        sentiment: 'positive',
        occurred_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        created_by: testUserId,
      },
      {
        contact_id: testContactId,
        org_id: testOrgId,
        kind: 'call',
        direction: 'inbound',
        content: 'Test call',
        summary: 'Quick catch-up call',
        sentiment: 'positive',
        occurred_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        created_by: testUserId,
      },
    ]);

    // Generate API key
    const crypto = require('crypto');
    testApiKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(testApiKey).digest('hex');
    
    await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: testApiKey.substring(0, 12),
      key_hash: keyHash,
      name: 'Context Bundle Test Key',
      environment: 'test',
      scopes: ['contacts:read', 'interactions:read'],
      created_by: testUserId,
    });

    console.log(`[E2E Setup] Contact ID: ${testContactId}`);
  });

  afterAll(async () => {
    if (supabase) {
      await supabase.from('interactions').delete().eq('contact_id', testContactId);
      await supabase.from('contacts').delete().eq('id', testContactId);
      await supabase.from('api_keys').delete().eq('org_id', testOrgId);
      await supabase.from('organizations').delete().eq('id', testOrgId);
      if (testUserId) {
        await supabase.auth.admin.deleteUser(testUserId);
      }
    }
  });

  // ============================================================================
  // CONTEXT BUNDLE STRUCTURE TESTS
  // ============================================================================

  describe('Context Bundle Structure', () => {
    test('should return complete context bundle structure', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const bundle = response.data as any;
      
      // Check main sections
      expect(bundle).toHaveProperty('contact');
      expect(bundle).toHaveProperty('interactions');
      expect(bundle).toHaveProperty('context');
      expect(bundle).toHaveProperty('meta');
    });

    test('should include complete contact information', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      const contact = bundle.contact;

      expect(contact.id).toBe(testContactId);
      expect(contact.name).toBe('Ada Lovelace');
      expect(contact.emails).toContain('ada@example.com');
      expect(contact.tags).toEqual(expect.arrayContaining(['vip', 'engineer']));
      expect(contact.warmth_score).toBe(72);
      expect(contact.custom_fields).toBeDefined();
    });

    test('should include recent interactions', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      
      expect(Array.isArray(bundle.interactions)).toBe(true);
      expect(bundle.interactions.length).toBeGreaterThan(0);
      
      const interaction = bundle.interactions[0];
      expect(interaction).toHaveProperty('id');
      expect(interaction).toHaveProperty('channel');
      expect(interaction).toHaveProperty('direction');
      expect(interaction).toHaveProperty('summary');
      expect(interaction).toHaveProperty('occurred_at');
    });

    test('should include AI context helpers', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      const context = bundle.context;

      expect(context).toHaveProperty('prompt_skeleton');
      expect(context).toHaveProperty('flags');
      expect(context.flags).toHaveProperty('dnc');
      expect(context.flags).toHaveProperty('requires_approval');
    });

    test('should include metadata with token estimate', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      
      expect(bundle.meta).toHaveProperty('generated_at');
      expect(bundle.meta).toHaveProperty('token_estimate');
      expect(typeof bundle.meta.token_estimate).toBe('number');
      expect(bundle.meta.token_estimate).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // QUERY PARAMETERS TESTS
  // ============================================================================

  describe('Query Parameters', () => {
    test('should respect interactions limit parameter', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey,
        {
          query: {
            interactions: '1',
          },
        }
      );

      expect(response.status).toBe(200);
      const bundle = response.data as any;
      expect(bundle.interactions.length).toBeLessThanOrEqual(1);
    });

    test('should default to reasonable interaction limit', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(200);
      const bundle = response.data as any;
      expect(bundle.interactions.length).toBeLessThanOrEqual(20);
    });

    test('should enforce maximum interaction limit', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey,
        {
          query: {
            interactions: '100', // Try to request 100
          },
        }
      );

      expect(response.status).toBe(200);
      const bundle = response.data as any;
      expect(bundle.interactions.length).toBeLessThanOrEqual(50); // Max should be 50
    });
  });

  // ============================================================================
  // PROMPT SKELETON TESTS
  // ============================================================================

  describe('Prompt Skeleton', () => {
    test('should generate token-efficient prompt skeleton', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      const skeleton = bundle.context.prompt_skeleton;

      expect(typeof skeleton).toBe('string');
      expect(skeleton.length).toBeGreaterThan(0);
      expect(skeleton.length).toBeLessThan(2000); // Should be compact
    });

    test('should include contact name in skeleton', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      const skeleton = bundle.context.prompt_skeleton;

      expect(skeleton).toContain('Ada Lovelace');
    });

    test('should include warmth information in skeleton', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      const bundle = response.data as any;
      const skeleton = bundle.context.prompt_skeleton;

      expect(skeleton).toMatch(/warmth|72|warm/i);
    });
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  describe('Authorization', () => {
    test('should require authentication', async () => {
      const response = await client.requestUnauth(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`
      );

      expect(response.status).toBe(401);
    });

    test('should require contacts:read scope', async () => {
      // Create key without contacts:read
      const crypto = require('crypto');
      const noReadKey = `evr_test_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(noReadKey).digest('hex');
      
      await supabase.from('api_keys').insert({
        org_id: testOrgId,
        key_prefix: noReadKey.substring(0, 12),
        key_hash: keyHash,
        name: 'No Read Scope Key',
        environment: 'test',
        scopes: ['contacts:write'], // No read scope
        created_by: testUserId,
      });

      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
        noReadKey
      );

      expect(response.status).toBe(403);
    });

    test('should enforce tenant isolation', async () => {
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
        `/api/v1/contacts/${otherContact!.id}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(404);
      
      // Cleanup
      await supabase.from('contacts').delete().eq('id', otherContact!.id);
      await supabase.from('organizations').delete().eq('id', otherOrg!.id);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    test('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${fakeId}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(404);
    });

    test('should handle contact with no interactions', async () => {
      // Create contact without interactions
      const { data: newContact } = await supabase.from('contacts').insert({
        org_id: testOrgId,
        name: 'New Contact',
        email: 'new@example.com',
        created_by: testUserId,
      }).select().single();

      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${newContact!.id}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(200);
      const bundle = response.data as any;
      expect(bundle.interactions).toEqual([]);
      
      // Cleanup
      await supabase.from('contacts').delete().eq('id', newContact!.id);
    });
  });

  // ============================================================================
  // RESPONSE HEADERS TESTS
  // ============================================================================

  describe('Response Headers', () => {
    test('should include rate limit headers', async () => {
      const response = await client.requestWithApiKey(
        'GET',
        `/api/v1/contacts/${testContactId}/context-bundle`,
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
        `/api/v1/contacts/${testContactId}/context-bundle`,
        testApiKey
      );

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_[a-f0-9]+$/);
    });
  });
});
