/**
 * V1 Interactions API Tests
 * 
 * Tests the interactions CRUD endpoints:
 * - GET /v1/interactions - List interactions with filtering
 * - POST /v1/interactions - Create interaction
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  makeAuthenticatedRequest,
  expectStatusOrLog,
} from '../setup-v1-tests';

// ============================================================================
// SETUP
// ============================================================================

let testContactId: string;

beforeAll(async () => {
  await initializeTestContext();
  const ctx = getTestContext();
  // Create test contact via API; fallback to DB if POST not available
  const resp = await makeAuthenticatedRequest('/v1/contacts', {
    method: 'POST',
    body: JSON.stringify({
      display_name: 'Test Contact for Interactions',
      emails: ['interactions@example.com'],
    }),
  });
  if ([200, 201].includes(resp.status)) {
    const d = await resp.json();
    testContactId = d.contact?.id;
  }
  if (!testContactId) {
    const { data: contact } = await ctx.supabase.from('contacts').insert({
      org_id: ctx.orgId,
      user_id: ctx.userId,
      display_name: 'Test Contact for Interactions',
      emails: ['interactions@example.com'],
    }).select().single();
    if (!contact) throw new Error('Failed to create test contact');
    testContactId = contact.id;
  }
});

afterAll(async () => {
  const ctx = getTestContext();
  await ctx.supabase.from('interactions').delete().match({ contact_id: testContactId });
  await ctx.supabase.from('contacts').delete().eq('id', testContactId);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createTestInteraction(data: any = {}) {
  const ctx = getTestContext();
  const { data: interaction } = await ctx.supabase.from('interactions').insert({
    org_id: ctx.orgId,
    contact_id: data.contact_id || testContactId,
    kind: data.kind || 'note',
    content: data.content || 'Test interaction',
    metadata: data.metadata || {},
    created_at: data.created_at || new Date().toISOString(),
  }).select().single();
  return interaction;
}

// ============================================================================
// TESTS: POST /v1/interactions (Create)
// ============================================================================

describe('POST /v1/interactions', () => {
  test('should create a note interaction', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: 'Had a great conversation about the project',
      }),
    });

    await expectStatusOrLog(response, [200], {
      endpoint: '/v1/interactions',
      method: 'POST',
      requestBody: { contact_id: testContactId, kind: 'note', content: 'Had a great conversation about the project' },
    });
    const data = await response.json();
    expect(data.interaction).toBeDefined();
    expect(data.interaction.id).toBeDefined();
    expect(data.interaction.kind).toBe('note');
    expect(data.interaction.contact_id).toBe(testContactId);
  });

  test('should create a call interaction', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'call',
        content: 'Discussed Q4 goals',
        metadata: {
          duration_seconds: 1800,
          direction: 'outbound',
        },
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();
    expect(data.interaction.kind).toBe('call');
  });

  test('should create an email interaction', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'email',
        content: 'Sent follow-up email',
        metadata: {
          subject: 'Following up on our meeting',
          direction: 'outbound',
        },
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();
    expect(data.interaction.kind).toBe('email');
  });

  test('should create a meeting interaction', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'meeting',
        content: 'Product demo meeting',
        metadata: {
          duration_minutes: 60,
          location: 'Zoom',
        },
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();
    expect(data.interaction.kind).toBe('meeting');
  });

  test('should require authentication', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/v1/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: 'Unauthorized interaction',
      }),
    });

    expect(response.status).toBe(401);
  });

  test('should validate required fields', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        // Missing contact_id and kind
        content: 'Invalid interaction',
      }),
    });

    await expectStatusOrLog(response, [422], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();
    expect(data.error).toBe('validation_error');
  });

  test('should handle metadata', async () => {
    const metadata = {
      sentiment: 'positive',
      tags: ['important', 'follow-up'],
      custom_field: 'custom_value',
    };

    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: 'Interaction with metadata',
        metadata,
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();

    // Verify metadata was saved
    const { data: interaction } = await getTestContext().supabase
      .from('interactions')
      .select('*')
      .eq('id', data.interaction.id)
      .single();

    expect(interaction?.metadata).toMatchObject(metadata);
  });
});

// ============================================================================
// TESTS: GET /v1/interactions (List)
// ============================================================================

describe('GET /v1/interactions', () => {
  beforeAll(async () => {
    // Create test interactions with different types and dates
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    await createTestInteraction({
      kind: 'note',
      content: 'Recent note',
      created_at: now.toISOString(),
    });

    await createTestInteraction({
      kind: 'call',
      content: 'Yesterday call',
      created_at: yesterday.toISOString(),
    });

    await createTestInteraction({
      kind: 'email',
      content: 'Last week email',
      created_at: lastWeek.toISOString(),
    });

    await createTestInteraction({
      kind: 'meeting',
      content: 'Last week meeting',
      created_at: lastWeek.toISOString(),
    });
  });

  test('should list all interactions', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions');

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'GET' });
    const data = await response.json();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });

  test('should filter by contact_id', async () => {
    const response = await makeAuthenticatedRequest(`/v1/interactions?contact_id=${testContactId}`);

    await expectStatusOrLog(response, [200], { endpoint: `/v1/interactions?contact_id=${testContactId}`, method: 'GET' });
    const data = await response.json();
    expect(data.items.every((i: any) => i.contact_id === testContactId)).toBe(true);
  });

  test('should filter by interaction type', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions?type=note');

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions?type=note', method: 'GET' });
    const data = await response.json();
    expect(data.items.every((i: any) => i.kind === 'note')).toBe(true);
  });

  test('should filter by date range', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await makeAuthenticatedRequest(`/v1/interactions?start=${yesterday}&end=${tomorrow}`);

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions?start=...&end=...', method: 'GET' });
    const data = await response.json();
    expect(data.items.length).toBeGreaterThan(0);
    // All interactions should be within the date range
    data.items.forEach((i: any) => {
      const createdAt = new Date(i.created_at);
      expect(createdAt >= new Date(yesterday)).toBe(true);
      expect(createdAt <= new Date(tomorrow)).toBe(true);
    });
  });

  test('should support pagination with limit', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions?limit=2');

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions?limit=2', method: 'GET' });
    const data = await response.json();
    expect(data.items.length).toBeLessThanOrEqual(2);
    expect(data.limit).toBe(2);
  });

  test('should support cursor-based pagination', async () => {
    // Get first page
    const response1 = await makeAuthenticatedRequest('/v1/interactions?limit=2');
    await expectStatusOrLog(response1, [200], { endpoint: '/v1/interactions?limit=2', method: 'GET' });
    const data1 = await response1.json();
    if (data1.nextCursor) {
      // Get second page
      const response2 = await makeAuthenticatedRequest(`/v1/interactions?limit=2&cursor=${data1.nextCursor}`);
      await expectStatusOrLog(response2, [200], { endpoint: '/v1/interactions?limit=2&cursor=...', method: 'GET' });
      const data2 = await response2.json();
      // Second page should have different items
      const page1Ids = data1.items.map((i: any) => i.id);
      const page2Ids = data2.items.map((i: any) => i.id);
      expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
    }
  });

  test('should order by created_at descending', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions?limit=10');

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions?limit=10', method: 'GET' });
    const data = await response.json();
    // Check that items are in descending order
    for (let i = 1; i < data.items.length; i++) {
      const prev = new Date(data.items[i - 1].created_at);
      const curr = new Date(data.items[i].created_at);
      expect(prev >= curr).toBe(true);
    }
  });

  test('should require authentication', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/v1/interactions`);
    await expectStatusOrLog(response, [401], { endpoint: '/v1/interactions', method: 'GET' });
  });

  test('should combine multiple filters', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await makeAuthenticatedRequest(`/v1/interactions?contact_id=${testContactId}&type=note&start=${yesterday}`);

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions?contact_id=...&type=note&start=...', method: 'GET' });
    const data = await response.json();
    // All results should match all filters
    data.items.forEach((i: any) => {
      expect(i.contact_id).toBe(testContactId);
      expect(i.kind).toBe('note');
      expect(new Date(i.created_at) >= new Date(yesterday)).toBe(true);
    });
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('should handle empty content', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: '',
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
  });

  test('should handle null content', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: null,
      }),
    });

    expect(response.status).toBe(200);
  });

  test('should handle long content', async () => {
    const longContent = 'A'.repeat(10000);

    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: longContent,
      }),
    });

    await expectStatusOrLog(response, [200], { endpoint: '/v1/interactions', method: 'POST' });
    const data = await response.json();
    // Verify content was saved
    const { data: interaction } = await getTestContext().supabase
      .from('interactions')
      .select('content')
      .eq('id', data.interaction.id)
      .single();
    expect(interaction?.content?.length).toBe(10000);
  });

  test('should handle complex metadata', async () => {
    const complexMetadata = {
      nested: {
        object: {
          with: {
            deep: {
              nesting: 'value',
            },
          },
        },
      },
      array: [1, 2, 3, { key: 'value' }],
      boolean: true,
      number: 42,
      null: null,
    };

    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'note',
        content: 'Complex metadata test',
        metadata: complexMetadata,
      }),
    });

    expect(response.status).toBe(200);
  });

  test('should handle invalid contact_id', async () => {
    const response = await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: '00000000-0000-0000-0000-000000000000',
        kind: 'note',
        content: 'Invalid contact',
      }),
    });

    // Should fail due to foreign key constraint
    await expectStatusOrLog(response, [500, 400], { endpoint: '/v1/interactions', method: 'POST' });
  });

  test('should enforce limit bounds', async () => {
    // Test max limit
    const response1 = await makeAuthenticatedRequest('/v1/interactions?limit=1000');
    await expectStatusOrLog(response1, [200], { endpoint: '/v1/interactions?limit=1000', method: 'GET' });
    const data1 = await response1.json();
    expect(data1.limit).toBeLessThanOrEqual(100);

    // Test min limit
    const response2 = await makeAuthenticatedRequest('/v1/interactions?limit=0');
    await expectStatusOrLog(response2, [200], { endpoint: '/v1/interactions?limit=0', method: 'GET' });
    const data2 = await response2.json();
    expect(data2.limit).toBeGreaterThanOrEqual(1);
  });
});
