/**
 * Backend Items Create Endpoint Tests
 * BACK-ITEM-002: Create Item Endpoint
 *
 * Tests for the POST /api/items endpoint that handles
 * item creation for authenticated users.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/items/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler) => {
    // Return a function that calls the handler with a mock user
    return async (request: NextRequest) => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      return handler(request, { user: mockUser });
    };
  }),
}));

describe('BACK-ITEM-002: Create Item Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Successful Item Creation', () => {
    it('should create an item with valid input', async () => {
      // Arrange
      const newItemData = {
        title: 'New Test Item',
        description: 'This is a test item',
      };

      const createdItem = {
        id: 'item-new-1',
        user_id: 'user-123',
        title: 'New Test Item',
        description: 'This is a test item',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data).toEqual(createdItem);
    });

    it('should create an item with only required fields', async () => {
      // Arrange
      const newItemData = {
        title: 'Minimal Item',
      };

      const createdItem = {
        id: 'item-new-2',
        user_id: 'user-123',
        title: 'Minimal Item',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.title).toBe('Minimal Item');
      expect(data.description).toBeNull();
    });

    it('should automatically set user_id from authenticated user', async () => {
      // Arrange
      const newItemData = {
        title: 'User Item',
      };

      const createdItem = {
        id: 'item-new-3',
        user_id: 'user-123',
        title: 'User Item',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
      });

      // Act
      await POST(request);

      // Assert
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          title: 'User Item',
        })
      );
    });

    it('should return the created item with all fields', async () => {
      // Arrange
      const newItemData = {
        title: 'Complete Item',
        description: 'Full description',
      };

      const createdItem = {
        id: 'item-new-4',
        user_id: 'user-123',
        title: 'Complete Item',
        description: 'Full description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });
  });

  describe('Input Validation', () => {
    it('should reject request with missing title', async () => {
      // Arrange
      const invalidData = {
        description: 'No title provided',
      };

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with empty title', async () => {
      // Arrange
      const invalidData = {
        title: '',
      };

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with title that is only whitespace', async () => {
      // Arrange
      const invalidData = {
        title: '   ',
      };

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with invalid JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: 'invalid json',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with missing body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should accept null description', async () => {
      // Arrange
      const validData = {
        title: 'Item with null description',
        description: null,
      };

      const createdItem = {
        id: 'item-new-5',
        user_id: 'user-123',
        title: 'Item with null description',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
    });

    it('should accept undefined description', async () => {
      // Arrange
      const validData = {
        title: 'Item without description field',
      };

      const createdItem = {
        id: 'item-new-6',
        user_id: 'user-123',
        title: 'Item without description field',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe('Database Errors', () => {
    it('should handle database insertion errors', async () => {
      // Arrange
      const validData = {
        title: 'Test Item',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          message: 'Database insertion failed',
          code: 'DB_ERROR',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const validData = {
        title: 'Test Item',
      };

      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Creates item - successfully creates a new item in the database', async () => {
      // Arrange
      const newItemData = {
        title: 'Acceptance Test Item',
        description: 'Testing acceptance criteria',
      };

      const createdItem = {
        id: 'item-acceptance-1',
        user_id: 'user-123',
        title: 'Acceptance Test Item',
        description: 'Testing acceptance criteria',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
      });

      // Act
      const response = await POST(request);

      // Assert: Creates item
      expect(response.status).toBe(201);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('items');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('Validates input - rejects invalid data and returns 400 error', async () => {
      // Arrange
      const invalidData = {
        description: 'Missing title field',
      };

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);

      // Assert: Validates input
      expect(response.status).toBe(400);
    });

    it('Returns created item - returns the newly created item with all fields', async () => {
      // Arrange
      const newItemData = {
        title: 'Return Test Item',
        description: 'Testing return value',
      };

      const createdItem = {
        id: 'item-acceptance-2',
        user_id: 'user-123',
        title: 'Return Test Item',
        description: 'Testing return value',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify(newItemData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert: Returns created item
      expect(data).toEqual(createdItem);
      expect(data.id).toBe('item-acceptance-2');
      expect(data.title).toBe('Return Test Item');
      expect(data.description).toBe('Testing return value');
    });
  });
});
