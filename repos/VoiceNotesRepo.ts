import { KV } from '@/storage/AsyncStorageService';
import { VoiceNote } from '@/storage/types';
import { FLAGS } from '@/constants/flags';
import { SupabaseVoiceNotesRepo } from './SupabaseVoiceNotesRepo';

const PREFIX = 'voicenotes/';

/**
 * Hybrid Voice Notes Repository
 * Uses local storage when LOCAL_ONLY is true, otherwise uses Supabase
 */

// Local storage implementation
const LocalVoiceNotesRepo = {
  async all(): Promise<VoiceNote[]> {
    const keys = await KV.keys(PREFIX);
    const rows = await Promise.all(keys.map(k => KV.get<VoiceNote>(k)));
    return (rows.filter(Boolean) as VoiceNote[]).sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id: string): Promise<VoiceNote | null> {
    return KV.get<VoiceNote>(PREFIX + id);
  },

  async create(note: Omit<VoiceNote, 'id' | 'createdAt'>): Promise<VoiceNote> {
    const newNote: VoiceNote = {
      ...note,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    await KV.set(PREFIX + newNote.id, newNote);
    return newNote;
  },

  async update(id: string, updates: Partial<VoiceNote>): Promise<VoiceNote> {
    const existing = await KV.get<VoiceNote>(PREFIX + id);
    if (!existing) {
      throw new Error(`Voice note ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await KV.set(PREFIX + id, updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await KV.remove(PREFIX + id);
  },

  async byPerson(personId: string): Promise<VoiceNote[]> {
    const all = await this.all();
    return all.filter(vn => vn.personId === personId);
  },
};

// Export hybrid repo that switches based on FLAGS.LOCAL_ONLY
export const VoiceNotesRepo = {
  async all(): Promise<VoiceNote[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[VoiceNotesRepo] Using LOCAL storage');
      return LocalVoiceNotesRepo.all();
    }
    console.log('[VoiceNotesRepo] Using SUPABASE');
    return SupabaseVoiceNotesRepo.all();
  },

  async get(id: string): Promise<VoiceNote | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalVoiceNotesRepo.get(id);
    }
    return SupabaseVoiceNotesRepo.get(id);
  },

  async create(note: {
    personId?: string;
    audioUri: string;
    transcription?: string;
    audioBlob?: Blob;
    audioFile?: File;
  }): Promise<VoiceNote> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalVoiceNotesRepo.create({
        personId: note.personId,
        audioUri: note.audioUri,
        transcription: note.transcription || '',
        processed: false,
      });
    }
    return SupabaseVoiceNotesRepo.create(note);
  },

  async update(id: string, updates: Partial<VoiceNote>): Promise<VoiceNote> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalVoiceNotesRepo.update(id, updates);
    }
    return SupabaseVoiceNotesRepo.update(id, updates);
  },

  async remove(id: string): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalVoiceNotesRepo.remove(id);
    }
    return SupabaseVoiceNotesRepo.remove(id);
  },

  async byPerson(personId: string): Promise<VoiceNote[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalVoiceNotesRepo.byPerson(personId);
    }
    return SupabaseVoiceNotesRepo.byPerson(personId);
  },

  /**
   * Request transcription for a voice note (backend only)
   */
  async transcribe(noteId: string): Promise<{ transcription: string }> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Transcription requires backend connection');
    }
    return SupabaseVoiceNotesRepo.transcribe(noteId);
  },

  /**
   * Upload audio file to Supabase Storage (backend only)
   */
  async uploadAudio(audioData: Blob | File): Promise<string | null> {
    if (FLAGS.LOCAL_ONLY) {
      console.warn('[VoiceNotesRepo] Audio upload not available in LOCAL_ONLY mode');
      return null;
    }
    return SupabaseVoiceNotesRepo.uploadAudio(audioData);
  },

  /**
   * Subscribe to real-time changes (Supabase only)
   */
  subscribeToChanges(callback: (payload: any) => void) {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[VoiceNotesRepo] Real-time subscriptions not available in LOCAL_ONLY mode');
      return () => {}; // No-op unsubscribe
    }
    return SupabaseVoiceNotesRepo.subscribeToChanges(callback);
  },
};