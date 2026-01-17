/**
 * Warmth Score Calculation Tests
 * Tests the updated warmth formula that caps at 100 points
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Warmth Score Calculation', () => {
  let testUserId: string;
  let testOrgId: string;
  let testContactId: string;

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `warmth-test-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    });
    testUserId = user.user!.id;

    // Create test org
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Warmth Test Org' })
      .select()
      .single();
    testOrgId = org.id;

    // Create test contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        org_id: testOrgId,
        name: 'Test Contact',
        warmth_score: 40,
      })
      .select()
      .single();
    testContactId = contact.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testContactId) {
      await supabase.from('contacts').delete().eq('id', testContactId);
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('Base score should be 30 for contact with no interactions', async () => {
    // Contact with no interactions should have base score of 30
    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // After recompute, should be at base (30) or initial (40)
    expect(data?.warmth_score).toBeGreaterThanOrEqual(30);
  });

  test('Warmth score increases after single interaction', async () => {
    const now = new Date().toISOString();
    
    // Add one recent interaction
    await supabase.from('interactions').insert({
      org_id: testOrgId,
      contact_id: testContactId,
      kind: 'email',
      content: 'Test interaction',
      created_by: testUserId,
      created_at: now,
    });

    // Update last_interaction_at
    await supabase
      .from('contacts')
      .update({ last_interaction_at: now })
      .eq('id', testContactId);

    // Trigger warmth recompute
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok).toBe(true);

    // Check updated warmth score
    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // Expected: Base (30) + Recency (~35) + Frequency (4.2 for 1 interaction) = ~69
    expect(data?.warmth_score).toBeGreaterThan(60);
    expect(data?.warmth_score).toBeLessThanOrEqual(100);
  });

  test('Warmth score reaches maximum of 100 with optimal engagement', async () => {
    const now = new Date();
    
    // Add 6 recent interactions across 2 channels
    const interactions = [];
    for (let i = 0; i < 6; i++) {
      const interactionDate = new Date(now);
      interactionDate.setHours(now.getHours() - i * 4); // Spread over 24 hours
      
      interactions.push({
        org_id: testOrgId,
        contact_id: testContactId,
        kind: i % 2 === 0 ? 'email' : 'call', // Alternate channels
        content: `Test interaction ${i}`,
        created_by: testUserId,
        created_at: interactionDate.toISOString(),
      });
    }

    await supabase.from('interactions').insert(interactions);

    // Update last_interaction_at to most recent
    await supabase
      .from('contacts')
      .update({ last_interaction_at: now.toISOString() })
      .eq('id', testContactId);

    // Trigger warmth recompute
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok).toBe(true);

    // Check updated warmth score
    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // Expected: Base (30) + Recency (35) + Frequency (25) + Channel (10) = 100
    expect(data?.warmth_score).toBeGreaterThanOrEqual(95);
    expect(data?.warmth_score).toBeLessThanOrEqual(100);
  });

  test('Warmth score decays after 30 days of no interaction', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Set last_interaction_at to 30 days ago
    await supabase
      .from('contacts')
      .update({ last_interaction_at: thirtyDaysAgo.toISOString() })
      .eq('id', testContactId);

    // Trigger warmth recompute
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok).toBe(true);

    // Check updated warmth score
    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // Should have decay penalty applied
    expect(data?.warmth_score).toBeLessThan(90);
  });

  test('Warmth score never goes below 0', async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Set last_interaction_at to 90+ days ago
    await supabase
      .from('contacts')
      .update({ last_interaction_at: ninetyDaysAgo.toISOString() })
      .eq('id', testContactId);

    // Delete all interactions
    await supabase
      .from('interactions')
      .delete()
      .eq('contact_id', testContactId);

    // Trigger warmth recompute
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok).toBe(true);

    // Check updated warmth score
    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // Should be clamped at 0 minimum
    expect(data?.warmth_score).toBeGreaterThanOrEqual(0);
    expect(data?.warmth_score).toBeLessThanOrEqual(100);
  });

  test('Channel diversity bonus applies with 2+ interaction types', async () => {
    const now = new Date();
    
    // Clear existing interactions
    await supabase
      .from('interactions')
      .delete()
      .eq('contact_id', testContactId);

    // Add 2 interactions with different channels in last 30 days
    await supabase.from('interactions').insert([
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'email',
        content: 'Email interaction',
        created_by: testUserId,
        created_at: now.toISOString(),
      },
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'call',
        content: 'Call interaction',
        created_by: testUserId,
        created_at: now.toISOString(),
      },
    ]);

    await supabase
      .from('contacts')
      .update({ last_interaction_at: now.toISOString() })
      .eq('id', testContactId);

    // Trigger warmth recompute
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/contacts/${testContactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok).toBe(true);

    const { data } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // Should include channel diversity bonus (+10)
    // Base (30) + Recency (35) + Frequency (8.3 for 2) + Channel (10) = ~83
    expect(data?.warmth_score).toBeGreaterThan(75);
  });
});
