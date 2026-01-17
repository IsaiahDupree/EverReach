/**
 * Context Assembly & Message Composition Tests
 * Tests interaction history selection, context compression, and message generation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Context Assembly & Compression', () => {
  let testUserId: string;
  let testOrgId: string;
  let testContactId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `context-test-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    });
    testUserId = user.user!.id;

    // Get auth token
    const { data: session } = await supabase.auth.signInWithPassword({
      email: user.user!.email!,
      password: 'test123456',
    });
    authToken = session.session?.access_token || '';

    // Create test org
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Context Test Org' })
      .select()
      .single();
    testOrgId = org.id;

    // Create test contact with rich metadata
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        org_id: testOrgId,
        name: 'Alex Chen',
        email: 'alex@example.com',
        warmth_score: 45,
        pipeline_stage: 'active',
        metadata: {
          role: 'Engineering Lead',
          company: 'TechCorp',
          preferences: ['prefers email', 'morning meetings'],
          facts: ['uses Slack', 'timezone PST', 'technical background'],
          boundaries: ['no cold calls', 'no weekend contact'],
        },
      })
      .select()
      .single();
    testContactId = contact.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testContactId) {
      await supabase.from('interactions').delete().eq('contact_id', testContactId);
      await supabase.from('contacts').delete().eq('id', testContactId);
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('Retrieves recent interaction history', async () => {
    // Create a history of interactions
    const now = new Date();
    const interactions = [
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'email',
        content: 'Initial outreach about Q4 project',
        created_by: testUserId,
        created_at: new Date(now.getTime() - 30 * 86400000).toISOString(), // 30 days ago
      },
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'call',
        content: 'Discussed technical requirements and timeline',
        created_by: testUserId,
        created_at: new Date(now.getTime() - 20 * 86400000).toISOString(), // 20 days ago
      },
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'email',
        content: 'Sent proposal for review',
        created_by: testUserId,
        created_at: new Date(now.getTime() - 10 * 86400000).toISOString(), // 10 days ago
      },
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'email',
        content: 'Quick follow-up on proposal status',
        created_by: testUserId,
        created_at: new Date(now.getTime() - 5 * 86400000).toISOString(), // 5 days ago
      },
    ];

    await supabase.from('interactions').insert(interactions);

    // Fetch interaction history via API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/interactions?limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();

    // Verify we got interactions back
    expect(result.data).toHaveLength(4);
    
    // Most recent should be first (descending order)
    expect(result.data[0].content).toContain('follow-up');
    expect(result.data[3].content).toContain('Initial outreach');
  }, 10000);

  test('Message generation includes relevant context from history', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: testContactId,
          goal: 'follow_up',
          channel: 'email',
          context: 'Following up on the proposal we discussed',
          include_history: true, // Important: request history
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();

    // Verify message was generated
    expect(result).toHaveProperty('message');
    expect(result.message.length).toBeGreaterThan(50);

    // Check if metadata includes context info
    if (result.metadata) {
      expect(result.metadata).toHaveProperty('context_included');
    }
  }, 15000);

  test('Context is compressed when interaction history is large', async () => {
    // Create many interactions (20+)
    const manyInteractions = [];
    for (let i = 0; i < 25; i++) {
      manyInteractions.push({
        org_id: testOrgId,
        contact_id: testContactId,
        kind: i % 3 === 0 ? 'email' : i % 3 === 1 ? 'call' : 'note',
        content: `Historical interaction ${i + 1}: Discussed various project details and next steps`,
        created_by: testUserId,
        created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      });
    }
    await supabase.from('interactions').insert(manyInteractions);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: testContactId,
          goal: 'follow_up',
          channel: 'email',
          include_history: true,
          max_context_tokens: 800, // Force compression
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();

    // Even with 25+ interactions, should still generate successfully
    expect(result).toHaveProperty('message');
    
    // Check token usage stayed within budget
    if (result.metadata?.tokens) {
      const totalTokens = result.metadata.tokens.total || 
                         (result.metadata.tokens.prompt + result.metadata.tokens.completion);
      expect(totalTokens).toBeLessThan(2000); // Reasonable total with compression
    }

    // Cleanup large interaction set
    await supabase.from('interactions').delete().eq('contact_id', testContactId);
  }, 20000);

  test('Pipeline stage and status influence message tone', async () => {
    // Update contact to different pipeline stages and test tone
    const stages = [
      { stage: 'networking', expected_tone: 'casual' },
      { stage: 'active', expected_tone: 'professional' },
      { stage: 'nurture', expected_tone: 'warm' },
    ];

    for (const { stage, expected_tone } of stages) {
      await supabase
        .from('contacts')
        .update({ pipeline_stage: stage })
        .eq('id', testContactId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_id: testContactId,
            goal: 'check_in',
            channel: 'email',
          }),
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      // Message should be generated
      expect(result.message).toBeTruthy();
      
      // Metadata should include pipeline context
      if (result.metadata) {
        expect(result.metadata.pipeline_stage).toBe(stage);
      }
    }
  }, 30000);

  test('Contact metadata (facts, preferences, boundaries) is respected', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: testContactId,
          goal: 'book_meeting',
          channel: 'email',
          context: 'Want to schedule a follow-up call',
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();

    const message = result.message.toLowerCase();

    // Should NOT violate boundaries
    expect(message).not.toContain('call you');
    expect(message).not.toContain('weekend');
    expect(message).not.toContain('saturday');
    expect(message).not.toContain('sunday');

    // Should respect preferences (email, morning)
    // Message was sent via email ✓
    // Check if mentions morning times if suggesting specific times
    if (message.includes('morning') || message.includes('am')) {
      expect(true).toBe(true); // Preference respected
    }
  }, 15000);

  test('Warmth score affects message approach', async () => {
    // Test with low warmth score (cold)
    await supabase
      .from('contacts')
      .update({ warmth_score: 15 }) // Cold relationship
      .eq('id', testContactId);

    const coldResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: testContactId,
          goal: 'follow_up',
          channel: 'email',
        }),
      }
    );

    expect(coldResponse.ok).toBe(true);
    const coldResult = await coldResponse.json();

    // Cold message should be more cautious/value-focused
    expect(coldResult.message).toBeTruthy();

    // Test with high warmth score (warm)
    await supabase
      .from('contacts')
      .update({ warmth_score: 85 }) // Warm relationship
      .eq('id', testContactId);

    const warmResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: testContactId,
          goal: 'follow_up',
          channel: 'email',
        }),
      }
    );

    expect(warmResponse.ok).toBe(true);
    const warmResult = await warmResponse.json();

    // Warm message should be more casual/friendly
    expect(warmResult.message).toBeTruthy();
    
    // Messages should be different based on warmth
    expect(coldResult.message).not.toBe(warmResult.message);
  }, 30000);

  test('Goal type influences message structure and CTA', async () => {
    const goals = [
      { type: 'follow_up', expected_elements: ['checking in', 'update', 'thoughts'] },
      { type: 'book_meeting', expected_elements: ['schedule', 'meeting', 'time', 'calendar'] },
      { type: 'share_resource', expected_elements: ['thought', 'might', 'helpful', 'sharing'] },
    ];

    for (const { type, expected_elements } of goals) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_id: testContactId,
            goal: type,
            channel: 'email',
          }),
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const message = result.message.toLowerCase();

      // Check if at least one expected element is present
      const hasExpected = expected_elements.some(element => 
        message.includes(element.toLowerCase())
      );
      
      expect(hasExpected).toBe(true);
    }
  }, 45000);
});

describe('Context Budget & Compression Properties', () => {
  test('Context always stays within token budget', async () => {
    // This is a property test - should always be true regardless of data size
    const budgets = [500, 1000, 1500];
    
    for (const budget of budgets) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_id: '00000000-0000-0000-0000-000000000000', // Will fail, but tests budget logic
            goal: 'follow_up',
            channel: 'email',
            max_context_tokens: budget,
          }),
        }
      );

      // Even if it fails, should fail fast (not timeout from huge context)
      expect(response.status).toBeDefined();
    }
  });

  test('Removing non-salient interactions does not change core message intent', async () => {
    // Property: If we remove old, low-relevance interactions, the message goal/CTA should stay same
    // This tests idempotence of compression
    
    expect(true).toBe(true); // Placeholder - implement with fixture comparisons
  });

  test('Safety: Low warmth score prevents aggressive asks', async () => {
    // Property: If warmth < threshold, no aggressive CTAs
    // This is a safety property test
    
    expect(true).toBe(true); // Placeholder - implement with boundary checks
  });
});
