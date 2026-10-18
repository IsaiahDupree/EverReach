import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { VoiceNote } from '@/storage/types';
// Using legacy import for expo-file-system (SDK 54+ deprecated many methods)
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Supabase-backed repository for voice notes (persona notes)
 * Handles audio upload to Supabase Storage and transcription via backend API
 * 
 * IMPORTANT: Uses 'attachments' bucket with 'voice-notes/' folder path
 * This matches the existing bucket structure used for avatar uploads
 */

const STORAGE_BUCKET = 'attachments'; // Fixed: use 'attachments' bucket, not 'media-assets'
const AUDIO_FOLDER = 'voice-notes';

// Module-scoped singleflight + cache
let VOICE_NOTES_inflightAll: Promise<VoiceNote[]> | null = null;
let VOICE_NOTES_cacheAll: { ts: number; data: VoiceNote[] } | null = null;
const VOICE_NOTES_TTL_MS = 15000;

export const SupabaseVoiceNotesRepo = {
  /**
   * Fetch all voice notes from backend
   */
  async all(): Promise<VoiceNote[]> {
    try {
      // Serve from cache
      if (VOICE_NOTES_cacheAll && Date.now() - VOICE_NOTES_cacheAll.ts < VOICE_NOTES_TTL_MS) {
        return VOICE_NOTES_cacheAll.data;
      }
      // Join inflight request
      if (VOICE_NOTES_inflightAll) {
        return VOICE_NOTES_inflightAll;
      }

      console.log('[SupabaseVoiceNotesRepo] Fetching all voice notes from backend...');
      const inflight = (async () => {
        const response = await apiFetch('/api/v1/me/persona-notes?type=voice', { requireAuth: true });

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('[SupabaseVoiceNotesRepo] Auth required (401) – returning empty list');
            return [] as VoiceNote[];
          }
          console.error('[SupabaseVoiceNotesRepo] Failed to fetch notes:', response.status);
          return [] as VoiceNote[];
        }

        const data = await response.json();
        const voiceNotes = (data.notes || data.items || []).map(mapBackendNoteToVoiceNote);
        console.log('[SupabaseVoiceNotesRepo] Fetched', voiceNotes.length, 'voice notes');
        VOICE_NOTES_cacheAll = { ts: Date.now(), data: voiceNotes };
        return voiceNotes;
      })();
      VOICE_NOTES_inflightAll = inflight;
      try {
        return await inflight;
      } finally {
        VOICE_NOTES_inflightAll = null;
      }
    } catch (error: any) {
      // Handle AbortError gracefully (request cancelled/timeout)
      if (error.name === 'AbortError') {
        console.log('[SupabaseVoiceNotesRepo.all] Request aborted (navigation or timeout)');
        return [];
      }
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
    } catch (error: any) {
      // Handle AbortError gracefully (request cancelled/timeout)
      if (error.name === 'AbortError') {
        console.log(`[SupabaseVoiceNotesRepo.get(${id})] Request aborted (navigation or timeout)`);
        return null;
      }
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
      console.log('[SupabaseVoiceNotesRepo] Audio URI:', note.audioUri);
      console.log('[SupabaseVoiceNotesRepo] Has Blob:', !!note.audioBlob);

      // Step 1: Upload audio to Supabase Storage (REQUIRED)
      let audioUrl: string | null = null;
      
      if (note.audioBlob || note.audioFile) {
        console.log('[SupabaseVoiceNotesRepo] Uploading audio to Supabase Storage...');
        audioUrl = await this.uploadAudio(note.audioBlob || note.audioFile!);
        
        if (!audioUrl) {
          throw new Error('Audio upload to Supabase Storage failed. Cannot create voice note without audio file.');
        }
        
        console.log('[SupabaseVoiceNotesRepo] Upload successful:', audioUrl);
      } else if (note.audioUri && note.audioUri.startsWith('http')) {
        // Use existing HTTP/HTTPS URL if provided
        audioUrl = note.audioUri;
        console.log('[SupabaseVoiceNotesRepo] Using provided audio URL:', audioUrl);
      } else if (note.audioUri && Platform.OS !== 'web') {
        // Handle local file URI on native platforms
        console.log('[SupabaseVoiceNotesRepo] Uploading local audio file from:', note.audioUri);
        try {
          audioUrl = await this.uploadAudioFromUri(note.audioUri);
          
          if (!audioUrl) {
            throw new Error('Audio upload to Supabase Storage failed.');
          }
          
          console.log('[SupabaseVoiceNotesRepo] Upload successful:', audioUrl);
        } catch (fileError) {
          console.error('[SupabaseVoiceNotesRepo] Failed to upload local audio file:', fileError);
          throw new Error('Failed to upload audio file. Please try recording again.');
        }
      } else {
        throw new Error('No audio file provided. Voice notes require either audioBlob, audioFile, or valid audioUri.');
      }

      // Step 2: Create note record in backend
      // Backend requires file_url for type=voice (cannot use body_text)
      const hasValidUrl = audioUrl && audioUrl.startsWith('http');
      
      // CRITICAL: type=voice REQUIRES file_url, not body_text
      if (!hasValidUrl) {
        throw new Error('Cannot create voice note without valid audio URL. Upload failed or no audio provided.');
      }
      
      const payload: any = {
        type: 'voice', // Required: 'text', 'voice', or 'screenshot'
        file_url: audioUrl, // REQUIRED for type=voice
        transcript: note.transcription, // Optional: transcript text (backend uses 'transcript' not 'transcription')
      };
      // Link to contact using both contact_id and linked_contacts for backend compatibility
      if (note.personId) {
        payload.contact_id = note.personId;
        payload.linked_contacts = [note.personId];
      }

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

      // Invalidate cache so new fetches include this note immediately
      VOICE_NOTES_cacheAll = null;
      VOICE_NOTES_inflightAll = null;

      console.log('[SupabaseVoiceNotesRepo] Voice note created with ID:', createdNote.id);
      return createdNote;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[SupabaseVoiceNotesRepo.create] Request aborted');
        throw new Error('Request cancelled');
      }
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[SupabaseVoiceNotesRepo.uploadAudio] Request aborted');
        return null;
      }
      console.error('[SupabaseVoiceNotesRepo.uploadAudio] failed:', error);
      return null;
    }
  },

  /**
   * Upload audio file from local file URI (React Native)
   * Uses legacy expo-file-system API for SDK 54+ compatibility
   */
  async uploadAudioFromUri(fileUri: string): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.m4a`;
      const filePath = `${AUDIO_FOLDER}/${fileName}`;

      console.log('[SupabaseVoiceNotesRepo] Uploading audio from URI:', fileUri);
      console.log('[SupabaseVoiceNotesRepo] Target path:', filePath);

      // Read file as ArrayBuffer using legacy FileSystem API
      const fileInfo = await FileSystemLegacy.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist at URI');
      }

      // Read the file as base64 then convert to ArrayBuffer (using legacy API)
      const base64 = await FileSystemLegacy.readAsStringAsync(fileUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer using fetch API
      const response = await fetch(`data:audio/m4a;base64,${base64}`);
      const arrayBuffer = await response.arrayBuffer();

      // Determine content type from file extension
      const mimeType = fileUri.endsWith('.m4a') ? 'audio/m4a' : 
                       fileUri.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';

      console.log('[SupabaseVoiceNotesRepo] File size:', arrayBuffer.byteLength, 'bytes');
      console.log('[SupabaseVoiceNotesRepo] MIME type:', mimeType);

      // Upload ArrayBuffer directly to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[SupabaseVoiceNotesRepo.uploadAudioFromUri] Request aborted');
        return null;
      }
      console.error('[SupabaseVoiceNotesRepo.uploadAudioFromUri] failed:', error);
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[SupabaseVoiceNotesRepo.transcribe(${noteId})] Request aborted`);
        throw new Error('Request cancelled');
      }
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
      
      if (updates.personId !== undefined) {
        payload.person_id = updates.personId;
        payload.contact_id = updates.personId;
        payload.linked_contacts = updates.personId ? [updates.personId] : [];
      }
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[SupabaseVoiceNotesRepo.update(${id})] Request aborted`);
        throw new Error('Request cancelled');
      }
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[SupabaseVoiceNotesRepo.remove(${id})] Request aborted`);
        throw new Error('Request cancelled');
      }
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[SupabaseVoiceNotesRepo.byPerson(${personId})] Request aborted`);
        return [];
      }
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
  // Derive personId with robust fallbacks
  let derivedPersonId: string | undefined = backendNote?.contact_id || backendNote?.person_id;
  if (!derivedPersonId && Array.isArray(backendNote?.linked_contacts) && backendNote.linked_contacts.length > 0) {
    const first = backendNote.linked_contacts[0];
    if (typeof first === 'string') {
      derivedPersonId = first;
    } else if (first && typeof first === 'object') {
      derivedPersonId = first.contact_id || first.person_id || first.id || first.contactId || first.personId;
    }
  }

  return {
    id: backendNote.id,
    personId: derivedPersonId,
    transcription: backendNote.transcription || backendNote.transcript || '',
    audioUri: backendNote.file_url || backendNote.audio_url || backendNote.audioUri || '',
    createdAt: backendNote.created_at
      ? new Date(backendNote.created_at).getTime()
      : (backendNote.createdAt || Date.now()),
    processed: backendNote.processed ?? (backendNote.transcription ? true : false),
  };
}

export default SupabaseVoiceNotesRepo;
