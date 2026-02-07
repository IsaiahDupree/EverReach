/**
 * Backend User Profile GET Endpoint Tests
 * BACK-USER-001: Get Profile Endpoint
 *
 * Tests for the GET /api/users/profile endpoint that returns
 * the authenticated user's profile information.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/profile/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-USER-001: Get Profile Endpoint', () => {
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

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
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

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
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
  });

  describe('Returns User Profile', () => {
    it('should return user profile with all fields', async () => {
      // Arrange: Mock valid user and profile
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
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
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe('user-123');
      expect(data.data.email).toBe('test@example.com');
      expect(data.data.name).toBe('Test User');
      expect(data.data.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should query profiles table by user id', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        email: 'john@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-456', email: 'john@example.com', name: 'John' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      await GET(request);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-456');
    });

    it('should return profile without optional fields', async () => {
      // Arrange: Profile with minimal fields
      const mockUser = {
        id: 'user-789',
        email: 'minimal@example.com',
      };

      const mockProfile = {
        id: 'user-789',
        email: 'minimal@example.com',
        name: null,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
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
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe('user-789');
      expect(data.data.name).toBeNull();
      expect(data.data.avatar_url).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when profile not found', async () => {
      // Arrange
      const mockUser = {
        id: 'user-999',
        email: 'notfound@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found', code: 'PGRST116' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.message).toContain('Profile not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-500',
        email: 'error@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const mockUser = {
        id: 'user-error',
        email: 'exception@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns user profile - authenticated request gets profile data', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
      };

      const mockProfile = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
        name: 'Acceptance User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
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
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe('acceptance-user-1');
      expect(data.data.email).toBe('acceptance@example.com');
      expect(data.data.name).toBe('Acceptance User');
    });

    it('Requires auth - unauthenticated request returns 401', async () => {
      // Arrange: Request without auth header
      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
