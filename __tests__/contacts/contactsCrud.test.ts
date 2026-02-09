/**
 * Contact CRUD Tests
 * 
 * Tests the SupabaseContactsRepo operations by mocking apiFetch.
 * Covers: all, get, upsert (create + update), remove, search, findByEmail, findByPhone.
 */

// Mock the API layer before importing
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  backendBase: () => 'http://localhost:3000',
  authHeader: () => Promise.resolve({ Authorization: 'Bearer test-token' }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/constants/endpoints', () => ({
  API_ENDPOINTS: {
    CONTACTS: '/api/v1/contacts',
    CONTACT_BY_ID: (id: string) => `/api/v1/contacts/${id}`,
    SEARCH: '/api/v1/contacts/search',
  },
  getFullUrl: (path: string) => `http://localhost:3000${path}`,
}));

jest.mock('@/helpers/diagnosticLogger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  isCapturingLogs: () => false,
}));

import { apiFetch } from '@/lib/api';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Import after mocks
import { SupabaseContactsRepo } from '@/repos/SupabaseContactsRepo';

const mockContact = {
  id: 'contact-123',
  display_name: 'John Doe',
  emails: ['john@example.com'],
  phones: ['+1234567890'],
  company: 'Acme Inc',
  title: 'CEO',
  tags: ['vip'],
  interests: ['tech'],
  warmth: 75,
  warmth_mode: 'medium',
  created_at: '2024-01-01T00:00:00Z',
  last_interaction_at: '2024-06-01T00:00:00Z',
  cadence_days: 14,
};

function mockOkResponse(data: any) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function mockErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  };
}

describe('SupabaseContactsRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('all()', () => {
    test('fetches and maps contacts', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ items: [mockContact] }) as any
      );

      const result = await SupabaseContactsRepo.all();

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/contacts'),
        expect.objectContaining({ requireAuth: true })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contact-123');
      expect(result[0].fullName).toBe('John Doe');
      expect(result[0].emails).toEqual(['john@example.com']);
      expect(result[0].warmth).toBe(75);
    });

    test('returns empty array on API error', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockErrorResponse(500, 'Internal Server Error') as any
      );

      const result = await SupabaseContactsRepo.all();
      expect(result).toEqual([]);
    });

    test('returns empty array on network error', async () => {
      mockApiFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await SupabaseContactsRepo.all();
      expect(result).toEqual([]);
    });

    test('returns empty array on timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockApiFetch.mockRejectedValueOnce(abortError);

      const result = await SupabaseContactsRepo.all();
      expect(result).toEqual([]);
    });
  });

  describe('get()', () => {
    test('fetches single contact by ID', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: mockContact }) as any
      );

      const result = await SupabaseContactsRepo.get('contact-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('contact-123');
      expect(result!.fullName).toBe('John Doe');
    });

    test('returns null on 404', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockErrorResponse(404, 'Not Found') as any
      );

      const result = await SupabaseContactsRepo.get('nonexistent');
      expect(result).toBeNull();
    });

    test('returns null on error', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await SupabaseContactsRepo.get('contact-123');
      expect(result).toBeNull();
    });
  });

  describe('upsert() - create', () => {
    const newPerson = {
      id: 'new',
      name: 'Jane Smith',
      fullName: 'Jane Smith',
      emails: ['jane@example.com'],
      phones: [],
      company: 'StartupCo',
      createdAt: Date.now(),
    };

    test('creates a new contact via POST', async () => {
      // POST response
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, id: 'new-id', display_name: 'Jane Smith' } }) as any
      );
      // GET (re-fetch full contact)
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, id: 'new-id', display_name: 'Jane Smith' } }) as any
      );

      const result = await SupabaseContactsRepo.upsert(newPerson as any);

      // Should have called POST
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/contacts'),
        expect.objectContaining({ method: 'POST', requireAuth: true })
      );
      expect(result.fullName).toBe('Jane Smith');
    });
  });

  describe('upsert() - update', () => {
    const existingPerson = {
      id: 'contact-123',
      name: 'John Doe Updated',
      fullName: 'John Doe Updated',
      emails: ['john@example.com'],
      company: 'New Corp',
      createdAt: Date.now(),
    };

    test('updates existing contact via PATCH', async () => {
      // PATCH response
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, display_name: 'John Doe Updated' } }) as any
      );
      // GET (re-fetch full)
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, display_name: 'John Doe Updated' } }) as any
      );

      const result = await SupabaseContactsRepo.upsert(existingPerson as any);

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/contacts/contact-123'),
        expect.objectContaining({ method: 'PATCH', requireAuth: true })
      );
      expect(result.fullName).toBe('John Doe Updated');
    });

    test('falls back to PUT if PATCH fails', async () => {
      // PATCH fails
      mockApiFetch.mockResolvedValueOnce(
        mockErrorResponse(405, 'Method Not Allowed') as any
      );
      // PUT succeeds
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, display_name: 'John Doe Updated' } }) as any
      );
      // GET (re-fetch)
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ contact: { ...mockContact, display_name: 'John Doe Updated' } }) as any
      );

      const result = await SupabaseContactsRepo.upsert(existingPerson as any);

      // Second call should be PUT
      expect(mockApiFetch).toHaveBeenCalledTimes(3);
      const secondCall = mockApiFetch.mock.calls[1];
      expect(secondCall[1]).toMatchObject({ method: 'PUT' });
    });
  });

  describe('remove()', () => {
    test('deletes contact via DELETE', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ success: true }) as any
      );

      await SupabaseContactsRepo.remove('contact-123');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/v1/contacts/contact-123',
        expect.objectContaining({ method: 'DELETE', requireAuth: true })
      );
    });

    test('throws on delete failure', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockErrorResponse(403, 'Forbidden') as any
      );

      await expect(SupabaseContactsRepo.remove('contact-123'))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('search()', () => {
    test('searches contacts by query', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ items: [mockContact] }) as any
      );

      const results = await SupabaseContactsRepo.search('john');

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('search'),
        expect.objectContaining({
          method: 'POST',
          requireAuth: true,
        })
      );
      expect(results).toHaveLength(1);
      expect(results[0].fullName).toBe('John Doe');
    });

    test('returns empty array on search error', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockErrorResponse(500, 'Error') as any
      );

      const results = await SupabaseContactsRepo.search('test');
      expect(results).toEqual([]);
    });
  });

  describe('findByEmail()', () => {
    test('finds contacts matching email', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ items: [mockContact] }) as any
      );

      const results = await SupabaseContactsRepo.findByEmail('john@example.com');

      expect(results).toHaveLength(1);
      expect(results[0].emails).toContain('john@example.com');
    });

    test('filters out non-matching emails', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({
          items: [
            mockContact,
            { ...mockContact, id: 'other', emails: ['other@example.com'] },
          ],
        }) as any
      );

      const results = await SupabaseContactsRepo.findByEmail('john@example.com');
      expect(results).toHaveLength(1);
    });
  });

  describe('findByPhone()', () => {
    test('finds contacts matching phone', async () => {
      mockApiFetch.mockResolvedValueOnce(
        mockOkResponse({ items: [mockContact] }) as any
      );

      const results = await SupabaseContactsRepo.findByPhone('+1234567890');
      expect(results).toHaveLength(1);
    });
  });

  describe('subscribeToChanges()', () => {
    test('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsub = SupabaseContactsRepo.subscribeToChanges(callback);

      expect(typeof unsub).toBe('function');
    });
  });
});

describe('Contact mapping', () => {
  test('maps backend schema to Person type correctly', async () => {
    mockApiFetch.mockResolvedValueOnce(
      mockOkResponse({
        contact: {
          id: 'map-test',
          display_name: 'Test User',
          emails: ['test@example.com'],
          phones: ['+1111111111'],
          company: 'TestCo',
          title: 'Engineer',
          tags: ['a', 'b'],
          interests: ['music'],
          warmth: 80,
          warmth_mode: 'fast',
          cadence_days: 7,
          created_at: '2024-01-01T00:00:00Z',
          last_interaction_at: '2024-06-15T00:00:00Z',
          custom_fields: [{ key: 'note', value: 'test note' }],
          photo_url: 'https://cdn.example.com/photo.jpg',
        },
      }) as any
    );

    const person = await SupabaseContactsRepo.get('map-test');

    expect(person).not.toBeNull();
    expect(person!.id).toBe('map-test');
    expect(person!.fullName).toBe('Test User');
    expect(person!.name).toBe('Test User');
    expect(person!.company).toBe('TestCo');
    expect(person!.title).toBe('Engineer');
    expect(person!.tags).toEqual(['a', 'b']);
    expect(person!.interests).toEqual(['music']);
    expect(person!.warmth).toBe(80);
    expect(person!.warmth_mode).toBe('fast');
    expect(person!.cadenceDays).toBe(7);
    expect(person!.photo_url).toBe('https://cdn.example.com/photo.jpg');
    expect(person!.customFields).toEqual([{ key: 'note', value: 'test note' }]);
  });

  test('handles missing optional fields gracefully', async () => {
    mockApiFetch.mockResolvedValueOnce(
      mockOkResponse({
        contact: {
          id: 'minimal',
          display_name: 'Minimal User',
        },
      }) as any
    );

    const person = await SupabaseContactsRepo.get('minimal');

    expect(person).not.toBeNull();
    expect(person!.fullName).toBe('Minimal User');
    expect(person!.warmth).toBe(50); // default
    expect(person!.cadenceDays).toBe(30); // default
  });
});
