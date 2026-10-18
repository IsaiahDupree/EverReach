/**
 * Backend Items Update Endpoint Tests
 * BACK-ITEM-004: Update Item Endpoint
 *
 * Tests for the PUT /api/items/:id endpoint that updates
 * an existing item for authenticated users.
 */

import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/items/[id]/route';

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

describe('BACK-ITEM-004: Update Item Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Successful Item Update', () => {
    it('should update item title successfully', async () => {
      // Arrange
      const itemId = 'item-123';
      const updateData = { title: 'Updated Title' };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Updated Title',
        description: 'Original description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(data.id).toBe(itemId);
    });

    it('should update item description successfully', async () => {
      // Arrange
      const itemId = 'item-456';
      const updateData = { description: 'Updated description' };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Original Title',
        description: 'Updated description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.description).toBe('Updated description');
    });

    it('should update both title and description', async () => {
      // Arrange
      const itemId = 'item-789';
      const updateData = {
        title: 'New Title',
        description: 'New description',
      };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'New Title',
        description: 'New description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.title).toBe('New Title');
      expect(data.description).toBe('New description');
    });

    it('should set description to null when provided', async () => {
      // Arrange
      const itemId = 'item-null';
      const updateData = { description: null };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Title',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.description).toBeNull();
    });

    it('should query Supabase with correct item ID and user ID', async () => {
      // Arrange
      const itemId = 'item-ownership';
      const updateData = { title: 'Updated' };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Updated',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      await PUT(request, { params: { id: itemId } });

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('items');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', itemId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should trim whitespace from title when updating', async () => {
      // Arrange
      const itemId = 'item-trim';
      const updateData = { title: '  Trimmed Title  ' };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Trimmed Title',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Trimmed Title' })
      );
    });
  });

  describe('Validation', () => {
    it('should reject empty title', async () => {
      // Arrange
      const itemId = 'item-empty-title';
      const updateData = { title: '' };

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('empty');
    });

    it('should reject whitespace-only title', async () => {
      // Arrange
      const itemId = 'item-whitespace-title';
      const updateData = { title: '   ' };

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject invalid JSON', async () => {
      // Arrange
      const itemId = 'item-invalid-json';

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: 'invalid json',
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('JSON');
    });

    it('should reject empty update (no fields provided)', async () => {
      // Arrange
      const itemId = 'item-empty-update';
      const updateData = {};

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('field');
    });

    it('should handle missing item ID parameter', async () => {
      // Arrange
      const updateData = { title: 'Updated' };

      const request = new NextRequest('http://localhost:3000/api/items/', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: '' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('ID');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when item not found', async () => {
      // Arrange
      const itemId = 'nonexistent-item';
      const updateData = { title: 'Updated' };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('not found');
    });

    it('should return 404 when item belongs to different user', async () => {
      // Arrange
      const itemId = 'other-user-item';
      const updateData = { title: 'Updated' };

      // Simulating RLS policy preventing update by returning no rows
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });

      // Assert: Should return 404 (ownership validation)
      expect(response.status).toBe(404);
    });

    it('should handle database errors', async () => {
      // Arrange
      const itemId = 'item-db-error';
      const updateData = { title: 'Updated' };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'DB_ERROR',
          message: 'Database error occurred',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const itemId = 'item-unexpected-error';
      const updateData = { title: 'Updated' };

      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Updates item - successfully updates the item with new data', async () => {
      // Arrange
      const itemId = 'acceptance-item-1';
      const updateData = {
        title: 'Updated Acceptance Item',
        description: 'Updated description',
      };
      const updatedItem = {
        id: itemId,
        user_id: 'user-123',
        title: 'Updated Acceptance Item',
        description: 'Updated description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });
      const data = await response.json();

      // Assert: Updates item
      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Acceptance Item');
      expect(data.description).toBe('Updated description');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('Validates ownership - ensures user can only update their own items', async () => {
      // Arrange
      const itemId = 'acceptance-item-2';
      const updateData = { title: 'Trying to update' };

      // Simulating ownership validation failure (RLS policy)
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows found',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: itemId } });

      // Assert: Validates ownership by checking user_id in query
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(response.status).toBe(404); // Item not found for this user
    });
  });
});
