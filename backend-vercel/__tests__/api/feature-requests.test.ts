/**
 * Integration Tests: Feature Requests API
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/v1/feature-requests/route';
import { GET as GET_SINGLE, PATCH, DELETE } from '@/app/api/v1/feature-requests/[id]/route';
import { POST as VOTE, DELETE as UNVOTE } from '@/app/api/v1/feature-requests/[id]/vote/route';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-feature-id',
              type: 'feature',
              title: 'Test Feature',
              description: 'Test Description',
              status: 'pending',
              votes_count: 0,
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-feature-id',
              title: 'Test Feature',
              votes_count: 5,
            },
            error: null,
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [
              {
                id: 'test-1',
                title: 'Feature 1',
                votes_count: 10,
              },
              {
                id: 'test-2',
                title: 'Feature 2',
                votes_count: 5,
              },
            ],
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'test-feature-id', title: 'Updated' },
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          error: null,
        })),
      })),
    })),
  })),
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

// Mock fetch for embedding processing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

describe('Feature Requests API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/feature-requests', () => {
    it('should create a new feature request', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'feature',
          title: 'Add dark mode',
          description: 'I want a dark theme',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('test-feature-id');
      expect(data.message).toContain('submitted successfully');
    });

    it('should reject request with missing fields', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'feature',
          // Missing title and description
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required fields');
    });

    it('should reject invalid request type', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'invalid',
          title: 'Test',
          description: 'Test',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('should enforce title length limit', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'feature',
          title: 'a'.repeat(150),
          description: 'Test',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('100 characters');
    });

    it('should enforce description length limit', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'feature',
          title: 'Test',
          description: 'a'.repeat(2500),
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('2000 characters');
    });

    it('should trigger embedding processing asynchronously', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          type: 'feature',
          title: 'Test',
          description: 'Test',
        },
      });

      await POST(req as any);

      // Should have called fetch to trigger embedding
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/process-embedding'),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/v1/feature-requests', () => {
    it('should list feature requests', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/feature-requests',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should support sorting options', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/feature-requests?sort=votes',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should support status filtering', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/feature-requests?status=planned',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/feature-requests?limit=10',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/v1/feature-requests/:id', () => {
    it('should get a single feature request', async () => {
      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET_SINGLE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('test-feature-id');
    });

    it('should include user_has_voted flag', async () => {
      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET_SINGLE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('user_has_voted');
    });
  });

  describe('PATCH /api/v1/feature-requests/:id', () => {
    it('should update own feature request', async () => {
      const { req } = createMocks({
        method: 'PATCH',
        body: {
          title: 'Updated Title',
          description: 'Updated Description',
        },
      });

      const response = await PATCH(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('updated successfully');
    });

    it('should require authentication', async () => {
      const { getUser } = require('@/lib/auth');
      getUser.mockResolvedValueOnce(null);

      const { req } = createMocks({
        method: 'PATCH',
        body: { title: 'Test' },
      });

      const response = await PATCH(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('DELETE /api/v1/feature-requests/:id', () => {
    it('should delete own feature request', async () => {
      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await DELETE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');
    });

    it('should require authentication', async () => {
      const { getUser } = require('@/lib/auth');
      getUser.mockResolvedValueOnce(null);

      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await DELETE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('POST /api/v1/feature-requests/:id/vote', () => {
    it('should vote for a feature request', async () => {
      const { req } = createMocks({
        method: 'POST',
      });

      const response = await VOTE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Vote registered');
    });

    it('should require authentication', async () => {
      const { getUser } = require('@/lib/auth');
      getUser.mockResolvedValueOnce(null);

      const { req } = createMocks({
        method: 'POST',
      });

      const response = await VOTE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('DELETE /api/v1/feature-requests/:id/vote', () => {
    it('should remove vote from feature request', async () => {
      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await UNVOTE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Vote removed');
    });

    it('should require authentication', async () => {
      const { getUser } = require('@/lib/auth');
      getUser.mockResolvedValueOnce(null);

      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await UNVOTE(req as any, {
        params: { id: 'test-feature-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });
});
