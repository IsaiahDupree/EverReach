import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { VoiceNote } from '@/storage/types';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { useAuth } from './AuthProviderV2';

interface VoiceNotesContextType {
  voiceNotes: VoiceNote[];
  addVoiceNote: (note: {
    personId?: string;
    audioUri: string;
    transcription?: string;
    audioBlob?: Blob;
    audioFile?: File;
  }) => Promise<VoiceNote>;
  deleteVoiceNote: (id: string) => Promise<void>;
  transcribeNote: (noteId: string) => Promise<string>;
  updateNote: (id: string, updates: Partial<VoiceNote>) => Promise<VoiceNote>;
}

export const [VoiceNotesProvider, useVoiceNotes] = createContextHook<VoiceNotesContextType>(() => {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const authContext = useAuth();
  const { user, session } = authContext || { user: null, session: null };

  const loadVoiceNotes = useCallback(async () => {
    if (!user || !session) {
      setVoiceNotes([]);
      return;
    }
    try {
      console.log('[VoiceNotesProvider] Loading voice notes');
      const notes = await VoiceNotesRepo.all();
      setVoiceNotes(notes);
      console.log('[VoiceNotesProvider] Loaded', notes.length, 'voice notes');
    } catch (error) {
      console.error('[VoiceNotesProvider] Failed to load voice notes:', error);
    }
  }, [user, session]);

  useEffect(() => {
    if (!user || !session) {
      setVoiceNotes([]);
      return;
    }

    loadVoiceNotes();

    const unsubscribe = VoiceNotesRepo.subscribeToChanges((payload) => {
      console.log('[VoiceNotesProvider] Real-time update:', payload);
      if (payload.eventType === 'INSERT') {
        setVoiceNotes(prev => {
          if (prev.some(n => n.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        setVoiceNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      } else if (payload.eventType === 'DELETE') {
        setVoiceNotes(prev => prev.filter(n => n.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadVoiceNotes, user, session]);

  const addVoiceNote = useCallback(async (note: {
    personId?: string;
    audioUri: string;
    transcription?: string;
    audioBlob?: Blob;
    audioFile?: File;
  }): Promise<VoiceNote> => {
    try {
      console.log('[VoiceNotesProvider] Adding voice note');
      const createdNote = await VoiceNotesRepo.create(note);
      console.log('[VoiceNotesProvider] Voice note created with ID:', createdNote.id);
      const normalized: VoiceNote = createdNote.personId ? createdNote : { ...createdNote, personId: note.personId };
      setVoiceNotes(prev => [normalized, ...prev]);
      return normalized;
    } catch (error) {
      console.error('[VoiceNotesProvider] Failed to add voice note:', error);
      throw error;
    }
  }, []);

  const deleteVoiceNote = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('[VoiceNotesProvider] Deleting voice note:', id);
      await VoiceNotesRepo.remove(id);
      setVoiceNotes(prev => prev.filter(n => n.id !== id));
      console.log('[VoiceNotesProvider] Voice note deleted');
    } catch (error) {
      console.error('[VoiceNotesProvider] Failed to delete voice note:', error);
      throw error;
    }
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<VoiceNote>): Promise<VoiceNote> => {
    try {
      const updatedNote = await VoiceNotesRepo.update(id, updates);
      console.log('[VoiceNotesProvider] Voice note updated:', id);
      setVoiceNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
      return updatedNote;
    } catch (error) {
      console.error('[VoiceNotesProvider] Failed to update voice note:', error);
      throw error;
    }
  }, []);

  const transcribeNote = useCallback(async (noteId: string): Promise<string> => {
    try {
      console.log('[VoiceNotesProvider] Requesting transcription for:', noteId);
      const { transcription } = await VoiceNotesRepo.transcribe(noteId);
      
      // Update the note with transcription
      await updateNote(noteId, { 
        transcription,
        processed: true 
      });
      
      console.log('[VoiceNotesProvider] Transcription complete');
      return transcription;
    } catch (error) {
      console.error('[VoiceNotesProvider] Transcription failed:', error);
      throw error;
    }
  }, [updateNote]);

  return useMemo(() => ({
    voiceNotes,
    addVoiceNote,
    deleteVoiceNote,
    transcribeNote,
    updateNote,
  }), [voiceNotes, addVoiceNote, deleteVoiceNote, transcribeNote, updateNote]);
});