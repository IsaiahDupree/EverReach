/**
 * Voice Notes Helper Utilities
 * 
 * Distinguishes between:
 * 1. Personal voice memos (unlinked) - journal/memo style
 * 2. Contact interactions (linked) - relationship timeline
 */

import { VoiceNote } from '@/storage/types';

/**
 * Check if a voice note is linked to any contacts
 * 
 * A voice note is considered a "contact interaction" if:
 * - It has a personId (legacy field)
 * - OR the backend has linked_contacts with at least one contact
 */
export function isContactLinked(voiceNote: VoiceNote | any): boolean {
  // Check if has personId (legacy contact link)
  if (voiceNote.personId) {
    return true;
  }

  // Check if backend response has linked_contacts array
  if (voiceNote.linked_contacts && Array.isArray(voiceNote.linked_contacts)) {
    return voiceNote.linked_contacts.length > 0;
  }

  return false;
}

/**
 * Filter voice notes to only include those linked to contacts
 * These should appear in "Recent Interactions" feeds
 */
export function getContactLinkedNotes(voiceNotes: VoiceNote[]): VoiceNote[] {
  return voiceNotes.filter(note => isContactLinked(note));
}

/**
 * Filter voice notes to only include personal memos (not linked)
 * These appear in "Personal Notes" / journal views
 */
export function getPersonalNotes(voiceNotes: VoiceNote[]): VoiceNote[] {
  return voiceNotes.filter(note => !isContactLinked(note));
}

/**
 * Get all contacts linked to a voice note
 * Returns array of contact IDs
 */
export function getLinkedContactIds(voiceNote: VoiceNote | any): string[] {
  const ids: string[] = [];

  // Legacy personId field
  if (voiceNote.personId) {
    ids.push(voiceNote.personId);
  }

  // Modern linked_contacts array
  if (voiceNote.linked_contacts && Array.isArray(voiceNote.linked_contacts)) {
    ids.push(...voiceNote.linked_contacts);
  }

  // Deduplicate
  return Array.from(new Set(ids));
}

/**
 * Check if a voice note is linked to a specific contact
 */
export function isLinkedToContact(voiceNote: VoiceNote | any, contactId: string): boolean {
  const linkedIds = getLinkedContactIds(voiceNote);
  return linkedIds.includes(contactId);
}

/**
 * Convert voice note to interaction format for timeline display
 */
export function voiceNoteToInteraction(voiceNote: VoiceNote | any) {
  return {
    id: voiceNote.id,
    kind: 'voice_note',
    type: 'voice_note',
    content: voiceNote.transcription || 'Voice note',
    created_at: voiceNote.createdAt 
      ? new Date(voiceNote.createdAt).toISOString() 
      : new Date().toISOString(),
    contact_id: voiceNote.personId || voiceNote.linked_contacts?.[0],
    contact_name: null, // Will be resolved from contacts provider
    contact_avatar_url: null, // Will be resolved from contacts provider
    metadata: {
      audio_url: voiceNote.audioUri,
      processed: voiceNote.processed,
      linked_contacts: getLinkedContactIds(voiceNote),
    },
  };
}

/**
 * Merge voice notes with regular interactions for unified timeline
 * Only includes contact-linked voice notes
 */
export function mergeVoiceNotesWithInteractions(
  interactions: any[],
  voiceNotes: VoiceNote[]
): any[] {
  // Get only linked voice notes
  const linkedNotes = getContactLinkedNotes(voiceNotes);

  // Convert to interaction format
  const voiceInteractions = linkedNotes.map(voiceNoteToInteraction);

  // Merge and sort by date
  const merged = [...interactions, ...voiceInteractions];
  
  return merged.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Newest first
  });
}
