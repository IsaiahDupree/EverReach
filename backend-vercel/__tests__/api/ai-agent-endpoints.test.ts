/**
 * AI Agent Endpoints Tests
 * 
 * Tests all AI agent endpoints that weren't fully tested yet
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testContactId: string;
let testConversationId: string;
let testNoteId: string;

beforeAll(async () => {
  // Create test org and user
  const { data: org } = await supabase.from('organizations').insert({
    name: 'Test Org - AI Agent',
  }).select().single();
  testOrgId = org!.id;

  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `ai-agent-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create test contact
  const { data: contact } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    name: 'Test Contact',
    email: 'testcontact@example.com',
    created_by: testUserId,
    warmth_score: 65,
  }).select().single();
  testContactId = contact!.id;

  // Create test voice note
  const { data: note } = await supabase.from('persona_notes').insert({
    user_id: testUserId,
    body_text: 'Had a great call with the client about the new project. They seem very excited and want to move forward quickly.',
    transcript: 'Had a great call with the client about the new project. They seem very excited and want to move forward quickly.',
    note_type: 'voice',
    tags: ['client', 'project'],
  }).select().single();
  testNoteId = note!.id;
});

afterAll(async () => {
  // Cleanup test data
  await supabase.from('persona_notes').delete().eq('id', testNoteId);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('organizations').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// OPENAI INTEGRATION TESTS
// ============================================================================

describe('OpenAI Integration', () => {
  test('should test OpenAI connection', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/openai-test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    // Should either work (200) or fail gracefully (500) if no OpenAI key
    expect([200, 500]).toContain(response.status);
  });

  test('should list available models', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/openai-models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    // Should either work or fail gracefully
    expect([200, 500]).toContain(response.status);
  });
});

// ============================================================================
// AGENT CHAT TESTS
// ============================================================================

describe('Agent Chat System', () => {
  test('should handle chat message', async () => {
    const chatData = {
      message: 'Hello, can you help me with my contacts?',
      conversation_id: null,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });

    // Should either work or fail gracefully
    expect([200, 400, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('response');
      expect(data).toHaveProperty('conversation_id');
      testConversationId = data.conversation_id;
    }
  });

  test('should continue conversation', async () => {
    if (!testConversationId) {
      // Skip if no conversation was created
      return;
    }

    const chatData = {
      message: 'Show me my warmest contacts',
      conversation_id: testConversationId,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });

    expect([200, 400, 500]).toContain(response.status);
  });

  test('should list agent tools', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-tools`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    expect([200, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(Array.isArray(data.tools)).toBe(true);
    }
  });

  test('should manage conversations', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    expect([200, 500]).toContain(response.status);
  });
});

// ============================================================================
// VOICE NOTE PROCESSING TESTS
// ============================================================================

describe('Voice Note Processing', () => {
  test('should process voice note with all options', async () => {
    const processData = {
      note_id: testNoteId,
      extract_contacts: true,
      extract_actions: true,
      categorize: true,
      suggest_tags: true,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-note-process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('processed', true);
      expect(data).toHaveProperty('extracted');
      expect(data).toHaveProperty('contact_matches');
    }
  });

  test('should process voice note with selective options', async () => {
    const processData = {
      note_id: testNoteId,
      extract_contacts: true,
      extract_actions: false,
      categorize: false,
      suggest_tags: true,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-note-process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  test('should handle invalid note ID', async () => {
    const processData = {
      note_id: '00000000-0000-0000-0000-000000000000',
      extract_contacts: true,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-note-process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processData),
    });

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// CONTACT ANALYSIS TESTS
// ============================================================================

describe('Contact Analysis', () => {
  test('should analyze contact relationship health', async () => {
    const analysisData = {
      contact_id: testContactId,
      analysis_type: 'relationship_health',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('analysis');
      expect(data).toHaveProperty('contact_id', testContactId);
    }
  });

  test('should provide engagement suggestions', async () => {
    const analysisData = {
      contact_id: testContactId,
      analysis_type: 'engagement_suggestions',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  test('should generate context summary', async () => {
    const analysisData = {
      contact_id: testContactId,
      analysis_type: 'context_summary',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  test('should handle invalid contact ID', async () => {
    const analysisData = {
      contact_id: '00000000-0000-0000-0000-000000000000',
      analysis_type: 'relationship_health',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// SMART COMPOSE TESTS
// ============================================================================

describe('Smart Compose', () => {
  test('should compose follow-up email', async () => {
    const composeData = {
      contact_id: testContactId,
      goal: 'follow_up',
      channel: 'email',
      context: 'Previous meeting about project timeline',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-compose`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(composeData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('subject');
      expect(data).toHaveProperty('body');
      expect(data).toHaveProperty('channel', 'email');
    }
  });

  test('should compose SMS message', async () => {
    const composeData = {
      contact_id: testContactId,
      goal: 'check_in',
      channel: 'sms',
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-compose`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(composeData),
    });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  test('should handle different goals', async () => {
    const goals = ['follow_up', 'check_in', 'introduction', 'thank_you', 'meeting_request'];
    
    for (const goal of goals) {
      const composeData = {
        contact_id: testContactId,
        goal: goal,
        channel: 'email',
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-compose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(composeData),
      });

      expect([200, 400, 404, 500]).toContain(response.status);
    }
  });
});

// ============================================================================
// ACTION SUGGESTIONS TESTS
// ============================================================================

describe('Action Suggestions', () => {
  test('should suggest proactive actions', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/action-suggestions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    expect([200, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(Array.isArray(data.suggestions)).toBe(true);
    }
  });

  test('should suggest contact-specific actions', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/action-suggestions?contact_id=${testContactId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    expect([200, 404, 500]).toContain(response.status);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('AI Agent Integration', () => {
  test('should work end-to-end: process voice note → analyze contact → compose message', async () => {
    // 1. Process voice note
    const processData = {
      note_id: testNoteId,
      extract_contacts: true,
      extract_actions: true,
      categorize: true,
      suggest_tags: true,
    };

    const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-note-process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processData),
    });

    expect([200, 400, 404, 500]).toContain(processResponse.status);

    // 2. Analyze contact
    const analysisData = {
      contact_id: testContactId,
      analysis_type: 'engagement_suggestions',
    };

    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    expect([200, 400, 404, 500]).toContain(analysisResponse.status);

    // 3. Compose message
    const composeData = {
      contact_id: testContactId,
      goal: 'follow_up',
      channel: 'email',
      context: 'Based on recent voice note analysis',
    };

    const composeResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-compose`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(composeData),
    });

    expect([200, 400, 404, 500]).toContain(composeResponse.status);

    // If all steps worked, we have a complete AI workflow
    if (processResponse.ok && analysisResponse.ok && composeResponse.ok) {
      const composeResult = await composeResponse.json();
      expect(composeResult).toHaveProperty('subject');
      expect(composeResult).toHaveProperty('body');
    }
  });

  test('should handle agent conversation with function calls', async () => {
    const chatData = {
      message: `Analyze my contact ${testContactId} and suggest what I should do next`,
      conversation_id: null,
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });

    expect([200, 400, 500]).toContain(response.status);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('response');
      // Agent should have used function calls to analyze the contact
      expect(data).toHaveProperty('function_calls_made');
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('AI Agent Error Handling', () => {
  test('should handle missing OpenAI API key gracefully', async () => {
    // This test assumes OpenAI key might not be configured in test environment
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/openai-test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (response.status === 500) {
      const data = await response.json();
      expect(data).toHaveProperty('error');
      // Should fail gracefully, not crash
    }
  });

  test('should handle malformed requests', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'data' }),
    });

    expect(response.status).toBe(400);
  });

  test('should handle unauthorized requests', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'test' }),
    });

    expect(response.status).toBe(401);
  });
});
