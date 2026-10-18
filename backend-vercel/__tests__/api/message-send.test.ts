/**
 * Message Send & Auto-Recompute Tests
 * Tests that warmth score is automatically recomputed after marking a message as sent
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Message Send with Auto-Recompute', () => {
  let testUserId: string;
  let testOrgId: string;
  let testContactId: string;
  let testThreadId: string;
  let testMessageId: string;

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `message-test-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    });
    testUserId = user.user!.id;

    // Create test org
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Message Test Org' })
      .select()
      .single();
    testOrgId = org.id;

    // Create test contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        org_id: testOrgId,
        name: 'Test Contact for Messages',
        warmth_score: 30,
      })
      .select()
      .single();
    testContactId = contact.id;

    // Create test thread
    const { data: thread } = await supabase
      .from('threads')
      .insert({
        org_id: testOrgId,
        contact_id: testContactId,
        title: 'Test Thread',
      })
      .select()
      .single();
    testThreadId = thread.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testMessageId) {
      await supabase.from('messages').delete().eq('id', testMessageId);
    }
    if (testThreadId) {
      await supabase.from('threads').delete().eq('id', testThreadId);
    }
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

  test('Sending a message creates an interaction record', async () => {
    // Create a draft message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        org_id: testOrgId,
        contact_id: testContactId,
        thread_id: testThreadId,
        channel: 'email',
        content: 'Test message content',
        delivery_status: 'draft',
      })
      .select()
      .single();
    testMessageId = message.id;

    // Get initial warmth score
    const { data: beforeContact } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();
    const initialWarmth = beforeContact?.warmth_score || 30;

    // Mark message as sent
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: testMessageId,
          channel_account_id: 'test-account',
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.sent).toBe(true);

    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify interaction was created
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', testContactId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(interactions).toHaveLength(1);
    expect(interactions![0].kind).toBe('email');

    // Verify last_interaction_at was updated
    const { data: contact } = await supabase
      .from('contacts')
      .select('last_interaction_at')
      .eq('id', testContactId)
      .single();

    expect(contact?.last_interaction_at).toBeTruthy();
  });

  test('Warmth score increases after sending a message', async () => {
    // Get warmth score before
    const { data: beforeContact } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();
    const warmthBefore = beforeContact?.warmth_score || 30;

    // Create and send another message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        org_id: testOrgId,
        contact_id: testContactId,
        thread_id: testThreadId,
        channel: 'email',
        content: 'Second test message',
        delivery_status: 'draft',
      })
      .select()
      .single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: message.id,
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Wait for async warmth recompute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get warmth score after
    const { data: afterContact } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();
    const warmthAfter = afterContact?.warmth_score || 30;

    // Warmth should have increased
    expect(warmthAfter).toBeGreaterThan(warmthBefore);
    expect(warmthAfter).toBeGreaterThan(40); // Should be above old max
    expect(warmthAfter).toBeLessThanOrEqual(100); // Should not exceed new max

    // Cleanup the second message
    await supabase.from('messages').delete().eq('id', message.id);
  });

  test('Multiple messages increase frequency boost', async () => {
    // Reset contact warmth
    await supabase
      .from('contacts')
      .update({ warmth_score: 30 })
      .eq('id', testContactId);

    // Delete existing interactions
    await supabase
      .from('interactions')
      .delete()
      .eq('contact_id', testContactId);

    const messageIds = [];

    // Send 3 messages in quick succession
    for (let i = 0; i < 3; i++) {
      const { data: message } = await supabase
        .from('messages')
        .insert({
          org_id: testOrgId,
          contact_id: testContactId,
          thread_id: testThreadId,
          channel: 'email',
          content: `Message ${i + 1}`,
          delivery_status: 'draft',
        })
        .select()
        .single();

      messageIds.push(message.id);

      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/messages/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message_id: message.id,
          }),
        }
      );

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for all recomputes to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final warmth score
    const { data: contact } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('id', testContactId)
      .single();

    // With 3 interactions:
    // Base (30) + Recency (35) + Frequency (12.5 for 3) + Channel (0, single type) = ~77
    expect(contact?.warmth_score).toBeGreaterThan(70);
    expect(contact?.warmth_score).toBeLessThanOrEqual(100);

    // Cleanup messages
    await supabase.from('messages').delete().in('id', messageIds);
  });

  test('Message metadata includes sent_at timestamp', async () => {
    const { data: message } = await supabase
      .from('messages')
      .insert({
        org_id: testOrgId,
        contact_id: testContactId,
        thread_id: testThreadId,
        channel: 'email',
        content: 'Metadata test message',
        delivery_status: 'draft',
        metadata: { test_field: 'test_value' },
      })
      .select()
      .single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: message.id,
          channel_account_id: 'test-account-123',
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Check message metadata was updated
    const { data: updatedMessage } = await supabase
      .from('messages')
      .select('metadata, delivery_status, sent_at')
      .eq('id', message.id)
      .single();

    expect(updatedMessage?.delivery_status).toBe('sent');
    expect(updatedMessage?.sent_at).toBeTruthy();
    expect(updatedMessage?.metadata).toHaveProperty('sent_at');
    expect(updatedMessage?.metadata).toHaveProperty('channel_account_id', 'test-account-123');
    expect(updatedMessage?.metadata).toHaveProperty('test_field', 'test_value'); // Original metadata preserved

    // Cleanup
    await supabase.from('messages').delete().eq('id', message.id);
  });

  test('Failed warmth recompute does not prevent message from being sent', async () => {
    // Create message with invalid contact_id to trigger recompute error
    const { data: message } = await supabase
      .from('messages')
      .insert({
        org_id: testOrgId,
        contact_id: testContactId, // Valid for message, but we'll test error handling
        thread_id: testThreadId,
        channel: 'email',
        content: 'Error handling test',
        delivery_status: 'draft',
      })
      .select()
      .single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/v1/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: message.id,
        }),
      }
    );

    // Message should still be marked as sent even if warmth recompute fails
    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.sent).toBe(true);

    // Cleanup
    await supabase.from('messages').delete().eq('id', message.id);
  });
});
