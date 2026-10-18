/**
 * Backend Auth Signup Endpoint Tests
 * BACK-AUTH-003: Signup Endpoint
 *
 * Tests for the POST /api/auth/signup endpoint that handles
 * user registration and returns JWT tokens.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signup/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-003: Signup Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('User Registration', () => {
    it('should create a new user with valid credentials', async () => {
      // Arrange: Mock successful signup
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      };

      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          session: mockSession,
          user: mockUser,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.access_token).toBe('mock-access-token');
      expect(data.refresh_token).toBe('mock-refresh-token');
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('newuser@example.com');
    });

    it('should reject duplicate email', async () => {
      // Arrange: Mock duplicate email error
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'User already registered',
          status: 400,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('already registered');
    });

    it('should handle email confirmation flow', async () => {
      // Arrange: Mock signup with email confirmation required
      const mockUser = {
        id: 'user-456',
        email: 'confirm@example.com',
        email_confirmed_at: null,
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          session: null,
          user: mockUser,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'confirm@example.com',
          password: 'Password123!',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('confirm@example.com');
      expect(data.message).toContain('confirmation');
    });
  });

  describe('Token Response', () => {
    it('should return access_token and refresh_token when session is created', async () => {
      // Arrange
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token-abc',
            refresh_token: 'refresh-token-xyz',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: {
            id: 'user-789',
            email: 'jane@example.com',
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'jane@example.com',
          password: 'StrongPassword123!',
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
  });

  describe('Input Validation', () => {
    it('should validate missing email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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

    it('should validate password strength requirements', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('Password');
    });

    it('should validate empty request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
      mockSupabaseClient.auth.signUp.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
      mockSupabaseClient.auth.signUp.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
    it('Creates user - successfully registers new account', async () => {
      // Arrange
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: { id: 'user-1', email: 'newuser@example.com' },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
    });

    it('Returns tokens - provides access and refresh tokens', async () => {
      // Arrange
      mockSupabaseClient.auth.signUp.mockResolvedValue({
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

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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

    it('Validates input - rejects invalid email and weak password', async () => {
      // Test invalid email
      const invalidEmailRequest = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Password123!',
        }),
      });

      const emailResponse = await POST(invalidEmailRequest);
      expect(emailResponse.status).toBe(400);

      // Test weak password
      const weakPasswordRequest = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123',
        }),
      });

      const passwordResponse = await POST(weakPasswordRequest);
      expect(passwordResponse.status).toBe(400);
    });
  });
});
