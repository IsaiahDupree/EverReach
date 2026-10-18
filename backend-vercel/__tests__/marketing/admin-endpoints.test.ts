/**
 * Admin Marketing Endpoints Tests
 * 
 * Tests for:
 * - GET /api/admin/marketing/overview
 * - GET /api/admin/marketing/enrichment-stats
 * - GET /api/admin/marketing/recent-users
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mock admin credentials (should match admin-middleware.ts)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_password_change_me';
const adminAuth = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');

describe('Admin Marketing Endpoints', () => {
  const authHeaders = {
    'Authorization': `Basic ${adminAuth}`
  };

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`);

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid credentials', async () => {
      const invalidAuth = Buffer.from('invalid:credentials').toString('base64');
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: {
          'Authorization': `Basic ${invalidAuth}`
        }
      });

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid admin credentials', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });

      // Should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/admin/marketing/overview', () => {
    it('should return comprehensive marketing overview', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.period).toBe('30_days');
      expect(data.funnel).toBeDefined();
      expect(data.personas).toBeDefined();
      expect(data.magnetism).toBeDefined();
      expect(data.enrichment).toBeDefined();
    });

    it('should include funnel metrics', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });
      
      const data = await response.json();
      
      expect(data.funnel.totals).toBeDefined();
      expect(data.funnel.totals).toHaveProperty('emails_submitted');
      expect(data.funnel.totals).toHaveProperty('trials_started');
      expect(data.funnel.totals).toHaveProperty('purchases_completed');
      
      expect(data.funnel.conversion_rates).toBeDefined();
      expect(data.funnel.conversion_rates).toHaveProperty('email_to_trial');
      expect(data.funnel.conversion_rates).toHaveProperty('trial_to_purchase');
    });

    it('should include top 3 personas', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });
      
      const data = await response.json();
      
      expect(data.personas.total_users).toBeDefined();
      expect(data.personas.top_3).toBeDefined();
      expect(Array.isArray(data.personas.top_3)).toBe(true);
      expect(data.personas.top_3.length).toBeLessThanOrEqual(3);
    });

    it('should include magnetism distribution', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });
      
      const data = await response.json();
      
      expect(data.magnetism.average).toBeDefined();
      expect(data.magnetism.distribution).toBeDefined();
      expect(data.magnetism.distribution).toHaveProperty('hot');
      expect(data.magnetism.distribution).toHaveProperty('warm');
      expect(data.magnetism.distribution).toHaveProperty('cooling');
      expect(data.magnetism.distribution).toHaveProperty('cold');
      expect(data.magnetism.high_risk_count).toBeDefined();
      expect(data.magnetism.healthy_count).toBeDefined();
    });

    it('should include enrichment stats', async () => {
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });
      
      const data = await response.json();
      
      expect(data.enrichment.last_7_days).toBeDefined();
      expect(data.enrichment.success_rate).toBeDefined();
      expect(data.enrichment.avg_cost).toBeDefined();
      
      const stats = data.enrichment.last_7_days;
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total_cost_usd');
    });

    it('should respond in < 2s', async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/admin/marketing/overview`, {
        headers: authHeaders
      });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('GET /api/admin/marketing/enrichment-stats', () => {
    it('should return enrichment statistics', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats`,
        { headers: authHeaders }
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.period_days).toBe(30);
      expect(data.summary).toBeDefined();
      expect(data.costs).toBeDefined();
      expect(data.reliability).toBeDefined();
      expect(data.daily_stats).toBeDefined();
    });

    it('should accept custom days parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats?days=60`,
        { headers: authHeaders }
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.period_days).toBe(60);
    });

    it('should include status breakdown', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      expect(data.summary).toHaveProperty('total');
      expect(data.summary).toHaveProperty('completed');
      expect(data.summary).toHaveProperty('pending');
      expect(data.summary).toHaveProperty('processing');
      expect(data.summary).toHaveProperty('failed');
      expect(data.summary).toHaveProperty('success_rate');
      expect(data.summary).toHaveProperty('failure_rate');
    });

    it('should include cost analysis', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      expect(data.costs).toHaveProperty('total_usd');
      expect(data.costs).toHaveProperty('avg_per_enrichment');
      expect(data.costs).toHaveProperty('projected_monthly');
      
      expect(typeof data.costs.total_usd).toBe('number');
      expect(typeof data.costs.avg_per_enrichment).toBe('number');
    });

    it('should include reliability metrics', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      expect(data.reliability).toHaveProperty('avg_retries');
      expect(data.reliability).toHaveProperty('total_retries');
      expect(data.reliability).toHaveProperty('top_errors');
      
      expect(Array.isArray(data.reliability.top_errors)).toBe(true);
    });

    it('should include daily breakdown', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/enrichment-stats`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      expect(Array.isArray(data.daily_stats)).toBe(true);
      
      if (data.daily_stats.length > 0) {
        const day = data.daily_stats[0];
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('total');
        expect(day).toHaveProperty('completed');
        expect(day).toHaveProperty('failed');
        expect(day).toHaveProperty('cost_usd');
      }
    });
  });

  describe('GET /api/admin/marketing/recent-users', () => {
    it('should return recent users with marketing data', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users`,
        { headers: authHeaders }
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.total).toBeDefined();
    });

    it('should accept custom limit parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users?limit=10`,
        { headers: authHeaders }
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.users.length).toBeLessThanOrEqual(10);
    });

    it('should include enrichment data per user', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users?limit=5`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toHaveProperty('user_id');
        expect(user).toHaveProperty('enrichment');
        expect(user.enrichment).toHaveProperty('status');
        expect(user.enrichment).toHaveProperty('created_at');
      }
    });

    it('should include persona data when available', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users?limit=50`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      const userWithPersona = data.users.find((u: any) => u.persona !== null);
      if (userWithPersona) {
        expect(userWithPersona.persona).toHaveProperty('slug');
        expect(userWithPersona.persona).toHaveProperty('label');
        expect(userWithPersona.persona).toHaveProperty('confidence');
      }
    });

    it('should include magnetism data when available', async () => {
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users?limit=50`,
        { headers: authHeaders }
      );
      
      const data = await response.json();
      
      const userWithMagnetism = data.users.find((u: any) => u.magnetism !== null);
      if (userWithMagnetism) {
        expect(userWithMagnetism.magnetism).toHaveProperty('score');
        expect(userWithMagnetism.magnetism).toHaveProperty('band');
        expect(['hot', 'warm', 'cooling', 'cold']).toContain(userWithMagnetism.magnetism.band);
      }
    });

    it('should respond in < 1s', async () => {
      const start = Date.now();
      const response = await fetch(
        `${API_URL}/api/admin/marketing/recent-users?limit=10`,
        { headers: authHeaders }
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
