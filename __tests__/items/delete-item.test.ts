/**
 * Backend Items Delete Endpoint Tests
 * BACK-ITEM-005: Delete Item Endpoint
 *
 * Tests for the DELETE /api/items/:id endpoint that deletes
 * an existing item for authenticated users.
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/items/[id]/route';

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

describe('BACK-ITEM-005: Delete Item Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Successful Item Deletion', () => {
    it('should delete item successfully', async () => {
      // Arrange
      const itemId = 'item-123';
      const deletedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Deleted Item',
        description: 'This item will be deleted',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: deletedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe(itemId);
      expect(data.message).toBeDefined();
    });

    it('should return deleted item data', async () => {
      // Arrange
      const itemId = 'item-456';
      const deletedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Test Item',
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: deletedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe(itemId);
      expect(data.title).toBe('Test Item');
    });

    it('should query Supabase with correct item ID and user ID', async () => {
      // Arrange
      const itemId = 'item-ownership';
      const deletedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Item',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: deletedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      await DELETE(request, { params: { id: itemId } });

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('items');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', itemId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should handle missing item ID parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/', {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: '' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('ID');
    });

    it('should handle whitespace-only item ID', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/%20%20', {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: '  ' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('ID');
    });

    it('should handle undefined item ID', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/undefined', {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: {} });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
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
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('not found');
    });

    it('should return 404 when item belongs to different user', async () => {
      // Arrange
      const itemId = 'other-user-item';

      // Simulating RLS policy preventing deletion by returning no rows
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });

      // Assert: Should return 404 (ownership validation)
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
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
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
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Deletes item - successfully removes the item from the database', async () => {
      // Arrange
      const itemId = 'acceptance-item-1';
      const deletedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Acceptance Test Item',
        description: 'This will be deleted',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: deletedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert: Deletes item
      expect(response.status).toBe(200);
      expect(data.id).toBe(itemId);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it('Validates ownership - ensures user can only delete their own items', async () => {
      // Arrange
      const itemId = 'acceptance-item-2';

      // Simulating ownership validation failure (RLS policy)
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'DELETE',
      });

      // Act
      const response = await DELETE(request, { params: { id: itemId } });

      // Assert: Validates ownership by checking user_id in query
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(response.status).toBe(404); // Item not found for this user
    });
  });
});
