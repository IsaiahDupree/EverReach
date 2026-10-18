/**
 * Backend Auth Current User Endpoint Tests
 * BACK-AUTH-006: Current User Endpoint
 *
 * Tests for the GET /api/auth/me endpoint that returns
 * the currently authenticated user's information.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/me/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-006: Current User Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Authentication Required', () => {
    it('should return 401 when Authorization header is missing', async () => {
      // Arrange: Request without Authorization header
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Authorization');
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange: Mock invalid token response
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when token is expired', async () => {
      // Arrange: Mock expired token response
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer expired-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('expired');
    });

    it('should return 401 when Authorization header format is invalid', async () => {
      // Arrange: Invalid format (missing "Bearer")
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'invalid-format-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Returns Current User', () => {
    it('should return authenticated user information', async () => {
      // Arrange: Mock valid user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        user_metadata: {
          name: 'Test User',
        },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should return user with metadata', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        email: 'john@example.com',
        created_at: '2024-01-15T10:30:00Z',
        user_metadata: {
          name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'email',
        },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toEqual(mockUser);
      expect(data.user.user_metadata.name).toBe('John Doe');
    });

    it('should call getUser with the provided token', async () => {
      // Arrange
      const token = 'test-access-token';
      const mockUser = {
        id: 'user-789',
        email: 'jane@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Act
      await GET(request);

      // Assert
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange: Mock an unexpected error
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not expose internal error details', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Database connection at 192.168.1.1 failed')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.message).not.toContain('192.168.1.1');
      expect(data.message).not.toContain('Database');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns current user - authenticated request gets user info', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('acceptance-user-1');
    });

    it('Requires auth - unauthenticated request returns 401', async () => {
      // Arrange: Request without auth header
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
