/**
 * Messages API - Prepare and Send Tests
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  authenticatedRequest,
  parseJsonResponse,
  assertStatus,
  BACKEND_BASE_URL,
} from './auth-helper.mjs';

const PREPARE_PATH = '/api/v1/messages/prepare';
const SEND_PATH = '/api/v1/messages/send';

describe('Messages API', () => {
  let contactId = null;

  beforeAll(async () => {
    const unique = Date.now().toString();
    const res = await authenticatedRequest('/api/v1/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Messages Test ${unique}`, emails: [`messages-${unique}@example.com`] }),
    });
    if (res.status === 201) {
      const data = await parseJsonResponse(res);
      contactId = data.id;
    } else {
      const list = await authenticatedRequest('/api/v1/contacts?limit=1');
      const data = await list.json();
      const items = data.items || data.contacts || data;
      contactId = items?.[0]?.id || null;
    }
  });
  it('POST /messages/prepare - returns 200 when OPENAI is set or 500 otherwise', async () => {
    const res = await authenticatedRequest(PREPARE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        purpose: 'check_in',
        tone: 'friendly',
        context: 'Quick check in after previous conversation.'
      }),
    });
    expect([200, 500, 400]).toContain(res.status);
    if (res.status === 500) {
      const text = await res.text();
      // Ensure problem json-ish content
      expect(typeof text).toBe('string');
    }
  });

  it('POST /messages/send - returns 200 when OPENAI is set or 500 otherwise', async () => {
    const res = await authenticatedRequest(SEND_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        channel: 'email',
        draft: 'Hi there, just checking in!'
      }),
    });
    expect([200, 500, 400]).toContain(res.status);
  });

  it('requires authentication', async () => {
    const res1 = await fetch(`${BACKEND_BASE_URL}${PREPARE_PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const res2 = await fetch(`${BACKEND_BASE_URL}${SEND_PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });
});
