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
      mockedApiFetch.mockRejectedValueOnce(abortError);

      await expect(
        SupabaseVoiceNotesRepo.create({
          bodyText: 'Test note',
          recordingUri: 'file://test.m4a',
        })
      ).rejects.toThrow('Request cancelled');

      // Should log info message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );

      // Should NOT log error (we're throwing intentionally)
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('update() method', () => {
    it('should handle AbortError and throw meaningful error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      await expect(
        SupabaseVoiceNotesRepo.update('test-id', { bodyText: 'Updated' })
      ).rejects.toThrow('Request cancelled');

      // Should log info message
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

      // Should return empty array
      expect(result).toEqual([]);

      // Should log info message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      );

      // Should NOT log error
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Cache behavior with AbortError', () => {
    it('should not cache AbortError results', async () => {
      // First call: AbortError
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      const result1 = await SupabaseVoiceNotesRepo.all();
      expect(result1).toEqual([]);

      // Second call: Successful
      const mockResponse = {
        ok: true,
        json: async () => ({ notes: [{ id: '1', body_text: 'Test' }] }),
      };
      mockedApiFetch.mockResolvedValueOnce(mockResponse as any);

      const result2 = await SupabaseVoiceNotesRepo.all();
      
      // Should get fresh data, not cached abort result
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe('1');
    });
  });

  describe('Error message clarity', () => {
    it('should distinguish AbortError from other errors in logs', async () => {
      // AbortError
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockedApiFetch.mockRejectedValueOnce(abortError);

      await SupabaseVoiceNotesRepo.all();

      const abortLogCall = (console.log as jest.Mock).mock.calls.find(call =>
        call[0].includes('Request aborted')
      );
      expect(abortLogCall).toBeDefined();
      expect(abortLogCall[0]).toContain('navigation or timeout');

      jest.clearAllMocks();

      // Regular error
      const networkError = new Error('Network failure');
      mockedApiFetch.mockRejectedValueOnce(networkError);

      await SupabaseVoiceNotesRepo.all();

      const errorLogCall = (console.error as jest.Mock).mock.calls.find(call =>
        call[0].includes('failed:')
      );
      expect(errorLogCall).toBeDefined();
      expect(errorLogCall[1]).toBe(networkError);
    });
  });
});
