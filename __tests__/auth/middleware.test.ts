/**
 * Backend Auth Middleware Tests
 * BACK-AUTH-001: Auth Middleware
 *
 * Tests for the withAuth middleware that protects API routes
 * by validating JWT tokens and extracting user information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-001: Auth Middleware', () => {
  let mockSupabaseClient: any;
  let mockRequest: NextRequest;

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

    // Create a mock Next.js request
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token-123',
      },
    });
  });

  describe('JWT Validation', () => {
    it('should validate a valid JWT token', async () => {
      // Arrange: Mock successful auth
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      // Act: Create handler and execute
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success', user: context.user });
      });

      const response = await handler(mockRequest, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange: Mock auth failure
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success' });
      });

      const response = await handler(mockRequest, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBeDefined();
    });

    it('should return 401 when no Authorization header is present', async () => {
      // Arrange: Create request without Authorization header
      const requestNoAuth = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success' });
      });

      const response = await handler(requestNoAuth, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when Authorization header is malformed', async () => {
      // Arrange: Create request with malformed header
      const requestBadAuth = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidFormat',
        },
      });

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success' });
      });

      const response = await handler(requestBadAuth, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('User Extraction', () => {
    it('should extract and return user in context', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        email: 'jane@example.com',
        user_metadata: {
          name: 'Jane Doe',
        },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ user: context.user });
      });

      const response = await handler(mockRequest, {});
      const data = await response.json();

      // Assert
      expect(data.user).toEqual(mockUser);
    });

    it('should pass request object to handler', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
        },
        error: null,
      });

      let receivedRequest: NextRequest | null = null;

      // Act
      const handler = withAuth(async (req, context) => {
        receivedRequest = req;
        return NextResponse.json({ message: 'ok' });
      });

      await handler(mockRequest, {});

      // Assert
      expect(receivedRequest).toBe(mockRequest);
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase client errors gracefully', async () => {
      // Arrange: Mock a network error or exception
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success' });
      });

      const response = await handler(mockRequest, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle expired tokens', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      // Act
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ message: 'success' });
      });

      const response = await handler(mockRequest, {});
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Validates JWT - accepts valid JWT and rejects invalid', async () => {
      // Valid JWT
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ status: 'ok' });
      });

      const validResponse = await handler(mockRequest, {});
      expect(validResponse.status).toBe(200);

      // Invalid JWT
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid' },
      });

      const invalidResponse = await handler(mockRequest, {});
      expect(invalidResponse.status).toBe(401);
    });

    it('Returns user - provides authenticated user in context', async () => {
      // Arrange
      const expectedUser = {
        id: 'user-789',
        email: 'user@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: expectedUser },
        error: null,
      });

      let capturedUser: any = null;

      // Act
      const handler = withAuth(async (req, context) => {
        capturedUser = context.user;
        return NextResponse.json({ status: 'ok' });
      });

      await handler(mockRequest, {});

      // Assert
      expect(capturedUser).toEqual(expectedUser);
    });

    it('401 on invalid - returns 401 status for authentication failures', async () => {
      // Test missing header
      const noAuthRequest = new NextRequest('http://localhost:3000/api/test');
      const handler = withAuth(async (req, context) => {
        return NextResponse.json({ status: 'ok' });
      });

      const response = await handler(noAuthRequest, {});
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Integration with Next.js', () => {
    it('should work as a higher-order function wrapper', () => {
      // Arrange
      const innerHandler = jest.fn();

      // Act
      const wrappedHandler = withAuth(innerHandler);

      // Assert
      expect(typeof wrappedHandler).toBe('function');
      expect(wrappedHandler).not.toBe(innerHandler);
    });

    it('should allow handler to return any Response type', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Act: Handler returns different response types
      const jsonHandler = withAuth(async () => {
        return NextResponse.json({ type: 'json' });
      });

      const textHandler = withAuth(async () => {
        return new NextResponse('text response', { status: 200 });
      });

      const jsonResponse = await jsonHandler(mockRequest, {});
      const textResponse = await textHandler(mockRequest, {});

      // Assert
      expect(jsonResponse.status).toBe(200);
      expect((await jsonResponse.json()).type).toBe('json');

      expect(textResponse.status).toBe(200);
      expect(await textResponse.text()).toBe('text response');
    });
  });
});
