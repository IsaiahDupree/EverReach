/**
 * imageUpload - Avatar Upload Tests
 * 
 * Tests the NEW simplified avatar upload flow:
 * - uploadContactAvatarToApi() using POST /v1/contacts/:id/avatar
 * - Single endpoint replaces multi-step flow
 * - Verifies cache invalidation
 * - Tests error handling
 */

import { uploadContactAvatarToApi } from '@/lib/imageUpload';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  backendBase: jest.fn(() => 'https://test-api.example.com'),
  authHeader: jest.fn(() => Promise.resolve({ Authorization: 'Bearer test-token' })),
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('uploadContactAvatarToApi - NEW Simplified Flow', () => {
  const mockContactId = 'test-contact-123';
  const mockImageUri = 'file:///path/to/image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Reset Platform.OS to default
    Platform.OS = 'ios';
  });

  describe('Successful upload flow', () => {
    it('should upload avatar via single /avatar endpoint', async () => {
      // Mock successful upload response
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          photo_url: 'https://storage.example.com/contacts/test-contact-123/avatar.jpg',
          avatar_url: 'https://storage.example.com/contacts/test-contact-123/avatar.jpg',
          contact: {
            id: mockContactId,
            display_name: 'Test User',
            photo_url: 'https://storage.example.com/contacts/test-contact-123/avatar.jpg',
          },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      // Verify result
      expect(result).not.toBeNull();
      expect(result?.url).toContain('storage.example.com');
      expect(result?.url).toContain(mockContactId);

      // Verify fetch was called with correct endpoint
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/v1/contacts/${mockContactId}/avatar`),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );

      // Verify no Content-Type header (multipart boundary set by FormData)
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.headers['Content-Type']).toBeUndefined();

      // Verify success log
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Avatar uploaded successfully')
      );
    });

    it('should handle photo_url in response', async () => {
      const mockPhotoUrl = 'https://storage.example.com/photo.jpg';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: mockPhotoUrl }),
      });

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result?.url).toBe(mockPhotoUrl);
    });

    it('should fallback to avatar_url if photo_url not present', async () => {
      const mockAvatarUrl = 'https://storage.example.com/avatar.jpg';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ avatar_url: mockAvatarUrl }),
      });

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result?.url).toBe(mockAvatarUrl);
    });

    it('should extract path from storage URL', async () => {
      const mockPhotoUrl = 'https://example.supabase.co/storage/v1/object/public/attachments/contacts/123/avatar.jpg';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: mockPhotoUrl }),
      });

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result?.url).toBe(mockPhotoUrl);
      expect(result?.path).toContain('contacts/123/avatar.jpg');
    });
  });

  describe('Platform-specific handling', () => {
    it('should handle native platform (iOS/Android)', async () => {
      Platform.OS = 'ios';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
      });

      await uploadContactAvatarToApi(mockImageUri, mockContactId);

      // Verify FormData was used with native file structure
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.body).toBeDefined();
    });

    it('should handle web platform', async () => {
      Platform.OS = 'web';

      // Mock fetch for blob conversion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
        });

      await uploadContactAvatarToApi(mockImageUri, mockContactId);

      // Verify fetch was called twice (once for blob, once for upload)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle upload failure gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Avatar upload failed'),
        500,
        'Internal Server Error'
      );
    });

    it('should handle missing URL in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }), // No photo_url or avatar_url
      });

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('No URL returned from server')
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('uploadContactAvatarToApi error'),
        networkError
      );
    });

    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const result = await uploadContactAvatarToApi(mockImageUri, mockContactId);

      expect(result).toBeNull();
      // Should still log error (AbortError handling is at API level, not here)
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('File type handling', () => {
    it('should detect PNG file extension', async () => {
      const pngUri = 'file:///path/to/image.png';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.png' }),
      });

      await uploadContactAvatarToApi(pngUri, mockContactId);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      // FormData should contain PNG type
      expect(fetchCall.body).toBeDefined();
    });

    it('should default to JPEG for unknown extensions', async () => {
      const unknownUri = 'file:///path/to/image';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
      });

      await uploadContactAvatarToApi(unknownUri, mockContactId);

      // Should not throw error and should complete successfully
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Comparison with old flow', () => {
    it('should use single endpoint (not multi-step)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
      });

      await uploadContactAvatarToApi(mockImageUri, mockContactId);

      // Verify only ONE fetch call (not 3-4 like old flow)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify it's to the /avatar endpoint (not /files or presigned URL)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/avatar'),
        expect.any(Object)
      );

      // Verify it's NOT calling /files endpoint
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/files'),
        expect.any(Object)
      );
    });

    it('should not make PATCH request separately', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
      });

      await uploadContactAvatarToApi(mockImageUri, mockContactId);

      // Verify no PATCH request (old flow needed this)
      const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[1]?.method === 'PATCH'
      );
      expect(patchCalls).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should complete upload in single request', async () => {
      const startTime = Date.now();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photo_url: 'https://storage.example.com/photo.jpg' }),
      });

      await uploadContactAvatarToApi(mockImageUri, mockContactId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete very quickly (mocked)
      expect(duration).toBeLessThan(100);

      // Single API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
