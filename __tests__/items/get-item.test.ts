/**
 * Backend Items Get Endpoint Tests
 * BACK-ITEM-003: Get Item Endpoint
 *
 * Tests for the GET /api/items/:id endpoint that retrieves
 * a single item by ID for authenticated users.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/items/[id]/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler) => {
    // Return a function that calls the handler with a mock user
    return async (request: NextRequest, context: any) => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      return handler(request, { ...context, user: mockUser });
    };
  }),
}));

describe('BACK-ITEM-003: Get Item Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Successful Item Retrieval', () => {
    it('should return item when found', async () => {
      // Arrange
      const itemId = 'item-123';
      const mockItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Test Item',
        description: 'This is a test item',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockItem);
    });

    it('should return item with all fields', async () => {
      // Arrange
      const itemId = 'item-complete';
      const mockItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Complete Item',
        description: 'Full description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });

    it('should query Supabase with correct item ID and user ID', async () => {
      // Arrange
      const itemId = 'item-456';
      const mockItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Test Item',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      await GET(request, { params: { id: itemId } });

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('items');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', itemId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should handle items with null description', async () => {
      // Arrange
      const itemId = 'item-null-desc';
      const mockItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Item without description',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.description).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when item not found', async () => {
      // Arrange
      const itemId = 'nonexistent-item';

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
    });

    it('should return 404 when item belongs to different user', async () => {
      // Arrange
      const itemId = 'other-user-item';

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should handle database errors', async () => {
      // Arrange
      const itemId = 'item-db-error';

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'DB_ERROR',
          message: 'Database error occurred',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const itemId = 'item-unexpected-error';

      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle missing item ID parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/', {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns item by ID - successfully retrieves the correct item', async () => {
      // Arrange
      const itemId = 'acceptance-item-1';
      const mockItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Acceptance Test Item',
        description: 'Testing acceptance criteria',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert: Returns item by ID
      expect(response.status).toBe(200);
      expect(data.id).toBe(itemId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('items');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', itemId);
    });

    it('404 if not found - returns 404 when item does not exist', async () => {
      // Arrange
      const itemId = 'nonexistent-item';

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'GET',
      });

      // Act
      const response = await GET(request, { params: { id: itemId } });

      // Assert: 404 if not found
      expect(response.status).toBe(404);
    });
  });
});
