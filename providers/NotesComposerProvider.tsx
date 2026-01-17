import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilesRepo } from '@/repos/FilesRepo';
import { TextNotesRepo } from '@/repos/TextNotesRepo';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import analytics from '@/lib/analytics';
import { go } from '@/lib/navigation';
import NotesComposerModal from '@/components/NotesComposer/NotesComposerModal';

export type NotesComposerTarget =
  | { type: 'personal' }
  | { type: 'contact'; personId: string; personName?: string };

type Attachment = { uri: string; name: string; mimeType?: string; size?: number };

type OpenOptions = {
  target: NotesComposerTarget;
  initialText?: string;
  onSaved?: (noteId?: string) => void;
  allow?: { voice?: boolean; screenshot?: boolean; attachments?: boolean };
};

interface NotesComposerContextState {
  open: (opts: OpenOptions) => void;
  close: () => void;
}

const NotesComposerContext = createContext<NotesComposerContextState | undefined>(undefined);

export function NotesComposerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<NotesComposerTarget>({ type: 'personal' });
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [onSaved, setOnSaved] = useState<((id?: string) => void) | undefined>();
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const draftKey = useMemo(() => {
    if (target.type === 'contact') return `draft/notes/contact/${target.personId}`;
    return 'draft/notes/personal';
  }, [target]);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(draftKey)
      .then(v => {
        if (!v) return;
        try {
          const parsed = JSON.parse(v);
          if (typeof parsed.text === 'string') setText(parsed.text);
          if (Array.isArray(parsed.attachments)) setAttachments(parsed.attachments);
        } catch {}
      })
      .catch(() => {});
  }, [visible, draftKey]);

  useEffect(() => {
    if (!visible) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(draftKey, JSON.stringify({ text, attachments, recordingUri }));
      } catch {}
    };
    persist();
  }, [text, attachments, recordingUri, draftKey, visible]);

  const reset = useCallback(async () => {
    try { await AsyncStorage.removeItem(draftKey); } catch {}
    setText('');
    setAttachments([]);
    setRecordingUri(null);
  }, [draftKey]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const open = useCallback((opts: OpenOptions) => {
    setTarget(opts.target);
    setText(opts.initialText || '');
    setAttachments([]);
    setOnSaved(() => opts.onSaved);
    setVisible(true);
    analytics.track('note_composer_opened', {
      has_contact: opts.target.type === 'contact',
      person_id: opts.target.type === 'contact' ? opts.target.personId : undefined,
    });
  }, []);

  const onPressVoice = useCallback(() => {
    close();
    if (target.type === 'contact') {
      go.voiceNote(target.personId, target.personName);
    } else {
      go.voiceNote('personal');
    }
  }, [target, close]);

  const onPressScreenshot = useCallback(() => {
    close();
    if (target.type === 'contact') {
      go.screenshotAnalysis(target.personId);
    } else {
      go.screenshotAnalysis();
    }
  }, [target, close]);

  const onPickAttachment = useCallback((file: Attachment) => {
    setAttachments(prev => [...prev, file]);
  }, []);

  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const onSave = useCallback(async () => {
    if (!text.trim() && attachments.length === 0 && !recordingUri) {
      Alert.alert('Empty Note', 'Add some text, a voice recording, or attach a file.');
      return;
    }

    try {
      setSaving(true);

      // Upload attachments and collect URLs
      let urls: string[] = [];
      let voiceUrl: string | null = null;
      for (const att of attachments) {
        try {
          const up = await FilesRepo.uploadUri({ uri: att.uri, name: att.name, contentType: att.mimeType });
          urls.push(up.url);
        } catch (err) {
          console.warn('[NotesComposer] Upload failed for', att.name, err);
        }
      }

      // Upload voice recording and create a voice note
      let voiceTranscript = '';
      if (recordingUri) {
        try {
          const up = await FilesRepo.uploadUri({ uri: recordingUri, name: 'voice.m4a', contentType: 'audio/m4a' });
          voiceUrl = up.url;
          
          let voiceNote;
          if (target.type === 'contact') {
            voiceNote = await VoiceNotesRepo.create({ personId: target.personId, audioUri: voiceUrl });
          } else {
            voiceNote = await VoiceNotesRepo.create({ audioUri: voiceUrl });
          }
          
          // Trigger transcription and wait for it (with timeout)
          if (voiceNote?.id) {
            console.log('[NotesComposer] Requesting transcription for voice note:', voiceNote.id);
            try {
              // Wait up to 10 seconds for transcription
              const transcriptionPromise = VoiceNotesRepo.transcribe(voiceNote.id);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transcription timeout')), 10000)
              );
              
              await Promise.race([transcriptionPromise, timeoutPromise]);
              
              // Fetch the updated voice note with transcript
              const updatedNote = await VoiceNotesRepo.get(voiceNote.id);
              if (updatedNote?.transcript) {
                voiceTranscript = updatedNote.transcript;
                console.log('[NotesComposer] Got transcript:', voiceTranscript.substring(0, 50) + '...');
              }
            } catch (error) {
              console.warn('[NotesComposer] Transcription failed or timed out:', error);
              // Continue without transcript
            }
          }
          
          urls.push(voiceUrl);
          
          // If there's ONLY a voice note (no text or other attachments), we're done
          // The voice note is already saved via VoiceNotesRepo
          if (!text.trim() && attachments.length === 0) {
            console.log('[NotesComposer] Voice note saved, skipping text note creation');
            analytics.track('note_saved', {
              type: 'voice',
              has_contact: target.type === 'contact',
              person_id: target.type === 'contact' ? target.personId : undefined,
            });
            await reset();
            setVisible(false);
            onSaved?.();
            return; // Exit early - voice note is already saved
          }
        } catch (err) {
          console.warn('[NotesComposer] Voice upload/create failed', err);
        }
      }

      // Only create a text note if there's text or non-voice attachments
      let content = text.trim();
      
      // If there's a voice transcript, include it in the note
      if (voiceTranscript) {
        const transcriptSection = `🎤 Voice Note Transcript:\n${voiceTranscript}`;
        content = content ? `${content}\n\n${transcriptSection}` : transcriptSection;
      }
      
      if (urls.length > 0) {
        const list = urls.map(u => `- ${u}`).join('\n');
        content = content ? `${content}\n\nAttachments:\n${list}` : `Attachments:\n${list}`;
      }

      // Ensure content is not empty (backend requires body_text for text notes)
      if (!content || content.trim().length === 0) {
        content = 'Note with attachments';
      }

      const payload = {
        id: 'new',
        content,
        personId: target.type === 'contact' ? target.personId : undefined,
        createdAt: Date.now(),
      } as any;

      await TextNotesRepo.upsert(payload);

      analytics.track('note_saved', {
        type: 'text',
        length: content.length,
        attachments: urls.length,
        has_contact: target.type === 'contact',
        person_id: target.type === 'contact' ? target.personId : undefined,
      });

      await reset();
      setVisible(false);
      onSaved?.();
    } catch (err) {
      console.error('[NotesComposer] Save failed', err);
      analytics.errors.occurred(err as Error, 'NotesComposer');
      Alert.alert('Save failed', 'Could not save your note. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [attachments, target, text, onSaved, reset, recordingUri]);

  const ctxValue = useMemo(() => ({ open, close }), [open, close]);

  return (
    <NotesComposerContext.Provider value={ctxValue}>
      {children}
      <NotesComposerModal
        visible={visible}
        title={target.type === 'contact' ? `Add Note for ${target.personName || 'Contact'}` : 'Add Personal Note'}
        text={text}
        setText={setText}
        attachments={attachments}
        onPickAttachment={onPickAttachment}
        onRemoveAttachment={removeAttachmentAt}
        recordingUri={recordingUri}
        setRecordingUri={setRecordingUri}
        onClose={close}
        onSave={onSave}
        saving={saving}
        onPressVoice={onPressVoice}
        onPressScreenshot={onPressScreenshot}
      />
    </NotesComposerContext.Provider>
  );
}

export function useNotesComposer(): NotesComposerContextState {
  const ctx = useContext(NotesComposerContext);
  if (!ctx) throw new Error('useNotesComposer must be used within NotesComposerProvider');
  return ctx;
}

const styles = StyleSheet.create({});
