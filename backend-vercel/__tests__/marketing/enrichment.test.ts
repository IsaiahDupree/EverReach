/**
 * Marketing Enrichment Endpoints Tests
 * 
 * Tests for:
 * - POST /api/v1/marketing/enrich
 * - GET /api/v1/marketing/enrich?user_id=X
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Marketing Enrichment Endpoints', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    // Create test user
    testUserId = `test_user_${Date.now()}`;
    testEmail = `test_${Date.now()}@example.com`;
  });

  afterAll(async () => {
    // Cleanup
    await supabase
      .from('user_identity')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('POST /api/v1/marketing/enrich', () => {
    it('should trigger enrichment for a new user', async () => {
      const response = await fetch(`${API_URL}/api/v1/marketing/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          user_id: testUserId,
          trigger: 'email_submitted'
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user_id).toBe(testUserId);
      expect(data.status).toBe('pending');
    });

    it('should create user_identity record with pending status', async () => {
      const { data, error } = await supabase
        .from('user_identity')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('pending');
      expect(data.user_id).toBe(testUserId);
    });

    it('should reject requests without required fields', async () => {
      const response = await fetch(`${API_URL}/api/v1/marketing/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail
          // Missing user_id
        })
      });

      expect(response.status).toBe(400);
    });

    it('should handle duplicate enrichment requests gracefully', async () => {
      const response = await fetch(`${API_URL}/api/v1/marketing/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          user_id: testUserId,
          trigger: 'email_submitted'
        })
      });

      // Should not error, just return existing status
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/marketing/enrich?user_id=X', () => {
    it('should return enrichment status for existing user', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/marketing/enrich?user_id=${testUserId}`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.user_id).toBe(testUserId);
      expect(data.status).toBeDefined();
      expect(['pending', 'processing', 'completed', 'failed']).toContain(data.status);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/marketing/enrich?user_id=nonexistent_user`
      );

      expect(response.status).toBe(404);
    });

    it('should return cost_cents when enrichment completed', async () => {
      // Update test user to completed
      await supabase
        .from('user_identity')
        .update({
          status: 'completed',
          enriched_at: new Date().toISOString(),
          cost_cents: 4
        })
        .eq('user_id', testUserId);

      const response = await fetch(
        `${API_URL}/api/v1/marketing/enrich?user_id=${testUserId}`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(data.cost_cents).toBe(4);
      expect(data.enriched_at).toBeDefined();
    });
  });
});
