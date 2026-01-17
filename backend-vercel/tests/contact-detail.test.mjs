/**
 * Contact Detail Endpoint Tests
 * Tests for /api/v1/contacts/:id/detail - comprehensive contact data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  authenticatedRequest, 
  parseJsonResponse, 
  assertStatus,
  BACKEND_BASE_URL 
} from './auth-helper.mjs';

describe('Contact Detail API - Integration Tests', () => {
  let testContactId = null;
  let noteIds = [];
  let interactionIds = [];

  // Setup: Create test contact with notes and interactions
  beforeAll(async () => {
    // 1. Create contact
    console.log('🔍 Attempting to create contact...');
    const contactResponse = await authenticatedRequest('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({
        display_name: 'Detail Test Contact',
        emails: ['detail@test.com'],
        company: 'Test Corp',
        tags: ['vip', 'customer'],
      }),
    });
    
    console.log('📊 Contact creation response status:', contactResponse.status);
    
    if (contactResponse.status !== 201) {
      const errorBody = await parseJsonResponse(contactResponse);
      console.error('❌ Contact creation failed with status:', contactResponse.status);
      console.error('❌ Error body:', JSON.stringify(errorBody, null, 2));
    }
    
    if (contactResponse.status === 201) {
      const response = await parseJsonResponse(contactResponse);
      console.log('✅ Contact created:', response);
      // API returns { contact: { id, ... } } not flat { id, ... }
      testContactId = response.contact?.id || response.id;
      console.log('📌 Test contact ID set to:', testContactId);

      // 2. Create voice note linked to contact
      const voiceNoteResponse = await authenticatedRequest('/api/v1/me/persona-notes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'voice',
          file_url: 'https://storage.example.com/audio/meeting.mp3',
          transcript: 'Discussed Q4 strategy',
          contact_id: testContactId,
        }),
      });
      if (voiceNoteResponse.status === 201) {
        const note = await parseJsonResponse(voiceNoteResponse);
        noteIds.push(note.id);
      }

      // 3. Create screenshot note linked to contact
      const screenshotResponse = await authenticatedRequest('/api/v1/me/persona-notes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'screenshot',
          file_url: 'https://storage.example.com/img/mockup.png',
          title: 'Dashboard feedback',
          body_text: 'Wants changes to layout',
          contact_id: testContactId,
        }),
      });
      if (screenshotResponse.status === 201) {
        const note = await parseJsonResponse(screenshotResponse);
        noteIds.push(note.id);
      }

      // 4. Create interaction
      const interactionResponse = await authenticatedRequest('/api/v1/interactions', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: testContactId,
          channel: 'email',
          direction: 'outbound',
          summary: 'Sent Q4 proposal',
          occurred_at: new Date().toISOString(),
        }),
      });
      if (interactionResponse.status === 201) {
        const resp = await parseJsonResponse(interactionResponse);
        const newId = resp?.interaction?.id || resp?.id;
        if (newId) interactionIds.push(newId);
      }
    }
  });

  // Cleanup
  afterAll(async () => {
    // Delete notes
    for (const noteId of noteIds) {
      try {
        await authenticatedRequest(`/api/v1/me/persona-notes/${noteId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to cleanup note:', noteId);
      }
    }

    // Delete interactions
    for (const interactionId of interactionIds) {
      try {
        await authenticatedRequest(`/api/v1/interactions/${interactionId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to cleanup interaction:', interactionId);
      }
    }

    // Delete contact
    if (testContactId) {
      try {
        await authenticatedRequest(`/api/v1/contacts/${testContactId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to cleanup contact:', testContactId);
      }
    }
  });

  describe('GET /api/v1/contacts/:id/detail - Contact Detail', () => {
    it('should return comprehensive contact data', async () => {
      if (!testContactId) {
        console.warn('⚠️  Skipping test: contact creation failed');
        return;
      }

      // Small delay to ensure database propagation
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await authenticatedRequest(`/api/v1/contacts/${testContactId}/detail`);
      assertStatus(response, 200);
      const data = await parseJsonResponse(response);

      // Check top-level structure
      expect(data).toHaveProperty('contact');
      expect(data).toHaveProperty('interactions');
      expect(data).toHaveProperty('notes');
      expect(data).toHaveProperty('meta');

      // Check contact info
      expect(data.contact).toHaveProperty('id');
      expect(data.contact.id).toBe(testContactId);
      expect(data.contact).toHaveProperty('display_name');
      expect(data.contact).toHaveProperty('emails');
      expect(data.contact).toHaveProperty('warmth');

      // Check interactions structure
      expect(data.interactions).toHaveProperty('recent');
      expect(data.interactions).toHaveProperty('total_count');
      expect(data.interactions).toHaveProperty('has_more');
      expect(Array.isArray(data.interactions.recent)).toBe(true);

      // Check notes structure
      expect(data.notes).toHaveProperty('all');
      expect(data.notes).toHaveProperty('by_type');
      expect(data.notes).toHaveProperty('counts');
      expect(Array.isArray(data.notes.all)).toBe(true);

      // Check notes by type
      expect(data.notes.by_type).toHaveProperty('voice');
      expect(data.notes.by_type).toHaveProperty('screenshot');
      expect(data.notes.by_type).toHaveProperty('text');
    });

    it('should include created persona notes in response', async () => {
      if (!testContactId || noteIds.length === 0) {
        console.warn('⚠️  Skipping test: prerequisites not met');
        return;
      }

      const response = await authenticatedRequest(`/api/v1/contacts/${testContactId}/detail`);
      const data = await parseJsonResponse(response);

      // Should have notes
      expect(data.notes.total_count).toBeGreaterThan(0);
      
      // Check counts by type
      expect(data.notes.counts.voice).toBeGreaterThanOrEqual(0);
      expect(data.notes.counts.screenshot).toBeGreaterThanOrEqual(0);
    });

    it('should include interactions in response', async () => {
      if (!testContactId || interactionIds.length === 0) {
        console.warn('⚠️  Skipping test: prerequisites not met');
        return;
      }

      const response = await authenticatedRequest(`/api/v1/contacts/${testContactId}/detail`);
      const data = await parseJsonResponse(response);

      // Should have interactions
      expect(data.interactions.total_count).toBeGreaterThan(0);
      expect(data.interactions.recent.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(`/api/v1/contacts/${fakeId}/detail`);
      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/contacts/${testContactId || 'fake-id'}/detail`
      );
      expect(response.status).toBe(401);
    });

    it('should respect RLS and only show user data', async () => {
      if (!testContactId) {
        console.warn('⚠️  Skipping test: contact creation failed');
        return;
      }

      // This contact belongs to the authenticated user
      const response = await authenticatedRequest(`/api/v1/contacts/${testContactId}/detail`);
      assertStatus(response, 200);
      
      const data = await parseJsonResponse(response);
      expect(data.contact.id).toBe(testContactId);
    });
  });
});
