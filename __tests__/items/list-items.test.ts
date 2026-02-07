/**
 * Backend Items List Endpoint Tests
 * BACK-ITEM-001: List Items Endpoint
 *
 * Tests for the GET /api/items endpoint that handles
 * paginated item retrieval with filtering by authenticated user.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/items/route';

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

describe('BACK-ITEM-001: List Items Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client with chainable methods
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();
    const mockRange = jest.fn().mockReturnThis();

    mockSupabaseClient = {
      from: jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      }),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Paginated Items List', () => {
    it('should return paginated items for authenticated user', async () => {
      // Arrange: Mock successful query
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'Test Item 1',
          description: 'Description 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'item-2',
          user_id: 'user-123',
          title: 'Test Item 2',
          description: 'Description 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
          count: 2,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?page=1&pageSize=10');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockItems);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pageSize).toBe(10);
      expect(data.pagination.total).toBe(2);
    });

    it('should filter items by authenticated user only', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      await GET(request);

      // Assert
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should apply default pagination if not specified', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pageSize).toBe(20);
    });

    it('should handle custom page size', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?pageSize=5');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.pagination.pageSize).toBe(5);
      expect(mockFromResult.range).toHaveBeenCalledWith(0, 4); // 0-indexed
    });

    it('should handle second page correctly', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 25,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?page=2&pageSize=10');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.pagination.page).toBe(2);
      expect(mockFromResult.range).toHaveBeenCalledWith(10, 19);
    });

    it('should calculate total pages correctly', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 45,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?pageSize=10');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.pagination.totalPages).toBe(5); // 45 items / 10 per page = 5 pages
    });
  });

  describe('Sorting', () => {
    it('should order items by created_at descending by default', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      await GET(request);

      // Assert
      expect(mockFromResult.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('Empty State', () => {
    it('should return empty array when user has no items', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.totalPages).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database connection failed',
            code: 'DB_ERROR',
          },
          count: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle invalid page numbers', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?page=0');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert - Should default to page 1
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
    });

    it('should handle invalid page size', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items?pageSize=1000');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert - Should cap at max page size (100)
      expect(response.status).toBe(200);
      expect(data.pagination.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns paginated items - provides items list with pagination', async () => {
      // Arrange
      const mockItems = [
        {
          id: 'item-1',
          user_id: 'user-123',
          title: 'Item 1',
          description: 'Description',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockItems,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('Filters by user - only returns items owned by authenticated user', async () => {
      // Arrange
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromResult);

      const request = new NextRequest('http://localhost:3000/api/items');

      // Act
      await GET(request);

      // Assert
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
