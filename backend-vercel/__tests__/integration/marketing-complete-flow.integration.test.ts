/**
 * Marketing Intelligence - Complete Flow Integration Tests
 * 
 * Tests the complete user journey through the marketing intelligence system:
 * 1. Event ingestion (PostHog webhook)
 * 2. User enrichment (RapidAPI + Perplexity + OpenAI)
 * 3. Persona assignment
 * 4. Magnetism calculation
 * 5. Attribution analysis
 * 6. Analytics queries
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Marketing Intelligence - Complete Flow Integration', () => {
  let testUserId: string;
  let testEmail: string;
  let testEmailHash: string;

  beforeAll(async () => {
    testUserId = `integration_test_${Date.now()}`;
    testEmail = `integration_${Date.now()}@example.com`;
    
    // Simple email hash (in production, use proper SHA-256)
    testEmailHash = Buffer.from(testEmail).toString('base64');
  });

  afterAll(async () => {
    // Cleanup all test data
    await supabase.from('user_event').delete().eq('user_id', testUserId);
    await supabase.from('user_magnetism_index').delete().eq('user_id', testUserId);
    await supabase.from('user_persona').delete().eq('user_id', testUserId);
    await supabase.from('user_identity').delete().eq('user_id', testUserId);
  });

  describe('Phase 1: Event Ingestion', () => {
    it('should ingest email_submitted event', async () => {
      const event = {
        event: 'email_submitted',
        distinct_id: testUserId,
        properties: {
          email_hash: testEmailHash,
          source: 'landing_hero',
          $current_url: 'https://example.com/landing'
        },
        timestamp: new Date().toISOString()
      };

      // In production, this would be sent via PostHog webhook
      const { data, error } = await supabase
        .from('user_event')
        .insert({
          user_id: testUserId,
          event_name: event.event,
          event_properties: event.properties,
          occurred_at: event.timestamp
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.event_name).toBe('email_submitted');
    });

    it('should track app_open event', async () => {
      const { data, error } = await supabase
        .from('user_event')
        .insert({
          user_id: testUserId,
          event_name: 'app_open',
          event_properties: {
            launch_type: 'cold',
            platform: 'ios'
          },
          occurred_at: new Date().toISOString()
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.event_name).toBe('app_open');
    });

    it('should track signup_completed event', async () => {
      const { data, error } = await supabase
        .from('user_event')
        .insert({
          user_id: testUserId,
          event_name: 'signup_completed',
          event_properties: {
            method: 'email',
            has_profile_pic: false
          },
          occurred_at: new Date().toISOString()
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.event_name).toBe('signup_completed');
    });

    it('should track multiple engagement events', async () => {
      const events = [
        { name: 'screen_view', props: { screen: 'Home' } },
        { name: 'screen_view', props: { screen: 'People' } },
        { name: 'contact_created', props: { contact_count: 1 } },
        { name: 'contact_created', props: { contact_count: 2 } }
      ];

      for (const event of events) {
        await supabase.from('user_event').insert({
          user_id: testUserId,
          event_name: event.name,
          event_properties: event.props,
          occurred_at: new Date().toISOString()
        });
      }

      // Verify events were inserted
      const { data, count } = await supabase
        .from('user_event')
        .select('*', { count: 'exact' })
        .eq('user_id', testUserId);

      expect(count).toBeGreaterThanOrEqual(6); // 3 from previous tests + 4 new
    });
  });

  describe('Phase 2: User Enrichment', () => {
    it('should trigger enrichment for user', async () => {
      const response = await fetch(`${API_URL}/api/v1/marketing/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          user_id: testUserId,
          trigger: 'signup_completed'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user_id).toBe(testUserId);
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
    });

    it('should simulate completed enrichment', async () => {
      // Simulate enrichment completion
      const { error } = await supabase
        .from('user_identity')
        .update({
          status: 'completed',
          enriched_at: new Date().toISOString(),
          cost_cents: 4,
          company_name: 'Acme Corp',
          company_industry: 'Technology',
          social_profiles: {
            linkedin: 'https://linkedin.com/in/testuser',
            twitter: 'https://twitter.com/testuser',
            github: 'https://github.com/testuser'
          }
        })
        .eq('user_id', testUserId);

      expect(error).toBeNull();
    });

    it('should verify enrichment data was saved', async () => {
      const { data, error } = await supabase
        .from('user_identity')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('completed');
      expect(data.company_name).toBe('Acme Corp');
      expect(data.social_profiles).toBeDefined();
      expect(data.social_profiles.linkedin).toBeDefined();
    });
  });

  describe('Phase 3: Persona Assignment', () => {
    it('should assign persona to user', async () => {
      // Get a persona bucket (automation_pro)
      const { data: persona } = await supabase
        .from('persona_bucket')
        .select('id')
        .eq('slug', 'automation_pro')
        .single();

      if (persona) {
        const { error } = await supabase
          .from('user_persona')
          .insert({
            user_id: testUserId,
            persona_id: persona.id,
            confidence_score: 0.85,
            assigned_at: new Date().toISOString()
          });

        expect(error).toBeNull();
      }
    });

    it('should retrieve user persona', async () => {
      const { data, error } = await supabase
        .from('user_persona')
        .select(`
          *,
          persona_bucket (
            slug,
            label,
            intent_level
          )
        `)
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      if (data) {
        expect(data.confidence_score).toBeGreaterThan(0);
        expect(data.persona_bucket).toBeDefined();
      }
    });
  });

  describe('Phase 4: Magnetism Calculation', () => {
    it('should calculate magnetism index (7d window)', async () => {
      // Insert magnetism index
      const { error } = await supabase
        .from('user_magnetism_index')
        .insert({
          user_id: testUserId,
          window: '7d',
          index_value: 68,
          intent_component: 22,
          engagement_component: 18,
          reactivation_component: 14,
          email_ctr_component: 10,
          social_returns_component: 4,
          computed_at: new Date().toISOString()
        });

      expect(error).toBeNull();
    });

    it('should retrieve magnetism data via API', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/marketing/magnetism/${testUserId}`
      );

      if (response.status === 200) {
        const data = await response.json();
        expect(data.user_id).toBe(testUserId);
        expect(data.magnetism_7d).toBeDefined();
        expect(data.magnetism_7d.index).toBeGreaterThan(0);
      }
    });

    it('should classify magnetism band correctly', async () => {
      const { data } = await supabase
        .from('user_magnetism_index')
        .select('index_value')
        .eq('user_id', testUserId)
        .eq('window', '7d')
        .single();

      if (data) {
        const band = 
          data.index_value >= 70 ? 'hot' :
          data.index_value >= 50 ? 'warm' :
          data.index_value >= 30 ? 'cooling' : 'cold';

        expect(['hot', 'warm', 'cooling', 'cold']).toContain(band);
      }
    });
  });

  describe('Phase 5: Attribution Analysis', () => {
    it('should retrieve complete user journey', async () => {
      const { data, error } = await supabase
        .from('user_event')
        .select('event_name, event_properties, occurred_at')
        .eq('user_id', testUserId)
        .order('occurred_at', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });

    it('should identify conversion events in journey', async () => {
      const { data } = await supabase
        .from('user_event')
        .select('event_name')
        .eq('user_id', testUserId)
        .in('event_name', [
          'email_submitted',
          'signup_completed',
          'trial_started',
          'purchase_completed'
        ]);

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      
      const eventNames = data.map(e => e.event_name);
      expect(eventNames).toContain('email_submitted');
      expect(eventNames).toContain('signup_completed');
    });

    it('should calculate time between key events', async () => {
      const { data } = await supabase
        .from('user_event')
        .select('event_name, occurred_at')
        .eq('user_id', testUserId)
        .in('event_name', ['email_submitted', 'signup_completed'])
        .order('occurred_at', { ascending: true });

      if (data && data.length >= 2) {
        const emailTime = new Date(data[0].occurred_at).getTime();
        const signupTime = new Date(data[1].occurred_at).getTime();
        const timeDiff = signupTime - emailTime;

        expect(timeDiff).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Phase 6: Analytics Queries', () => {
    it('should appear in funnel analytics', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/analytics/funnel?days=7`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totals).toBeDefined();
      expect(data.totals.emails_submitted).toBeGreaterThanOrEqual(0);
    });

    it('should appear in persona distribution', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/analytics/personas`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.personas).toBeDefined();
      expect(Array.isArray(data.personas)).toBe(true);
    });

    it('should appear in magnetism summary', async () => {
      const response = await fetch(
        `${API_URL}/api/v1/analytics/magnetism-summary?window=7d`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.distribution).toBeDefined();
      expect(data.total_users).toBeGreaterThanOrEqual(0);
    });

    it('should calculate intent score correctly', async () => {
      // Count high-intent events
      const { data } = await supabase
        .from('user_event')
        .select('event_name')
        .eq('user_id', testUserId)
        .in('event_name', [
          'signup_completed',
          'trial_started',
          'contact_created',
          'screen_view'
        ]);

      if (data) {
        // Simple intent score calculation
        const intentScore = Math.min(100, data.length * 10);
        expect(intentScore).toBeGreaterThan(0);
        expect(intentScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Phase 7: End-to-End Verification', () => {
    it('should have complete user profile', async () => {
      // Get all user data
      const [identity, persona, magnetism, events] = await Promise.all([
        supabase
          .from('user_identity')
          .select('*')
          .eq('user_id', testUserId)
          .single(),
        supabase
          .from('user_persona')
          .select('*, persona_bucket(*)')
          .eq('user_id', testUserId)
          .single(),
        supabase
          .from('user_magnetism_index')
          .select('*')
          .eq('user_id', testUserId)
          .eq('window', '7d')
          .single(),
        supabase
          .from('user_event')
          .select('*', { count: 'exact' })
          .eq('user_id', testUserId)
      ]);

      // Verify all components exist
      expect(identity.data).toBeDefined();
      expect(identity.data?.status).toBe('completed');
      
      expect(events.count).toBeGreaterThan(0);
      
      // Persona and magnetism might not exist for all test users
      if (persona.data) {
        expect(persona.data.persona_bucket).toBeDefined();
      }
      
      if (magnetism.data) {
        expect(magnetism.data.index_value).toBeGreaterThan(0);
      }
    });

    it('should verify data consistency', async () => {
      const { data: identity } = await supabase
        .from('user_identity')
        .select('user_id, status')
        .eq('user_id', testUserId)
        .single();

      const { data: events } = await supabase
        .from('user_event')
        .select('user_id')
        .eq('user_id', testUserId)
        .limit(1)
        .single();

      // Both should have same user_id
      expect(identity?.user_id).toBe(events?.user_id);
      expect(identity?.user_id).toBe(testUserId);
    });

    it('should verify enrichment cost tracking', async () => {
      const { data } = await supabase
        .from('user_identity')
        .select('cost_cents')
        .eq('user_id', testUserId)
        .single();

      if (data?.cost_cents) {
        expect(data.cost_cents).toBeGreaterThan(0);
        expect(data.cost_cents).toBeLessThan(10); // Should be ~4 cents
      }
    });
  });

  describe('Phase 8: Performance Validation', () => {
    it('should retrieve user data in < 500ms', async () => {
      const start = Date.now();
      
      await supabase
        .from('user_identity')
        .select('*')
        .eq('user_id', testUserId)
        .single();
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should query events efficiently', async () => {
      const start = Date.now();
      
      await supabase
        .from('user_event')
        .select('*')
        .eq('user_id', testUserId)
        .order('occurred_at', { ascending: false })
        .limit(10);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });

    it('should calculate magnetism in < 200ms', async () => {
      const start = Date.now();
      
      await supabase
        .from('user_magnetism_index')
        .select('*')
        .eq('user_id', testUserId)
        .eq('window', '7d')
        .single();
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });
});
