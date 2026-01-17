import { apiFetch } from '@/lib/api';
import { TextNote } from '@/storage/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Track notes that failed to delete due to backend 405
// These will be filtered out locally until backend DELETE is deployed
const DELETED_NOTES_KEY = 'deleted_notes_pending_backend';

async function getLocallyDeletedNotes(): Promise<Set<string>> {
  try {
    const json = await AsyncStorage.getItem(DELETED_NOTES_KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch {
    return new Set();
  }
}

async function markNoteAsLocallyDeleted(noteId: string): Promise<void> {
  try {
    const deleted = await getLocallyDeletedNotes();
    deleted.add(noteId);
    await AsyncStorage.setItem(DELETED_NOTES_KEY, JSON.stringify([...deleted]));
  } catch (error) {
    console.error('[SupabaseTextNotesRepo] Failed to mark note as deleted:', error);
  }
}

async function clearLocallyDeletedNote(noteId: string): Promise<void> {
  try {
    const deleted = await getLocallyDeletedNotes();
    deleted.delete(noteId);
    await AsyncStorage.setItem(DELETED_NOTES_KEY, JSON.stringify([...deleted]));
  } catch (error) {
    console.error('[SupabaseTextNotesRepo] Failed to clear deleted note:', error);
  }
}

// Module-scoped singleflight + cache
let TEXT_NOTES_inflightAll: Promise<TextNote[]> | null = null;
let TEXT_NOTES_cacheAll: { ts: number; data: TextNote[] } | null = null;
const TEXT_NOTES_TTL_MS = 3000;

export const SupabaseTextNotesRepo = {
  async all(): Promise<TextNote[]> {
    try {
      // Serve from cache
      if (TEXT_NOTES_cacheAll && Date.now() - TEXT_NOTES_cacheAll.ts < TEXT_NOTES_TTL_MS) {
        return TEXT_NOTES_cacheAll.data;
      }
      // Join inflight request
      if (TEXT_NOTES_inflightAll) {
        return TEXT_NOTES_inflightAll;
      }

      console.log('[SupabaseTextNotesRepo] Fetching all text notes from backend...');
      const inflight = (async () => {
        const personaNotesResponse = await apiFetch('/api/v1/me/persona-notes?type=text', { requireAuth: true });

        if (!personaNotesResponse.ok) {
          console.error('[SupabaseTextNotesRepo] Failed to fetch persona notes:', personaNotesResponse.status);
          if (personaNotesResponse.status === 401) {
            console.error('❌ Authentication required. Please sign in.');
          }
          return [] as TextNote[];
        }

        const personaData = await personaNotesResponse.json();
        const personaNotes = (personaData.notes || personaData.items || []).map(mapBackendNoteToTextNote);
        console.log('[SupabaseTextNotesRepo] Fetched', personaNotes.length, 'persona notes');
        
        const interactionsResponse = await apiFetch('/api/v1/interactions?kind=note&limit=100', { requireAuth: true });
        
        let contactNotes: TextNote[] = [];
        if (interactionsResponse.ok) {
          const interactionsData = await interactionsResponse.json();
          contactNotes = (interactionsData.items || []).map(mapInteractionToTextNote);
          console.log('[SupabaseTextNotesRepo] Fetched', contactNotes.length, 'contact notes');
        } else {
          console.log('[SupabaseTextNotesRepo] Failed to fetch contact notes:', interactionsResponse.status);
        }
        
        const allNotes = [...personaNotes, ...contactNotes];
        console.log('[SupabaseTextNotesRepo] Total notes (before filter):', allNotes.length);
        
        // Filter out locally deleted notes (pending backend deployment)
        const locallyDeleted = await getLocallyDeletedNotes();
        const filteredNotes = allNotes.filter(note => !locallyDeleted.has(note.id));
        
        if (locallyDeleted.size > 0) {
          console.log('[SupabaseTextNotesRepo] Filtered out', locallyDeleted.size, 'locally deleted notes');
        }
        
        TEXT_NOTES_cacheAll = { ts: Date.now(), data: filteredNotes };
        return filteredNotes;
      })();

      TEXT_NOTES_inflightAll = inflight;
      try {
        return await inflight;
      } finally {
        TEXT_NOTES_inflightAll = null;
      }
    } catch (error) {
      console.error('[SupabaseTextNotesRepo.all] failed:', error);
      return [];
    }
  },

  async get(id: string): Promise<TextNote | null> {
    try {
      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, { requireAuth: true });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return mapBackendNoteToTextNote(data.note || data);
    } catch (error) {
      console.error(`[SupabaseTextNotesRepo.get(${id})] failed:`, error);
      return null;
    }
  },

  async upsert(textNote: TextNote): Promise<void> {
    try {
      if (textNote.id && textNote.id !== 'new') {
        // Try to update as persona note first
        const personaPayload = {
          type: 'text',
          title: textNote.content.substring(0, 100),
          body_text: textNote.content,
          contact_id: textNote.personId,
        };

        const personaResponse = await apiFetch(`/api/v1/me/persona-notes/${textNote.id}`, {
          method: 'PATCH',
          requireAuth: true,
          body: JSON.stringify(personaPayload),
        });

        if (personaResponse.ok) {
          console.log('[SupabaseTextNotesRepo] Text note updated (persona)');
          return;
        }

        // If persona note update fails with 404, try as interaction
        if (personaResponse.status === 404) {
          const interactionPayload = {
            content: textNote.content,
          };

          const interactionResponse = await apiFetch(`/api/v1/interactions/${textNote.id}`, {
            method: 'PATCH',
            requireAuth: true,
            body: JSON.stringify(interactionPayload),
          });

          if (!interactionResponse.ok) {
            const errorText = await interactionResponse.text();
            throw new Error(`Update failed: ${interactionResponse.status} ${errorText}`);
          }
          console.log('[SupabaseTextNotesRepo] Text note updated (interaction)');
          return;
        }

        const errorText = await personaResponse.text();
        throw new Error(`Update failed: ${personaResponse.status} ${errorText}`);
      } else {
        // Create new note
        const payload = {
          type: 'text',
          title: textNote.content.substring(0, 100),
          body_text: textNote.content,
          contact_id: textNote.personId,
        };

        const response = await apiFetch('/api/v1/me/persona-notes', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Create failed: ${response.status} ${errorText}`);
        }
        console.log('[SupabaseTextNotesRepo] Text note created');
      }
    } catch (error) {
      console.error('[SupabaseTextNotesRepo.upsert] failed:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      // Try to delete as persona note first
      const personaResponse = await apiFetch(`/api/v1/me/persona-notes/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      if (personaResponse.ok) {
        console.log('[SupabaseTextNotesRepo] Text note deleted (persona):', id);
        await clearLocallyDeletedNote(id); // Clear any pending delete marker
        return;
      }

      // If persona note delete fails with 404, try as interaction
      if (personaResponse.status === 404) {
        console.log('[SupabaseTextNotesRepo] Note not found as persona note, trying as interaction');
        
        // Try to delete as interaction note
        const interactionResponse = await apiFetch(`/api/v1/interactions/${id}`, {
          method: 'DELETE',
          requireAuth: true,
        });

        if (interactionResponse.ok) {
          console.log('[SupabaseTextNotesRepo] Text note deleted (interaction):', id);
          await clearLocallyDeletedNote(id); // Clear any pending delete marker
          return;
        }
        
        // If also fails with 404, note doesn't exist anywhere, consider it deleted
        if (interactionResponse.status === 404) {
          console.log('[SupabaseTextNotesRepo] Note not found in interactions either, considering deleted');
          await clearLocallyDeletedNote(id); // Clear any pending delete marker
          return;
        }
        
        // If 405 Method Not Allowed, DELETE endpoint not deployed yet - mark as locally deleted
        if (interactionResponse.status === 405) {
          console.warn('[SupabaseTextNotesRepo] DELETE endpoint not deployed (405), marking as locally deleted');
          console.warn('[SupabaseTextNotesRepo] Note will stay hidden until backend DELETE is deployed');
          await markNoteAsLocallyDeleted(id); // Mark so it stays hidden on reload
          return; // Treat as success - optimistic delete with persistence
        }
        
        // Some other error occurred
        const errorText = await interactionResponse.text();
        throw new Error(`Delete failed (interaction): ${interactionResponse.status} ${errorText}`);
      }

      const errorText = await personaResponse.text();
      throw new Error(`Delete failed: ${personaResponse.status} ${errorText}`);
    } catch (error) {
      console.error(`[SupabaseTextNotesRepo.remove(${id})] failed:`, error);
      throw error;
    }
  },

  async byPerson(personId: string): Promise<TextNote[]> {
    try {
      const all = await this.all();
      return all.filter(note => note.personId === personId);
    } catch (error) {
      console.error(`[SupabaseTextNotesRepo.byPerson(${personId})] failed:`, error);
      return [];
    }
  },
};

function mapBackendNoteToTextNote(backendNote: any): TextNote {
  return {
    id: backendNote.id,
    content: backendNote.body_text || backendNote.content || '',
    personId: backendNote.contact_id || backendNote.person_id,
    createdAt: backendNote.created_at 
      ? new Date(backendNote.created_at).getTime() 
      : (backendNote.createdAt || Date.now()),
    metadata: backendNote.metadata, // Include metadata for screenshot file_url
  } as any; // Cast to any since TextNote type doesn't include metadata yet
}

function mapInteractionToTextNote(interaction: any): TextNote {
  return {
    id: interaction.id,
    content: interaction.content || '',
    personId: interaction.contact_id,
    createdAt: interaction.created_at 
      ? new Date(interaction.created_at).getTime() 
      : Date.now(),
    metadata: interaction.metadata, // Include metadata for screenshot file_url
  } as any; // Cast to any since TextNote type doesn't include metadata yet
}

export default SupabaseTextNotesRepo;
