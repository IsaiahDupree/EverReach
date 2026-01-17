/**
 * Unit Tests: Embeddings Library
 */

import {
  cosineSimilarity,
  calculateCentroid,
  formatVectorForPostgres,
  parseVectorFromPostgres,
} from '@/lib/embeddings';

describe('Embeddings Library', () => {
  describe('cosineSimilarity', () => {
    it('should calculate perfect similarity for identical vectors', () => {
      const vec = [1, 2, 3];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate zero similarity for orthogonal vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should calculate negative similarity for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should calculate partial similarity for similar vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2, 4];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should throw error for different length vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow();
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate centroid of multiple vectors', () => {
      const vectors = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([4, 5, 6]);
    });

    it('should return the vector itself for single vector', () => {
      const vectors = [[1, 2, 3]];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([1, 2, 3]);
    });

    it('should return zero vector for empty array', () => {
      const centroid = calculateCentroid([]);
      expect(centroid).toHaveLength(1536);
      expect(centroid.every(n => n === 0)).toBe(true);
    });

    it('should handle negative numbers', () => {
      const vectors = [
        [-1, -2, -3],
        [1, 2, 3],
      ];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([0, 0, 0]);
    });

    it('should calculate weighted average correctly', () => {
      const vectors = [
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3],
        [4, 4, 4],
      ];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([2.5, 2.5, 2.5]);
    });
  });

  describe('formatVectorForPostgres', () => {
    it('should format vector as PostgreSQL array string', () => {
      const vector = [1, 2, 3];
      const formatted = formatVectorForPostgres(vector);
      expect(formatted).toBe('[1,2,3]');
    });

    it('should handle decimal numbers', () => {
      const vector = [1.5, 2.75, 3.125];
      const formatted = formatVectorForPostgres(vector);
      expect(formatted).toBe('[1.5,2.75,3.125]');
    });

    it('should handle negative numbers', () => {
      const vector = [-1, -2.5, 3];
      const formatted = formatVectorForPostgres(vector);
      expect(formatted).toBe('[-1,-2.5,3]');
    });

    it('should handle large vectors', () => {
      const vector = Array(1536).fill(0.5);
      const formatted = formatVectorForPostgres(vector);
      expect(formatted).toMatch(/^\[[\d.,]+\]$/);
      expect(formatted.split(',').length).toBe(1536);
    });
  });

  describe('parseVectorFromPostgres', () => {
    it('should parse PostgreSQL vector string', () => {
      const pgVector = '[1,2,3]';
      const parsed = parseVectorFromPostgres(pgVector);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it('should handle decimal numbers', () => {
      const pgVector = '[1.5,2.75,3.125]';
      const parsed = parseVectorFromPostgres(pgVector);
      expect(parsed).toEqual([1.5, 2.75, 3.125]);
    });

    it('should handle negative numbers', () => {
      const pgVector = '[-1,-2.5,3]';
      const parsed = parseVectorFromPostgres(pgVector);
      expect(parsed).toEqual([-1, -2.5, 3]);
    });

    it('should round-trip with formatVectorForPostgres', () => {
      const original = [1.5, -2.75, 3.125];
      const formatted = formatVectorForPostgres(original);
      const parsed = parseVectorFromPostgres(formatted);
      expect(parsed).toEqual(original);
    });
  });

  describe('Vector operations integration', () => {
    it('should maintain similarity after centroid calculation', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const vec3 = [1, 0.1, 0];
      
      const vectors = [vec1, vec2, vec3];
      const centroid = calculateCentroid(vectors);
      
      // Centroid should be similar to original vectors
      const sim1 = cosineSimilarity(centroid, vec1);
      const sim2 = cosineSimilarity(centroid, vec2);
      const sim3 = cosineSimilarity(centroid, vec3);
      
      expect(sim1).toBeGreaterThan(0.95);
      expect(sim2).toBeGreaterThan(0.95);
      expect(sim3).toBeGreaterThan(0.95);
    });

    it('should create centroids that are between input vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      
      const centroid = calculateCentroid([vec1, vec2]);
      
      // Centroid should have positive similarity to both
      const sim1 = cosineSimilarity(centroid, vec1);
      const sim2 = cosineSimilarity(centroid, vec2);
      
      expect(sim1).toBeGreaterThan(0);
      expect(sim2).toBeGreaterThan(0);
    });
  });
});
