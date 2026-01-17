import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { VoiceNote } from '@/storage/types';

/**
 * Supabase-backed repository for voice notes (persona notes)
 * Handles audio upload to Supabase Storage and transcription via backend API
 */

const STORAGE_BUCKET = 'media-assets';
const AUDIO_FOLDER = 'voice-notes';

export const SupabaseVoiceNotesRepo = {
  /**
   * Fetch all voice notes from backend
   */
  async all(): Promise<VoiceNote[]> {
    try {
      const response = await apiFetch('/api/v1/me/persona-notes', { requireAuth: true });

      if (!response.ok) {
        console.error('[SupabaseVoiceNotesRepo] Failed to fetch notes:', response.status);
        return [];
      }

      const data = await response.json();
      return (data.notes || data.items || []).map(mapBackendNoteToVoiceNote);
    } catch (error) {
      console.error('[SupabaseVoiceNotesRepo.all] failed:', error);
      return [];
    }
  },

  /**
   * Fetch single voice note by ID
   */
  async get(id: string): Promise<VoiceNote | null> {
    try {
      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, { requireAuth: true });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return mapBackendNoteToVoiceNote(data.note || data);
    } catch (error) {
      console.error(`[SupabaseVoiceNotesRepo.get(${id})] failed:`, error);
      return null;
    }
  },

  /**
   * Create a new voice note with audio upload
   */
  async create(note: {
    personId?: string;
    audioUri: string;
    transcription?: string;
    audioBlob?: Blob;
    audioFile?: File;
  }): Promise<VoiceNote> {
    try {
      console.log('[SupabaseVoiceNotesRepo] Creating voice note');

      // Step 1: Upload audio to Supabase Storage
      let audioUrl = note.audioUri;
      
      if (note.audioBlob || note.audioFile) {
        const uploadedUrl = await this.uploadAudio(note.audioBlob || note.audioFile!);
        if (uploadedUrl) {
          audioUrl = uploadedUrl;
        }
      }

      // Step 2: Create note record in backend
      const payload = {
        person_id: note.personId,
        audio_url: audioUrl,
        transcription: note.transcription,
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

      const data = await response.json();
      const createdNote = mapBackendNoteToVoiceNote(data.note || data);

      console.log('[SupabaseVoiceNotesRepo] Voice note created with ID:', createdNote.id);
      return createdNote;
    } catch (error) {
      console.error('[SupabaseVoiceNotesRepo.create] failed:', error);
      throw error;
    }
  },

  /**
   * Upload audio file to Supabase Storage
   */
  async uploadAudio(audioData: Blob | File): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.m4a`;
      const filePath = `${AUDIO_FOLDER}/${fileName}`;

      console.log('[SupabaseVoiceNotesRepo] Uploading audio to:', filePath);

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, audioData, {
          contentType: audioData.type || 'audio/m4a',
          upsert: false,
        });

      if (error) {
        console.error('[SupabaseVoiceNotesRepo] Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      console.log('[SupabaseVoiceNotesRepo] Audio uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[SupabaseVoiceNotesRepo.uploadAudio] failed:', error);
      return null;
    }
  },

  /**
   * Request transcription for a voice note
   */
  async transcribe(noteId: string): Promise<{ transcription: string }> {
    try {
      const response = await apiFetch(`/api/v1/me/persona-notes/${noteId}/transcribe`, {
        method: 'POST',
        requireAuth: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return { transcription: data.transcription || data.transcript || '' };
    } catch (error) {
      console.error(`[SupabaseVoiceNotesRepo.transcribe(${noteId})] failed:`, error);
      throw error;
    }
  },

  /**
   * Update an existing voice note
   */
  async update(id: string, updates: Partial<VoiceNote>): Promise<VoiceNote> {
    try {
      const payload: any = {};
      
      if (updates.personId !== undefined) payload.person_id = updates.personId;
      if (updates.transcription !== undefined) payload.transcription = updates.transcription;
      if (updates.processed !== undefined) payload.processed = updates.processed;

      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return mapBackendNoteToVoiceNote(data.note || data);
    } catch (error) {
      console.error(`[SupabaseVoiceNotesRepo.update(${id})] failed:`, error);
      throw error;
    }
  },

  /**
   * Delete a voice note
   */
  async remove(id: string): Promise<void> {
    try {
      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }

      console.log('[SupabaseVoiceNotesRepo] Voice note deleted:', id);
    } catch (error) {
      console.error(`[SupabaseVoiceNotesRepo.remove(${id})] failed:`, error);
      throw error;
    }
  },

  /**
   * Get voice notes for a specific person
   */
  async byPerson(personId: string): Promise<VoiceNote[]> {
    try {
      // For now, fetch all and filter
      // Backend could add a query param: /api/v1/me/persona-notes?person_id=...
      const all = await this.all();
      return all.filter(note => note.personId === personId);
    } catch (error) {
      console.error(`[SupabaseVoiceNotesRepo.byPerson(${personId})] failed:`, error);
      return [];
    }
  },

  /**
   * Subscribe to real-time voice note updates
   */
  subscribeToChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('persona-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'persona_notes',
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
 * Map backend persona note schema to VoiceNote type
 */
function mapBackendNoteToVoiceNote(backendNote: any): VoiceNote {
  return {
    id: backendNote.id,
    personId: backendNote.person_id,
    transcription: backendNote.transcription || backendNote.transcript || '',
    audioUri: backendNote.audio_url || backendNote.audioUri || '',
    createdAt: backendNote.created_at 
      ? new Date(backendNote.created_at).getTime() 
      : (backendNote.createdAt || Date.now()),
    processed: backendNote.processed ?? backendNote.transcription ? true : false,
  };
}

export default SupabaseVoiceNotesRepo;
