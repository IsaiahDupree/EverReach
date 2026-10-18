/**
 * Marketing Analytics Endpoints Tests
 * 
 * Tests for:
 * - GET /api/v1/analytics/funnel?days=30
 * - GET /api/v1/analytics/personas
 * - GET /api/v1/analytics/magnetism-summary?window=7d
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Marketing Analytics Endpoints', () => {
  beforeAll(async () => {
    // Ensure materialized views are refreshed
    await supabase.rpc('refresh_materialized_view', { 
      view_name: 'mv_daily_funnel' 
    }).catch(() => {
      // View might not exist yet, that's ok
    });
  });

  describe('GET /api/v1/analytics/funnel', () => {
    it('should return funnel data with default 30 days', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.period_days).toBe(30);
      expect(data.daily_data).toBeDefined();
      expect(Array.isArray(data.daily_data)).toBe(true);
      expect(data.totals).toBeDefined();
      expect(data.overall_rates).toBeDefined();
    });

    it('should accept custom days parameter', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel?days=7`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.period_days).toBe(7);
    });

    it('should return totals with correct structure', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
      const data = await response.json();

      expect(data.totals).toHaveProperty('emails_submitted');
      expect(data.totals).toHaveProperty('trials_started');
      expect(data.totals).toHaveProperty('purchases_completed');
      
      expect(typeof data.totals.emails_submitted).toBe('number');
      expect(typeof data.totals.trials_started).toBe('number');
      expect(typeof data.totals.purchases_completed).toBe('number');
    });

    it('should return conversion rates', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
      const data = await response.json();

      expect(data.overall_rates).toHaveProperty('email_to_trial_rate');
      expect(data.overall_rates).toHaveProperty('trial_to_purchase_rate');
      expect(data.overall_rates).toHaveProperty('email_to_purchase_rate');
      
      // Rates should be between 0 and 1
      expect(data.overall_rates.email_to_trial_rate).toBeGreaterThanOrEqual(0);
      expect(data.overall_rates.email_to_trial_rate).toBeLessThanOrEqual(1);
    });

    it('should reject invalid days parameter', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel?days=500`);

      expect(response.status).toBe(400);
    });

    it('should include generated_at timestamp', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
      const data = await response.json();

      expect(data.generated_at).toBeDefined();
      expect(new Date(data.generated_at).toString()).not.toBe('Invalid Date');
    });
  });

  describe('GET /api/v1/analytics/personas', () => {
    it('should return persona distribution', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.personas).toBeDefined();
      expect(Array.isArray(data.personas)).toBe(true);
      expect(data.totals).toBeDefined();
    });

    it('should include persona percentages', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);
      const data = await response.json();

      if (data.personas.length > 0) {
        const persona = data.personas[0];
        expect(persona).toHaveProperty('percentage');
        expect(typeof persona.percentage).toBe('number');
        expect(persona.percentage).toBeGreaterThanOrEqual(0);
        expect(persona.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should include performance metrics per persona', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);
      const data = await response.json();

      if (data.personas.length > 0) {
        const persona = data.personas[0];
        expect(persona).toHaveProperty('user_count');
        expect(persona).toHaveProperty('trial_rate');
        expect(persona).toHaveProperty('purchase_rate');
      }
    });

    it('should order personas by user count (descending)', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);
      const data = await response.json();

      if (data.personas.length > 1) {
        for (let i = 0; i < data.personas.length - 1; i++) {
          expect(data.personas[i].user_count).toBeGreaterThanOrEqual(
            data.personas[i + 1].user_count
          );
        }
      }
    });
  });

  describe('GET /api/v1/analytics/magnetism-summary', () => {
    it('should return magnetism distribution with default 7d window', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.window).toBe('7d');
      expect(data.distribution).toBeDefined();
      expect(data.percentages).toBeDefined();
    });

    it('should accept 30d window parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/analytics/magnetism-summary?window=30d`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.window).toBe('30d');
    });

    it('should return distribution with all 4 bands', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      const data = await response.json();

      expect(data.distribution).toHaveProperty('hot');
      expect(data.distribution).toHaveProperty('warm');
      expect(data.distribution).toHaveProperty('cooling');
      expect(data.distribution).toHaveProperty('cold');
      
      expect(typeof data.distribution.hot).toBe('number');
      expect(typeof data.distribution.warm).toBe('number');
      expect(typeof data.distribution.cooling).toBe('number');
      expect(typeof data.distribution.cold).toBe('number');
    });

    it('should return percentages that sum to ~100%', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      const data = await response.json();

      if (data.total_users > 0) {
        const sum = data.percentages.hot + 
                    data.percentages.warm + 
                    data.percentages.cooling + 
                    data.percentages.cold;
        
        // Allow for small rounding errors
        expect(sum).toBeGreaterThan(99);
        expect(sum).toBeLessThan(101);
      }
    });

    it('should include risk analysis', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      const data = await response.json();

      expect(data.risk_analysis).toBeDefined();
      expect(data.risk_analysis).toHaveProperty('high_risk');
      expect(data.risk_analysis).toHaveProperty('moderate');
      expect(data.risk_analysis).toHaveProperty('healthy');
    });

    it('should reject invalid window parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/analytics/magnetism-summary?window=14d`
      );

      expect(response.status).toBe(400);
    });

    it('should include average magnetism score', async () => {
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      const data = await response.json();

      expect(data.average_magnetism).toBeDefined();
      expect(typeof data.average_magnetism).toBe('number');
      expect(data.average_magnetism).toBeGreaterThanOrEqual(0);
      expect(data.average_magnetism).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Tests', () => {
    it('funnel endpoint should respond in < 1s', async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/v1/analytics/funnel`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('personas endpoint should respond in < 1s', async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/v1/analytics/personas`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('magnetism endpoint should respond in < 1s', async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/api/v1/analytics/magnetism-summary`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
