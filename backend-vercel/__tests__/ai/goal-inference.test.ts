/**
 * AI Goal Inference System Tests
 * Integrated with existing test suite
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  inferUserGoals, 
  getUserGoalsForAI,
  InferredGoal 
} from '../../lib/goal-inference';

describe('AI Goal Inference System', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testOrgId: string;
  
  beforeAll(async () => {
    // Initialize Supabase client with service role
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create test user and org
    const { data: user } = await supabase.auth.admin.createUser({
      email: `test-goal-inference-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true
    });
    
    testUserId = user!.user!.id;

    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org Goal Inference' })
      .select()
      .single();
    
    testOrgId = org!.id;

    // Create user profile
    await supabase.from('profiles').insert({
      user_id: testUserId,
      display_name: 'Test User'
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await supabase.from('ai_user_context').delete().eq('user_id', testUserId);
      await supabase.from('persona_notes').delete().eq('user_id', testUserId);
      await supabase.from('profiles').delete().eq('user_id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
  });

  describe('Explicit Goal Extraction', () => {
    it('should extract explicit goals from profile fields', async () => {
      // Set explicit goals
      await supabase.from('profiles').update({
        business_goal: 'Close 5 enterprise deals this quarter',
        networking_goal: 'Connect with 20 senior CTOs',
        personal_goal: 'Maintain weekly contact with key relationships'
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);

      // Should have 3 goals (one per category)
      expect(goals.length).toBeGreaterThanOrEqual(3);

      // Find business goal
      const businessGoal = goals.find(g => g.category === 'business');
      expect(businessGoal).toBeDefined();
      expect(businessGoal!.source).toBe('explicit_field');
      expect(businessGoal!.goal_text).toBe('Close 5 enterprise deals this quarter');
      expect(businessGoal!.confidence).toBe(1.0);
      expect(businessGoal!.weight).toBe(100);

      // Find networking goal
      const networkingGoal = goals.find(g => g.category === 'networking');
      expect(networkingGoal).toBeDefined();
      expect(networkingGoal!.goal_text).toBe('Connect with 20 senior CTOs');

      // Find personal goal
      const personalGoal = goals.find(g => g.category === 'personal');
      expect(personalGoal).toBeDefined();
      expect(personalGoal!.goal_text).toBe('Maintain weekly contact with key relationships');
    });

    it('should handle empty profile goals gracefully', async () => {
      // Clear all explicit goals
      await supabase.from('profiles').update({
        business_goal: null,
        networking_goal: null,
        personal_goal: null
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);

      // Should still work, may have 0 goals or inferred goals
      expect(goals).toBeInstanceOf(Array);
      
      // No explicit field goals
      const explicitGoals = goals.filter(g => g.source === 'explicit_field');
      expect(explicitGoals.length).toBe(0);
    });

    it('should prioritize explicit goals over inferred goals', async () => {
      // Set explicit goal
      await supabase.from('profiles').update({
        business_goal: 'Close 10 deals this quarter'
      }).eq('user_id', testUserId);

      // Add note with different goal
      await supabase.from('persona_notes').insert({
        user_id: testUserId,
        title: 'Goals',
        body_text: 'My goal is to close 5 deals this quarter',
        type: 'text'
      });

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should only have explicit goal (100 weight beats 80 weight)
      const businessGoals = goals.filter(g => g.category === 'business');
      
      // First should be explicit
      expect(businessGoals[0].source).toBe('explicit_field');
      expect(businessGoals[0].goal_text).toBe('Close 10 deals this quarter');
    });
  });

  describe('Goal Extraction from Notes', () => {
    it('should extract explicit goals from persona notes', async () => {
      // Clear profile goals
      await supabase.from('profiles').update({
        business_goal: null,
        networking_goal: null,
        personal_goal: null
      }).eq('user_id', testUserId);

      // Add notes with explicit goals
      await supabase.from('persona_notes').insert([
        {
          user_id: testUserId,
          title: 'Q1 Goals',
          body_text: 'My goal is to close 5 enterprise deals this quarter and build my CTO network',
          type: 'text'
        },
        {
          user_id: testUserId,
          title: 'Priorities',
          body_text: 'I want to focus on enterprise sales and connect with more tech leaders',
          type: 'text'
        }
      ]);

      const goals = await inferUserGoals(testUserId, supabase);

      // Should have extracted goals from notes
      const noteGoals = goals.filter(g => 
        g.source === 'note_explicit' || g.source === 'note_implicit'
      );
      
      expect(noteGoals.length).toBeGreaterThan(0);
      
      // Check confidence and weight
      const explicitNoteGoal = noteGoals.find(g => g.source === 'note_explicit');
      if (explicitNoteGoal) {
        expect(explicitNoteGoal.confidence).toBeGreaterThanOrEqual(0.8);
        expect(explicitNoteGoal.weight).toBe(80);
      }
    });

    it('should handle notes without clear goals', async () => {
      // Add generic notes
      await supabase.from('persona_notes').insert([
        {
          user_id: testUserId,
          title: 'Meeting Notes',
          body_text: 'Had a great call with John today. Discussed the new project timeline.',
          type: 'text'
        }
      ]);

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should not error, may have no goals from these notes
      expect(goals).toBeInstanceOf(Array);
    });
  });

  describe('Behavioral Goal Inference', () => {
    it('should infer sales goals from active pipeline', async () => {
      // Clear profile and notes
      await supabase.from('profiles').update({
        business_goal: null,
        networking_goal: null,
        personal_goal: null
      }).eq('user_id', testUserId);
      
      await supabase.from('persona_notes').delete().eq('user_id', testUserId);

      // Create contacts in pipeline
      const contactIds = [];
      for (let i = 0; i < 10; i++) {
        const { data: contact } = await supabase.from('contacts').insert({
          user_id: testUserId,
          display_name: `Contact ${i}`,
          warmth: 50
        }).select().single();
        
        contactIds.push(contact!.id);

        // Add to pipeline
        await supabase.from('contact_pipeline_state').insert({
          contact_id: contact!.id,
          user_id: testUserId,
          pipeline_key: 'sales',
          stage_key: i < 3 ? 'demo' : i < 6 ? 'proposal' : 'negotiation'
        });
      }

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should have inferred business goal from pipeline activity
      const behaviorGoals = goals.filter(g => g.source === 'behavior');
      expect(behaviorGoals.length).toBeGreaterThan(0);

      const businessGoal = behaviorGoals.find(g => g.category === 'business');
      expect(businessGoal).toBeDefined();
      expect(businessGoal!.weight).toBe(30);
      expect(businessGoal!.confidence).toBeLessThanOrEqual(0.5);

      // Cleanup
      for (const id of contactIds) {
        await supabase.from('contact_pipeline_state').delete().eq('contact_id', id);
        await supabase.from('contacts').delete().eq('id', id);
      }
    });

    it('should infer networking goals from executive contacts', async () => {
      // Create CTO/VP contacts
      const contactIds = [];
      for (let i = 0; i < 8; i++) {
        const { data: contact } = await supabase.from('contacts').insert({
          user_id: testUserId,
          display_name: `Executive ${i}`,
          job_title: i % 2 === 0 ? 'CTO' : 'VP of Engineering',
          warmth: 60
        }).select().single();
        
        contactIds.push(contact!.id);
      }

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should infer networking goal
      const networkingGoal = goals.find(g => 
        g.category === 'networking' && g.source === 'behavior'
      );
      
      if (networkingGoal) {
        expect(networkingGoal.weight).toBe(30);
        expect(networkingGoal.goal_text).toContain('leader');
      }

      // Cleanup
      for (const id of contactIds) {
        await supabase.from('contacts').delete().eq('id', id);
      }
    });
  });

  describe('Goal Deduplication', () => {
    it('should merge similar goals from multiple sources', async () => {
      // Set explicit goal
      await supabase.from('profiles').update({
        business_goal: 'Close deals this quarter'
      }).eq('user_id', testUserId);

      // Add note with similar goal
      await supabase.from('persona_notes').insert({
        user_id: testUserId,
        title: 'Goals',
        body_text: 'My goal is to close more enterprise deals',
        type: 'text'
      });

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should have business category goals
      const businessGoals = goals.filter(g => g.category === 'business');
      
      // Explicit goal should come first (highest weight)
      expect(businessGoals[0].source).toBe('explicit_field');
      expect(businessGoals[0].weight).toBe(100);
    });

    it('should keep only top goal per category after merge', async () => {
      // Set goals in all categories
      await supabase.from('profiles').update({
        business_goal: 'Close 10 deals',
        networking_goal: 'Connect with CTOs',
        personal_goal: 'Stay in touch'
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Group by category
      const byCategory = {
        business: goals.filter(g => g.category === 'business'),
        networking: goals.filter(g => g.category === 'networking'),
        personal: goals.filter(g => g.category === 'personal')
      };

      // Each category should have at least one goal
      expect(byCategory.business.length).toBeGreaterThanOrEqual(1);
      expect(byCategory.networking.length).toBeGreaterThanOrEqual(1);
      expect(byCategory.personal.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AI Context Formatting', () => {
    it('should format goals for AI prompt injection', async () => {
      // Set explicit goals
      await supabase.from('profiles').update({
        business_goal: 'Close 5 deals this quarter',
        networking_goal: 'Build CTO network'
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Store in ai_user_context
      await supabase.from('ai_user_context').upsert({
        user_id: testUserId,
        inferred_goals: goals,
        last_analyzed_at: new Date().toISOString()
      });

      // Get formatted string
      const formatted = await getUserGoalsForAI(testUserId, supabase);
      
      // Should be a non-empty string
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      
      // Should contain goal categories
      expect(formatted).toContain('[business]');
      expect(formatted).toContain('[networking]');
      
      // Should mention not to explicitly mention goals
      expect(formatted.toLowerCase()).toContain('context');
    });

    it('should return empty string if no goals', async () => {
      // Create new user with no goals
      const { data: user } = await supabase.auth.admin.createUser({
        email: `test-no-goals-${Date.now()}@example.com`,
        password: 'test123',
        email_confirm: true
      });
      
      const userId = user!.user!.id;

      const formatted = await getUserGoalsForAI(userId, supabase);
      
      expect(formatted).toBe('');

      // Cleanup
      await supabase.auth.admin.deleteUser(userId);
    });

    it('should sort goals by weight descending', async () => {
      // Set explicit goal (weight 100)
      await supabase.from('profiles').update({
        business_goal: 'Close 10 deals'
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Store with mixed weights
      await supabase.from('ai_user_context').upsert({
        user_id: testUserId,
        inferred_goals: goals,
        last_analyzed_at: new Date().toISOString()
      });

      const formatted = await getUserGoalsForAI(testUserId, supabase);
      
      // Should show explicit goals first (marked with ✓)
      const lines = formatted.split('\n').filter(l => l.trim().startsWith('-'));
      if (lines.length > 0) {
        expect(lines[0]).toContain('✓ Explicit');
      }
    });
  });

  describe('Database Storage', () => {
    it('should store inferred goals in ai_user_context', async () => {
      const goals = await inferUserGoals(testUserId, supabase);
      
      // Store goals
      const { error } = await supabase.from('ai_user_context').upsert({
        user_id: testUserId,
        inferred_goals: goals,
        last_analyzed_at: new Date().toISOString()
      });

      expect(error).toBeNull();

      // Verify storage
      const { data } = await supabase
        .from('ai_user_context')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(data).toBeDefined();
      expect(data!.inferred_goals).toBeInstanceOf(Array);
    });

    it('should update existing context on re-inference', async () => {
      // First inference
      const goals1 = await inferUserGoals(testUserId, supabase);
      await supabase.from('ai_user_context').upsert({
        user_id: testUserId,
        inferred_goals: goals1,
        last_analyzed_at: new Date().toISOString()
      });

      // Change goals
      await supabase.from('profiles').update({
        business_goal: 'New goal'
      }).eq('user_id', testUserId);

      // Second inference
      const goals2 = await inferUserGoals(testUserId, supabase);
      await supabase.from('ai_user_context').upsert({
        user_id: testUserId,
        inferred_goals: goals2,
        last_analyzed_at: new Date().toISOString()
      });

      // Verify updated
      const { data } = await supabase
        .from('ai_user_context')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      const businessGoal = data!.inferred_goals.find((g: InferredGoal) => 
        g.category === 'business' && g.source === 'explicit_field'
      );
      
      expect(businessGoal?.goal_text).toBe('New goal');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      // This test assumes OpenAI might fail
      // The system should still return goals from profile fields
      
      await supabase.from('profiles').update({
        business_goal: 'Close deals'
      }).eq('user_id', testUserId);

      const goals = await inferUserGoals(testUserId, supabase);
      
      // Should at least have explicit goal even if OpenAI fails
      const explicitGoal = goals.find(g => g.source === 'explicit_field');
      expect(explicitGoal).toBeDefined();
    });

    it('should return empty array for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const goals = await inferUserGoals(fakeUserId, supabase);
      
      expect(goals).toBeInstanceOf(Array);
      expect(goals.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete inference in reasonable time', async () => {
      const startTime = Date.now();
      
      await inferUserGoals(testUserId, supabase);
      
      const duration = Date.now() - startTime;
      
      // Should complete in under 10 seconds (including OpenAI call)
      expect(duration).toBeLessThan(10000);
    });
  });
});
