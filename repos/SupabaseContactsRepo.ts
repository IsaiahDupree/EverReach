import { supabase } from '@/lib/supabase';
import { apiFetch, backendBase, authHeader } from '@/lib/api';
import { Person } from '@/storage/types';
import { API_ENDPOINTS, getFullUrl } from '@/constants/endpoints';
import { logInfo, logError, isCapturingLogs } from '@/helpers/diagnosticLogger';

/**
 * Supabase-backed repository for contacts/people
 * Uses both direct Supabase queries and REST API endpoints
 */
export const SupabaseContactsRepo = {
  /**
   * Fetch all contacts from backend API
   */
  async all(): Promise<Person[]> {
    try {
      const endpoint = API_ENDPOINTS.CONTACTS;
      const response = await apiFetch(`${endpoint}?limit=1000`, {
        requireAuth: true,
      });

      if (!response.ok) {
        console.error('SupabaseContactsRepo.all error:', response.status, response.statusText);
        return [];
      }

      const result = await response.json();
      // Backend returns { items: [...] }
      const contacts = result.items || result.contacts || result || [];
      
      // Map backend schema to Person type
      return contacts.map(mapSupabaseContactToPerson);
    } catch (error) {
      console.error('SupabaseContactsRepo.all failed:', error);
      // Fallback to empty array instead of crashing
      return [];
    }
  },

  /**
   * Fetch single contact by ID from backend API
   */
  async get(id: string): Promise<Person | null> {
    try {
      const endpoint = API_ENDPOINTS.CONTACT_BY_ID(id);
      const response = await apiFetch(endpoint, {
        requireAuth: true,
      });

      if (!response.ok) {
        console.error('SupabaseContactsRepo.get error:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      // Backend returns { contact: { ... } }
      const contact = result.contact || result;
      
      return contact ? mapSupabaseContactToPerson(contact) : null;
    } catch (error) {
      console.error(`SupabaseContactsRepo.get(${id}) failed:`, error);
      return null;
    }
  },

  /**
   * Create or update a contact
   */
  async upsert(person: Person): Promise<Person> {
    try {
      console.log('\n🟡 [SupabaseContactsRepo.upsert] Input person:', JSON.stringify(person, null, 2));
      
      const payload = mapPersonToSupabaseContact(person);
      
      console.log('🟡 [SupabaseContactsRepo.upsert] Mapped payload:', JSON.stringify(payload, null, 2));

      // Use REST API for upsert (better validation)
      if (person.id && person.id !== 'new') {
        // Update existing
        const response = await apiFetch(`/api/v1/contacts/${person.id}`, {
          method: 'PUT',
          requireAuth: true,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Update failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        // Backend returns { contact: { ... } }
        const updated = result.contact || result;
        return mapSupabaseContactToPerson(updated);
      } else {
        // Create new contact
        const endpoint = API_ENDPOINTS.CONTACTS;
        const fullUrl = getFullUrl(endpoint);
        const base = backendBase();
        const auth = await authHeader();
        const hasToken = !!auth.Authorization;
        const tokenPreview = hasToken ? auth.Authorization.substring(0, 30) + '...' : 'No token';
        
        // Log to console
        console.log('\n╔═══════════════════════════════════════════════════════════');
        console.log('║ 🚀 EXACT API CALL - CONTACT CREATE');
        console.log('╠═══════════════════════════════════════════════════════════');
        console.log('║ 📍 Endpoint:', endpoint);
        console.log('║ 🌐 Full URL:', fullUrl);
        console.log('║ 📤 Method: POST');
        console.log('║ 🔗 Base:', base);
        console.log('║ 📍 Path:', endpoint);
        console.log('║ 🔐 Needs Auth: true');
        console.log('║ 🎫 Has Token:', hasToken);
        console.log('║ 🎫 Token Preview:', tokenPreview);
        console.log('║ 📋 Headers:', JSON.stringify({ ...auth }));
        console.log('║ 📦 Payload (stringified for request):');
        console.log('║', JSON.stringify(payload));
        console.log('║ 📦 Payload (pretty):');
        console.log('║', JSON.stringify(payload, null, 2).split('\n').join('\n║ '));
        console.log('║');
        console.log('║ 🔍 Payload Details:');
        console.log('║   - display_name:', payload.display_name);
        console.log('║   - emails:', JSON.stringify(payload.emails));
        console.log('║   - phones:', JSON.stringify(payload.phones));
        console.log('║   - company:', payload.company);
        console.log('║   - tags:', JSON.stringify(payload.tags));
        console.log('╚═══════════════════════════════════════════════════════════\n');
        
        // Log to diagnostic logger if capturing
        if (isCapturingLogs()) {
          logInfo('🚀 EXACT API CALL - CONTACT CREATE');
          logInfo('Endpoint: ' + endpoint);
          logInfo('Full URL: ' + fullUrl);
          logInfo('Method: POST');
          logInfo('Base: ' + base);
          logInfo('Path: ' + endpoint);
          logInfo('Needs Auth: true');
          logInfo('Has Token: ' + hasToken);
          logInfo('Token Preview: ' + tokenPreview);
          logInfo('Headers: ' + JSON.stringify({ ...auth }, null, 2));
          logInfo('Payload (stringified for request):', JSON.stringify(payload));
          logInfo('Payload (pretty):', JSON.stringify(payload, null, 2));
          logInfo('Payload Details:', {
            display_name: payload.display_name,
            emails: payload.emails,
            phones: payload.phones,
            company: payload.company,
            tags: payload.tags,
          });
        }
        
        const response = await apiFetch(endpoint, {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify(payload),
        });

        console.log('\n╔═══════════════════════════════════════════════════════════');
        console.log('║ ✅ API RESPONSE - CONTACT CREATE');
        console.log('╠═══════════════════════════════════════════════════════════');
        console.log('║ ⏱️  Duration: (see above)');
        console.log('║ 📊 Status:', response.status, response.statusText);
        console.log('║ ✓ OK:', response.ok);
        console.log('╚═══════════════════════════════════════════════════════════\n');
        
        // Log response to diagnostic logger
        if (isCapturingLogs()) {
          logInfo('========== API RESPONSE ==========');
          logInfo('Status: ' + response.status + ' ' + response.statusText);
          logInfo('OK: ' + response.ok);
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('\n╔═══════════════════════════════════════════════════════════');
          console.error('║ ❌ API ERROR - CONTACT CREATE FAILED');
          console.error('╠═══════════════════════════════════════════════════════════');
          console.error('║ 📊 Status:', response.status, response.statusText);
          console.error('║ 🌐 URL:', fullUrl);
          console.error('║ 📦 Payload:', JSON.stringify(payload));
          console.error('║ 💥 Error:', errorText);
          console.error('╚═══════════════════════════════════════════════════════════\n');
          
          // Log error to diagnostic logger
          if (isCapturingLogs()) {
            logError('Unexpected error during import', {
              error: `Create failed: ${response.status} - ${response.statusText}`,
            });
            logError('Response Body: ' + errorText);
          }
          
          throw new Error(`Create failed: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[SupabaseContactsRepo] Contact created successfully:', result);
        
        // Backend returns { contact: { ... } }
        const created = result.contact || result;
        return mapSupabaseContactToPerson(created);
      }
    } catch (error) {
      console.error('SupabaseContactsRepo.upsert failed:', error);
      throw error;
    }
  },

  /**
   * Delete a contact
   */
  async remove(id: string): Promise<void> {
    try {
      const response = await apiFetch(`/api/v1/contacts/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`SupabaseContactsRepo.remove(${id}) failed:`, error);
      throw error;
    }
  },

  /**
   * Search contacts by email
   */
  async findByEmail(email: string): Promise<Person[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .contains('emails', [email]);

      if (error) throw error;

      return (data || []).map(mapSupabaseContactToPerson);
    } catch (error) {
      console.error(`SupabaseContactsRepo.findByEmail(${email}) failed:`, error);
      return [];
    }
  },

  /**
   * Search contacts by phone
   */
  async findByPhone(phone: string): Promise<Person[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .contains('phones', [phone]);

      if (error) throw error;

      return (data || []).map(mapSupabaseContactToPerson);
    } catch (error) {
      console.error(`SupabaseContactsRepo.findByPhone(${phone}) failed:`, error);
      return [];
    }
  },

  /**
   * Search contacts by query (name, company, email)
   */
  async search(query: string): Promise<Person[]> {
    try {
      const response = await apiFetch(
        `/api/v1/search?q=${encodeURIComponent(query)}`,
        { requireAuth: true }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const results = await response.json();
      return (results.contacts || []).map(mapSupabaseContactToPerson);
    } catch (error) {
      console.error(`SupabaseContactsRepo.search(${query}) failed:`, error);
      return [];
    }
  },

  /**
   * Subscribe to real-time contact updates
   */
  subscribeToChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Map Supabase contact schema to Person type
 */
function mapSupabaseContactToPerson(contact: any): Person {
  // Backend uses display_name, legacy might have name/full_name
  const displayName = contact.display_name || contact.full_name || contact.name || '';
  
  return {
    id: contact.id,
    name: displayName,
    fullName: displayName,
    emails: contact.emails || [],
    phones: contact.phones || [],
    company: contact.company || '',
    title: contact.title || '',
    tags: contact.tags || [],
    interests: contact.interests || [],
    lastInteraction: contact.last_interaction_at || contact.last_interaction || contact.updated_at,
    lastInteractionSummary: contact.last_interaction_summary || '',
    cadenceDays: contact.cadence_days || 30,
    warmth: contact.warmth || 50,
    createdAt: contact.created_at ? new Date(contact.created_at).getTime() : Date.now(),
    // Additional fields from backend (if they exist)
    ...(contact.notes && { notes: contact.notes }),
    ...(contact.avatar_url && { avatar: contact.avatar_url }),
  };
}

/**
 * Map Person type to Supabase contact schema
 */
function mapPersonToSupabaseContact(person: Person): any {
  const payload: any = {
    display_name: person.fullName || person.name,
    emails: person.emails || [],
    phones: person.phones || [],
  };

  // Only include optional fields if they have values
  if (person.company) {
    payload.company = person.company;
  }
  
  if (person.tags && person.tags.length > 0) {
    payload.tags = person.tags;
  }

  // Don't include id in create payload
  if (person.id && person.id !== 'new') {
    payload.id = person.id;
  }

  return payload;
}

export default SupabaseContactsRepo;
