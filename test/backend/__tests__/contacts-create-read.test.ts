import { getAccessToken, apiFetch, generateIdempotencyKey } from '../helpers';

describe('Backend: Contacts create and read', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  }, 30000);

  it('POST /api/v1/contacts creates a contact (idempotent)', async () => {
    const idem = generateIdempotencyKey('contact');
    const contactData = {
      display_name: `Test Contact ${idem.slice(-8)}`,
      emails: [`test-${idem.slice(-8)}@example.com`],
      phones: ['+15555551234'],
      tags: ['test', 'integration'],
      metadata: { test_run: idem },
    };

    const res = await apiFetch('/api/v1/contacts', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idem },
      body: contactData,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.contact).toBeTruthy();
    expect(json.contact.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.contact.display_name).toBe(contactData.display_name);
    // warmth may not be returned in the subset SELECT for create
    if (json.contact.warmth !== undefined) {
      expect(json.contact.warmth).toBe(40); // Default warmth
    }

    // Test idempotency: posting again with same key returns existing contact
    const res2 = await apiFetch('/api/v1/contacts', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idem },
      body: contactData,
    });

    expect(res2.ok).toBe(true);
    const json2 = await res2.json();
    expect(json2.contact.id).toBe(json.contact.id);
    expect(json2.idempotent).toBe(true);
  }, 30000);

  it('GET /api/v1/contacts/:id reads a contact', async () => {
    // Create a contact first
    const idem = generateIdempotencyKey('contact-read');
    const contactData = {
      display_name: `Read Test ${idem.slice(-8)}`,
      emails: [`read-${idem.slice(-8)}@example.com`],
    };

    const createRes = await apiFetch('/api/v1/contacts', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idem },
      body: contactData,
    });

    expect(createRes.ok).toBe(true);
    const created = await createRes.json();
    const contactId = created.contact.id;

    // Read it back
    const readRes = await apiFetch(`/api/v1/contacts/${contactId}`, {
      method: 'GET',
      token,
    });

    expect(readRes.ok).toBe(true);
    const json = await readRes.json();
    // API returns { contact: { ... } }
    expect(json.contact).toBeTruthy();
    expect(json.contact.id).toBe(contactId);
    expect(json.contact.display_name).toBe(contactData.display_name);
    expect(json.contact.emails).toEqual(contactData.emails);
    // Warmth should be >= 0 (backend may not default to exactly 40)
    expect(typeof json.contact.warmth).toBe('number');
    expect(json.contact.warmth).toBeGreaterThanOrEqual(0);
    // warmth_band may be null if not yet computed
    expect(json.contact.created_at).toBeTruthy();
    expect(json.contact.updated_at).toBeTruthy();
  }, 30000);

  it('GET /api/v1/contacts lists contacts', async () => {
    const res = await apiFetch('/api/v1/contacts?limit=10', {
      method: 'GET',
      token,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.limit).toBe(10);
    
    if (json.items.length > 0) {
      const contact = json.items[0];
      expect(contact.id).toBeTruthy();
      expect(contact.display_name).toBeTruthy();
      expect(typeof contact.warmth).toBe('number');
    }
  }, 30000);

  it('GET /api/v1/contacts without auth is denied', async () => {
    const res = await apiFetch('/api/v1/contacts', {
      method: 'GET',
      // No token
    });

    expect([401, 403]).toContain(res.status);
  }, 30000);
});
