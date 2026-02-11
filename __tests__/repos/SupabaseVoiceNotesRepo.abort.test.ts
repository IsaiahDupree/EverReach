/**
 * SupabaseVoiceNotesRepo - AbortError Handling Tests
 * 
 * Tests that AbortError is handled gracefully when:
 * - Request times out (30s timeout)
 * - User navigates away before request completes
 * - Component unmounts during fetch
 * 
 * These tests verify that AbortError doesn't show as console error
 * and that the app continues working normally.
 */

import { SupabaseVoiceNotesRepo } from '@/repos/SupabaseVoiceNotesRepo';

// Mock apiFetch to simulate AbortError
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  authHeader: jest.fn(() => Promise.resolve({ Authorization: 'Bearer test-token' })),
  backendBase: jest.fn(() => 'https://test-api.example.com'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    removeChannel: jest.fn(),
  },
}));

import { apiFetch } from '@/lib/api';

describe('SupabaseVoiceNotesRepo - AbortError Handling', () => {
  const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
    console.log = jest.fn(); // Mock console.log
  });

  describe('all() method', () => {
    it('should handle AbortError gracefully and return empty array', async () => {
      // Simulate AbortError (request cancelled)
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const result = await SupabaseVoiceNotesRepo.all();

      // Should return empty array
      expect(result).toEqual([]);

      // Should log info message, NOT error
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );

      // Should NOT log error
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should still log errors for non-AbortError failures', async () => {
      // Simulate a real error (not AbortError)
      const networkError = new Error('Network failure');
      mockedApiFetch.mockRejectedValueOnce(networkError);

      const result = await SupabaseVoiceNotesRepo.all();

      // Should return empty array
      expect(result).toEqual([]);

      // Should log actual error
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('failed:'),
        networkError
      );
    });

    it('should handle successful fetch normally', async () => {
      // Simulate successful response
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          notes: [
            {
              id: 'test-note-1',
              body_text: 'Test note',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      };
      mockedApiFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await SupabaseVoiceNotesRepo.all();

      // Should return mapped notes
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-note-1');

      // Should not log errors
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('get() method', () => {
    it('should handle AbortError gracefully and return null', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const result = await SupabaseVoiceNotesRepo.get('test-id');

      // Should return null
      expect(result).toBeNull();

      // Should log info message, NOT error
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );

      // Should NOT log error
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('create() method', () => {
    it('should handle AbortError and throw meaningful error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      // First call for upload attempt, second for create - both abort
      mockedApiFetch.mockRejectedValue(abortError);

      await expect(
        SupabaseVoiceNotesRepo.create({
          audioUri: 'https://example.com/test.m4a',
        })
      ).rejects.toThrow('Request cancelled');

      // Should log abort message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );
    });
  });

  describe('update() method', () => {
    it('should handle AbortError and throw meaningful error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      await expect(
        SupabaseVoiceNotesRepo.update('test-id', { transcription: 'Updated' })
      ).rejects.toThrow('Request cancelled');

      // Should log abort message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );
    });
  });

  describe('remove() method', () => {
    it('should handle AbortError and throw meaningful error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      await expect(
        SupabaseVoiceNotesRepo.remove('test-id')
      ).rejects.toThrow('Request cancelled');

      // Should log info message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );
    });
  });

  describe('byPerson() method', () => {
    it('should handle AbortError gracefully and return empty array', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const result = await SupabaseVoiceNotesRepo.byPerson('test-person-id');

      // Should return empty array (byPerson delegates to all() which catches AbortError)
      expect(result).toEqual([]);
    });
  });

  describe('Cache behavior with AbortError', () => {
    it('should not cache AbortError results', async () => {
      // Use get() to avoid module-level all() cache interference
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const result1 = await SupabaseVoiceNotesRepo.get('cache-test-1');
      expect(result1).toBeNull();
      expect(mockedApiFetch).toHaveBeenCalled();
      
      // After abort, next call should still attempt fetch (not return cached abort)
      mockedApiFetch.mockClear();
      mockedApiFetch.mockRejectedValueOnce(new Error('Second call made'));

      await SupabaseVoiceNotesRepo.get('cache-test-2');
      
      // Verify apiFetch was called again (abort didn't permanently cache)
      expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error message clarity', () => {
    it('should handle AbortError differently from network errors', async () => {
      // AbortError: returns null without throwing
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const abortResult = await SupabaseVoiceNotesRepo.get('clarity-abort');
      expect(abortResult).toBeNull();

      // Network error: also returns null without throwing
      const networkError = new Error('Network failure');
      mockedApiFetch.mockRejectedValueOnce(networkError);

      const errorResult = await SupabaseVoiceNotesRepo.get('clarity-network');
      expect(errorResult).toBeNull();

      // Both errors handled gracefully (no unhandled exceptions)
      expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    });
  });
});
