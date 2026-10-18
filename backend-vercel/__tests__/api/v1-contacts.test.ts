/**
 * V1 Contacts API Tests
 * 
 * Tests the core contacts CRUD endpoints:
 * - GET /v1/contacts - List contacts with filtering
 * - POST /v1/contacts - Create contact
 * - GET /v1/contacts/:id - Get single contact
 * - PATCH /v1/contacts/:id - Update contact
 * - DELETE /v1/contacts/:id - Soft delete contact
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  cleanupTestData,
  createTestContact,
  makeAuthenticatedRequest,
} from '../setup-v1-tests';

// ============================================================================
// SETUP
// ============================================================================

let testContactId: string;

beforeAll(async () => {
  // Initialize shared test context (generates fresh token)
  await initializeTestContext();
  console.log('✅ V1 Contacts tests initialized');
});

afterAll(async () => {
  // Cleanup test contacts
  const context = getTestContext();
  await cleanupTestData('contacts', { org_id: context.orgId });
  console.log('🧹 V1 Contacts tests cleaned up');
});

// ============================================================================
// TESTS: POST /v1/contacts (Create)
// ============================================================================

describe('POST /v1/contacts', () => {
  test('should create a contact with minimal data', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({
        display_name: 'John Doe',
        emails: ['john@example.com'],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.contact).toBeDefined();
    expect(data.contact.id).toBeDefined();
    expect(data.contact.display_name).toBe('John Doe');
    
    testContactId = data.contact.id;
  });

  test('should create a contact with full data', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Jane Smith',
        emails: ['jane@example.com', 'jane.smith@work.com'],
        phones: ['+1234567890'],
        company: 'Acme Corp',
        tags: ['vip', 'customer'],
        notes: 'Important client',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.contact.display_name).toBe('Jane Smith');
  });

  test('should require authentication', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Unauthorized Contact',
      }),
    });

    expect(response.status).toBe(401);
  });

  test('should validate required fields', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing display_name
        emails: ['test@example.com'],
      }),
    });

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe('validation_error');
  });

  test('should handle idempotency key', async () => {
    const idempotencyKey = `test-${Date.now()}`;
    
    // First request
    const response1 = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        display_name: 'Idempotent Contact',
        emails: ['idempotent@example.com'],
      }),
    });

    expect(response1.status).toBe(201);
    const data1 = await response1.json();
    const contactId = data1.contact.id;

    // Second request with same key
    const response2 = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        display_name: 'Idempotent Contact',
        emails: ['idempotent@example.com'],
      }),
    });

    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.contact.id).toBe(contactId);
    expect(data2.idempotent).toBe(true);
  });
});

// ============================================================================
// TESTS: GET /v1/contacts (List)
// ============================================================================

describe('GET /v1/contacts', () => {
  beforeAll(async () => {
    // Create test contacts
    await createTestContact({ display_name: 'Alice', tags: ['vip'], warmth: 85 });
    await createTestContact({ display_name: 'Bob', tags: ['customer'], warmth: 60 });
    await createTestContact({ display_name: 'Charlie', tags: ['lead'], warmth: 40 });
  });

  test('should list contacts', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });

  test('should filter by tag', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts?tag=vip`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.every((c: any) => c.tags.includes('vip'))).toBe(true);
  });

  test('should filter by warmth range', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts?warmth_gte=70`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.every((c: any) => c.warmth >= 70)).toBe(true);
  });

  test('should search by name', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts?q=Alice`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.some((c: any) => c.display_name.includes('Alice'))).toBe(true);
  });

  test('should support pagination', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts?limit=2`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.length).toBeLessThanOrEqual(2);
    expect(data.limit).toBe(2);
  });

  test('should require authentication', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`);
    expect(response.status).toBe(401);
  });
});

// ============================================================================
// TESTS: GET /v1/contacts/:id (Get Single)
// ============================================================================

describe('GET /v1/contacts/:id', () => {
  let contactId: string;

  beforeAll(async () => {
    const contact = await createTestContact({
      display_name: 'Test Single Contact',
      emails: ['single@example.com'],
      company: 'Test Corp',
    });
    contactId = contact!.id;
  });

  test('should get a contact by ID', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contact).toBeDefined();
    expect(data.contact.id).toBe(contactId);
    expect(data.contact.display_name).toBe('Test Single Contact');
    expect(data.contact.emails).toContain('single@example.com');
  });

  test('should return 404 for non-existent contact', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/00000000-0000-0000-0000-000000000000`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(404);
  });

  test('should require authentication', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`);
    expect(response.status).toBe(401);
  });
});

// ============================================================================
// TESTS: PATCH /v1/contacts/:id (Update)
// ============================================================================

describe('PATCH /v1/contacts/:id', () => {
  let contactId: string;

  beforeAll(async () => {
    const contact = await createTestContact({
      display_name: 'Update Test',
      emails: ['update@example.com'],
    });
    contactId = contact!.id;
  });

  test('should update contact name', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Updated Name',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contact.display_name).toBe('Updated Name');
  });

  test('should update multiple fields', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company: 'New Company',
        tags: ['updated', 'test'],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verify update
    const getResponse = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${testAccessToken}` },
    });
    const getData = await getResponse.json();
    expect(getData.contact.company).toBe('New Company');
    expect(getData.contact.tags).toContain('updated');
  });

  test('should return 404 for non-existent contact', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Should Not Exist',
      }),
    });

    expect(response.status).toBe(404);
  });

  test('should require authentication', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Unauthorized Update',
      }),
    });

    expect(response.status).toBe(401);
  });
});

// ============================================================================
// TESTS: DELETE /v1/contacts/:id (Soft Delete)
// ============================================================================

describe('DELETE /v1/contacts/:id', () => {
  let contactId: string;

  beforeAll(async () => {
    const contact = await createTestContact({
      display_name: 'Delete Test',
      emails: ['delete@example.com'],
    });
    contactId = contact!.id;
  });

  test('should soft delete a contact', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.deleted).toBe(true);
    expect(data.contact.deleted_at).toBeDefined();
  });

  test('should not return deleted contact in list', async () => {
    // Delete a contact
    const contact = await createTestContact({
      display_name: 'To Be Deleted',
      emails: ['todelete@example.com'],
    });
    
    await fetch(`${apiUrl}/v1/contacts/${contact!.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    // List contacts
    const listResponse = await fetch(`${apiUrl}/v1/contacts`, {
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    const listData = await listResponse.json();
    expect(listData.items.find((c: any) => c.id === contact!.id)).toBeUndefined();
  });

  test('should return 404 for non-existent contact', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
      },
    });

    expect(response.status).toBe(404);
  });

  test('should require authentication', async () => {
    const contact = await createTestContact({
      display_name: 'Auth Delete Test',
    });
    
    const response = await fetch(`${apiUrl}/v1/contacts/${contact!.id}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(401);
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('should handle empty email array', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'No Email Contact',
        emails: [],
      }),
    });

    expect(response.status).toBe(201);
  });

  test('should handle special characters in name', async () => {
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'José García-López & Co.',
        emails: ['jose@example.com'],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.contact.display_name).toBe('José García-López & Co.');
  });

  test('should handle large tag arrays', async () => {
    const tags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
    
    const response = await fetch(`${apiUrl}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Many Tags Contact',
        emails: ['tags@example.com'],
        tags,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    
    // Verify tags were saved
    const getResponse = await fetch(`${apiUrl}/v1/contacts/${data.contact.id}`, {
      headers: { 'Authorization': `Bearer ${testAccessToken}` },
    });
    const getData = await getResponse.json();
    expect(getData.contact.tags.length).toBe(50);
  });
});
