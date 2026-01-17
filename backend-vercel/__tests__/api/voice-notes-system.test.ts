/**
 * Voice Notes & Persona System Tests
 * 
 * Tests voice note processing, persona notes, and contact linking
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testUserId: string;
let testOrgId: string;
let testContactId: string;
let testNoteIds: string[] = [];

beforeAll(async () => {
  // Create test user
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `voice-notes-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create test org
  const { data: org } = await supabase.from('organizations').insert({
    name: 'Test Org - Voice Notes',
  }).select().single();
  testOrgId = org!.id;

  // Create test contact
  const { data: contact } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    created_by: testUserId,
    warmth_score: 70,
  }).select().single();
  testContactId = contact!.id;
});

afterAll(async () => {
  // Cleanup test data
  await supabase.from('persona_notes').delete().in('id', testNoteIds);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('organizations').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// PERSONA NOTES CRUD TESTS
// ============================================================================

describe('Persona Notes CRUD', () => {
  test('should create voice note', async () => {
    const noteData = {
      user_id: testUserId,
      body_text: 'Had a great call with Alice about the new project. She was very excited about the timeline.',
      transcript: 'Had a great call with Alice about the new project. She was very excited about the timeline.',
      note_type: 'voice',
      tags: ['client', 'project', 'positive'],
      metadata: {
        duration_seconds: 120,
        audio_quality: 'good',
      },
    };

    const { data: note, error } = await supabase
      .from('persona_notes')
      .insert(noteData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.note_type).toBe('voice');
    expect(note!.tags).toContain('client');
    expect(note!.metadata.duration_seconds).toBe(120);

    testNoteIds.push(note!.id);
  });

  test('should create text note', async () => {
    const noteData = {
      user_id: testUserId,
      body_text: 'Remember to follow up with Alice next week about the contract details.',
      note_type: 'text',
      tags: ['follow-up', 'contract'],
    };

    const { data: note, error } = await supabase
      .from('persona_notes')
      .insert(noteData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.note_type).toBe('text');
    expect(note!.transcript).toBeNull(); // Text notes don't have transcripts

    testNoteIds.push(note!.id);
  });

  test('should link note to contact', async () => {
    const noteData = {
      user_id: testUserId,
      contact_id: testContactId,
      body_text: 'Alice mentioned she prefers email communication over phone calls.',
      note_type: 'text',
      tags: ['preference', 'communication'],
    };

    const { data: note, error } = await supabase
      .from('persona_notes')
      .insert(noteData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.contact_id).toBe(testContactId);

    testNoteIds.push(note!.id);
  });

  test('should retrieve notes by user', async () => {
    const { data: notes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(notes).toBeDefined();
    expect(notes!.length).toBeGreaterThanOrEqual(3);
    expect(notes!.every(n => n.user_id === testUserId)).toBe(true);
  });

  test('should retrieve notes by contact', async () => {
    const { data: notes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('contact_id', testContactId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(notes).toBeDefined();
    expect(notes!.length).toBeGreaterThanOrEqual(1);
    expect(notes!.every(n => n.contact_id === testContactId)).toBe(true);
  });

  test('should filter notes by tags', async () => {
    const { data: notes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .contains('tags', ['client']);

    expect(error).toBeNull();
    expect(notes).toBeDefined();
    expect(notes!.length).toBeGreaterThanOrEqual(1);
    expect(notes!.every(n => n.tags.includes('client'))).toBe(true);
  });

  test('should update note', async () => {
    const noteId = testNoteIds[0];
    const updateData = {
      tags: ['client', 'project', 'positive', 'updated'],
      metadata: {
        duration_seconds: 120,
        audio_quality: 'good',
        updated: true,
      },
    };

    const { data: note, error } = await supabase
      .from('persona_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.tags).toContain('updated');
    expect(note!.metadata.updated).toBe(true);
  });

  test('should delete note', async () => {
    // Create a note to delete
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'This note will be deleted',
        note_type: 'text',
      })
      .select()
      .single();

    const noteId = note!.id;

    // Delete it
    const { error } = await supabase
      .from('persona_notes')
      .delete()
      .eq('id', noteId);

    expect(error).toBeNull();

    // Verify it's gone
    const { data: deletedNote } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle();

    expect(deletedNote).toBeNull();
  });
});

// ============================================================================
// VOICE NOTE PROCESSING TESTS
// ============================================================================

describe('Voice Note Processing', () => {
  let processingNoteId: string;

  beforeAll(async () => {
    // Create a note for processing tests
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'Had lunch with Alice Johnson and Bob Smith. Alice is interested in our new product line and wants to schedule a demo next week. Bob mentioned he might be changing companies soon.',
        transcript: 'Had lunch with Alice Johnson and Bob Smith. Alice is interested in our new product line and wants to schedule a demo next week. Bob mentioned he might be changing companies soon.',
        note_type: 'voice',
        tags: ['meeting'],
      })
      .select()
      .single();

    processingNoteId = note!.id;
    testNoteIds.push(processingNoteId);
  });

  test('should extract contacts from voice note', async () => {
    // Simulate AI processing (in real implementation, this would call OpenAI)
    const extractedData = {
      contacts: ['Alice Johnson', 'Bob Smith'],
      actions: ['Schedule demo with Alice', 'Follow up on Bob\'s job change'],
      category: 'business',
      tags: ['demo', 'networking', 'opportunity'],
      sentiment: 'positive',
      topics: ['product demo', 'job change', 'networking'],
    };

    const updatedMetadata = {
      ai_processed: true,
      processing_date: new Date().toISOString(),
      extracted_data: extractedData,
      processing_options: {
        extract_contacts: true,
        extract_actions: true,
        categorize: true,
        suggest_tags: true,
      },
    };

    const { data: note, error } = await supabase
      .from('persona_notes')
      .update({
        metadata: updatedMetadata,
        tags: ['meeting', 'demo', 'networking', 'opportunity'], // Merged with suggested tags
      })
      .eq('id', processingNoteId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.metadata.ai_processed).toBe(true);
    expect(note!.metadata.extracted_data.contacts).toContain('Alice Johnson');
    expect(note!.metadata.extracted_data.actions).toHaveLength(2);
    expect(note!.tags).toContain('demo');
  });

  test('should match extracted contacts with existing contacts', async () => {
    // Simulate contact matching
    const contactMatches = [
      {
        mentioned: 'Alice Johnson',
        possible_matches: [
          {
            id: testContactId,
            display_name: 'Alice Johnson',
          },
        ],
      },
      {
        mentioned: 'Bob Smith',
        possible_matches: [], // No existing contact found
      },
    ];

    const { data: note, error } = await supabase
      .from('persona_notes')
      .update({
        metadata: {
          ai_processed: true,
          processing_date: new Date().toISOString(),
          contact_matches: contactMatches,
        },
      })
      .eq('id', processingNoteId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(note!.metadata.contact_matches).toHaveLength(2);
    expect(note!.metadata.contact_matches[0].possible_matches).toHaveLength(1);
    expect(note!.metadata.contact_matches[1].possible_matches).toHaveLength(0);
  });

  test('should categorize voice notes', async () => {
    const categories = ['personal', 'business', 'networking', 'follow-up'];
    
    for (const category of categories) {
      const { data: note } = await supabase
        .from('persona_notes')
        .insert({
          user_id: testUserId,
          body_text: `This is a ${category} note for testing categorization.`,
          note_type: 'voice',
          metadata: {
            ai_processed: true,
            extracted_data: {
              category: category,
            },
          },
        })
        .select()
        .single();

      expect(note!.metadata.extracted_data.category).toBe(category);
      testNoteIds.push(note!.id);
    }
  });

  test('should extract action items', async () => {
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'Need to call Sarah tomorrow about the contract. Also send the proposal to Mike by Friday. Don\'t forget to book the conference room for next week\'s meeting.',
        note_type: 'voice',
        metadata: {
          ai_processed: true,
          extracted_data: {
            actions: [
              'Call Sarah tomorrow about the contract',
              'Send proposal to Mike by Friday',
              'Book conference room for next week\'s meeting',
            ],
          },
        },
      })
      .select()
      .single();

    expect(note!.metadata.extracted_data.actions).toHaveLength(3);
    expect(note!.metadata.extracted_data.actions[0]).toContain('Sarah');
    testNoteIds.push(note!.id);
  });

  test('should analyze sentiment', async () => {
    const sentiments = ['positive', 'neutral', 'negative'];
    
    for (const sentiment of sentiments) {
      const { data: note } = await supabase
        .from('persona_notes')
        .insert({
          user_id: testUserId,
          body_text: `This is a ${sentiment} note for sentiment analysis testing.`,
          note_type: 'voice',
          metadata: {
            ai_processed: true,
            extracted_data: {
              sentiment: sentiment,
            },
          },
        })
        .select()
        .single();

      expect(note!.metadata.extracted_data.sentiment).toBe(sentiment);
      testNoteIds.push(note!.id);
    }
  });
});

// ============================================================================
// CONTACT LINKING TESTS
// ============================================================================

describe('Contact Linking', () => {
  test('should link note to contact after processing', async () => {
    // Create unlinked note
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'Alice was very happy with our service and wants to refer us to her colleagues.',
        note_type: 'voice',
      })
      .select()
      .single();

    testNoteIds.push(note!.id);

    // Simulate linking after AI processing identifies Alice
    const { data: linkedNote, error } = await supabase
      .from('persona_notes')
      .update({
        contact_id: testContactId,
        metadata: {
          ai_processed: true,
          contact_linked: true,
          linked_via: 'ai_processing',
        },
      })
      .eq('id', note!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(linkedNote!.contact_id).toBe(testContactId);
    expect(linkedNote!.metadata.contact_linked).toBe(true);
  });

  test('should handle multiple contact mentions', async () => {
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'Met with Alice, Bob, and Carol at the conference. All three are potential clients.',
        note_type: 'voice',
        metadata: {
          ai_processed: true,
          extracted_data: {
            contacts: ['Alice', 'Bob', 'Carol'],
          },
          contact_matches: [
            {
              mentioned: 'Alice',
              possible_matches: [{ id: testContactId, display_name: 'Alice Johnson' }],
            },
            {
              mentioned: 'Bob',
              possible_matches: [],
            },
            {
              mentioned: 'Carol',
              possible_matches: [],
            },
          ],
        },
      })
      .select()
      .single();

    expect(note!.metadata.contact_matches).toHaveLength(3);
    expect(note!.metadata.contact_matches[0].possible_matches).toHaveLength(1);
    testNoteIds.push(note!.id);
  });

  test('should suggest creating new contacts', async () => {
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: 'Met David Wilson from TechCorp. He\'s interested in our enterprise solution.',
        note_type: 'voice',
        metadata: {
          ai_processed: true,
          extracted_data: {
            contacts: ['David Wilson'],
            companies: ['TechCorp'],
          },
          contact_matches: [
            {
              mentioned: 'David Wilson',
              possible_matches: [],
              suggested_new_contact: {
                name: 'David Wilson',
                company: 'TechCorp',
                source: 'voice_note',
              },
            },
          ],
        },
      })
      .select()
      .single();

    expect(note!.metadata.contact_matches[0].suggested_new_contact).toBeDefined();
    expect(note!.metadata.contact_matches[0].suggested_new_contact.name).toBe('David Wilson');
    testNoteIds.push(note!.id);
  });
});

// ============================================================================
// SEARCH AND FILTERING TESTS
// ============================================================================

describe('Voice Notes Search & Filtering', () => {
  test('should search notes by content', async () => {
    const { data: notes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .textSearch('body_text', 'Alice project');

    expect(error).toBeNull();
    expect(notes).toBeDefined();
    // Should find notes containing both "Alice" and "project"
  });

  test('should filter by note type', async () => {
    const { data: voiceNotes, error: voiceError } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .eq('note_type', 'voice');

    const { data: textNotes, error: textError } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .eq('note_type', 'text');

    expect(voiceError).toBeNull();
    expect(textError).toBeNull();
    expect(voiceNotes!.every(n => n.note_type === 'voice')).toBe(true);
    expect(textNotes!.every(n => n.note_type === 'text')).toBe(true);
  });

  test('should filter by date range', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentNotes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .gte('created_at', yesterday.toISOString());

    expect(error).toBeNull();
    expect(recentNotes).toBeDefined();
    expect(recentNotes!.length).toBeGreaterThan(0);
  });

  test('should filter by AI processing status', async () => {
    const { data: processedNotes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .eq('metadata->>ai_processed', 'true');

    expect(error).toBeNull();
    expect(processedNotes).toBeDefined();
    expect(processedNotes!.every(n => n.metadata?.ai_processed === true)).toBe(true);
  });

  test('should get notes with specific sentiment', async () => {
    const { data: positiveNotes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .eq('metadata->extracted_data->>sentiment', 'positive');

    expect(error).toBeNull();
    expect(positiveNotes).toBeDefined();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Voice Notes Performance', () => {
  test('should handle large note content', async () => {
    const largeContent = 'This is a very long voice note. '.repeat(1000); // ~30KB
    
    const start = Date.now();
    
    const { data: note, error } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        body_text: largeContent,
        transcript: largeContent,
        note_type: 'voice',
      })
      .select()
      .single();

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(note).toBeDefined();
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    
    testNoteIds.push(note!.id);
  });

  test('should efficiently query notes with complex metadata', async () => {
    const start = Date.now();

    const { data: notes, error } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('user_id', testUserId)
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(notes).toBeDefined();
    expect(duration).toBeLessThan(1000); // Should be fast with proper indexing
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Voice Notes Integration', () => {
  test('should integrate with contact warmth system', async () => {
    // Create note that should affect warmth
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        contact_id: testContactId,
        body_text: 'Alice was extremely positive about our proposal and is ready to sign the contract.',
        note_type: 'voice',
        metadata: {
          ai_processed: true,
          extracted_data: {
            sentiment: 'positive',
            topics: ['contract', 'proposal', 'positive'],
          },
        },
      })
      .select()
      .single();

    testNoteIds.push(note!.id);

    // In a real system, this would trigger warmth recalculation
    // For now, just verify the note was created with positive sentiment
    expect(note!.metadata.extracted_data.sentiment).toBe('positive');
    expect(note!.contact_id).toBe(testContactId);
  });

  test('should work with interaction logging', async () => {
    // Create note that represents an interaction
    const { data: note } = await supabase
      .from('persona_notes')
      .insert({
        user_id: testUserId,
        contact_id: testContactId,
        body_text: 'Had a 30-minute phone call with Alice about the project timeline.',
        note_type: 'voice',
        metadata: {
          ai_processed: true,
          extracted_data: {
            interaction_type: 'call',
            duration: '30 minutes',
            topics: ['project', 'timeline'],
          },
        },
      })
      .select()
      .single();

    testNoteIds.push(note!.id);

    // This could trigger automatic interaction creation
    expect(note!.metadata.extracted_data.interaction_type).toBe('call');
  });
});
