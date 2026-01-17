/**
 * Public API Context Bundle Tests
 * 
 * Tests the most important endpoint for AI agents:
 * GET /v1/contacts/:id/context-bundle
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testContactId: string;
let testApiKey: string;
let testInteractionIds: string[] = [];

beforeAll(async () => {
  // Create test org
  const { data: org, error: orgError } = await supabase.from('orgs').insert({
    name: 'Test Org - Context Bundle',
  }).select().single();
  
  if (orgError || !org) {
    console.error('Failed to create test org:', orgError);
    throw new Error(`Failed to create test org: ${orgError?.message || 'No data returned'}`);
  }
  
  testOrgId = org.id;

  // Create test user
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `contextbundle-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create test contact with rich data
  const { data: contact, error: contactError } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    display_name: 'Ada Lovelace',
    emails: ['ada@example.com'],
    phones: ['+15555551234'],
    tags: ['vip', 'engineer', 'historical'],
    warmth: 72,
    warmth_band: 'warm',
    last_interaction_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    metadata: {
      birthday: '1815-12-10',
      city: 'London',
      specialty: 'Analytical Engine',
    },
    user_id: testUserId,
  }).select().single();
  
  if (contactError || !contact) {
    console.error('Failed to create test contact:', contactError);
    throw new Error(`Failed to create test contact: ${contactError?.message || 'No data returned'}`);
  }
  
  testContactId = contact.id;

  // Create test interactions
  const interactions = [
    {
      org_id: testOrgId,
      user_id: testUserId,
      contact_id: testContactId,
      channel: 'email',
      direction: 'outbound',
      summary: 'Checked in about project progress',
      sentiment: 'positive',
      occurred_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      org_id: testOrgId,
      user_id: testUserId,
      contact_id: testContactId,
      channel: 'call',
      direction: 'inbound',
      summary: 'Discussed upcoming conference',
      sentiment: 'positive',
      occurred_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      org_id: testOrgId,
      user_id: testUserId,
      contact_id: testContactId,
      channel: 'dm',
      direction: 'outbound',
      summary: 'Shared interesting article',
      sentiment: 'neutral',
      occurred_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const { data: createdInteractions } = await supabase
    .from('interactions')
    .insert(interactions)
    .select();

  testInteractionIds = createdInteractions!.map(i => i.id);

  // Create API key with contacts:read scope
  testApiKey = generateApiKey('test');
  const keyHash = hashApiKey(testApiKey);

  await supabase.from('api_keys').insert({
    org_id: testOrgId,
    key_prefix: getKeyPrefix(testApiKey),
    key_hash: keyHash,
    name: 'Context Bundle Test Key',
    environment: 'test',
    scopes: ['contacts:read', 'interactions:read'],
    user_id: testUserId,
  });
});

afterAll(async () => {
  // Cleanup
  await supabase.from('interactions').delete().in('id', testInteractionIds);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('api_keys').delete().eq('org_id', testOrgId);
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// CONTEXT BUNDLE STRUCTURE TESTS
// ============================================================================

describe('Context Bundle Structure', () => {
  test('should return complete context bundle structure', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const bundle = await response.json();

    // Verify top-level structure
    expect(bundle).toHaveProperty('contact');
    expect(bundle).toHaveProperty('interactions');
    expect(bundle).toHaveProperty('pipeline');
    expect(bundle).toHaveProperty('tasks');
    expect(bundle).toHaveProperty('context');
    expect(bundle).toHaveProperty('meta');
  });

  test('should include complete contact information', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const contact = bundle.contact;

    expect(contact.id).toBe(testContactId);
    expect(contact.name).toBe('Ada Lovelace');
    expect(contact.emails).toContain('ada@example.com');
    expect(contact.phones).toContain('+15555551234');
    expect(contact.tags).toContain('vip');
    expect(contact.warmth_score).toBe(72);
    expect(contact.warmth_band).toBe('warm');
    expect(contact.last_touch_at).toBeTruthy();
    expect(contact.custom_fields).toHaveProperty('birthday', '1815-12-10');
    expect(contact.custom_fields).toHaveProperty('city', 'London');
  });

  test('should include recent interactions', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle?interactions=10`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const interactions = bundle.interactions;

    expect(Array.isArray(interactions)).toBe(true);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions.length).toBeLessThanOrEqual(10);

    // Verify interaction structure
    const interaction = interactions[0];
    expect(interaction).toHaveProperty('id');
    expect(interaction).toHaveProperty('channel');
    expect(interaction).toHaveProperty('direction');
    expect(interaction).toHaveProperty('summary');
    expect(interaction).toHaveProperty('sentiment');
    expect(interaction).toHaveProperty('occurred_at');
  });

  test('should include context helpers for AI', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const context = bundle.context;

    // Verify prompt skeleton
    expect(context.prompt_skeleton).toBeTruthy();
    expect(typeof context.prompt_skeleton).toBe('string');
    expect(context.prompt_skeleton).toContain('Ada Lovelace');
    expect(context.prompt_skeleton).toContain('Warmth:');
    expect(context.prompt_skeleton).toContain('Last contact:');

    // Verify brand rules
    expect(context.brand_rules).toHaveProperty('tone');
    expect(context.brand_rules).toHaveProperty('do');
    expect(context.brand_rules).toHaveProperty('dont');
    expect(Array.isArray(context.brand_rules.do)).toBe(true);
    expect(Array.isArray(context.brand_rules.dont)).toBe(true);

    // Verify flags
    expect(context.flags).toHaveProperty('dnc');
    expect(context.flags).toHaveProperty('requires_approval');
    expect(typeof context.flags.dnc).toBe('boolean');
  });

  test('should include metadata with token estimate', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const meta = bundle.meta;

    expect(meta).toHaveProperty('generated_at');
    expect(meta).toHaveProperty('token_estimate');
    expect(typeof meta.token_estimate).toBe('number');
    expect(meta.token_estimate).toBeGreaterThan(0);
  });
});

// ============================================================================
// QUERY PARAMETERS TESTS
// ============================================================================

describe('Query Parameters', () => {
  test('should limit interactions with query param', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle?interactions=2`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    expect(bundle.interactions.length).toBeLessThanOrEqual(2);
  });

  test('should enforce max interactions limit', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle?interactions=1000`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    expect(bundle.interactions.length).toBeLessThanOrEqual(50); // Max is 50
  });

  test('should default to 20 interactions', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    // We only have 3 interactions, so it should return all 3
    expect(bundle.interactions.length).toBe(3);
  });
});

// ============================================================================
// PROMPT SKELETON TESTS
// ============================================================================

describe('Prompt Skeleton Generation', () => {
  test('should include contact name in skeleton', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    expect(skeleton).toContain('Contact: Ada Lovelace');
  });

  test('should include warmth information', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    expect(skeleton).toMatch(/Warmth:\s*72\/100/);
    expect(skeleton).toContain('(warm)');
  });

  test('should include tags', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    expect(skeleton).toContain('Tags:');
    expect(skeleton).toContain('vip');
    expect(skeleton).toContain('engineer');
  });

  test('should include last contact information', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    expect(skeleton).toMatch(/Last contact:\s*\d+\s*days ago/);
  });

  test('should include recent interactions summary', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    expect(skeleton).toContain('Recent interactions');
    expect(skeleton).toMatch(/\d+d ago/); // Should have day counts
  });

  test('should be token-efficient', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const bundle = await response.json();
    const skeleton = bundle.context.prompt_skeleton;

    // Prompt skeleton should be compact
    expect(skeleton.length).toBeLessThan(2000); // Should be < 500 tokens
    
    // Should not have verbose formatting
    expect(skeleton).not.toContain('===');
    expect(skeleton).not.toContain('###');
  });
});

// ============================================================================
// AUTHORIZATION TESTS
// ============================================================================

describe('Authorization', () => {
  test('should require authentication', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`
    );

    expect(response.status).toBe(401);
    const error = await response.json();
    expect(error.type).toContain('unauthorized');
  });

  test('should require contacts:read scope', async () => {
    // Create key without contacts:read
    const limitedKey = generateApiKey('test');
    const keyHash = hashApiKey(limitedKey);

    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(limitedKey),
      key_hash: keyHash,
      name: 'Limited Key',
      environment: 'test',
      scopes: ['warmth:read'], // No contacts:read
      created_by: testUserId,
    }).select().single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${limitedKey}`,
        },
      }
    );

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.type).toContain('forbidden');

    // Cleanup
    await supabase.from('api_keys').delete().eq('id', apiKey!.id);
  });

  test('should enforce tenant isolation', async () => {
    // Create another org and contact
    const { data: otherOrg } = await supabase.from('orgs').insert({
    name: 'Other Org',
    }).select().single();

    const { data: otherContact } = await supabase.from('contacts').insert({
      org_id: otherOrg!.id,
      display_name: 'Other Contact',
      emails: ['other@example.com'],
    }).select().single();

    // Try to access other org's contact with our key
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${otherContact!.id}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(404); // Should appear as not found
    const error = await response.json();
    expect(error.type).toContain('not-found');

    // Cleanup
    await supabase.from('contacts').delete().eq('id', otherContact!.id);
    await supabase.from('orgs').delete().eq('id', otherOrg!.id);
  });
});

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  test('should handle contact with no interactions', async () => {
    // Create contact with no interactions
    const { data: newContact } = await supabase.from('contacts').insert({
      org_id: testOrgId,
      display_name: 'New Contact',
      emails: ['new@example.com'],
      user_id: testUserId,
    }).select().single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${newContact!.id}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const bundle = await response.json();

    expect(bundle.interactions).toHaveLength(0);
    expect(bundle.context.prompt_skeleton).toContain('No recent interactions');

    // Cleanup
    await supabase.from('contacts').delete().eq('id', newContact!.id);
  });

  test('should handle contact with no custom fields', async () => {
    const { data: plainContact } = await supabase.from('contacts').insert({
      org_id: testOrgId,
      display_name: 'Plain Contact',
      emails: ['plain@example.com'],
      user_id: testUserId,
    }).select().single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${plainContact!.id}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const bundle = await response.json();

    expect(bundle.contact.custom_fields).toBeDefined();
    expect(Object.keys(bundle.contact.custom_fields).length).toBe(0);

    // Cleanup
    await supabase.from('contacts').delete().eq('id', plainContact!.id);
  });

  test('should handle contact with DNC flag', async () => {
    const { data: dncContact } = await supabase.from('contacts').insert({
      org_id: testOrgId,
      display_name: 'DNC Contact',
      emails: ['dnc@example.com'],
      tags: ['dnc'],
      user_id: testUserId,
    }).select().single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${dncContact!.id}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const bundle = await response.json();

    expect(bundle.context.flags.dnc).toBe(true);

    // Cleanup
    await supabase.from('contacts').delete().eq('id', dncContact!.id);
  });

  test('should return 404 for non-existent contact', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/00000000-0000-0000-0000-000000000000/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.status).toBe(404);
    const error = await response.json();
    expect(error.type).toContain('not-found');
  });
});

// ============================================================================
// RESPONSE HEADERS TESTS
// ============================================================================

describe('Response Headers', () => {
  test('should include rate limit headers', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  test('should include request ID header', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/contacts/${testContactId}/context-bundle`,
      {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      }
    );

    const requestId = response.headers.get('X-Request-Id');
    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^req_[a-f0-9]{32}$/);
  });
});

console.log('✅ Public API Context Bundle Tests Complete');
