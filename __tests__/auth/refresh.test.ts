/**
 * Backend Auth Refresh Token Endpoint Tests
 * BACK-AUTH-005: Refresh Token Endpoint
 *
 * Tests for the POST /api/auth/refresh endpoint that handles
 * refreshing access tokens using a valid refresh token.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/refresh/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-005: Refresh Token Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        refreshSession: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange: Mock successful token refresh
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: mockSession,
          user: mockUser,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-refresh-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.access_token).toBe('new-access-token');
      expect(data.refresh_token).toBe('new-refresh-token');
      expect(data.expires_in).toBe(3600);
      expect(data.token_type).toBe('bearer');
    });

    it('should reject invalid refresh token', async () => {
      // Arrange: Mock failed token refresh
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'Invalid refresh token',
          status: 400,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'invalid-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // Arrange: Mock expired token
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'Refresh token has expired',
          status: 400,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'expired-refresh-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('should return new access_token and refresh_token', async () => {
      // Arrange
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'refreshed-access-token',
            refresh_token: 'refreshed-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: {
            id: 'user-456',
            email: 'jane@example.com',
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.access_token).toBe('refreshed-access-token');
      expect(data.refresh_token).toBe('refreshed-refresh-token');
      expect(data.expires_in).toBe(3600);
      expect(data.token_type).toBe('bearer');
    });

    it('should return user information with refreshed tokens', async () => {
      // Arrange
      const mockUser = {
        id: 'user-789',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        user_metadata: {
          name: 'John Doe',
        },
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: mockUser,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.user).toEqual(mockUser);
    });
  });

  describe('Input Validation', () => {
    it('should validate missing refresh_token', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('refresh_token');
    });

    it('should validate empty refresh_token', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: '',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('refresh_token');
    });

    it('should handle malformed JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: 'not-json',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase service errors', async () => {
      // Arrange: Mock network error
      mockSupabaseClient.auth.refreshSession.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should not expose internal error details', async () => {
      // Arrange
      mockSupabaseClient.auth.refreshSession.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-token',
        }),
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
    it('Refreshes access token - accepts valid refresh token and returns new tokens', async () => {
      // Arrange
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: { id: 'user-1', email: 'user@example.com' },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: 'valid-refresh-token',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert: Acceptance criterion - Refreshes access token
      expect(response.status).toBe(200);
      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();
      expect(data.access_token).not.toBe('valid-refresh-token'); // New token generated
    });
  });
});
