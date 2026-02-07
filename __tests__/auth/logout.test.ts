/**
 * Backend Auth Logout Endpoint Tests
 * BACK-AUTH-004: Logout Endpoint
 *
 * Tests for the POST /api/auth/logout endpoint that handles
 * session invalidation and user sign out.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/logout/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-004: Logout Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        signOut: jest.fn(),
        getUser: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Session Invalidation', () => {
    it('should invalidate session for authenticated user', async () => {
      // Arrange: Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-access-token',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(data.message).toBeDefined();
      expect(data.message).toContain('successfully');
    });

    it('should handle logout without authorization header', async () => {
      // Arrange: Mock signOut to succeed even without user
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(data.message).toBeDefined();
    });

    it('should clear all sessions for the user', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            email: 'jane@example.com',
          },
        },
        error: null,
      });

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success Response', () => {
    it('should return success message on logout', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
    });

    it('should not return user data in response', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.user).toBeUndefined();
      expect(data.access_token).toBeUndefined();
      expect(data.refresh_token).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase signOut errors', async () => {
      // Arrange: Mock signOut failure
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Failed to sign out',
          status: 500,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
    });

    it('should handle Supabase service errors', async () => {
      // Arrange: Mock network error
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('error');
    });

    it('should not expose internal error details', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.message).not.toContain('192.168.1.1');
      expect(data.message).not.toContain('Database');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Invalidates session - successfully signs out user', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      // Act
      const response = await POST(request);

      // Assert: Feature acceptance criteria
      // - Invalidates session
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });
});
