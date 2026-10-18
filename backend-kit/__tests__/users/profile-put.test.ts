/**
 * Backend User Profile PUT Endpoint Tests
 * BACK-USER-002: Update Profile Endpoint
 *
 * Tests for the PUT /api/users/profile endpoint that updates
 * the authenticated user's profile information.
 */

import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/users/profile/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-USER-002: Update Profile Endpoint', () => {
  let mockSupabaseClient: any;

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

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Authentication Required', () => {
    it('should return 401 when Authorization header is missing', async () => {
      // Arrange: Request without Authorization header
      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test User' }),
      });

      // Act
      const response = await PUT(request);
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
        method: 'PUT',
        headers: {
          Authorization: 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when request body is empty', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
    });

    it('should return 400 when name is invalid (too long)', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'a'.repeat(256) }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('255 character');
    });

    it('should return 400 when avatar_url is not a valid URL', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: 'not-a-valid-url' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('url');
    });

    it('should return 400 when invalid fields are provided', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          invalid_field: 'should not be allowed'
        }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
    });
  });

  describe('Updates User Profile', () => {
    it('should update user name successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-18T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe('Updated Name');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should update avatar_url successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        email: 'avatar@example.com',
      };

      const updatedProfile = {
        id: 'user-456',
        email: 'avatar@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/new-avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-18T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: 'https://example.com/new-avatar.jpg' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const mockUser = {
        id: 'user-789',
        email: 'multi@example.com',
      };

      const updatedProfile = {
        id: 'user-789',
        email: 'multi@example.com',
        name: 'Multi Update User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-18T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Multi Update User',
          avatar_url: 'https://example.com/avatar.jpg',
        }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe('Multi Update User');
      expect(data.data.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Multi Update User',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should allow setting fields to null', async () => {
      // Arrange
      const mockUser = {
        id: 'user-null',
        email: 'null@example.com',
      };

      const updatedProfile = {
        id: 'user-null',
        email: 'null@example.com',
        name: null,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-18T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: null, avatar_url: null }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.name).toBeNull();
      expect(data.data.avatar_url).toBeNull();
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

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
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

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      // Arrange
      const mockUser = {
        id: 'user-json',
        email: 'json@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Updates profile - successfully updates user profile with valid data', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
      };

      const updatedProfile = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
        name: 'Acceptance User Updated',
        avatar_url: 'https://example.com/avatar-new.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-18T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Acceptance User Updated',
          avatar_url: 'https://example.com/avatar-new.jpg',
        }),
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe('Acceptance User Updated');
      expect(data.data.avatar_url).toBe('https://example.com/avatar-new.jpg');
    });

    it('Validates input - rejects invalid profile data', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-2',
        email: 'validate@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'x'.repeat(256) }), // Too long
      });

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
    });
  });
});
