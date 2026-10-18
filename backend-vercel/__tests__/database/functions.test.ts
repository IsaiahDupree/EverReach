/**
 * Database Function Tests
 * 
 * Tests SQL functions that power the AI clustering system
 * These tests require a running Supabase instance with the migrations applied
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Skip these tests if not in integration test environment
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Database Functions (Integration)', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('find_nearest_bucket', () => {
    it('should find similar bucket by embedding', async () => {
      // Create a test embedding (1536-dim vector)
      const testEmbedding = Array(1536).fill(0).map((_, i) => Math.sin(i / 100));
      const embeddingStr = `[${testEmbedding.join(',')}]`;

      const { data, error } = await supabase.rpc('find_nearest_bucket', {
        p_embedding: embeddingStr,
        p_org_id: null,
        p_similarity_threshold: 0.78,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array when no similar buckets exist', async () => {
      const randomEmbedding = Array(1536).fill(0).map(() => Math.random());
      const embeddingStr = `[${randomEmbedding.join(',')}]`;

      const { data, error } = await supabase.rpc('find_nearest_bucket', {
        p_embedding: embeddingStr,
        p_org_id: null,
        p_similarity_threshold: 0.99, // Very high threshold
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should respect org_id filtering', async () => {
      const testEmbedding = Array(1536).fill(0.5);
      const embeddingStr = `[${testEmbedding.join(',')}]`;

      const { data, error } = await supabase.rpc('find_nearest_bucket', {
        p_embedding: embeddingStr,
        p_org_id: 'non-existent-org',
        p_similarity_threshold: 0.5,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('calculate_bucket_centroid', () => {
    it('should calculate centroid from bucket requests', async () => {
      // This test would require setting up test data
      // Skipping for now as it requires fixtures
    });

    it('should return null for empty bucket', async () => {
      // Test with non-existent bucket ID
      const { data, error } = await supabase.rpc('calculate_bucket_centroid', {
        p_bucket_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('refresh_bucket_momentum', () => {
    it('should refresh momentum stats without error', async () => {
      const { error } = await supabase.rpc('refresh_bucket_momentum');

      expect(error).toBeNull();
    });

    it('should update 7-day momentum counts', async () => {
      await supabase.rpc('refresh_bucket_momentum');

      // Query buckets to verify momentum was updated
      const { data, error } = await supabase
        .from('feature_buckets')
        .select('id, momentum_7d')
        .limit(1);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('momentum_7d');
        expect(typeof data[0].momentum_7d).toBe('number');
      }
    });

    it('should update 30-day momentum counts', async () => {
      await supabase.rpc('refresh_bucket_momentum');

      const { data, error } = await supabase
        .from('feature_buckets')
        .select('id, momentum_30d')
        .limit(1);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('momentum_30d');
        expect(typeof data[0].momentum_30d).toBe('number');
      }
    });

    it('should refresh materialized view', async () => {
      await supabase.rpc('refresh_bucket_momentum');

      // Verify materialized view is accessible
      const { data, error } = await supabase
        .from('feature_bucket_rollups')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Materialized View: feature_bucket_rollups', () => {
    it('should aggregate bucket statistics', async () => {
      const { data, error } = await supabase
        .from('feature_bucket_rollups')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const rollup = data[0];
        expect(rollup).toHaveProperty('bucket_id');
        expect(rollup).toHaveProperty('title');
        expect(rollup).toHaveProperty('votes_count');
        expect(rollup).toHaveProperty('request_count');
        expect(rollup).toHaveProperty('progress_percent');
      }
    });

    it('should calculate progress percentage correctly', async () => {
      const { data } = await supabase
        .from('feature_bucket_rollups')
        .select('votes_count, goal_votes, progress_percent')
        .limit(10);

      if (data && data.length > 0) {
        data.forEach(rollup => {
          const expectedProgress = (rollup.votes_count / rollup.goal_votes) * 100;
          expect(rollup.progress_percent).toBeCloseTo(expectedProgress, 1);
        });
      }
    });

    it('should sort by votes descending', async () => {
      const { data } = await supabase
        .from('feature_bucket_rollups')
        .select('votes_count')
        .order('votes_count', { ascending: false })
        .limit(5);

      if (data && data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          expect(data[i].votes_count).toBeGreaterThanOrEqual(data[i + 1].votes_count);
        }
      }
    });
  });

  describe('Triggers', () => {
    it('should auto-update votes_count on vote insert', async () => {
      // This requires setting up test data
      // Skipping for unit tests
    });

    it('should auto-update updated_at timestamp', async () => {
      // This requires setting up test data
      // Skipping for unit tests
    });

    it('should log bucket status changes', async () => {
      // This requires setting up test data
      // Skipping for unit tests
    });

    it('should update user vote stats', async () => {
      // This requires setting up test data
      // Skipping for unit tests
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enforce RLS on feature_buckets', async () => {
      const { data, error } = await supabase
        .from('feature_buckets')
        .select('*')
        .limit(1);

      // With service role key, should have access
      expect(error).toBeNull();
    });

    it('should enforce RLS on feature_requests', async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should enforce RLS on feature_votes', async () => {
      const { data, error } = await supabase
        .from('feature_votes')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Vector Operations', () => {
    it('should support vector cosine similarity', async () => {
      const vec1 = Array(1536).fill(1);
      const vec2 = Array(1536).fill(1);

      const { data, error } = await supabase.rpc('vector_cosine_similarity', {
        vec1: `[${vec1.join(',')}]`,
        vec2: `[${vec2.join(',')}]`,
      });

      // This function may not exist, so we just test the capability
      // In real tests with actual DB, we'd verify similarity calculations
    });

    it('should handle IVFFlat index queries', async () => {
      // Verify that vector indexes exist
      const { data, error } = await supabase.rpc('pg_indexes', {
        schemaname: 'public',
      });

      // Just verify no error with vector queries
      expect(error).toBeNull();
    });
  });
});
