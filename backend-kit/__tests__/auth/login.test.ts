/**
 * Backend Auth Login Endpoint Tests
 * BACK-AUTH-002: Login Endpoint
 *
 * Tests for the POST /api/auth/login endpoint that handles
 * email/password authentication and returns JWT tokens.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-002: Login Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        signInWithPassword: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Email/Password Authentication', () => {
    it('should authenticate valid credentials', async () => {
      // Arrange: Mock successful login
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: mockSession,
          user: mockUser,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.access_token).toBe('mock-access-token');
      expect(data.refresh_token).toBe('mock-refresh-token');
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      // Arrange: Mock failed login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('Invalid login credentials');
    });

    it('should reject unregistered email', async () => {
      // Arrange: Mock user not found
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
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

  describe('Token Response', () => {
    it('should return access_token and refresh_token', async () => {
      // Arrange
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token-abc',
            refresh_token: 'refresh-token-xyz',
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

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'jane@example.com',
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.access_token).toBe('access-token-abc');
      expect(data.refresh_token).toBe('refresh-token-xyz');
      expect(data.expires_in).toBe(3600);
      expect(data.token_type).toBe('bearer');
    });

    it('should return user information with tokens', async () => {
      // Arrange
      const mockUser = {
        id: 'user-789',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        user_metadata: {
          name: 'John Doe',
        },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
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

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'Password123!',
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
    it('should validate missing email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('email');
    });

    it('should validate missing password', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('password');
    });

    it('should validate invalid email format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('email');
    });

    it('should validate empty request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
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
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
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
    it('Email/password login - accepts valid credentials', async () => {
      // Arrange
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: { id: 'user-1', email: 'user@example.com' },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('Returns tokens - provides access and refresh tokens', async () => {
      // Arrange
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-123',
            refresh_token: 'refresh-456',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: { id: 'user-1', email: 'user@example.com' },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();
    });
  });
});
