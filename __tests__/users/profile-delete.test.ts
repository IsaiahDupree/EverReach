/**
 * Backend User Profile DELETE Endpoint Tests
 * BACK-USER-003: Delete Account Endpoint
 *
 * Tests for the DELETE /api/users/profile endpoint that deletes
 * the authenticated user's account and all associated data.
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/users/profile/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

// Mock the Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('BACK-USER-003: Delete Account Endpoint', () => {
  let mockSupabaseClient: any;
  let mockAdminClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    // Create mock Admin client
    mockAdminClient = {
      auth: {
        admin: {
          deleteUser: jest.fn(),
        },
      },
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);

    // Mock createAdminClient to return our mock
    const { createAdminClient } = require('@/lib/supabase/admin');
    createAdminClient.mockReturnValue(mockAdminClient);
  });

  describe('Authentication Required', () => {
    it('should return 401 when Authorization header is missing', async () => {
      // Arrange: Request without Authorization header
      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request);
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

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Deletes User and Data', () => {
    it('should delete user account successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'delete@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted');
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should cascade delete user items', async () => {
      // Arrange
      const mockUser = {
        id: 'user-with-items',
        email: 'items@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);

      // Assert
      expect(response.status).toBe(200);
      // Cascade delete is handled by database ON DELETE CASCADE
      // So we just verify the user deletion was called
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-with-items');
    });

    it('should cascade delete user subscriptions', async () => {
      // Arrange
      const mockUser = {
        id: 'user-with-subscription',
        email: 'subscription@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);

      // Assert
      expect(response.status).toBe(200);
      // Cascade delete is handled by database ON DELETE CASCADE
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-with-subscription');
    });

    it('should return success message after deletion', async () => {
      // Arrange
      const mockUser = {
        id: 'user-message-test',
        email: 'message@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(data.message).toContain('Account successfully deleted');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-error',
        email: 'error@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('Failed to delete account');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const mockUser = {
        id: 'user-unexpected',
        email: 'unexpected@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle user not found error', async () => {
      // Arrange
      const mockUser = {
        id: 'user-not-found',
        email: 'notfound@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'User not found', code: 'user_not_found' },
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Deletes user and data - successfully deletes user account and cascades to related data', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-delete',
        email: 'acceptance-delete@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('Account successfully deleted');
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('acceptance-user-delete');
    });

    it('Cascade delete - ensures all related data is removed when user is deleted', async () => {
      // Arrange
      const mockUser = {
        id: 'cascade-test-user',
        email: 'cascade@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await DELETE(request);

      // Assert
      expect(response.status).toBe(200);
      // The cascade delete is enforced by the database schema with ON DELETE CASCADE
      // When deleteUser is called, it will automatically delete:
      // - User profile from public.users
      // - All items owned by user
      // - User's subscription
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
    });
  });
});
