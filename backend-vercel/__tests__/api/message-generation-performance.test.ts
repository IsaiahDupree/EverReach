/**
 * Message Generation Performance Tests
 * Tests speed and latency of AI message generation endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  SIMPLE_MESSAGE: 3000,      // Simple message should be < 3s
  COMPLEX_MESSAGE: 5000,     // Complex message should be < 5s
  WITH_CONTEXT: 6000,        // With full context should be < 6s
  CRITICAL_MAX: 10000,       // Nothing should take > 10s
};

describe('Message Generation Performance', () => {
  let testUserId: string;
  let testOrgId: string;
  let testContactId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `perf-test-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    });
    testUserId = user.user!.id;

    // Get auth token
    const { data: session } = await supabase.auth.signInWithPassword({
      email: `perf-test-${Date.now()}@test.com`,
      password: 'test123456',
    });
    authToken = session.session?.access_token || '';

    // Create test org
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Performance Test Org' })
      .select()
      .single();
    testOrgId = org.id;

    // Create test contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        org_id: testOrgId,
        name: 'Test Contact',
        email: 'test@example.com',
        warmth_score: 50,
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

  test('Simple message generation completes within threshold', async () => {
    const startTime = Date.now();

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
          context: 'Simple follow-up message',
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_MESSAGE);

    const result = await response.json();
    expect(result).toHaveProperty('message');
    expect(result.message.length).toBeGreaterThan(10);

    console.log(`✓ Simple message: ${duration}ms (threshold: ${THRESHOLDS.SIMPLE_MESSAGE}ms)`);
  }, 15000); // Allow 15s total for test

  test('Complex message with multiple goals stays performant', async () => {
    const startTime = Date.now();

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
          tone: 'professional',
          context: 'Following up on our previous conversation about the Q4 project timeline. Need to discuss deliverables and next steps.',
          max_length: 200,
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_MESSAGE);

    const result = await response.json();
    expect(result).toHaveProperty('message');

    console.log(`✓ Complex message: ${duration}ms (threshold: ${THRESHOLDS.COMPLEX_MESSAGE}ms)`);
  }, 15000);

  test('Message generation with full context retrieval', async () => {
    // Add some interactions for context
    await supabase.from('interactions').insert([
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'email',
        content: 'Previous email discussion',
        created_by: testUserId,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'call',
        content: 'Phone call notes',
        created_by: testUserId,
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
    ]);

    const startTime = Date.now();

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
          include_history: true, // Request full context
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(THRESHOLDS.WITH_CONTEXT);

    const result = await response.json();
    expect(result).toHaveProperty('message');

    console.log(`✓ With context: ${duration}ms (threshold: ${THRESHOLDS.WITH_CONTEXT}ms)`);
  }, 20000);

  test('No generation should exceed critical threshold', async () => {
    const startTime = Date.now();

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
          goal: 'introduction',
          channel: 'email',
          tone: 'friendly',
          context: 'First time reaching out to discuss potential collaboration',
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(THRESHOLDS.CRITICAL_MAX);

    console.log(`✓ Critical threshold check: ${duration}ms (max: ${THRESHOLDS.CRITICAL_MAX}ms)`);
  }, 15000);

  test('Concurrent requests maintain acceptable performance', async () => {
    const NUM_CONCURRENT = 3;
    const requests = [];
    const startTime = Date.now();

    for (let i = 0; i < NUM_CONCURRENT; i++) {
      requests.push(
        fetch(
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
              context: `Concurrent request ${i + 1}`,
            }),
          }
        )
      );
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgDuration = totalDuration / NUM_CONCURRENT;

    // All should succeed
    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });

    // Average time should be reasonable (considering OpenAI might batch)
    expect(avgDuration).toBeLessThan(THRESHOLDS.COMPLEX_MESSAGE);

    console.log(`✓ Concurrent (${NUM_CONCURRENT}): avg ${avgDuration.toFixed(0)}ms, total ${totalDuration}ms`);
  }, 30000);

  test('Token usage is reasonable for simple messages', async () => {
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
          context: 'Quick follow-up',
          max_length: 100,
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();

    // Check if token usage is returned
    if (result.metadata?.tokens) {
      const totalTokens = result.metadata.tokens.total || 
                         (result.metadata.tokens.prompt + result.metadata.tokens.completion);
      
      // Simple message should use < 500 tokens
      expect(totalTokens).toBeLessThan(500);
      
      console.log(`✓ Token usage: ${totalTokens} tokens (expected < 500)`);
    }
  }, 15000);

  test('Streaming response starts quickly', async () => {
    const startTime = Date.now();
    let firstChunkTime: number | null = null;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/chat/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Write a brief follow-up email',
          contact_id: testContactId,
        }),
      }
    );

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    // Check time to first byte (TTFB)
    if (response.body) {
      const reader = response.body.getReader();
      const { done, value } = await reader.read();
      
      if (!done && value) {
        firstChunkTime = Date.now() - startTime;
        expect(firstChunkTime).toBeLessThan(2000); // First chunk < 2s
        
        console.log(`✓ Streaming TTFB: ${firstChunkTime}ms (threshold: 2000ms)`);
      }
      
      reader.cancel();
    }
  }, 15000);

  test('Performance degrades gracefully with large context', async () => {
    // Create many interactions (simulating large history)
    const manyInteractions = [];
    for (let i = 0; i < 20; i++) {
      manyInteractions.push({
        org_id: testOrgId,
        contact_id: testContactId,
        kind: 'note',
        content: `Historical note ${i}: This is some context about previous interactions`,
        created_by: testUserId,
        created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      });
    }
    await supabase.from('interactions').insert(manyInteractions);

    const startTime = Date.now();

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
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    // Even with large context, should still complete
    expect(duration).toBeLessThan(THRESHOLDS.CRITICAL_MAX);

    console.log(`✓ Large context (20 interactions): ${duration}ms`);

    // Cleanup
    await supabase.from('interactions').delete().eq('contact_id', testContactId);
  }, 20000);

  test('Error responses are fast (no timeout on errors)', async () => {
    const startTime = Date.now();

    // Request with invalid contact ID should fail quickly
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/agent/compose/smart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          goal: 'follow_up',
          channel: 'email',
        }),
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should return error quickly (< 2s)
    expect(duration).toBeLessThan(2000);
    expect(response.ok).toBe(false);

    console.log(`✓ Error response: ${duration}ms (threshold: 2000ms)`);
  }, 10000);
});

describe('Performance Metrics Summary', () => {
  test('Log performance summary', () => {
    console.log('\n📊 Performance Thresholds:');
    console.log(`   Simple Message:    ${THRESHOLDS.SIMPLE_MESSAGE}ms`);
    console.log(`   Complex Message:   ${THRESHOLDS.COMPLEX_MESSAGE}ms`);
    console.log(`   With Full Context: ${THRESHOLDS.WITH_CONTEXT}ms`);
    console.log(`   Critical Maximum:  ${THRESHOLDS.CRITICAL_MAX}ms\n`);
    
    expect(true).toBe(true); // Always pass
  });
});
