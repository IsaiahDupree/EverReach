/**
 * Backend Items Search Endpoint Tests
 * BACK-ITEM-006: Search Items Endpoint
 *
 * Tests for the GET /api/items/search endpoint that handles
 * full-text search across items owned by the authenticated user.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/items/search/route';

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

describe('BACK-ITEM-006: Search Items Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client with chainable methods
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockIlike = jest.fn().mockReturnThis();
    const mockOr = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();

    mockSupabaseClient = {
      from: jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        ilike: mockIlike,
        or: mockOr,
        order: mockOrder,
      }),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Full-Text Search', () => {
    it('should search items by query parameter', async () => {
      // Arrange: Mock successful search
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'Search term in title',
          description: 'Description',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'item-2',
          user_id: 'user-123',
          title: 'Another item',
          description: 'Search term in description',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=search%20term');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockItems);
      expect(data.data).toHaveLength(2);
    });

    it('should search across title and description fields', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      await GET(request);

      // Assert
      // Verify that search is performed across both title and description
      expect(mockFromResult.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
    });

    it('should filter by authenticated user only', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      await GET(request);

      // Assert
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should order results by relevance (created_at descending)', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      await GET(request);

      // Assert
      expect(mockFromResult.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'TEST Item',
          description: 'Description',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });
  });

  describe('Query Parameter Handling', () => {
    it('should require query parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/search');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain('query');
    });

    it('should reject empty query string', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/search?q=');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject whitespace-only query', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/items/search?q=%20%20%20');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should trim whitespace from query', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=%20test%20');

      // Act
      await GET(request);

      // Assert
      // Should search for trimmed query
      expect(mockFromResult.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
    });
  });

  describe('Empty Results', () => {
    it('should return empty array when no matches found', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=nonexistent');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database connection failed',
            code: 'DB_ERROR',
          },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in search query', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test%40example');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle multi-word search queries', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=test%20query');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Should search for the entire phrase
      expect(mockFromResult.or).toHaveBeenCalledWith(
        'title.ilike.%test query%,description.ilike.%test query%'
      );
    });
  });

  describe('Acceptance Criteria', () => {
    it('Full-text search - searches across title and description fields', async () => {
      // Arrange
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'Important task',
          description: 'Complete the project',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=task');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(mockFromResult.or).toHaveBeenCalled();
    });

    it('Returns matching items - provides list of items matching search query', async () => {
      // Arrange
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'Match this',
          description: 'Description',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'item-2',
          user_id: 'user-123',
          title: 'Another match',
          description: 'More content',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items/search?q=match');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data).toEqual(mockItems);
    });
  });
});
