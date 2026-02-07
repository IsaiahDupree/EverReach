/**
 * File Upload API Tests
 * BACK-UPLOAD-001: File Upload Endpoint
 *
 * Tests for the POST /api/upload endpoint that uploads files to Supabase Storage
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}));

describe('BACK-UPLOAD-001: File Upload Endpoint', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should return 401 if not authenticated', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if no file is provided', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      });

      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('file');
    });

    it('should upload file to Supabase Storage and return URL', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'uploads/test-user-id/test.txt' },
        error: null,
      });

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/uploads/test-user-id/test.txt' },
      });

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          })),
        },
      });

      const fileContent = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fileContent, 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
      expect(data.url).toContain('https://');
      expect(data.path).toBeDefined();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should handle upload errors from Supabase Storage', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      });

      const fileContent = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fileContent, 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should create unique file paths for each user', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: `uploads/${mockUser.id}/unique-filename.txt` },
        error: null,
      });

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/uploads/${mockUser.id}/unique-filename.txt` },
      });

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          })),
        },
      });

      const fileContent = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fileContent, 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toContain(mockUser.id);
    });
  });

  describe('Acceptance Criteria', () => {
    it('Uploads to Supabase Storage - files are stored in Supabase Storage', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'uploads/test-user-id/test.txt' },
        error: null,
      });

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/uploads/test-user-id/test.txt' },
      });

      const mockStorageFrom = jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }));

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        storage: {
          from: mockStorageFrom,
        },
      });

      const fileContent = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fileContent, 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      await POST(request, {});

      // Verify storage.from was called with a bucket name
      expect(mockStorageFrom).toHaveBeenCalled();

      // Verify upload was called
      expect(mockUpload).toHaveBeenCalled();
    });

    it('Returns URL - API returns the public URL of the uploaded file', async () => {
      const { createServerClient } = require('@/lib/supabase/server');

      const expectedUrl = 'https://example.supabase.co/storage/v1/object/public/uploads/test-user-id/test.txt';

      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({
              data: { path: 'uploads/test-user-id/test.txt' },
              error: null,
            }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: expectedUrl },
            }),
          })),
        },
      });

      const fileContent = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fileContent, 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe(expectedUrl);
    });
  });
});
