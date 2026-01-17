import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { mergeVoiceNotesWithInteractions } from '@/utils/voiceNoteHelpers';

export interface Interaction {
  id: string;
  contact_id: string;
  kind: 'email' | 'note' | 'call' | 'screenshot' | 'voice_note' | 'meeting' | 'sms';
  content?: string;
  metadata: {
    subject?: string;
    direction?: 'inbound' | 'outbound';
    status?: string;
    opened?: boolean;
    clicked?: boolean;
    ai_generated?: boolean;
    template_id?: string;
    goal?: string;
    channel?: string;
    image_url?: string;
    screenshot_id?: string;
    analysis?: {
      text_extracted?: string;
      entities?: any[];
      action_items?: string[];
      confidence_score?: number;
    };
    audio_url?: string;
    duration_seconds?: number;
    transcription?: {
      text?: string;
      confidence?: number;
    };
    ai_analysis?: {
      contacts_mentioned?: string[];
      action_items?: string[];
      sentiment?: string;
      tags?: string[];
    };
    recording_url?: string;
    attendees?: string[];
    location?: string;
    notes?: string;
    tags?: string[];
    sentiment?: string;
    priority?: string;
  };
  occurred_at: string;
  created_at: string;
  updated_at?: string;
}

interface InteractionsResponse {
  items?: Interaction[];
  interactions?: Interaction[];
  total?: number;
  has_more?: boolean;
}

interface GroupedInteractions {
  [date: string]: Interaction[];
}

export function useContactHistory(contactId: string | undefined) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInteractions = async (isRefresh = false) => {
    if (!contactId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('[useContactHistory] Fetching interactions for contact:', contactId);

      let items: Interaction[] = [];

      try {
        const data = await apiGet<InteractionsResponse>(
          `/api/v1/interactions?contact_id=${contactId}&limit=100&sort=occurred_at:desc`,
          { requireAuth: true }
        );
        items = data?.items || data?.interactions || [];
        console.log('[useContactHistory] Fetched', items.length, 'regular interactions');
      } catch (err) {
        console.log('[useContactHistory] v1 endpoint failed, trying legacy...');
        try {
          const data = await apiGet<InteractionsResponse>(
            `/api/interactions?contact_id=${contactId}&limit=100`,
            { requireAuth: true }
          );
          items = data?.items || data?.interactions || [];
        } catch (err2) {
          console.error('[useContactHistory] Both endpoints failed:', err, err2);
        }
      }

      try {
        const { data: sentMessages, error: messagesError } = await supabase
          .from('generated_messages')
          .select(`
            id,
            person_id,
            channel_selected,
            status,
            context_snapshot,
            created_at,
            updated_at,
            message_variants (
              id,
              variant_index,
              text,
              edited
            )
          `)
          .eq('person_id', contactId)
          .eq('status', 'sent')
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('[useContactHistory] Error fetching sent messages:', messagesError);
        } else if (sentMessages && sentMessages.length > 0) {
          console.log('[useContactHistory] Fetched', sentMessages.length, 'sent messages');
          
          const messageInteractions: Interaction[] = sentMessages.map((msg: any) => {
            const chosenVariant = msg.message_variants?.find(
              (v: any) => v.variant_index === 0
            ) || msg.message_variants?.[0];
            
            return {
              id: msg.id,
              contact_id: msg.person_id,
              kind: msg.channel_selected === 'sms' ? 'sms' : 'email',
              content: chosenVariant?.text || '',
              metadata: {
                subject: msg.context_snapshot?.subject,
                direction: 'outbound' as const,
                status: 'sent',
                ai_generated: true,
                goal: msg.context_snapshot?.goalIdentifier,
                channel: msg.channel_selected,
              },
              occurred_at: msg.updated_at || msg.created_at,
              created_at: msg.created_at,
              updated_at: msg.updated_at,
            };
          });

          items = [...items, ...messageInteractions].sort((a, b) => {
            const dateA = new Date(a.occurred_at || a.created_at).getTime();
            const dateB = new Date(b.occurred_at || b.created_at).getTime();
            return dateB - dateA;
          });
        }
      } catch (err) {
        console.error('[useContactHistory] Error fetching sent messages:', err);
      }

      // Merge contact-linked voice notes for this contact
      try {
        const voiceNotes = await VoiceNotesRepo.byPerson(contactId);
        const merged = mergeVoiceNotesWithInteractions(items as any[], voiceNotes);
        items = merged as any;
        console.log('[useContactHistory] After merge with voice notes:', {
          regular: items.length,
          voiceNotes: voiceNotes.length,
          merged: merged.length,
        });
      } catch (err) {
        console.error('[useContactHistory] Error merging voice notes:', err);
      }

      console.log('[useContactHistory] Total interactions:', items.length);
      setInteractions(items);
    } catch (err: any) {
      console.error('[useContactHistory] Error:', err);
      setError(err.message || 'Failed to load interactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const groupedByDate = useMemo<GroupedInteractions>(() => {
    if (!interactions.length) return {};

    return interactions.reduce((acc, item) => {
      const date = new Date(item.occurred_at || item.created_at);
      const dateKey = date.toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as GroupedInteractions);
  }, [interactions]);

  const filterByType = (type: string | string[]) => {
    const types = Array.isArray(type) ? type : [type];
    return interactions.filter(item => types.includes(item.kind));
  };

  const screenshots = useMemo(() => interactions.filter(i => i.kind === 'screenshot'), [interactions]);
  const voiceNotes = useMemo(() => interactions.filter(i => i.kind === 'voice_note'), [interactions]);
  const notes = useMemo(() => interactions.filter(i => i.kind === 'note'), [interactions]);
  const emails = useMemo(() => interactions.filter(i => i.kind === 'email'), [interactions]);
  const calls = useMemo(() => interactions.filter(i => i.kind === 'call'), [interactions]);
  const meetings = useMemo(() => interactions.filter(i => i.kind === 'meeting'), [interactions]);

  const refresh = () => fetchInteractions(true);

  return {
    interactions,
    groupedByDate,
    screenshots,
    voiceNotes,
    notes,
    emails,
    calls,
    meetings,
    filterByType,
    loading,
    error,
    refreshing,
    refresh,
  };
}
