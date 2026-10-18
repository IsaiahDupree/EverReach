/**
 * Backend Health Check Endpoint Tests
 * BACK-HEALTH-001: Health Check Endpoint
 *
 * Tests for the GET /api/health endpoint that returns API status
 * and checks database connection.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-HEALTH-001: Health Check Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Status Response', () => {
    it('should return 200 status code', async () => {
      // Arrange: Mock successful DB connection
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should return status as "ok" when healthy', async () => {
      // Arrange: Mock successful DB connection
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.status).toBe('ok');
    });

    it('should include timestamp in response', async () => {
      // Arrange: Mock successful DB connection
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
      // Verify it's a valid ISO date
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should include version information', async () => {
      // Arrange: Mock successful DB connection
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
    });
  });

  describe('Database Connection Check', () => {
    it('should check database connection', async () => {
      // Arrange: Mock successful DB query
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      await GET(request);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalled();
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(1);
    });

    it('should return database as "connected" when query succeeds', async () => {
      // Arrange: Mock successful DB connection
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.database).toBe('connected');
    });

    it('should return database as "disconnected" when query fails', async () => {
      // Arrange: Mock DB connection error
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: {
          message: 'Connection timeout',
          code: 'PGRST301',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.database).toBe('disconnected');
      expect(data.status).toBe('degraded');
    });

    it('should handle database connection exceptions', async () => {
      // Arrange: Mock DB exception
      mockSupabaseClient.limit.mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.database).toBe('disconnected');
      expect(data.status).toBe('degraded');
    });
  });

  describe('Error Handling', () => {
    it('should return 503 when database is disconnected', async () => {
      // Arrange: Mock DB connection error
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: {
          message: 'Connection failed',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(503);
    });

    it('should not expose internal error details', async () => {
      // Arrange: Mock DB error with sensitive info
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: {
          message: 'Connection failed to db.internal.company.com:5432',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.error).toBeUndefined();
      // Should not expose internal hostnames
      expect(JSON.stringify(data)).not.toContain('db.internal');
      expect(JSON.stringify(data)).not.toContain('5432');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns status - provides API health status', async () => {
      // Arrange
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('Checks DB connection - verifies database is reachable', async () => {
      // Arrange
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.database).toBeDefined();
      expect(data.database).toBe('connected');
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should return valid JSON', async () => {
      // Arrange
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should have consistent structure', async () => {
      // Arrange
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('version');
    });
  });
});
