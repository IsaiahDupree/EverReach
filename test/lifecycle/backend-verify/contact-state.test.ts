/**
 * Backend State Verification for Contact Lifecycle
 * 
 * Run AFTER Maestro UI tests to verify backend consistency
 * 
 * Usage:
 * 1. Run Maestro: maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml
 * 2. Extract contact ID from UI/logs
 * 3. Set env: $env:LIFECYCLE_CONTACT_ID = "uuid-here"
 * 4. Run this: npm test -- test/lifecycle/backend-verify/contact-state.test.ts
 */

import { getAccessToken, apiFetch, retry } from '../../backend/helpers';

describe('Lifecycle: Backend State Verification', () => {
  let token: string;
  const contactId = process.env.LIFECYCLE_CONTACT_ID || '';

  beforeAll(async () => {
    token = await getAccessToken();
    
    if (!contactId) {
      console.warn('⚠️  LIFECYCLE_CONTACT_ID not set. Skipping verification tests.');
      console.warn('   Run Maestro test first and extract contact ID.');
    }
  }, 30000);

  describe('Stage 1: CREATE', () => {
    it('Contact exists in database', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      expect(json.contact).toBeTruthy();
      expect(json.contact.id).toBe(contactId);
      expect(json.contact.display_name).toContain('Lifecycle');
    });

    it('Default warmth is set', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      expect(json.contact.warmth).toBeGreaterThanOrEqual(40);
      expect(json.contact.warmth).toBeLessThanOrEqual(40);
    });

    it('No interactions exist initially', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}/messages`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.items || []).toHaveLength(0);
    });

    it('last_interaction_at is null initially', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      expect(json.contact.last_interaction_at).toBeNull();
    });
  });

  describe('Stage 3: UPDATE', () => {
    it('Updated fields are persisted', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      
      // Company should be updated
      expect(json.contact.company).toBe('Lifecycle Test Corp');
      
      // Tags should include lifecycle test tags
      expect(json.contact.tags).toContain('lifecycle');
      expect(json.contact.tags).toContain('vip');
    });

    it('updated_at timestamp is recent', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      const updatedAt = new Date(json.contact.updated_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - updatedAt.getTime()) / 1000;
      
      // Should be updated within last 5 minutes
      expect(diffSeconds).toBeLessThan(300);
    });
  });

  describe('Stage 4: NOTE', () => {
    it('Note is accessible via API', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}/notes`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const lifecycleNote = json.find((n: any) => 
        n.content?.includes('Initial contact') || 
        n.content?.includes('virtual conference')
      );
      
      expect(lifecycleNote).toBeTruthy();
    });
  });

  describe('Stage 5: INTERACT', () => {
    it('last_interaction_at is updated after interaction', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      expect(json.contact.last_interaction_at).toBeTruthy();
      
      const lastInteraction = new Date(json.contact.last_interaction_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastInteraction.getTime()) / 1000;
      
      // Should be within last 5 minutes
      expect(diffSeconds).toBeLessThan(300);
    });

    it('Warmth increased after interaction', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      
      // After logging interaction, warmth should be > 40 (default)
      expect(json.contact.warmth).toBeGreaterThan(40);
      console.log(`   Warmth after interaction: ${json.contact.warmth}`);
    });

    it('Interaction appears in timeline', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}/messages`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const interaction = json.items?.find((item: any) => 
        item.type === 'interaction' || 
        item.payload?.summary?.includes('Discussed product')
      );
      
      expect(interaction).toBeTruthy();
    });
  });

  describe('Stage 6: MESSAGE', () => {
    it('Draft message is saved', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}/messages`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const draft = json.items?.find((item: any) => 
        item.type === 'message' && 
        item.payload?.metadata?.subject?.includes('Follow-up')
      );
      
      expect(draft).toBeTruthy();
    });
  });

  describe('Stage 8: SEARCH', () => {
    it('Contact findable via search endpoint', async () => {
      if (!contactId) return;

      const res = await apiFetch('/api/v1/contacts?q=Lifecycle&limit=50', {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const found = json.items.find((c: any) => c.id === contactId);
      expect(found).toBeTruthy();
    });
  });

  describe('Stage 10: TAG FILTER', () => {
    it('Contact findable via tag filter', async () => {
      if (!contactId) return;

      const res = await apiFetch('/api/v1/contacts?tag=vip&limit=50', {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const found = json.items.find((c: any) => c.id === contactId);
      expect(found).toBeTruthy();
    });
  });

  describe('Stage 11: CONTEXT', () => {
    it('Context summary endpoint accessible', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}/context-summary`, {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      expect(json.warmth).toBeDefined();
      expect(json.last_contact_delta_days).toBeDefined();
      expect(json.interaction_count).toBeGreaterThan(0);
    });
  });

  describe('Stage 12: ARCHIVE', () => {
    it('Contact is soft-deleted', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      
      // Should either return 404 or have deleted_at set
      if (res.status === 404) {
        expect(true).toBe(true); // Archived and hidden
      } else {
        expect(json.contact.deleted_at).toBeTruthy();
      }
    });

    it('Contact not in default list after archive', async () => {
      if (!contactId) return;

      const res = await apiFetch('/api/v1/contacts?limit=100', {
        method: 'GET',
        token,
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      
      const found = json.items.find((c: any) => c.id === contactId);
      expect(found).toBeFalsy();
    });
  });

  describe('Lifecycle Metrics', () => {
    it('Generates lifecycle summary report', async () => {
      if (!contactId) return;

      const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
        method: 'GET',
        token,
      });

      const json = await res.json();
      
      console.log('\n📊 Contact Lifecycle Summary:');
      console.log(`   ID: ${contactId}`);
      console.log(`   Name: ${json.contact?.display_name || 'N/A'}`);
      console.log(`   Company: ${json.contact?.company || 'N/A'}`);
      console.log(`   Warmth: ${json.contact?.warmth || 0} (${json.contact?.warmth_band || 'unknown'})`);
      console.log(`   Tags: ${json.contact?.tags?.join(', ') || 'none'}`);
      console.log(`   Last Interaction: ${json.contact?.last_interaction_at || 'never'}`);
      console.log(`   Created: ${json.contact?.created_at}`);
      console.log(`   Updated: ${json.contact?.updated_at}`);
      console.log(`   Deleted: ${json.contact?.deleted_at || 'active'}`);
    });
  });
});
