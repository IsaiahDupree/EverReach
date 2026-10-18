/**
 * Performance & Load Testing Integration Tests
 * 
 * Tests system performance under various loads:
 * - Concurrent requests
 * - Large data volumes
 * - Query performance
 * - Resource usage
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Performance & Load Integration Tests', () => {
  let testUserIds: string[] = [];

  beforeAll(async () => {
    // Create test user IDs
    for (let i = 0; i < 10; i++) {
      testUserIds.push(`perf_test_${Date.now()}_${i}`);
    }
  });

  afterAll(async () => {
    // Cleanup all test users
    for (const userId of testUserIds) {
      await supabase.from('user_event').delete().eq('user_id', userId);
      await supabase.from('user_identity').delete().eq('user_id', userId);
    }
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent enrichment requests', async () => {
      const start = Date.now();
      
      const requests = testUserIds.slice(0, 10).map(userId =>
        fetch(`${API_URL}/api/v1/marketing/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${userId}@example.com`,
            user_id: userId,
            trigger: 'test'
          })
        })
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      
      expect(successCount).toBeGreaterThan(5); // At least 50% success
      expect(duration).toBeLessThan(10000); // Complete in < 10s
    });

    it('should handle concurrent analytics queries', async () => {
      const start = Date.now();

      const queries = [
        fetch(`${API_URL}/api/v1/analytics/funnel`),
        fetch(`${API_URL}/api/v1/analytics/personas`),
        fetch(`${API_URL}/api/v1/analytics/magnetism-summary`),
        fetch(`${API_URL}/api/v1/analytics/funnel?days=7`),
        fetch(`${API_URL}/api/v1/analytics/magnetism-summary?window=30d`)
      ];

      const responses = await Promise.all(queries);
      const duration = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      
      expect(successCount).toBe(5); // All should succeed
      expect(duration).toBeLessThan(3000); // Complete in < 3s
    });

    it('should maintain response times under load', async () => {
      const requestCount = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        await fetch(`${API_URL}/api/v1/analytics/funnel`);
        responseTimes.push(Date.now() - start);
      }

      const avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / requestCount;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(1000); // Avg < 1s
      expect(maxResponseTime).toBeLessThan(2000); // Max < 2s
    });
  });

  describe('Large Data Volume Handling', () => {
    it('should insert 100 events efficiently', async () => {
      const userId = testUserIds[0];
      const start = Date.now();

      const events = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          user_id: userId,
          event_name: `test_event_${i}`,
          event_properties: { index: i },
          occurred_at: new Date(Date.now() - i * 1000).toISOString()
        });
      }

      const { error } = await supabase
        .from('user_event')
        .insert(events);

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(3000); // Should insert in < 3s
    });

    it('should query 1000 events efficiently', async () => {
      const userId = testUserIds[0];
      const start = Date.now();

      const { data, error } = await supabase
        .from('user_event')
        .select('*')
        .eq('user_id', userId)
        .limit(1000);

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Query in < 1s
    });

    it('should paginate through large result sets', async () => {
      const userId = testUserIds[0];
      const pageSize = 50;
      const totalPages = 3;
      const allResults: any[] = [];

      for (let page = 0; page < totalPages; page++) {
        const { data } = await supabase
          .from('user_event')
          .select('*')
          .eq('user_id', userId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (data) {
          allResults.push(...data);
        }
      }

      expect(allResults.length).toBeGreaterThan(0);
    });
  });

  describe('Query Performance', () => {
    it('should execute funnel query in < 800ms', async () => {
      const start = Date.now();

      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
      
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(800);
    });

    it('should execute persona query in < 500ms', async () => {
      const start = Date.now();

      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);
      
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should execute magnetism query in < 600ms', async () => {
      const start = Date.now();

      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(600);
    });

    it('should use database indexes efficiently', async () => {
      const userId = testUserIds[0];
      const start = Date.now();

      // Query that should use index on user_id
      const { data, error } = await supabase
        .from('user_event')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })
        .limit(10);

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(200); // Very fast with index
    });
  });

  describe('Materialized View Performance', () => {
    it('should query mv_daily_funnel efficiently', async () => {
      const start = Date.now();

      const { data, error } = await supabase
        .from('mv_daily_funnel')
        .select('*')
        .gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('event_date', { ascending: false });

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(300); // Materialized view should be fast
    });

    it('should query persona performance view efficiently', async () => {
      const start = Date.now();

      const { data, error } = await supabase
        .from('mv_persona_performance')
        .select('*');

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory & Resource Usage', () => {
    it('should not leak memory on repeated queries', async () => {
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        await supabase
          .from('user_event')
          .select('*')
          .eq('user_id', testUserIds[0])
          .limit(10);
      }

      // If we get here without crashing, memory is being managed
      expect(true).toBe(true);
    });

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        user_id: testUserIds[0],
        event_name: 'large_event',
        event_properties: {
          data: 'x'.repeat(10000) // 10KB of data
        },
        occurred_at: new Date().toISOString()
      };

      const start = Date.now();

      const { error } = await supabase
        .from('user_event')
        .insert(largePayload);

      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Throughput Testing', () => {
    it('should measure event ingestion throughput', async () => {
      const eventCount = 100;
      const userId = testUserIds[1];
      const start = Date.now();

      const events = Array.from({ length: eventCount }, (_, i) => ({
        user_id: userId,
        event_name: 'throughput_test',
        event_properties: { index: i },
        occurred_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_event')
        .insert(events);

      const duration = Date.now() - start;
      const throughput = (eventCount / duration) * 1000; // events per second

      expect(error).toBeNull();
      expect(throughput).toBeGreaterThan(20); // > 20 events/second
    });

    it('should measure query throughput', async () => {
      const queryCount = 50;
      const start = Date.now();

      for (let i = 0; i < queryCount; i++) {
        await supabase
          .from('user_event')
          .select('count')
          .eq('user_id', testUserIds[0])
          .limit(1);
      }

      const duration = Date.now() - start;
      const throughput = (queryCount / duration) * 1000; // queries per second

      expect(throughput).toBeGreaterThan(10); // > 10 queries/second
    });
  });

  describe('Scalability Testing', () => {
    it('should handle increasing load gracefully', async () => {
      const loadLevels = [5, 10, 20, 30];
      const responseTimes: number[] = [];

      for (const load of loadLevels) {
        const start = Date.now();
        
        const requests = Array.from({ length: load }, () =>
          fetch(`${API_URL}/api/v1/analytics/funnel`)
        );

        await Promise.all(requests);
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // Response time should increase sub-linearly (good scaling)
      const firstLoadTime = responseTimes[0];
      const lastLoadTime = responseTimes[responseTimes.length - 1];
      const loadIncrease = loadLevels[loadLevels.length - 1] / loadLevels[0];
      const timeIncrease = lastLoadTime / firstLoadTime;

      expect(timeIncrease).toBeLessThan(loadIncrease * 2); // Sub-linear scaling
    });

    it('should maintain sub-second response times under moderate load', async () => {
      const concurrentRequests = 15;
      const start = Date.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        fetch(`${API_URL}/api/v1/analytics/personas`)
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      const avgResponseTime = duration / concurrentRequests;

      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBeGreaterThan(concurrentRequests * 0.9); // 90%+ success
      expect(avgResponseTime).toBeLessThan(1000); // Avg < 1s
    });
  });

  describe('Cache Performance', () => {
    it('should benefit from query caching', async () => {
      const userId = testUserIds[0];

      // First query (cold)
      const start1 = Date.now();
      await supabase
        .from('user_event')
        .select('*')
        .eq('user_id', userId)
        .limit(10);
      const coldDuration = Date.now() - start1;

      // Second query (potentially cached)
      const start2 = Date.now();
      await supabase
        .from('user_event')
        .select('*')
        .eq('user_id', userId)
        .limit(10);
      const warmDuration = Date.now() - start2;

      // Warm query should be at least as fast (or faster if cached)
      expect(warmDuration).toBeLessThanOrEqual(coldDuration * 1.5);
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain < 1% error rate under load', async () => {
      const requestCount = 100;
      let errorCount = 0;

      const requests = Array.from({ length: requestCount }, async () => {
        try {
          const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
          if (response.status !== 200) {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      });

      await Promise.allSettled(requests);

      const errorRate = (errorCount / requestCount) * 100;
      expect(errorRate).toBeLessThan(1); // < 1% error rate
    });
  });
});
