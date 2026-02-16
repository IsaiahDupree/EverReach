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
      console.log('[SupabaseContactsRepo.all] Fetching contacts from:', endpoint);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await apiFetch(`${endpoint}?limit=100`, {
          requireAuth: true,
          signal: controller.signal,
          noDedupe: true, // ensure fresh list after recompute (bypass 3s GET cache)
        });

        clearTimeout(timeoutId);

        console.log('[SupabaseContactsRepo.all] Response status:', response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error');
          console.warn('[SupabaseContactsRepo.all] API error:', response.status, response.statusText);
          console.warn('[SupabaseContactsRepo.all] Error details:', errorText);
          
          // Return empty array for any error to prevent UI from getting stuck
          // The user will see an empty list, which is better than a stuck loading state
          return [];
        }

        const result = await response.json();
        console.log('[SupabaseContactsRepo.all] Response data:', result);

        // Backend returns { items: [...] }
        const contacts = result.items || result.contacts || result || [];
        console.log('[SupabaseContactsRepo.all] Found', contacts.length, 'contacts');

        // Map backend schema to Person type
        return contacts.map(mapSupabaseContactToPerson);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Handle specific error types
        if (fetchError.name === 'AbortError') {
          console.log('[SupabaseContactsRepo.all] Request timeout after 10 seconds - returning cached/empty data');
          // Don't throw on timeout - return empty array gracefully
          return [];
        }

        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          console.warn('[SupabaseContactsRepo.all] Network error - cannot reach backend');
          console.warn('Backend URL:', endpoint);
          console.warn('Returning empty array - check connection');
          // Don't throw on network error - return empty array gracefully
          return [];
        }

        throw fetchError;
      }
    } catch (error: any) {
      console.error('SupabaseContactsRepo.all failed:', error);
      // Return empty array instead of throwing to prevent UI from getting stuck
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
      console.log('🟡 [SupabaseContactsRepo.upsert] warmth_mode in person:', person.warmth_mode);
      console.log('🟡 [SupabaseContactsRepo.upsert] warmth_mode in payload:', payload.warmth_mode);

      // Use REST API for upsert (better validation)
      if (person.id && person.id !== 'new') {
        // Update existing
        let response = await apiFetch(`/api/v1/contacts/${person.id}`, {
          method: 'PATCH',
          requireAuth: true,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          response = await apiFetch(`/api/v1/contacts/${person.id}`, {
            method: 'PUT',
            requireAuth: true,
            body: JSON.stringify(payload),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Update failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        // Backend may return partial contact
        const updated = result.contact || result;
        // Fetch full contact to ensure all fields (tags/interests/custom_fields) are present
        try {
          const full = await SupabaseContactsRepo.get(updated.id);
          if (full) {
            return mergePersonSafe(person, full);
          }
        } catch { }
        return mergePersonSafe(person, mapSupabaseContactToPerson(updated));
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

        // Backend may return minimal object; fetch full contact to hydrate
        const created = result.contact || result;
        try {
          const full = await SupabaseContactsRepo.get(created.id);
          if (full) {
            return mergePersonSafe(person, full);
          }
        } catch { }
        return mergePersonSafe(person, mapSupabaseContactToPerson(created));
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
      const response = await apiFetch(
        API_ENDPOINTS.SEARCH,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ q: email, limit: 100 })
        }
      );

      if (!response.ok) {
        console.error('SupabaseContactsRepo.findByEmail error:', response.status, response.statusText);
        return [];
      }

      const results = await response.json();
      const contacts = results.items || results.contacts || [];
      return contacts
        .filter((c: any) => c.emails?.includes(email))
        .map(mapSupabaseContactToPerson);
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
      const response = await apiFetch(
        API_ENDPOINTS.SEARCH,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ q: phone, limit: 100 })
        }
      );

      if (!response.ok) {
        console.error('SupabaseContactsRepo.findByPhone error:', response.status, response.statusText);
        return [];
      }

      const results = await response.json();
      const contacts = results.items || results.contacts || [];
      return contacts
        .filter((c: any) => c.phones?.includes(phone))
        .map(mapSupabaseContactToPerson);
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
        API_ENDPOINTS.SEARCH,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ q: query, limit: 100 })
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const results = await response.json();
      return (results.items || results.contacts || []).map(mapSupabaseContactToPerson);
    } catch (error) {
      console.error(`SupabaseContactsRepo.search(${query}) failed:`, error);
      return [];
    }
  },

  /**
   * Subscribe to real-time contact updates
   */
  subscribeToChanges(callback: (payload: any) => void) {
    if (!supabase) {
      console.log('[SupabaseContactsRepo] Supabase not available, skipping real-time subscription');
      return () => { };
    }

    try {
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
    } catch (error) {
      console.error('[SupabaseContactsRepo] Failed to subscribe to changes:', error);
      return () => { };
    }
  },
};

/**
 * Map Supabase contact schema to Person type
 */
function mapSupabaseContactToPerson(contact: any): Person {
  // DEBUG: Log avatar fields to trace issue
  if (contact.id) {
    console.log(`[mapSupabaseContactToPerson] Contact ${contact.id}: photo_url =`, contact.photo_url, 'avatar_url =', contact.avatar_url);
  }

  // Backend uses display_name, legacy might have name/full_name
  const displayName = contact.display_name || contact.full_name || contact.name || '';

  // Normalize custom fields from various backend shapes
  let customFields: Array<{ key: string; value: string }> | undefined;
  if (Array.isArray(contact.custom_fields)) {
    customFields = contact.custom_fields
      .map((it: any) => ({ key: it?.key || it?.slug || it?.name, value: String(it?.value ?? '') }))
      .filter((f: any) => typeof f.key === 'string' && f.key.length > 0);
  } else if (contact.custom_fields && typeof contact.custom_fields === 'object') {
    customFields = Object.entries(contact.custom_fields).map(([key, value]) => ({ key, value: String(value ?? '') }));
  } else if (Array.isArray(contact.customFields)) {
    customFields = contact.customFields
      .map((it: any) => ({ key: it?.key, value: String(it?.value ?? '') }))
      .filter((f: any) => typeof f.key === 'string' && f.key.length > 0);
  }

  return {
    id: contact.id,
    name: displayName,
    fullName: displayName,
    emails: contact.emails,
    phones: contact.phones,
    company: contact.company,
    title: contact.title,
    tags: contact.tags,
    interests: contact.interests,
    lastInteraction: contact.last_interaction_at || contact.last_interaction || contact.updated_at,
    lastInteractionSummary: contact.last_interaction_summary || '',
    cadenceDays: contact.cadence_days || 30,
    warmth: contact.warmth ?? 0,
    warmth_mode: contact.warmth_mode || 'medium',
    createdAt: contact.created_at ? new Date(contact.created_at).getTime() : Date.now(),
    photo_url: contact.photo_url || undefined, // New: user-uploaded photos
    avatarUrl: contact.avatar_url || undefined, // Legacy: external avatar URLs
    // Additional fields from backend (if they exist)
    ...(contact.notes && { notes: contact.notes }),
    ...(customFields && customFields.length > 0 ? { customFields } : {}),
  };
}

/**
 * Map Person type to Supabase contact schema
 */
function mapPersonToSupabaseContact(person: Person): any {
  const payload: any = {
    display_name: person.fullName || person.name,
  };

  // Only include optional fields if they have values
  if (person.company) {
    payload.company = person.company;
  }
  if (person.title) {
    payload.title = person.title;
  }

  if (person.emails && person.emails.length > 0) {
    payload.emails = person.emails;
  }

  if (person.phones && person.phones.length > 0) {
    payload.phones = person.phones;
  }

  if (person.tags && person.tags.length > 0) {
    payload.tags = person.tags;
  }

  if (person.interests && person.interests.length > 0) {
    payload.interests = person.interests;
  }

  if (person.customFields && person.customFields.length > 0) {
    // Convert array of { key, value } to backend shape (object map)
    const obj: Record<string, any> = {};
    for (const cf of person.customFields) {
      if (!cf || typeof cf.key !== 'string' || cf.key.length === 0) continue;
      obj[cf.key] = cf.value;
    }
    payload.custom_fields = obj;
  }

  // Don't include id in create payload
  if (person.id && person.id !== 'new') {
    payload.id = person.id;
  }

  // Include avatar_url if present
  if (person.avatarUrl) {
    payload.avatar_url = person.avatarUrl;
  }

  // Include warmth_mode if present
  if (person.warmth_mode) {
    payload.warmth_mode = person.warmth_mode;
  }

  return payload;
}

// Safely merge server person into local person, preserving local fields when server omits them
function mergePersonSafe(local: Person, server: Person): Person {
  const pickArray = <T>(a?: T[], b?: T[]) => (Array.isArray(b) && b.length ? b : a);
  return {
    ...local,
    ...server,
    fullName: server.fullName || local.fullName,
    name: server.name || local.name,
    company: server.company ?? local.company,
    title: server.title ?? local.title,
    emails: pickArray(local.emails, server.emails),
    phones: pickArray(local.phones, server.phones),
    tags: pickArray(local.tags, server.tags),
    interests: pickArray(local.interests, server.interests),
    customFields: pickArray((local as any).customFields, (server as any).customFields) as any,
    avatarUrl: server.avatarUrl ?? local.avatarUrl,
    createdAt: local.createdAt || server.createdAt || Date.now(),
    lastInteraction: server.lastInteraction || local.lastInteraction,
    lastInteractionSummary: server.lastInteractionSummary || local.lastInteractionSummary,
    cadenceDays: server.cadenceDays ?? local.cadenceDays,
    nextTouchAt: server.nextTouchAt ?? local.nextTouchAt,
    warmth: typeof server.warmth === 'number' ? server.warmth : local.warmth,
    warmth_mode: server.warmth_mode || local.warmth_mode || 'medium',
  } as Person;
}

export default SupabaseContactsRepo;
