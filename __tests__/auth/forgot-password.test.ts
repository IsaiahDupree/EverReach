/**
 * Backend Auth Forgot Password Endpoint Tests
 * BACK-AUTH-007: Forgot Password Endpoint
 *
 * Tests for the POST /api/auth/forgot-password endpoint that handles
 * password reset email requests.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/forgot-password/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-AUTH-007: Forgot Password Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        resetPasswordForEmail: jest.fn(),
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Send Reset Email', () => {
    it('should send reset email to valid registered email', async () => {
      // Arrange: Mock successful reset email
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('reset email');
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.any(String),
        })
      );
    });

    it('should send reset email even for non-existent email (security)', async () => {
      // Arrange: Mock successful reset (Supabase doesn't error for non-existent emails)
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('reset email');
    });

    it('should include redirect URL in reset email', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('http'),
        })
      );
    });
  });

  describe('Success Feedback', () => {
    it('should return success message after sending reset email', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'success@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
    });

    it('should provide user-friendly success message', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'friendly@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.message.length).toBeGreaterThan(10);
      expect(data.message).toMatch(/check|email|inbox/i);
    });
  });

  describe('Input Validation', () => {
    it('should validate missing email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('email');
    });

    it('should validate invalid email format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
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

    it('should validate empty email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
        }),
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
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
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
    it('should handle Supabase service errors gracefully', async () => {
      // Arrange: Mock service error
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: {
          message: 'Email service unavailable',
          status: 500,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      // Arrange: Mock network error
      mockSupabaseClient.auth.resetPasswordForEmail.mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
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
      mockSupabaseClient.auth.resetPasswordForEmail.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
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

  describe('Security Considerations', () => {
    it('should not reveal if email exists in system', async () => {
      // Arrange: Mock both successful and failed cases
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const requestExists = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'exists@example.com',
        }),
      });

      const requestNotExists = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'notexists@example.com',
        }),
      });

      // Act
      const responseExists = await POST(requestExists);
      const dataExists = await responseExists.json();

      const responseNotExists = await POST(requestNotExists);
      const dataNotExists = await responseNotExists.json();

      // Assert: Both responses should be identical
      expect(responseExists.status).toBe(responseNotExists.status);
      expect(dataExists.message).toBe(dataNotExists.message);
    });

    it('should use rate limiting friendly response time', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Act
      const startTime = Date.now();
      await POST(request);
      const endTime = Date.now();

      // Assert: Should respond quickly (< 2 seconds for test)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Acceptance Criteria', () => {
    it('Sends reset email - successfully sends password reset email', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalled();
    });

    it('Success feedback - provides confirmation message to user', async () => {
      // Arrange
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
    });
  });
});
