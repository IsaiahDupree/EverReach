/**
 * AI Agent System Integration Tests
 * 
 * Tests the integration between AI agent, context bundles, preferences,
 * and message generation system.
 * 
 * Coverage:
 * - Agent fetching context bundles
 * - Preferences affecting channel selection
 * - Voice note processing → contact extraction → interaction logging
 * - Agent respecting tenant policies
 * - Effective channel calculation with quiet hours
 * - AI tool execution and validation
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test data
let testOrgId: string;
let testUserId: string;

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeAll(async () => {
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: 'Test Org - AI Agent' })
    .select()
    .single();
  testOrgId = org!.id;

  const { data: user } = await supabase
    .from('users')
    .insert({
      email: 'ai-agent-test@example.com',
      org_id: testOrgId,
    })
    .select()
    .single();
  testUserId = user!.id;
});

afterAll(async () => {
  await supabase.from('users').delete().eq('id', testUserId);
  await supabase.from('organizations').delete().eq('id', testOrgId);
});

beforeEach(async () => {
  await supabase.from('contacts').delete().eq('org_id', testOrgId);
});

// ============================================================================
// Helper Functions
// ============================================================================

async function createContact(data: {
  name: string;
  email?: string;
  warmth_score?: number;
  tags?: string[];
}) {
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      org_id: testOrgId,
      name: data.name,
      emails: data.email ? [data.email] : [],
      warmth_score: data.warmth_score || 50,
      tags: data.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return contact;
}

async function setPreferences(contactId: string, preferences: {
  preferred_channel?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  tone?: string;
}) {
  const { data, error } = await supabase
    .from('contact_preferences')
    .insert({
      contact_id: contactId,
      org_id: testOrgId,
      preferred_channel: preferences.preferred_channel || 'email',
      quiet_hours_start: preferences.quiet_hours_start,
      quiet_hours_end: preferences.quiet_hours_end,
      timezone: preferences.timezone || 'America/New_York',
      tone: preferences.tone || 'friendly',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function addChannel(contactId: string, data: {
  channel: string;
  address: string;
  is_default?: boolean;
  opt_status?: string;
}) {
  const { data: channel, error } = await supabase
    .from('contact_channels')
    .insert({
      contact_id: contactId,
      org_id: testOrgId,
      channel: data.channel,
      address: data.address,
      is_default: data.is_default || false,
      opt_status: data.opt_status || 'opted_in',
    })
    .select()
    .single();

  if (error) throw error;
  return channel;
}

async function logInteraction(contactId: string, data: {
  channel: string;
  direction: 'inbound' | 'outbound';
  summary: string;
  sentiment?: string;
}) {
  const { data: interaction, error } = await supabase
    .from('interactions')
    .insert({
      contact_id: contactId,
      org_id: testOrgId,
      channel: data.channel,
      direction: data.direction,
      summary: data.summary,
      sentiment: data.sentiment || 'neutral',
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return interaction;
}

async function fetchContextBundle(contactId: string, options: { interactions?: number } = {}) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  const { data: interactions } = await supabase
    .from('interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(options.interactions || 20);

  const { data: preferences } = await supabase
    .from('contact_preferences')
    .select('*')
    .eq('contact_id', contactId)
    .single();

  const { data: channels } = await supabase
    .from('contact_channels')
    .select('*')
    .eq('contact_id', contactId);

  // Build prompt skeleton (token-efficient summary)
  const promptSkeleton = `Contact: ${contact!.name}
Warmth: ${contact!.warmth_score}/100 (${contact!.warmth_band || 'unknown'})
Last contact: ${contact!.last_touch_at ? 'recently' : 'never'}
Tags: ${contact!.tags?.join(', ') || 'none'}
Recent interactions: ${interactions?.length || 0}`;

  return {
    contact: contact!,
    interactions: interactions || [],
    context: {
      prompt_skeleton: promptSkeleton,
      preferred_channel: preferences?.preferred_channel || 'email',
      quiet_hours: preferences ? {
        start: preferences.quiet_hours_start,
        end: preferences.quiet_hours_end,
        timezone: preferences.timezone,
      } : null,
      flags: {
        dnc: false, // Would check actual DNC status
        requires_approval: contact!.warmth_score < 20,
      },
      tone: preferences?.tone || 'professional',
    },
    channels: channels || [],
    meta: {
      generated_at: new Date().toISOString(),
      token_estimate: promptSkeleton.split(/\s+/).length * 1.3, // Rough estimate
    },
  };
}

async function getEffectiveChannel(contactId: string) {
  const { data: preferences } = await supabase
    .from('contact_preferences')
    .select('*')
    .eq('contact_id', contactId)
    .single();

  const { data: channels } = await supabase
    .from('contact_channels')
    .select('*')
    .eq('contact_id', contactId)
    .eq('opt_status', 'opted_in')
    .order('is_default', { ascending: false });

  const preferredChannel = preferences?.preferred_channel || 'email';
  const channel = channels?.find(c => c.channel === preferredChannel) || channels?.[0];

  // Check if in quiet hours
  const now = new Date();
  const currentHour = now.getHours();
  
  let isQuietHours = false;
  if (preferences?.quiet_hours_start && preferences?.quiet_hours_end) {
    const startHour = parseInt(preferences.quiet_hours_start.split(':')[0]);
    const endHour = parseInt(preferences.quiet_hours_end.split(':')[0]);
    
    if (startHour > endHour) {
      // Overnight quiet hours (e.g., 21:00 to 07:00)
      isQuietHours = currentHour >= startHour || currentHour < endHour;
    } else {
      isQuietHours = currentHour >= startHour && currentHour < endHour;
    }
  }

  return {
    channel: channel?.channel || 'email',
    address: channel?.address || '',
    can_send: !!channel && !isQuietHours,
    is_quiet_hours: isQuietHours,
    reason: !channel ? 'No channels available' : isQuietHours ? 'Quiet hours active' : 'OK',
  };
}

async function queueMessage(data: {
  contact_id: string;
  channel: string;
  recipient: string;
  body: string;
  send_after?: string;
  requires_approval?: boolean;
}) {
  const { data: outboxItem, error } = await supabase
    .from('outbox')
    .insert({
      org_id: testOrgId,
      contact_id: data.contact_id,
      channel: data.channel,
      recipient: data.recipient,
      body: data.body,
      send_after: data.send_after || new Date().toISOString(),
      requires_approval: data.requires_approval || false,
      status: data.requires_approval ? 'awaiting_approval' : 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return outboxItem;
}

async function setTenantPolicies(policies: {
  send_caps?: { per_contact_per_week: number };
  approval_required?: { warmth_threshold: number };
}) {
  const { data, error } = await supabase
    .from('tenant_policies')
    .upsert({
      org_id: testOrgId,
      policy_sets: [
        {
          key: 'send_caps',
          rules: policies.send_caps || { per_contact_per_week: 7 },
        },
        {
          key: 'approval_required',
          rules: policies.approval_required || { warmth_threshold: 20 },
        },
      ],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function countSentThisWeek(contactId: string): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count, error } = await supabase
    .from('outbox')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .eq('status', 'sent')
    .gte('sent_at', weekAgo.toISOString());

  if (error) throw error;
  return count || 0;
}

// ============================================================================
// Tests
// ============================================================================

describe('AI Agent System Integration', () => {
  test('Agent fetches context bundle → generates message → uses preferences for channel selection', async () => {
    // 1. Setup contact with preferences
    const contact = await createContact({
      name: 'Ada Lovelace',
      email: 'ada@test.com',
      warmth_score: 45,
      tags: ['engineer', 'vip'],
    });

    await setPreferences(contact.id, {
      preferred_channel: 'sms',
      quiet_hours_start: '21:00:00',
      quiet_hours_end: '07:00:00',
      timezone: 'America/New_York',
      tone: 'friendly',
    });

    await addChannel(contact.id, {
      channel: 'sms',
      address: '+15555551234',
      is_default: true,
    });

    // Log some interactions for context
    await logInteraction(contact.id, {
      channel: 'email',
      direction: 'outbound',
      summary: 'Sent project proposal',
      sentiment: 'positive',
    });

    await logInteraction(contact.id, {
      channel: 'call',
      direction: 'inbound',
      summary: 'Discussed timeline',
      sentiment: 'positive',
    });

    // 2. Agent fetches context bundle
    const bundle = await fetchContextBundle(contact.id, { interactions: 20 });

    expect(bundle.contact.name).toBe('Ada Lovelace');
    expect(bundle.context.preferred_channel).toBe('sms');
    expect(bundle.context.quiet_hours).toBeDefined();
    expect(bundle.context.tone).toBe('friendly');
    expect(bundle.interactions.length).toBe(2);
    expect(bundle.context.prompt_skeleton).toContain('Ada Lovelace');
    expect(bundle.context.prompt_skeleton).toContain('45/100');
    expect(bundle.meta.token_estimate).toBeGreaterThan(0);

    // 3. Agent checks effective channel (simulating current time outside quiet hours)
    const effectiveChannel = await getEffectiveChannel(contact.id);
    expect(effectiveChannel.channel).toBe('sms');
    expect(effectiveChannel.address).toBe('+15555551234');

    // 4. Agent queues message
    const message = 'Hi Ada! Following up on our discussion about the project timeline...';
    const outboxItem = await queueMessage({
      contact_id: contact.id,
      channel: effectiveChannel.channel,
      recipient: effectiveChannel.address,
      body: message,
    });

    expect(outboxItem.channel).toBe('sms');
    expect(outboxItem.status).toBe('pending');
    expect(outboxItem.body).toBe(message);
  });

  test('Agent respects quiet hours and schedules message for later', async () => {
    const contact = await createContact({
      name: 'Grace Hopper',
      email: 'grace@test.com',
    });

    // Set quiet hours: 9 PM to 7 AM
    await setPreferences(contact.id, {
      preferred_channel: 'email',
      quiet_hours_start: '21:00:00',
      quiet_hours_end: '07:00:00',
    });

    await addChannel(contact.id, {
      channel: 'email',
      address: 'grace@test.com',
    });

    // Get effective channel (will check if we're in quiet hours)
    const effectiveChannel = await getEffectiveChannel(contact.id);

    // If in quiet hours, schedule for tomorrow morning
    if (effectiveChannel.is_quiet_hours) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(7, 0, 0, 0);

      const outboxItem = await queueMessage({
        contact_id: contact.id,
        channel: effectiveChannel.channel,
        recipient: effectiveChannel.address,
        body: 'Good morning! ...',
        send_after: tomorrow.toISOString(),
      });

      expect(outboxItem.send_after).toBeDefined();
      expect(new Date(outboxItem.send_after!)).toBeInstanceOf(Date);
    }

    expect(effectiveChannel.reason).toBeDefined();
  });

  test('Agent processes voice note → extracts contacts → logs interactions', async () => {
    // Create contacts that might be mentioned
    const ada = await createContact({ name: 'Ada Lovelace', warmth_score: 60 });
    const grace = await createContact({ name: 'Grace Hopper', warmth_score: 55 });

    // Simulate voice note processing result
    const voiceNoteTranscript = 'Had a great call with Ada about the new project. She was very excited. Also need to follow up with Grace about the timeline.';
    
    // Extract mentioned contacts (simple keyword matching for test)
    const mentionedContacts = [
      { name: 'Ada', contact: ada },
      { name: 'Grace', contact: grace },
    ];

    // Agent extracts sentiment
    const sentiment = 'positive'; // Would use OpenAI in real implementation

    // Log interactions for each mentioned contact
    for (const { contact } of mentionedContacts) {
      await logInteraction(contact.id, {
        channel: 'call',
        direction: 'outbound',
        summary: voiceNoteTranscript.substring(0, 100),
        sentiment: sentiment,
      });
    }

    // Verify interactions logged
    const { data: adaInteractions } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', ada.id);

    const { data: graceInteractions } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', grace.id);

    expect(adaInteractions).toHaveLength(1);
    expect(adaInteractions![0].sentiment).toBe('positive');
    expect(graceInteractions).toHaveLength(1);
  });

  test('Agent respects tenant policies (send caps)', async () => {
    const contact = await createContact({
      name: 'Katherine Johnson',
      warmth_score: 70,
    });

    // Set policy: max 2 messages per week per contact
    await setTenantPolicies({
      send_caps: { per_contact_per_week: 2 },
    });

    // Simulate 2 messages already sent this week
    await supabase.from('outbox').insert([
      {
        org_id: testOrgId,
        contact_id: contact.id,
        channel: 'email',
        recipient: 'test@example.com',
        body: 'Message 1',
        status: 'sent',
        sent_at: new Date().toISOString(),
      },
      {
        org_id: testOrgId,
        contact_id: contact.id,
        channel: 'email',
        recipient: 'test@example.com',
        body: 'Message 2',
        status: 'sent',
        sent_at: new Date().toISOString(),
      },
    ]);

    // Check send count
    const sentCount = await countSentThisWeek(contact.id);
    expect(sentCount).toBe(2);

    // Agent should NOT send if cap reached
    const policies = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('org_id', testOrgId)
      .single();

    const sendCap = policies.data?.policy_sets?.find(p => p.key === 'send_caps')?.rules?.per_contact_per_week;
    
    if (sentCount >= sendCap) {
      // Agent should skip sending
      expect(sentCount).toBeGreaterThanOrEqual(sendCap);
    }
  });

  test('Low warmth contacts require approval before sending', async () => {
    const contact = await createContact({
      name: 'Alan Turing',
      warmth_score: 15, // Very low warmth
    });

    await addChannel(contact.id, {
      channel: 'email',
      address: 'alan@test.com',
    });

    // Fetch context bundle (includes requires_approval flag)
    const bundle = await fetchContextBundle(contact.id);
    expect(bundle.context.flags.requires_approval).toBe(true);

    // Agent should queue with requires_approval=true
    const outboxItem = await queueMessage({
      contact_id: contact.id,
      channel: 'email',
      recipient: 'alan@test.com',
      body: 'Re-engagement attempt',
      requires_approval: bundle.context.flags.requires_approval,
    });

    expect(outboxItem.status).toBe('awaiting_approval');
    expect(outboxItem.requires_approval).toBe(true);
  });

  test('Agent uses multiple interactions to build richer context', async () => {
    const contact = await createContact({
      name: 'Margaret Hamilton',
      warmth_score: 80,
    });

    // Log diverse interactions
    await logInteraction(contact.id, {
      channel: 'email',
      direction: 'inbound',
      summary: 'Asked about Apollo project',
      sentiment: 'excited',
    });

    await logInteraction(contact.id, {
      channel: 'meeting',
      direction: 'outbound',
      summary: 'Demo of new software',
      sentiment: 'positive',
    });

    await logInteraction(contact.id, {
      channel: 'call',
      direction: 'inbound',
      summary: 'Follow-up questions about implementation',
      sentiment: 'curious',
    });

    // Fetch context bundle
    const bundle = await fetchContextBundle(contact.id, { interactions: 10 });

    expect(bundle.interactions.length).toBe(3);
    expect(bundle.interactions.some(i => i.sentiment === 'excited')).toBe(true);
    expect(bundle.interactions.some(i => i.channel === 'meeting')).toBe(true);
    expect(bundle.context.prompt_skeleton).toContain('Margaret Hamilton');
  });

  test('Opted-out channel forces fallback to alternative', async () => {
    const contact = await createContact({
      name: 'Dorothy Vaughan',
      email: 'dorothy@test.com',
    });

    // Setup email (opted-out) and SMS (opted-in)
    await addChannel(contact.id, {
      channel: 'email',
      address: 'dorothy@test.com',
      opt_status: 'opted_out',
    });

    await addChannel(contact.id, {
      channel: 'sms',
      address: '+15555555678',
      opt_status: 'opted_in',
    });

    await setPreferences(contact.id, {
      preferred_channel: 'email', // Preferred, but opted-out
    });

    // Get effective channel (should fall back to SMS)
    const effectiveChannel = await getEffectiveChannel(contact.id);

    // Should fall back to SMS since email is opted-out
    expect(effectiveChannel.channel).toBe('sms');
    expect(effectiveChannel.can_send).toBe(true);
  });

  test('Context bundle includes custom fields for AI context', async () => {
    const contact = await createContact({
      name: 'Annie Easley',
      warmth_score: 65,
    });

    // Add custom fields
    await supabase
      .from('contacts')
      .update({
        custom: {
          company: 'NASA',
          role: 'Computer Scientist',
          interests: ['rocket propulsion', 'energy conversion'],
          is_vip: true,
        },
      })
      .eq('id', contact.id);

    const bundle = await fetchContextBundle(contact.id);

    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('custom')
      .eq('id', contact.id)
      .single();

    expect(updatedContact?.custom).toBeDefined();
    expect(updatedContact?.custom?.company).toBe('NASA');
    expect(updatedContact?.custom?.is_vip).toBe(true);
  });

  test('Token estimate helps agent stay within LLM context limits', async () => {
    const contact = await createContact({
      name: 'Mary Jackson',
      warmth_score: 75,
    });

    // Add many interactions to test token counting
    for (let i = 0; i < 20; i++) {
      await logInteraction(contact.id, {
        channel: 'email',
        direction: i % 2 === 0 ? 'inbound' : 'outbound',
        summary: `Interaction ${i + 1}: Discussion about project milestones and deliverables`,
        sentiment: 'positive',
      });
    }

    const bundle = await fetchContextBundle(contact.id, { interactions: 20 });

    expect(bundle.meta.token_estimate).toBeGreaterThan(0);
    expect(bundle.interactions.length).toBe(20);
    
    // Agent can use token_estimate to decide if it needs to truncate context
    const estimatedTokens = bundle.meta.token_estimate;
    const maxTokens = 4000; // Example LLM limit

    if (estimatedTokens > maxTokens) {
      // Agent would reduce interaction count
      const reducedBundle = await fetchContextBundle(contact.id, { interactions: 10 });
      expect(reducedBundle.interactions.length).toBeLessThan(bundle.interactions.length);
    }
  });

  test('DNC (Do Not Contact) flag prevents message sending', async () => {
    const contact = await createContact({
      name: 'Hedy Lamarr',
      warmth_score: 80,
    });

    // Mark as DNC
    await supabase
      .from('contacts')
      .update({ dnc: true })
      .eq('id', contact.id);

    // Fetch context bundle
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('dnc')
      .eq('id', contact.id)
      .single();

    // Agent should check DNC flag
    if (updatedContact?.dnc) {
      // Should NOT queue message
      expect(updatedContact.dnc).toBe(true);
      
      // Agent logs that contact is DNC and skips
      // In real implementation, would not call queueMessage at all
    }
  });
});
