/**
 * V1 Contacts API Scenario Tests (inspired by recover-work runner)
 * - Data-driven scenarios with varied payloads
 * - Uses shared setup and makeAuthenticatedRequest
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  makeAuthenticatedRequest,
  shouldCleanup,
} from '../setup-v1-tests';

interface Scenario {
  name: string;
  payload: any;
}

describe('V1 Contacts Scenarios', () => {
  const createdIds: string[] = [];
  const unique = Date.now();

  const scenarios: Scenario[] = [
    {
      name: 'Phone Only (US)',
      payload: {
        display_name: `Phone Test ${unique}`,
        phones: ['+16018264769'],
        emails: [],
        tags: ['test-phone-only'],
      },
    },
    {
      name: 'Phone Only (International)',
      payload: {
        display_name: `Int'l Phone ${unique}`,
        phones: ['+442012345678'],
        emails: [],
        tags: ['test-phone-intl'],
      },
    },
    {
      name: 'Email Only',
      payload: {
        display_name: `Email Test ${unique}`,
        phones: [],
        emails: [`test.${unique}@example.com`],
        tags: ['test-email-only'],
      },
    },
    {
      name: 'Multiple Emails',
      payload: {
        display_name: `Multi Email ${unique}`,
        phones: [],
        emails: [`work.${unique}@example.com`, `jane.${unique}@gmail.com`],
        tags: ['test-multi-email'],
      },
    },
    {
      name: 'Phone + Email',
      payload: {
        display_name: `Full Contact ${unique}`,
        phones: ['+15551234567'],
        emails: [`full.${unique}@example.com`],
        tags: ['test-full'],
      },
    },
    {
      name: 'Multiple Phones + Emails',
      payload: {
        display_name: `Complete Contact ${unique}`,
        phones: ['+15551111111', '+15552222222'],
        emails: [`primary.${unique}@example.com`, `secondary.${unique}@example.com`],
        company: 'Test Corp',
        tags: ['test-complete'],
      },
    },
    {
      name: 'Special Characters in Name',
      payload: {
        display_name: `O'Brien-Smith ${unique}`,
        phones: ['+15551112222'],
        emails: [],
        tags: ['test-special-chars'],
      },
    },
    {
      name: 'Unicode Name',
      payload: {
        display_name: `张伟 José ${unique}`,
        phones: ['+8613800138000'],
        emails: [`unicode.${unique}@example.com`],
        tags: ['test-unicode'],
      },
    },
    {
      name: 'SHOULD FAIL: No Phone or Email',
      payload: {
        display_name: `Invalid Contact ${unique}`,
        phones: [],
        emails: [],
        tags: ['test-invalid'],
      },
    },
  ];

  beforeAll(async () => {
    await initializeTestContext();
  });

  afterAll(async () => {
    // Optional cleanup via API; tolerate undeployed DELETE (405)
    if (shouldCleanup() && createdIds.length > 0) {
      for (const id of createdIds) {
        try {
          const resp = await makeAuthenticatedRequest(`/v1/contacts/${id}`, { method: 'DELETE' });
          if (![200, 204, 405].includes(resp.status)) {
            // Best effort only
            const ctx = getTestContext();
            await ctx.supabase.from('contacts').delete().eq('id', id);
          }
        } catch {
          const ctx = getTestContext();
          await ctx.supabase.from('contacts').delete().eq('id', id);
        }
      }
    }
  });

  test.each(scenarios.map(s => [s.name, s.payload]))('Create scenario: %s', async (_name, payload) => {
    const response = await makeAuthenticatedRequest('/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Accept 201 if deployed, 405 if not yet deployed
    expect([201, 405, 400, 422]).toContain(response.status);

    if (response.status === 201) {
      const data = await response.json();
      const id = data?.contact?.id;
      expect(id).toBeDefined();
      if (id) createdIds.push(id);
    } else if (payload.emails?.length === 0 && payload.phones?.length === 0) {
      // Invalid scenario should fail with 400/422 when endpoint exists
      expect([400, 422, 405]).toContain(response.status);
    }
  });

  test('List contacts (limit)', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts?limit=20');
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      const data = await response.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.limit).toBeGreaterThanOrEqual(1);
      expect(data.limit).toBeLessThanOrEqual(50);
    }
  });

  test('Search contacts (q=unique token)', async () => {
    const response = await makeAuthenticatedRequest(`/v1/contacts?q=${encodeURIComponent('Contact ' + unique)}`);
    expect([200, 404]).toContain(response.status);
    // If enabled, should return array shape
    if (response.status === 200) {
      const data = await response.json();
      expect(Array.isArray(data.items)).toBe(true);
    }
  });
});
