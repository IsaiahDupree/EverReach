import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { SocialMediaChannel } from '@/types/socialChannels';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { mergeVoiceNotesWithInteractions } from '@/utils/voiceNoteHelpers';

export interface ContactDetail {
  id: string;
  display_name: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  notes?: string;
  tags?: string[];
  warmth?: number;
  warmth_band?: string;
  last_interaction_at?: string;
  avatar_url?: string; // Legacy field
  photo_url?: string; // New field for contact photos
  social_channels?: SocialMediaChannel[];
  metadata?: {
    social_channels?: SocialMediaChannel[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  contact_name?: string;
  kind: string;
  content?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface InteractionsResponse {
  items: Interaction[];
  limit: number;
  nextCursor: string | null;
  sort: string;
}

export interface GoalSuggestion {
  id: string;
  goal: string;
  goal_key: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'nurture' | 're-engage' | 'convert' | 'maintain';
  confidence: number;
}

export interface GoalSuggestionsResponse {
  suggestions: GoalSuggestion[];
}

export interface PipelineHistoryEntry {
  id: string;
  from_stage_name: string | null;
  to_stage_name: string | null;
  moved_at: string;
  pipeline_name?: string;
  notes?: string;
}

export interface PipelineHistoryResponse {
  items: PipelineHistoryEntry[];
}

export interface Channel {
  id: string;
  channel_type: 'email' | 'phone' | 'sms' | 'linkedin' | 'twitter' | 'instagram' | 'website';
  channel_value: string;
  label?: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

// Additional data for Option 3 (People-Centric detail)
export interface NoteItem {
  id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export interface NotesResponse {
  items?: NoteItem[];
  notes?: NoteItem[];
}

export interface FileItem {
  id: string;
  type?: string;
  url?: string;
  filename?: string;
  size_bytes?: number;
  uploaded_at: string;
}

export interface FilesResponse {
  items?: FileItem[];
  files?: FileItem[];
}

export interface AnalysisResponse {
  summary?: string;
  status?: string;
  best_time_contact?: string;
  risk_level?: 'low' | 'medium' | 'high';
}

export interface SuggestionItem {
  id?: string;
  title: string;
  reason?: string;
}

export interface SuggestionsResponse {
  suggestions: SuggestionItem[];
}

export function useContactDetail(contactId: string) {
  const contactQuery = useQuery<ContactDetail>({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/contacts/${contactId}`, {
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contact: ${response.statusText}`);
      }

      const data = await response.json();
      return data.contact || data;
    },
    enabled: !!contactId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // AI Analysis - DISABLED: Backend endpoints not implemented
  // The backend only has /api/v1/analysis/screenshot/:id for screenshot analysis
  // Contact-level analysis endpoints (/api/v1/analysis/:contactId) don't exist yet
  const analysisQuery = useQuery<AnalysisResponse | null>({
    queryKey: ['analysis', contactId],
    queryFn: async () => {
      // TODO: Implement contact analysis endpoint in backend
      return null;
    },
    enabled: false, // Disabled until backend endpoint is implemented
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // AI Suggestions - DISABLED: Backend endpoint not implemented
  // The /api/v1/analysis/:contactId/suggestions endpoint doesn't exist
  const suggestionsQuery = useQuery<SuggestionsResponse>({
    queryKey: ['analysis-suggestions', contactId],
    queryFn: async () => {
      // TODO: Implement suggestions endpoint in backend
      return { suggestions: [] };
    },
    enabled: false, // Disabled until backend endpoint is implemented
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const interactionsQuery = useQuery<InteractionsResponse>({
    queryKey: ['interactions', contactId],
    queryFn: async () => {
      console.log('[useContactDetail] Fetching interactions for contact:', contactId);
      
      // Fetch regular interactions
      const response = await apiFetch(
        `/api/v1/interactions?contact_id=${contactId}&limit=50&sort=created_at:desc`,
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch interactions: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Fetch voice notes for this contact
      const voiceNotes = await VoiceNotesRepo.byPerson(contactId);
      
      // Merge contact-linked voice notes with interactions
      const mergedItems = mergeVoiceNotesWithInteractions(
        data.items || [],
        voiceNotes
      );
      
      console.log('[useContactDetail] Interactions + Voice Notes:', {
        regularInteractions: data.items?.length || 0,
        voiceNotes: voiceNotes.length,
        merged: mergedItems.length,
      });
      
      return {
        ...data,
        items: mergedItems,
      };
    },
    enabled: !!contactId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const goalSuggestionsQuery = useQuery<GoalSuggestionsResponse>({
    queryKey: ['goal-suggestions', contactId],
    queryFn: async () => {
      console.log('[useContactDetail] Fetching goal suggestions for:', contactId);
      const response = await apiFetch(
        `/api/v1/contacts/${contactId}/goal-suggestions`,
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        console.log('[useContactDetail] Goal suggestions not available:', response.status);
        return { suggestions: [] };
      }

      const data = await response.json();
      console.log('[useContactDetail] Goal suggestions response:', JSON.stringify(data, null, 2));
      console.log('[useContactDetail] Suggestions count:', data.suggestions?.length || 0);
      
      return data;
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const pipelineHistoryQuery = useQuery<PipelineHistoryResponse>({
    queryKey: ['pipeline-history', contactId],
    queryFn: async () => {
      const response = await apiFetch(
        `/api/v1/contacts/${contactId}/pipeline/history`,
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        console.log('[useContactDetail] Pipeline history not available:', response.status);
        return { items: [] };
      }

      return response.json();
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const channelsQuery = useQuery<Channel[]>({
    queryKey: ['channels', contactId, contactQuery.data],
    queryFn: async () => {
      const contact = contactQuery.data;
      if (!contact) return [];

      console.log('[useContactDetail] Building channels list...');
      
      // Check both top-level and metadata for social channels
      const socialChannels = contact.social_channels || contact.metadata?.social_channels || [];
      console.log('[useContactDetail] Contact has social_channels:', !!contact.social_channels);
      console.log('[useContactDetail] Contact has metadata.social_channels:', !!contact.metadata?.social_channels);
      console.log('[useContactDetail] Social channels count:', socialChannels.length);
      if (socialChannels.length) {
        console.log('[useContactDetail] Social channels:', JSON.stringify(socialChannels, null, 2));
      }

      const channels: Channel[] = [];

      if (contact.emails && contact.emails.length > 0) {
        contact.emails.forEach((email, index) => {
          channels.push({
            id: `email-${index}`,
            channel_type: 'email',
            channel_value: email,
            label: index === 0 ? 'Primary Email' : `Email ${index + 1}`,
            is_primary: index === 0,
            is_verified: true,
          });
        });
      }

      if (contact.phones && contact.phones.length > 0) {
        contact.phones.forEach((phone, index) => {
          channels.push({
            id: `phone-${index}`,
            channel_type: 'phone',
            channel_value: phone,
            label: index === 0 ? 'Primary Phone' : `Phone ${index + 1}`,
            is_primary: index === 0,
            is_verified: true,
          });
        });
      }

      // Add social media channels (from either location)
      if (socialChannels.length > 0) {
        console.log('[useContactDetail] Adding', socialChannels.length, 'social channels...');
        socialChannels.forEach((social, index) => {
          const channel = {
            id: `social-${social.platform}-${index}`,
            channel_type: social.platform.toLowerCase() as any,
            channel_value: social.handle,
            label: social.platform.charAt(0).toUpperCase() + social.platform.slice(1),
            is_primary: false,
            is_verified: false, // Can add verification later if needed
          };
          console.log('[useContactDetail] Adding channel:', channel);
          channels.push(channel);
        });
      }

      console.log('[useContactDetail] Total channels built:', channels.length);
      console.log('[useContactDetail] Channels:', channels.map(c => `${c.label} (${c.channel_type})`).join(', '));
      return channels;
    },
    enabled: !!contactQuery.data,
    staleTime: 5 * 60 * 1000,
  });

  // Recent notes
  const notesQuery = useQuery<NotesResponse>({
    queryKey: ['notes', contactId],
    queryFn: async () => {
      const response = await apiFetch(
        `/api/v1/contacts/${contactId}/notes?limit=5&sort=created_at:desc`,
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        console.log('[useContactDetail] Notes not available:', response.status);
        return { items: [] };
      }

      return response.json();
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Files & documents
  const filesQuery = useQuery<FilesResponse>({
    queryKey: ['files', contactId],
    queryFn: async () => {
      const response = await apiFetch(
        `/api/v1/contacts/${contactId}/files?limit=3`,
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        console.log('[useContactDetail] Files not available:', response.status);
        return { items: [] };
      }

      return response.json();
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isLoading = 
    contactQuery.isLoading || 
    interactionsQuery.isLoading;

  const refetchAll = async () => {
    await Promise.all([
      contactQuery.refetch(),
      interactionsQuery.refetch(),
      goalSuggestionsQuery.refetch(),
      pipelineHistoryQuery.refetch(),
      channelsQuery.refetch(),
      notesQuery.refetch(),
      filesQuery.refetch(),
      analysisQuery.refetch(),
      suggestionsQuery.refetch(),
    ]);
  };

  // Filter out AbortError from error state (happens on navigation)
  const getError = () => {
    const contactError = contactQuery.error as any;
    const interactionsError = interactionsQuery.error as any;
    
    // Ignore AbortError (request cancelled during navigation)
    const isAbortError = (err: any) => err?.name === 'AbortError';
    
    if (contactError && !isAbortError(contactError)) return contactError;
    if (interactionsError && !isAbortError(interactionsError)) return interactionsError;
    
    return null;
  };

  return {
    contact: contactQuery.data,
    interactions: interactionsQuery.data?.items || [],
    goalSuggestions: goalSuggestionsQuery.data?.suggestions || [],
    pipelineHistory: pipelineHistoryQuery.data?.items || [],
    channels: channelsQuery.data || [],
    notes: (notesQuery.data?.items || notesQuery.data?.notes || []) as NoteItem[],
    files: (filesQuery.data?.files || filesQuery.data?.items || []) as FileItem[],
    analysis: analysisQuery.data || null,
    suggestions: suggestionsQuery.data?.suggestions || [],
    isLoading,
    isLoadingGoals: goalSuggestionsQuery.isLoading,
    isLoadingHistory: pipelineHistoryQuery.isLoading,
    isLoadingNotes: notesQuery.isLoading,
    isLoadingFiles: filesQuery.isLoading,
    isLoadingAnalysis: analysisQuery.isLoading,
    isLoadingSuggestions: suggestionsQuery.isLoading,
    error: getError(),
    refetchAll,
  };
}
