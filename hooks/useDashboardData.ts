/**
 * Dashboard Data Hook
 * Fetches data from the backend API endpoints for the dashboard screen
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useContacts } from './useContacts';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { mergeVoiceNotesWithInteractions } from '@/utils/voiceNoteHelpers';

export interface WarmthSummary {
  total_contacts: number;
  by_band: {
    hot: number;
    warm: number;
    neutral: number;
    cool: number;
    cold: number;
  };
  average_score: number;
  contacts_needing_attention: number;
  last_updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  contact_name?: string;
  contact_warmth?: number;
  contact_warmth_band?: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
  contact_avatar_url?: string;
  kind: string;
  channel?: string;
  direction?: string;
  summary?: string;
  sentiment?: string;
  content: string | null;
  metadata?: any;
  occurred_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionsResponse {
  items: Interaction[];
  limit: number;
  nextCursor: string | null;
  sort: string;
}

export interface Alert {
  type: 'cold' | 'due_today' | 'overdue';
  count: number;
  contacts?: any[];
}

// Warmth band thresholds - aligned with EWMA standard (warmth-ewma.ts)
const WARMTH_THRESHOLDS = {
  hot: 80,      // >= 80
  warm: 60,     // 60-79
  neutral: 40,  // 40-59
  cool: 20,     // 20-39
  // cold: < 20
};

function calculateWarmthBand(warmth: number): 'hot' | 'warm' | 'neutral' | 'cool' | 'cold' {
  if (warmth >= WARMTH_THRESHOLDS.hot) return 'hot';
  if (warmth >= WARMTH_THRESHOLDS.warm) return 'warm';
  if (warmth >= WARMTH_THRESHOLDS.neutral) return 'neutral';
  if (warmth >= WARMTH_THRESHOLDS.cool) return 'cool';
  return 'cold';
}

/**
 * Main dashboard data hook
 * Uses shared useContacts hook and calculates warmth summary on frontend
 */
export function useDashboardData() {
  // Fetch contacts using shared hook (Dashboard + People page share same cache)
  const contacts = useContacts();

  // Calculate warmth summary from contacts
  const warmthSummary = useQuery<WarmthSummary>({
    queryKey: ['warmth-summary', contacts.data],
    queryFn: async () => {
      const contactsList = contacts.data || [];
      
      const by_band = {
        hot: 0,
        warm: 0,
        neutral: 0,
        cool: 0,
        cold: 0,
      };

      let totalWarmth = 0;
      let contactsNeedingAttention = 0;

      contactsList.forEach((contact: any) => {
        const warmth = contact.warmth ?? 0;
        const band = calculateWarmthBand(warmth);
        by_band[band]++;
        totalWarmth += warmth;

        if (band === 'cold' || band === 'cool') {
          contactsNeedingAttention++;
        }
      });

      const average_score = contactsList.length > 0 
        ? Math.round((totalWarmth / contactsList.length) * 10) / 10 
        : 0;

      const summary: WarmthSummary = {
        total_contacts: contactsList.length,
        by_band,
        average_score,
        contacts_needing_attention: contactsNeedingAttention,
        last_updated_at: new Date().toISOString(),
      };

      console.log('[useDashboardData] Warmth summary calculated:', summary);
      return summary;
    },
    enabled: !!contacts.data,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent interactions from backend (includes voice notes)
  const recentInteractions = useQuery<InteractionsResponse>({
    queryKey: ['interactions', 'recent'],
    queryFn: async () => {
      console.log('[useDashboardData] Fetching interactions and voice notes...');
      
      // Fetch regular interactions
      const response = await apiFetch(
        '/api/v1/interactions?limit=10&sort=created_at:desc',
        {
          requireAuth: true,
        }
      );

      if (!response.ok) {
        console.error('[useDashboardData] Interactions fetch failed:', response.status);
        throw new Error(`Failed to fetch interactions: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Fetch voice notes
      const voiceNotes = await VoiceNotesRepo.all();
      
      // Merge contact-linked voice notes with interactions
      const mergedItems = mergeVoiceNotesWithInteractions(
        data.items || [],
        voiceNotes
      );
      
      console.log('[useDashboardData] Interactions + Voice Notes:', {
        regularInteractions: data.items?.length || 0,
        totalVoiceNotes: voiceNotes.length,
        merged: mergedItems.length,
        firstItem: mergedItems[0],
      });
      
      return {
        ...data,
        items: mergedItems.slice(0, 10), // Keep only top 10 after merge
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  });

  // Generate alerts from warmth summary
  const alerts = useQuery<Alert[]>({
    queryKey: ['alerts', warmthSummary.data],
    queryFn: async () => {
      const summary = warmthSummary.data;
      if (!summary) return [];

      const alertsList: Alert[] = [];

      // Cold contacts alert
      if (summary.by_band.cold > 0) {
        alertsList.push({
          type: 'cold',
          count: summary.by_band.cold,
        });
      }

      return alertsList;
    },
    enabled: !!warmthSummary.data,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = 
    contacts.isLoading ||
    warmthSummary.isLoading || 
    recentInteractions.isLoading;

  const refetchAll = async () => {
    await contacts.refetch(); // Refetch contacts first
    // warmthSummary and alerts will auto-recalculate from new contacts data
    await recentInteractions.refetch();
  };

  return {
    warmthSummary,
    recentInteractions,
    alerts,
    isLoading,
    refetchAll,
  };
}

/**
 * Transform warmth summary to legacy format for backward compatibility
 */
export function useWarmthSummaryLegacy() {
  const { warmthSummary } = useDashboardData();

  const legacyFormat = warmthSummary.data ? {
    hot: warmthSummary.data.by_band.hot,
    warm: warmthSummary.data.by_band.warm,
    cool: warmthSummary.data.by_band.cool,
    cold: warmthSummary.data.by_band.cold,
    total: warmthSummary.data.total_contacts,
  } : {
    hot: 0,
    warm: 0,
    cool: 0,
    cold: 0,
    total: 0,
  };

  return {
    data: legacyFormat,
    isLoading: warmthSummary.isLoading,
    error: warmthSummary.error,
    refetch: warmthSummary.refetch,
  };
}
