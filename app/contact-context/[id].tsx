import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { go } from '@/lib/navigation';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useNotesComposer } from '@/providers/NotesComposerProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import Avatar from '@/components/Avatar';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useWarmth } from '@/providers/WarmthProvider';
import { useWarmthSettings } from '@/providers/WarmthSettingsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { TextNotesRepo } from '@/repos/TextNotesRepo';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { TextNote, VoiceNote } from '@/storage/types';
import { Interaction } from '@/repos/InteractionsRepo';
import {
  ArrowLeft,
  MessageCircle,
  Mic,
  Heart,
  Star,
  Clock,
  Lock,
  Sparkles,
  Pen,
  Edit2,
  Trash2,
  X,
  FileText,
  Maximize2,
  Paperclip,
  Search,
  Home,
  Users,
  MessageSquare,
  Camera,
  Play,
  Pause,
  Volume2,
  RefreshCcw,
  ChevronLeft,
  Plus,
  Send,
  Phone,
  Mail,
  Eye,
  Calendar,
  MapPin,
  Building,
  Tag,
  UserPlus,
  XCircle,
} from 'lucide-react-native';
import WarmthGraph from '@/components/WarmthGraph';
import { PipelineThemes, ThemeColors } from '@/constants/pipelines';
import AuthGate from '@/components/AuthGate';
import { usePaywallGate } from '@/hooks/usePaywallGate';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useContactBundle } from '@/hooks/useContactBundle';
import { ContactBundleProvider } from '@/providers/ContactBundleProvider';
import { useQueryClient } from '@tanstack/react-query';
import type { ContactBundle } from '@/repos/ContactsRepo';
import { ContactChannels } from '@/components/ContactChannels';
import type { SocialMediaChannel } from '@/types/socialChannels';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
// Use dynamic import for DocumentPicker to avoid hard-failing when native module isn't present

type TabType = 'interactions' | 'notes' | 'insights' | 'details' | 'activity';

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'details', label: 'Details', icon: MessageCircle },
  { key: 'interactions', label: 'History', icon: Clock },
  { key: 'notes', label: 'Notes', icon: Mic },
  { key: 'activity', label: 'Activity', icon: Sparkles },
  { key: 'insights', label: 'Insights', icon: Star },
];

export default function ContactContextScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { people, refreshPeople } = usePeople();
  const { getByPerson } = useInteractions();
  const queryClient = useQueryClient();
  const { theme } = useAppSettings();
  const { isPaid } = useSubscription();
  const { voiceNotes: allVoiceNotes } = useVoiceNotes();
  const { refreshSingle, isRefreshing: isWarmthRefreshing, getWarmth } = useWarmth();
  const { getWarmthStatus } = useWarmthSettings();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('ContactContext');
  
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams();
  const requestedTabParam = Array.isArray(params.tab) ? params.tab[0] : (params.tab as string | undefined);
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [editingNote, setEditingNote] = useState<TextNote | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  // ✅ REMOVED: refreshingWarmth state - now using WarmthProvider.isRefreshing()
  const [newNoteText, setNewNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const audioSoundRef = useRef<Audio.Sound | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [relationshipAnalysis, setRelationshipAnalysis] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [warmthHistory, setWarmthHistory] = useState<Array<{ date: string; score: number }>>([]);
  const [loadingWarmthHistory, setLoadingWarmthHistory] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<7 | 30 | 90>(30);
  // Log each note's debug payload only once to avoid noisy repeated console logs on re-renders
  const loggedNoteIdsRef = useRef<Set<string>>(new Set());
  // Guard for details section debug logs
  const loggedDetailsRef = useRef<boolean>(false);
  // Track images that have completed loading at least once to avoid re-showing spinner
  const loadedImagesRef = useRef<Set<string>>(new Set());
  // Track images that errored in the last attempt
  const errorImagesRef = useRef<Set<string>>(new Set());
  // Tick used to force a lightweight re-render when load/error events occur
  const [imagesVersion, setImagesVersion] = useState(0);

  const person = people.find(p => p.id === id);
  const notesComposer = useNotesComposer();

  useEffect(() => {
    const index = tabs.findIndex(t => t.key === activeTab);
    const offset = index >= 0 ? index * screenWidth : 0;
    scrollViewRef.current?.scrollTo({ x: offset, animated: false });
  }, [screenWidth]);

  // Honor ?tab=interactions (or any valid tab key) on initial load
  useEffect(() => {
    if (!requestedTabParam) return;
    const match = tabs.findIndex(t => t.key === requestedTabParam);
    if (match >= 0) {
      setActiveTab(tabs[match].key);
      scrollViewRef.current?.scrollTo({ x: match * screenWidth, animated: false });
    }
  // only run when param or width changes
  }, [requestedTabParam, screenWidth]);

  const loadTextNotes = React.useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    
    try {
      setLoadingNotes(true);
      console.log('[ContactContext] Loading text notes for contact:', id);
      const notes = await TextNotesRepo.byPerson(id);
      console.log('[ContactContext] Loaded', notes.length, 'text notes');
      setTextNotes(notes);
    } catch (error) {
      console.error('[ContactContext] Failed to load text notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, [id]);

  const loadInteractions = React.useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    
    try {
      setLoadingInteractions(true);
      console.log('[ContactContext] Loading interactions for contact:', id);
      const data = await getByPerson(id);
      console.log('[ContactContext] Loaded', data.length, 'interactions');
      if (data.length > 0) {
        console.log('[ContactContext] Sample interaction:', JSON.stringify(data[0], null, 2));
      }
      setInteractions(data);
    } catch (error) {
      console.error('[ContactContext] Failed to load interactions:', error);
    } finally {
      setLoadingInteractions(false);
    }
  }, [id, getByPerson]);

  

  const loadAIInsights = React.useCallback(async () => {
    if (!id || typeof id !== 'string' || !isPaid) return;
    
    try {
      setLoadingInsights(true);
      console.log('[ContactContext] Loading AI insights for contact:', id);
      
      // Load relationship health analysis
      const analysisResponse = await apiFetch(`/api/v1/agent/analyze/contact`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contact_id: id,
          analysis_type: 'relationship_health',
          include_voice_notes: true,
          include_interactions: true,
        }),
      });
      
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        setRelationshipAnalysis(analysisData.analysis);
      }
      
      // Load AI suggestions
      const suggestionsResponse = await apiFetch(`/api/v1/agent/suggest/actions`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contact_id: id,
          limit: 5,
        }),
      });
      
      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        setAiSuggestions(suggestionsData.suggestions || []);
      }
      
      console.log('[ContactContext] AI insights loaded successfully');
    } catch (error) {
      console.error('[ContactContext] Failed to load AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  }, [id, isPaid]);

  // Bundle fetch: single source for contact, interactions, notes, files
  const bundleQuery = useContactBundle(typeof id === 'string' ? id : '');
  
  // Manual refresh state (separate from auto-fetching)
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  // Always refetch when screen gains focus so socials/custom fields are fresh
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      bundleQuery.refetch();
    }, [id])
  );
  
  // Handle manual refresh (pull-to-refresh)
  const handleManualRefresh = useCallback(async () => {
    setIsManuallyRefreshing(true);
    await bundleQuery.refetch();
    setIsManuallyRefreshing(false);
  }, [bundleQuery]);

  const INSIGHTS_COPY = {
    title: 'Unlock Relationship Insights',
    description: 'Get AI-powered insights about your relationships, including:',
    features: [
      'Relationship temperature analysis',
      'Communication pattern insights',
      'Shared interests & conversation starters',
      'Personalized recommendations',
    ],
  };

  // ✅ REFACTORED: Now uses centralized WarmthProvider
  const handleRefreshWarmth = async (silent: boolean = false) => {
    if (!id || typeof id !== 'string') return;
    try {
      // Debug metrics before recompute (optional)
      try {
        const c = (bundleQuery.data as any)?.contact || {};
        const lastISO: string | undefined = c.last_interaction_at || (person?.lastInteraction as any);
        const lastTs = lastISO ? new Date(lastISO).getTime() : undefined;
        const daysSince = typeof lastTs === 'number' ? Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24)) : undefined;
        const since90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const inter = Array.isArray(interactions) ? interactions : [];
        const inter90 = inter.filter((r: any) => {
          const t = new Date(r.created_at || r.createdAt || r.timestamp || Date.now()).getTime();
          return t >= since90;
        });
        const kinds30 = new Set(
          inter.filter((r: any) => {
            const t = new Date(r.created_at || r.createdAt || r.timestamp || Date.now()).getTime();
            return t >= since30 && typeof r.kind === 'string';
          }).map((r: any) => r.kind)
        ).size;
        console.log('[Warmth][Debug][Before] daysSince:', daysSince, 'interCount90:', inter90.length, 'distinctKinds30:', kinds30);
      } catch {}

      // Use centralized provider with force refresh
      await refreshSingle(id, { 
        force: true, 
        source: silent ? 'contact-auto-refresh' : 'contact-manual-refresh' 
      });
      
      // Refetch bundle and refresh people list
      await bundleQuery.refetch();
      try { await refreshPeople?.(); } catch {}
    } catch (e) {
      console.warn('[Warmth] Per-contact recompute failed:', (e as any)?.message || e);
      if (!silent) {
        Alert.alert('Warmth Refresh Failed', 'Unable to refresh warmth right now. Please try again.');
      }
    }
  };

  // ✅ REFACTORED: Auto-refresh warmth when stale (provider handles TTL automatically)
  useEffect(() => {
    (async () => {
      try {
        if (!id || typeof id !== 'string') return;
        // Provider's refreshSingle() already checks TTL and skips if < 6h old
        // This just triggers the check on mount/contact change
        await refreshSingle(id, { source: 'contact-mount-auto-check' });
        await bundleQuery.refetch();
      } catch (e) {
        console.warn('[Warmth] Auto refresh check failed:', (e as any)?.message || e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!bundleQuery.data) return;
    const b = bundleQuery.data;
    // Seed notes (text and screenshot only; voice notes come from VoiceNotesProvider to avoid duplicates)
    const bn = (b.notes || [])
      .filter((n: any) => n.type !== 'voice') // Exclude voice notes since they come from provider
      .map((n: any) => ({
        id: n.id,
        content: n.content,
        createdAt: n.created_at ? Date.parse(n.created_at) : (n.createdAt || Date.now()),
        personId: (n as any).person_id,
        metadata: n.metadata, // CRITICAL: Include metadata for screenshot file_url and other note metadata
      }));
    setTextNotes(bn as any);
    setLoadingNotes(false);
    setInteractions(b.interactions || []);
    setLoadingInteractions(false);
  }, [bundleQuery.data]);

  useEffect(() => {
    if (isPaid) {
      loadAIInsights();
    }
  }, [isPaid, loadAIInsights]);

  // ✅ REMOVED: This effect was causing infinite loops. The auto-refresh effect above
  // already handles refetching on mount/contact change. The useFocusEffect also handles
  // refetching when navigating back to this screen after edits.

  // Load Warmth History (best-effort; uses master endpoints order)
  // TEMPORARILY DISABLED: Backend endpoint returns 200 but missing CORS headers
  // See NETWORK_ERRORS_FIX.md for details
  const loadWarmthHistory = React.useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setLoadingWarmthHistory(true);
      
      // TEMPORARILY DISABLED - endpoint exists but CORS headers missing
      // Return empty until backend CORS is fixed
      setWarmthHistory([]);
    } catch {
      setWarmthHistory([]);
    } finally {
      setLoadingWarmthHistory(false);
    }
  }, [id, selectedWindow]);

  useEffect(() => {
    void loadWarmthHistory();
  }, [loadWarmthHistory, selectedWindow]);

  // Load persisted window
  useEffect(() => {
    AsyncStorage.getItem('ui/warmth_window')
      .then((val) => {
        if (val === '7' || val === '30' || val === '90') setSelectedWindow(Number(val) as 7 | 30 | 90);
      })
      .catch(() => {});
  }, []);

  // Get warmth data and theme (use fallbacks if person not found yet)
  const warmth = person ? getWarmth(person.id) : null;
  const warmthScore = warmth?.score || 0;
  const warmthStatus = getWarmthStatus(warmthScore);
  const personTheme = person?.theme;
  const themeKey = (personTheme && PipelineThemes.includes(personTheme)) ? personTheme : 'networking';
  const themeColors = ThemeColors[themeKey];
  
  // Get person details with safe fallbacks
  const personName = person?.fullName || person?.name || 'Unknown';
  const personInitial = person?.fullName?.charAt(0).toUpperCase() || person?.name?.charAt(0).toUpperCase() || '?';
  const personPhone = person?.phones?.[0] || '';

  const getWarmthColor = (status: string) => {
    switch (status) {
      case 'hot': return '#FF6B6B';
      case 'warm': return '#FFD93D';
      case 'cool': return '#95E1D3';
      case 'cold': return '#4ECDC4';
      default: return '#9C9C9C';
    }
  };

  const handleTabPress = (tabIndex: number) => {
    const tab = tabs[tabIndex];
    
    // Track tab change
    screenAnalytics.track('context_tab_changed', {
      contactId: id as string,
      tab: tab.key,
      previousTab: activeTab,
    });
    
    setActiveTab(tab.key);
    scrollViewRef.current?.scrollTo({ x: tabIndex * screenWidth, animated: true });
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const tabIndex = Math.round(offsetX / screenWidth);
        if (tabIndex >= 0 && tabIndex < tabs.length) {
          setActiveTab(tabs[tabIndex].key);
        }
      },
    }
  );



  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || dateString.trim() === '') {
      console.log('[ContactContext] Empty or null date string');
      return 'Unknown date';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('[ContactContext] Invalid date:', dateString);
        return 'Invalid date';
      }
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      console.error('[ContactContext] Date formatting error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
  };

  const renderInteractions = () => {
    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={isManuallyRefreshing} onRefresh={handleManualRefresh} />
        }
      >
        <Text style={styles.tabTitle}>Interaction History</Text>
        {loadingInteractions ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading interactions...</Text>
          </View>
        ) : interactions.length > 0 ? (
          <View style={styles.interactionsContainer}>
            {interactions.map((interaction) => {
              const content = interaction.content || interaction.summary || interaction.notes || 'No details recorded';
              const interactionType = interaction.type || 'note';
              const direction = interaction.direction ? ` (${interaction.direction})` : '';
              
              return (
                <View key={interaction.id} style={styles.interactionItem}>
                  <View style={styles.interactionHeader}>
                    <View style={[styles.interactionIcon, { backgroundColor: '#FFF9C4' }]}>
                      <FileText size={18} color="#F57F17" />
                    </View>
                    <View style={styles.interactionMeta}>
                      <Text style={styles.interactionType}>
                        {interactionType.charAt(0).toUpperCase() + interactionType.slice(1)}
                        {direction}
                      </Text>
                      <Text style={styles.interactionTime}>
                        {formatDate(interaction.occurred_at || new Date().toISOString())}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.interactionContent}>{content}</Text>
                  {interaction.duration_minutes && (
                    <Text style={styles.interactionDuration}>
                      Duration: {interaction.duration_minutes} minutes
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Clock size={48} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No interactions recorded yet</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const handleEditNote = (note: TextNote) => {
    // Track note edit initiated
    screenAnalytics.track('context_note_edit_initiated', {
      contactId: id as string,
      noteId: note.id,
      noteLength: note.content.length,
    });
    
    setEditingNote(note);
    setEditedContent(note.content);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      setDeletingFileId(fileId);
      console.log('[ContactContext] Deleting file:', fileId);

      // Delete from attachments table
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('[ContactContext] File delete error:', error);
        Alert.alert('Error', 'Failed to delete file');
        return;
      }

      console.log('[ContactContext] File deleted successfully');
      // Refetch contact bundle to update files list
      bundleQuery.refetch();
    } catch (err) {
      console.error('[ContactContext] File delete failed:', err);
      Alert.alert('Error', 'Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDeleteNote = async (note: TextNote) => {
    const confirmDelete = Platform.OS === 'web'
      ? confirm('Are you sure you want to delete this note?')
      : true;

    if (!confirmDelete) return;

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Delete Note',
        'Are you sure you want to delete this note?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDeleteNote(note);
            },
          },
        ]
      );
    } else {
      await performDeleteNote(note);
    }
  };

  const performDeleteNote = async (note: TextNote) => {
    try {
      setDeletingNoteId(note.id);
      console.log('[ContactContext] Deleting note:', note.id);
      
      // Check if note has associated file (screenshot)
      const noteMetadata = (note as any).metadata;
      const hasFile = noteMetadata?.file_url && noteMetadata?.file_id;
      
      if (hasFile) {
        console.log('[ContactContext] Note has associated file, deleting:', noteMetadata.file_id);
        try {
          // Delete the file from storage via backend
          const deleteFileResponse = await apiFetch(`/api/v1/files/${noteMetadata.file_id}`, {
            method: 'DELETE',
            requireAuth: true,
          });
          
          if (deleteFileResponse.ok) {
            console.log('[ContactContext] Associated file deleted successfully');
          } else {
            console.warn('[ContactContext] Failed to delete associated file:', deleteFileResponse.status);
            // Continue with note deletion even if file deletion fails
          }
        } catch (fileError) {
          console.error('[ContactContext] Error deleting associated file:', fileError);
          // Continue with note deletion even if file deletion fails
        }
      }
      
      // Track note deletion
      screenAnalytics.track('context_note_deleted', {
        contactId: id as string,
        noteId: note.id,
        noteLength: note.content.length,
        hadFile: hasFile,
      });
      
      await TextNotesRepo.remove(note.id);
      setTextNotes(prev => prev.filter(n => n.id !== note.id));
      
      // Optimistically update bundle cache
      queryClient.setQueryData(['contact-bundle', id], (old: ContactBundle | undefined) => {
        if (!old) return old;
        return {
          ...old,
          notes: (old.notes || []).filter(n => n.id !== note.id),
        };
      });
      
      console.log('[ContactContext] Note deleted successfully');
      
      // Show success feedback
      if (Platform.OS === 'web') {
        // For web, just log success
      } else {
        // For mobile, could show a toast/snackbar (currently just succeeds silently)
      }
    } catch (error) {
      console.error('[ContactContext] Failed to delete note:', error);
      analytics.errors.occurred(error as Error, 'ContactContext');
      if (Platform.OS === 'web') {
        alert('Failed to delete note. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete note. Please try again.');
      }
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleDeleteVoiceNote = async (note: VoiceNote) => {
    const confirmDelete = Platform.OS === 'web'
      ? confirm('Are you sure you want to delete this voice note?')
      : true;

    if (!confirmDelete) return;

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Delete Voice Note',
        'Are you sure you want to delete this voice note?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDeleteVoiceNote(note);
            },
          },
        ]
      );
    } else {
      await performDeleteVoiceNote(note);
    }
  };

  const performDeleteVoiceNote = async (note: VoiceNote) => {
    try {
      setDeletingNoteId(note.id);
      console.log('[ContactContext] Deleting voice note:', note.id);
      
      // Track voice note deletion
      screenAnalytics.track('context_voice_note_deleted', {
        contactId: id as string,
        noteId: note.id,
        transcriptionLength: note.transcription?.length || 0,
      });
      
      await VoiceNotesRepo.remove(note.id);
      
      // Refresh bundle to update voice notes list
      bundleQuery.refetch();
      
      console.log('[ContactContext] Voice note deleted successfully');
      
      // Show success feedback
      if (Platform.OS === 'web') {
        // For web, just log success
      } else {
        // For mobile, could show a toast/snackbar (currently just succeeds silently)
      }
    } catch (error) {
      console.error('[ContactContext] Failed to delete voice note:', error);
      analytics.errors.occurred(error as Error, 'ContactContext');
      if (Platform.OS === 'web') {
        alert('Failed to delete voice note. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete voice note. Please try again.');
      }
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNote || !editedContent.trim()) return;
    try {
      setSavingNote(true);
      console.log('[ContactContext] Saving edited note:', editingNote.id);
      
      // Track note save
      screenAnalytics.track('context_note_saved', {
        contactId: id as string,
        noteId: editingNote.id,
        originalLength: editingNote.content.length,
        newLength: editedContent.trim().length,
      });
      
      const updatedNote: TextNote = {
        ...editingNote,
        content: editedContent.trim(),
        createdAt: editingNote.createdAt, // Keep original creation time
      };
      
      await TextNotesRepo.upsert(updatedNote);
      setTextNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
      
      // Optimistically update bundle cache
      queryClient.setQueryData(['contact-bundle', id], (old: ContactBundle | undefined) => {
        if (!old) return old;
        return {
          ...old,
          notes: (old.notes || []).map(n => 
            n.id === editingNote.id 
              ? { ...n, content: editedContent.trim() } 
              : n
          ),
        };
      });
      
      setEditingNote(null);
      setEditedContent('');
      console.log('[ContactContext] Note saved successfully');
    } catch (error) {
      console.error('[ContactContext] Failed to save note:', error);
      analytics.errors.occurred(error as Error, 'ContactContext');
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  // Helper to construct full storage URL if needed
  const getFullStorageUrl = (pathOrUrl: string): string => {
    if (!pathOrUrl) return '';
    // Configure from environment
    const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'attachments';

    // Helper to build a public URL from a storage path
    const toPublicUrl = (p: string) => {
      const clean = (p || '').replace(/^\/+/, '');
      if (SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`;
      }
      // Fallback to default known project if env missing
      return `https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`;
    };

    // If already a full URL
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      // Fix old presigned upload URLs (wrong format saved in old notes)
      if (pathOrUrl.includes('/upload/sign/')) {
        const pathMatch = pathOrUrl.match(/\/upload\/sign\/(.+?)(\?|$)/);
        if (pathMatch && pathMatch[1]) {
          const newPath = pathMatch[1].replace(/^attachments\//, '');
          return toPublicUrl(newPath);
        }
      }
      // If URL points to a different Supabase project host, normalize to current env host
      try {
        const u = new URL(pathOrUrl);
        const envUrl = SUPABASE_URL;
        if (u.hostname.endsWith('supabase.co')) {
          if (envUrl && !u.origin.startsWith(envUrl)) {
            // Swap origin to current project
            return `${envUrl}${u.pathname}`;
          }
          // If env not available, normalize to known fallback host used by the app
          if (!envUrl && !u.hostname.startsWith('utasetfxiqcrnwyfforx')) {
            return `https://utasetfxiqcrnwyfforx.supabase.co${u.pathname}`;
          }
        }
      } catch {}
      // Otherwise return as-is
      return pathOrUrl;
    }

    // Otherwise, construct full Supabase storage URL from path
    return toPublicUrl(pathOrUrl);
  };

  // Audio playback handlers
  const playAudio = async (audioUrl: string, noteId: string) => {
    try {
      // Stop currently playing audio if any
      if (audioSoundRef.current) {
        await audioSoundRef.current.unloadAsync();
        audioSoundRef.current = null;
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.durationMillis) {
            const progress = status.positionMillis / status.durationMillis;
            setAudioProgress(prev => ({ ...prev, [noteId]: progress * 100 }));
            
            if (status.didJustFinish) {
              setPlayingAudioId(null);
              setAudioProgress(prev => ({ ...prev, [noteId]: 0 }));
            }
          }
        }
      );

      audioSoundRef.current = sound;
      setPlayingAudioId(noteId);
    } catch (error) {
      console.error('[ContactContext] Audio playback error:', error);
      Alert.alert('Playback Error', 'Unable to play audio file');
    }
  };

  const pauseAudio = async () => {
    try {
      if (audioSoundRef.current) {
        // Check if sound is still loaded before pausing
        const status = await audioSoundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await audioSoundRef.current.stopAsync();
          await audioSoundRef.current.unloadAsync();
        }
        audioSoundRef.current = null;
        setPlayingAudioId(null);
      }
    } catch (error) {
      console.error('[ContactContext] Audio pause error:', error);
      // Even if error occurs, clear the state
      audioSoundRef.current = null;
      setPlayingAudioId(null);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioSoundRef.current) {
        audioSoundRef.current.getStatusAsync().then(status => {
          if (status.isLoaded) {
            audioSoundRef.current?.unloadAsync();
          }
        }).catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  const renderNotes = () => {
    const voiceNotesForPerson = allVoiceNotes.filter(vn => vn.personId === id);
    
    type CombinedNote = 
      | { type: 'text'; data: TextNote }
      | { type: 'voice'; data: VoiceNote };
    
    const combinedNotes: CombinedNote[] = [
      ...textNotes.map(note => ({ type: 'text' as const, data: note })),
      ...voiceNotesForPerson.map(note => ({ type: 'voice' as const, data: note }))
    ].sort((a, b) => b.data.createdAt - a.data.createdAt);

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={isManuallyRefreshing} onRefresh={handleManualRefresh} />
        }
      >
        <Text style={styles.tabTitle}>Notes</Text>
        
        {/* Add New Note Section */}
        <View style={styles.addNoteSection}>
          <View style={styles.addNoteSectionHeader}>
            <Text style={styles.addNoteSectionTitle}>Add New Note</Text>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => {
                if (!id || typeof id !== 'string') return;
                notesComposer.open({
                  target: { type: 'contact', personId: id as string, personName: person?.name },
                  initialText: newNoteText,
                  onSaved: () => {
                    setNewNoteText('');
                    bundleQuery.refetch();
                  },
                });
              }}
            >
              <Maximize2 size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <CrossPlatformTextInput
            style={styles.noteInput}
            placeholder="What happened in your interaction with this contact?"
            placeholderTextColor="#999999"
            value={newNoteText}
            onChangeText={setNewNoteText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.addNoteButton,
              { backgroundColor: newNoteText.trim() ? '#D1D5DB' : '#F3F4F6' }
            ]}
            onPress={() => {
              if (!id || typeof id !== 'string' || !newNoteText.trim()) return;
              notesComposer.open({
                target: { type: 'contact', personId: id as string, personName: person?.name },
                initialText: newNoteText,
                onSaved: () => {
                  setNewNoteText('');
                  bundleQuery.refetch();
                }
              });
            }}
            disabled={!newNoteText.trim()}
          >
            <Text style={[styles.addNoteButtonText, { color: newNoteText.trim() ? '#000000' : '#9CA3AF' }]}>+ Add Note</Text>
          </TouchableOpacity>
        </View>

        {/* Search Notes */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <CrossPlatformTextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* All Notes & Interactions */}
        <Text style={styles.allNotesHeader}>
          All Notes & Interactions
          {searchQuery && ` (${combinedNotes.filter(note => {
            const content = note.type === 'voice' 
              ? (note.data as VoiceNote).transcription 
              : (note.data as TextNote).content;
            return content?.toLowerCase().includes(searchQuery.toLowerCase());
          }).length} results)`}
        </Text>
        {loadingNotes ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading notes...</Text>
          </View>
        ) : (() => {
          const filteredNotes = combinedNotes.filter(note => {
            if (!searchQuery) return true;
            const content = note.type === 'voice' 
              ? (note.data as VoiceNote).transcription 
              : (note.data as TextNote).content;
            return content?.toLowerCase().includes(searchQuery.toLowerCase());
          });

          if (filteredNotes.length > 0) {
            return filteredNotes.map((note, index) => {
            const isVoice = note.type === 'voice';
            const noteData = note.data;
            const content = isVoice 
              ? (noteData as VoiceNote).transcription 
              : (noteData as TextNote).content;
            const isDeleting = deletingNoteId === noteData.id;
            
            // Check if note has screenshot image metadata
            const noteMetadata = (noteData as any).metadata;
            const screenshotPath = noteMetadata?.file_path || noteMetadata?.file_url;
            
            // More lenient screenshot detection - check metadata type OR content
            const isScreenshotNote = content?.includes('📸 Screenshot Analysis') || 
                                    noteMetadata?.type === 'screenshot_analysis';
            const hasScreenshot = !!screenshotPath && isScreenshotNote;
            
            // Construct full Supabase storage URL for screenshots
            const screenshotUrl = hasScreenshot && screenshotPath
              ? getFullStorageUrl(screenshotPath)
              : null;
            const urlKey = screenshotUrl ? screenshotUrl.split('?')[0] : '';
            
            // Debug log once per note to avoid repeating on every render
            if (!loggedNoteIdsRef.current.has(noteData.id)) {
              console.log('[ContactContext] Note data:', {
                noteId: noteData.id,
                contentPreview: content?.substring(0, 50),
                hasMetadata: !!noteMetadata,
                metadataType: noteMetadata?.type,
                metadataFileUrl: noteMetadata?.file_url,
                screenshotPath,
                isScreenshotNote,
                hasScreenshot,
                screenshotUrl,
              });
              loggedNoteIdsRef.current.add(noteData.id);
            }
            
            return (
              <TouchableOpacity
                key={`${note.type}-${noteData.id}`}
                style={[styles.noteCard, isDeleting && styles.noteCardDeleting]}
                onPress={() => {
                  if (!isVoice && !isDeleting) {
                    handleEditNote(noteData as TextNote);
                  }
                }}
                disabled={isVoice || isDeleting}
                activeOpacity={isVoice ? 1 : 0.7}
              >
                <View style={styles.noteHeader}>
                  {isVoice ? (
                    <Mic size={16} color={themeColors.primary} />
                  ) : (
                    <Pen size={16} color={themeColors.primary} />
                  )}
                  <Text style={styles.noteDate}>
                    {formatDate(new Date(noteData.createdAt).toISOString())}
                  </Text>
                  <Text style={styles.noteType}>{isVoice ? 'Voice' : 'Text'}</Text>
                </View>
                
                {/* Display screenshot image if available */}
                {hasScreenshot && screenshotUrl && !imageLoadErrors.has(urlKey) && (
                  <TouchableOpacity 
                    style={styles.screenshotContainer}
                    onPress={(e) => {
                      e.stopPropagation();
                      setFullScreenImage(screenshotUrl);
                    }}
                  >
                    {!loadedImagesRef.current.has(urlKey) && (
                      <View style={[styles.screenshotImage, styles.screenshotPlaceholder]}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.screenshotPlaceholderSubtext}>Loading image...</Text>
                      </View>
                    )}
                    <Image
                      source={{ uri: screenshotUrl }}
                      style={styles.screenshotImage}
                      resizeMode="cover"
                      onLoadStart={() => {
                        // Clear last error; do not toggle loading state to avoid flicker
                        errorImagesRef.current.delete(urlKey);
                      }}
                      onError={() => {
                        // Mark as error; onLoadEnd will still clear the loading state
                        setImageLoadErrors(prev => new Set(prev).add(urlKey));
                        errorImagesRef.current.add(urlKey);
                        // Bump version to re-render and show error placeholder
                        setImagesVersion(v => v + 1);
                      }}
                      onLoad={() => {
                        loadedImagesRef.current.add(urlKey);
                        setImagesVersion(v => v + 1);
                      }}
                      onLoadEnd={() => {
                        if (!errorImagesRef.current.has(urlKey)) {
                          loadedImagesRef.current.add(urlKey);
                        }
                        setImagesVersion(v => v + 1);
                      }}
                    />
                  </TouchableOpacity>
                )}
                
                {/* Show placeholder if image failed to load */}
                {hasScreenshot && screenshotUrl && imageLoadErrors.has(urlKey) && (
                  <View style={styles.screenshotContainer}>
                    <View style={[styles.screenshotImage, styles.screenshotPlaceholder]}>
                      <Camera size={48} color="#9CA3AF" />
                      <Text style={styles.screenshotPlaceholderText}>Image unavailable</Text>
                      <Text style={styles.screenshotPlaceholderSubtext}>Tap to view analysis</Text>
                    </View>
                  </View>
                )}
                
                {/* Display audio player if note has audio */}
                {/* Primary: voice notes from VoiceNotesProvider */}
                {isVoice && (noteData as VoiceNote).audioUri && (
                  <View style={styles.audioPlayerContainer}>
                    <TouchableOpacity
                      style={styles.audioPlayButton}
                      onPress={() => {
                        const isPlaying = playingAudioId === noteData.id;
                        if (isPlaying) {
                          pauseAudio();
                        } else {
                          const audioUrl = (noteData as VoiceNote).audioUri;
                          playAudio(audioUrl, noteData.id);
                        }
                      }}
                    >
                      {playingAudioId === noteData.id ? (
                        <Pause size={20} color="#007AFF" />
                      ) : (
                        <Play size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                      <Text style={styles.audioLabel}>Voice Note</Text>
                      <View style={styles.audioMeta}>
                        {audioProgress[noteData.id] > 0 && (
                          <View style={styles.audioProgressBar}>
                            <View style={[styles.audioProgressFill, { width: `${audioProgress[noteData.id]}%` }]} />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                {/* Fallback: legacy voice notes stored in note metadata */}
                {(noteMetadata?.file_path || noteMetadata?.file_url) && noteMetadata?.type === 'voice_note' && (
                  <View style={styles.audioPlayerContainer}>
                    <TouchableOpacity
                      style={styles.audioPlayButton}
                      onPress={() => {
                        const isPlaying = playingAudioId === noteData.id;
                        if (isPlaying) {
                          pauseAudio();
                        } else {
                          const audioUrl = getFullStorageUrl(noteMetadata.file_path || noteMetadata.file_url);
                          playAudio(audioUrl, noteData.id);
                        }
                      }}
                    >
                      {playingAudioId === noteData.id ? (
                        <Pause size={20} color="#007AFF" />
                      ) : (
                        <Play size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                      <Text style={styles.audioLabel}>Voice Note</Text>
                      <View style={styles.audioMeta}>
                        {noteMetadata.duration_sec && (
                          <Text style={styles.audioDuration}>
                            {Math.floor(noteMetadata.duration_sec / 60)}:{(noteMetadata.duration_sec % 60).toString().padStart(2, '0')}
                          </Text>
                        )}
                        {audioProgress[noteData.id] > 0 && (
                          <View style={styles.audioProgressBar}>
                            <View style={[styles.audioProgressFill, { width: `${audioProgress[noteData.id]}%` }]} />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                
                <Text style={styles.noteContent}>{content}</Text>
                <View style={styles.noteActions}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FF6B6B" />
                  ) : (
                    <>
                      {!isVoice && (
                        <TouchableOpacity
                          style={styles.noteActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditNote(noteData as TextNote);
                          }}
                        >
                          <Edit2 size={16} color="#666666" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.noteActionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (isVoice) {
                            handleDeleteVoiceNote(noteData as VoiceNote);
                          } else {
                            handleDeleteNote(noteData as TextNote);
                          }
                        }}
                      >
                        <Trash2 size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
            });
          } else if (combinedNotes.length > 0) {
            // Has notes but search returned no results
            return (
              <View style={styles.emptyState}>
                <Search size={48} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>
                  No notes found for "{searchQuery}"
                </Text>
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            );
          } else {
            // No notes at all
            return (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconRow}>
                  <Mic size={48} color="#CCCCCC" />
                  <Pen size={48} color="#CCCCCC" />
                </View>
                <Text style={styles.emptyStateText}>No notes recorded yet</Text>
                <TouchableOpacity 
                  style={styles.addNoteButton}
                  onPress={() => {
                    if (!id || typeof id !== 'string') return;
                    notesComposer.open({
                      target: { type: 'contact', personId: id as string, personName: person?.name },
                      onSaved: () => {
                        setNewNoteText('');
                        bundleQuery.refetch();
                      }
                    });
                  }}
                >
                  <Text style={styles.addNoteButtonText}>Add First Note</Text>
                </TouchableOpacity>
              </View>
            );
          }
        })()}

        {Array.isArray(bundleQuery.data?.files) && bundleQuery.data!.files.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.filesTitle}>Files & Documents</Text>
            {bundleQuery.data!.files.map((f: any) => {
              const name = f.filename || f.name || 'File';
              const when = formatDate(f.uploaded_at || f.created_at || f.updated_at || '');
              const isDeleting = deletingFileId === f.id;
              return (
                <View key={`file-${f.id || name}`} style={styles.fileRow}>
                  <View style={styles.fileIcon}>
                    <Paperclip size={16} color="#374151" />
                  </View>
                  <View style={styles.fileMeta}>
                    <Text style={styles.fileName}>{name}</Text>
                    <Text style={styles.fileSub}>{when}</Text>
                  </View>
                  {f.id && (
                    <TouchableOpacity
                      style={styles.fileDeleteButton}
                      onPress={() => handleDeleteFile(f.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <XCircle size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // legacy add note flow removed in favor of NotesComposer

  const renderDetails = () => {
    const c = (bundleQuery.data as any)?.contact || {};
    const fullName = c.display_name || person.fullName || person.name;
    const company = c.company || person.company;
    const title = c.title || person.title;
    const primaryEmail = (Array.isArray(c.emails) && c.emails[0]) || (person.emails && person.emails[0]);
    const primaryPhone = (Array.isArray(c.phones) && c.phones[0]) || (person.phones && person.phones[0]);
    const tags = Array.isArray(c.tags) && c.tags.length ? c.tags : person.tags;
    const interests = Array.isArray(c.interests) && c.interests.length ? c.interests : (person.interests || []);
    const emails: string[] = Array.isArray(c.emails) ? c.emails : (person.emails || []);
    const phones: string[] = Array.isArray(c.phones) ? c.phones : (person.phones || []);
    const socialChannels: SocialMediaChannel[] = (
      (Array.isArray(c.social_channels) && c.social_channels.length ? c.social_channels : null)
      || ((person as any).social_channels as SocialMediaChannel[] | undefined)
      || ((c as any).metadata?.social_channels as SocialMediaChannel[] | undefined)
      || ((person as any).metadata?.social_channels as SocialMediaChannel[] | undefined)
      || []
    );
    
    if (!loggedDetailsRef.current) {
      console.log('[ContactContext Details] Social channels debug:', {
        from_c_social_channels: c.social_channels,
        from_person_social_channels: (person as any).social_channels,
        from_c_metadata: (c as any).metadata?.social_channels,
        from_person_metadata: (person as any).metadata?.social_channels,
        final_count: socialChannels.length,
        final_data: socialChannels,
      });
    }
    const preferredChannels: string[] = (
      (c.metadata?.comms?.channelsPreferred as string[] | undefined)
      || (c.comms?.channelsPreferred as string[] | undefined)
      || ((person as any).comms?.channelsPreferred as string[] | undefined)
      || []
    );
    const createdAtISO = c.created_at || (person.createdAt ? new Date(person.createdAt).toISOString() : undefined);
    const lastInteractionISO = c.last_interaction_at || (person.lastInteraction ? new Date(person.lastInteraction).toISOString() : undefined);

    if (!loggedDetailsRef.current) {
      console.log('[ContactContext Details] Rendering ContactChannels with:', {
        contactId: id,
        emailsCount: emails.length,
        phonesCount: phones.length,
        socialChannelsCount: socialChannels.length,
        socialChannelsData: JSON.stringify(socialChannels),
        hideSocialHeader: true,
      });
      loggedDetailsRef.current = true;
    }
    
    return (
      <View style={styles.tabContent}>
        {/* Communication Channels with Social Media (expandable, CRUD, preferred) */}
        <ContactChannels
          contactId={id as string}
          emails={emails}
          phones={phones}
          socialChannels={socialChannels}
          preferredChannels={preferredChannels}
          initiallyExpanded={false}
          showEditIcon={false}
          hideSocialHeader={true}
          onUpdateSocialChannels={async (channels: SocialMediaChannel[]) => {
            try {
              console.log('[ContactContext] onUpdateSocialChannels called with:', JSON.stringify(channels, null, 2));
              
              const validChannels = channels.filter(ch => {
                const isValid = ch.platform && ch.handle && ch.url && ch.url.startsWith('http');
                console.log('[ContactContext] Channel validation:', { 
                  platform: ch.platform, 
                  handle: ch.handle, 
                  url: ch.url,
                  isValid 
                });
                return isValid;
              });
              
              console.log('[ContactContext] Valid channels after filtering:', validChannels.length, 'of', channels.length);
              console.log('[ContactContext] Valid channels data:', JSON.stringify(validChannels, null, 2));
              
              const updatePayload: any = { social_channels: validChannels };
              // include tags to avoid empty payload issues
              updatePayload.tags = Array.isArray(c.tags) ? c.tags : (person.tags || []);
              
              console.log('[ContactContext] Sending PATCH to /api/v1/contacts/' + id);
              console.log('[ContactContext] Payload:', JSON.stringify(updatePayload, null, 2));
              
              const res = await apiFetch(`/api/v1/contacts/${id}`, {
                method: 'PATCH',
                requireAuth: true,
                body: JSON.stringify(updatePayload),
                headers: { 'Content-Type': 'application/json' },
              });
              
              console.log('[ContactContext] PATCH response status:', res.status, res.ok);
              
              if (!res.ok) {
                const t = await res.text();
                console.error('[ContactContext] PATCH failed with response:', t);
                throw new Error(`Update social_channels failed: ${res.status} ${t}`);
              }
              
              const responseData = await res.json();
              console.log('[ContactContext] PATCH success, response data:', responseData);
              
              console.log('[ContactContext] Refetching bundle query...');
              await bundleQuery.refetch();
              
              console.log('[ContactContext] Invalidating queries...');
              queryClient.invalidateQueries({ queryKey: ['contact-bundle', id] });
              
              console.log('[ContactContext] Social channels save completed successfully');
            } catch (e) {
              console.error('[ContactContext] Social channels update failed:', e);
              console.error('[ContactContext] Error details:', JSON.stringify(e, null, 2));
              throw e;
            }
          }}
          onSetPreferredChannel={async (platform: string) => {
            try {
              const current: string[] = preferredChannels || [];
              const socialPlatforms = ['instagram','twitter','linkedin','facebook','whatsapp','telegram','tiktok','snapchat','youtube','threads','pinterest','twitch','discord','custom'];
              const nonSocial = current.filter(p => !socialPlatforms.includes(p));
              const next = Array.from(new Set([...nonSocial, platform]));
              const existingMeta = (c.metadata || {}) as any;
              const nextMeta = {
                ...existingMeta,
                comms: {
                  ...(existingMeta.comms || {}),
                  channelsPreferred: next,
                },
              };
              const res = await apiFetch(`/api/v1/contacts/${id}`, {
                method: 'PATCH',
                requireAuth: true,
                body: JSON.stringify({ metadata: nextMeta }),
                headers: { 'Content-Type': 'application/json' },
              });
              if (!res.ok) {
                const t = await res.text();
                throw new Error(`Set preferred channel failed: ${res.status} ${t}`);
              }
              await bundleQuery.refetch();
              queryClient.invalidateQueries({ queryKey: ['contact-bundle', id] });
            } catch (e) {
              console.error('[ContactContext] Set preferred channel failed:', e);
              throw e;
            }
          }}
          editable={true}
        />

        <Text style={styles.tabTitle}>Contact Details</Text>
        
        {/* Basic Info */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>📇 Basic Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{fullName}</Text>
          </View>
          {company && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company</Text>
              <Text style={styles.detailValue}>{company}</Text>
            </View>
          )}
          {title && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Title</Text>
              <Text style={styles.detailValue}>{title}</Text>
            </View>
          )}
          {primaryEmail && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{primaryEmail}</Text>
            </View>
          )}
          {primaryPhone && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{primaryPhone}</Text>
            </View>
          )}
        </View>

        {/* Tags & Interests */}
        {(tags && tags.length > 0) || (interests && interests.length > 0) ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>🏷️ Tags & Interests</Text>
            {tags && tags.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Tags</Text>
                <View style={styles.tagContainer}>
                  {tags.map((tag: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {interests && interests.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Interests</Text>
                <View style={styles.tagContainer}>
                  {interests.map((interest: string, index: number) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Custom Fields */}
        {(() => {
          const c = (bundleQuery.data as any)?.contact || {};
          const fromLocal = Array.isArray((person as any).customFields) ? (person as any).customFields : [];
          const fromCamel = Array.isArray(c.customFields) ? c.customFields : [];
          let fromSnake: Array<{ key: string; value: any }> = [];
          if (Array.isArray(c.custom_fields)) {
            fromSnake = c.custom_fields
              .map((it: any) => ({ key: it?.key || it?.slug || it?.name, value: it?.value }))
              .filter((f: any) => typeof f?.key === 'string' && f.key.length > 0);
          } else if (c.custom_fields && typeof c.custom_fields === 'object') {
            fromSnake = Object.entries(c.custom_fields).map(([key, value]) => ({ key, value }));
          }

          // Also support metadata shapes
          const meta = (c.metadata || {}) as any;
          let fromMeta: Array<{ key: string; value: any }> = [];
          if (Array.isArray(meta?.custom_fields)) {
            fromMeta = meta.custom_fields
              .map((it: any) => ({ key: it?.key || it?.slug || it?.name, value: it?.value }))
              .filter((f: any) => typeof f?.key === 'string' && f.key.length > 0);
          } else if (meta?.custom_fields && typeof meta.custom_fields === 'object') {
            fromMeta = Object.entries(meta.custom_fields).map(([key, value]) => ({ key, value }));
          } else if (Array.isArray(meta?.customFields)) {
            fromMeta = meta.customFields
              .map((it: any) => ({ key: it?.key, value: it?.value }))
              .filter((f: any) => typeof f?.key === 'string' && f.key.length > 0);
          }

          const merged: Array<{ key: string; value: string }> = [];
          const seen = new Set<string>();
          [...fromLocal, ...fromCamel, ...fromSnake, ...fromMeta].forEach((f: any) => {
            if (!f || typeof f.key !== 'string' || f.key.length === 0) return;
            const val = String(f.value ?? '');
            if (seen.has(f.key)) {
              const idx = merged.findIndex(m => m.key === f.key);
              if (idx >= 0) merged[idx] = { key: f.key, value: val };
            } else {
              seen.add(f.key);
              merged.push({ key: f.key, value: val });
            }
          });

          if (merged.length === 0) return null;

          const humanize = (k: string) => k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());
          return (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>✨ Custom Fields</Text>
              {merged.map((field, index) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{humanize(field.key)}</Text>
                  <Text style={styles.detailValue}>{field.value}</Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Pipeline & Status */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>📊 Status</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pipeline</Text>
            <Text style={styles.detailValue}>{person.pipeline || person.theme || 'Networking'}</Text>
          </View>
          {person.status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{person.status}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Warmth</Text>
            <Text style={[styles.detailValue, { color: getWarmthColor(warmthStatus), fontWeight: '600' }]}>
              {warmthStatus.toUpperCase()} ({warmthScore})
            </Text>
          </View>
          <View style={styles.inlineActionRow}>
            <TouchableOpacity
              onPress={() => handleRefreshWarmth(false)}
              disabled={isWarmthRefreshing(typeof id === 'string' ? id : undefined)}
              style={styles.refreshWarmthButton}
            >
              {isWarmthRefreshing(typeof id === 'string' ? id : undefined) ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <View style={styles.refreshContentRow}>
                  <RefreshCcw size={14} color="#3B82F6" />
                  <Text style={styles.refreshWarmthLabel}>Refresh Warmth</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {person.cadenceDays && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Touch Cadence</Text>
              <Text style={styles.detailValue}>Every {person.cadenceDays} days</Text>
            </View>
          )}
        </View>

        {/* Timestamps */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>⏰ Timeline</Text>
          {createdAtISO && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Added</Text>
              <Text style={styles.detailValue}>{formatDate(createdAtISO)}</Text>
            </View>
          )}
          {lastInteractionISO && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Contact</Text>
              <Text style={styles.detailValue}>{formatDate(lastInteractionISO)}</Text>
            </View>
          )}
          {person.nextTouchAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Next Touch</Text>
              <Text style={styles.detailValue}>{formatDate(person.nextTouchAt)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActivity = () => {
    const totalInteractions = interactions.length;
    const totalNotes = textNotes.length + allVoiceNotes.filter(vn => vn.personId === id).length;
    const daysSinceAdded = person.createdAt 
      ? Math.floor((Date.now() - person.createdAt) / (1000 * 60 * 60 * 24))
      : 0;
    const series = warmthHistory.slice(-(selectedWindow as number));
    const maxWarmth = Math.max(1, ...series.map((p) => (typeof p.score === 'number' ? p.score : 0)));

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={isManuallyRefreshing} onRefresh={handleManualRefresh} />
        }
      >
        <Text style={styles.tabTitle}>Activity Summary</Text>
        
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#EBF5FF' }]}>
              <MessageCircle size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{totalInteractions}</Text>
            <Text style={styles.statLabel}>Interactions</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Mic size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{totalNotes}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{daysSinceAdded}</Text>
            <Text style={styles.statLabel}>Days Known</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: getWarmthColor(warmthStatus) + '20' }]}>
              <Heart size={24} color={getWarmthColor(warmthStatus)} />
            </View>
            <Text style={[styles.statNumber, { color: getWarmthColor(warmthStatus) }]}>{warmthScore}</Text>
            <Text style={styles.statLabel}>Warmth</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>📈 Recent Activity</Text>
          {person.lastInteraction ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Interaction</Text>
                <Text style={styles.detailValue}>
                  {Math.floor((Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </Text>
              </View>
              {person.lastInteractionSummary && (
                <View style={styles.activitySummaryBox}>
                  <Text style={styles.activitySummaryText}>{person.lastInteractionSummary}</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>

        {/* Communication Preferences */}
        {(person as any).comms?.channelsPreferred && (person as any).comms.channelsPreferred.length > 0 ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>💬 Communication Preferences</Text>
            <Text style={styles.detailLabel}>Preferred Channels</Text>
            <View style={styles.tagContainer}>
              {(person as any).comms.channelsPreferred.map((channel: string, index: number) => (
                <View key={index} style={styles.preferredChannelTag}>
                  <Text style={styles.tagText}>{channel}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Warmth Trend Graph */}
        {(() => {
          const validHistory = warmthHistory
            .filter(p => p && typeof p.score === 'number' && !isNaN(p.score) && p.score >= 0 && p.score <= 100)
            .slice(-20);
          
          if (validHistory.length === 0) {
            return (
              <View style={styles.detailsCard}>
                <Text style={[styles.detailsCardTitle, { marginBottom: 8 }]}>📈 Warmth Over Time</Text>
                <Text style={styles.emptyText}>No warmth history available yet</Text>
              </View>
            );
          }
          
          return (
            <WarmthGraph
              data={validHistory}
              currentScore={warmthScore}
              height={200}
            />
          );
        })()}
      </ScrollView>
    );
  };

  const renderInsights = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.paywallContainer}>
          <View style={styles.paywallIconContainer}>
            <Sparkles size={64} color="#FFD700" />
          </View>
          <Text style={styles.paywallTitle}>Relationship Insights</Text>
          <Text style={styles.paywallDescription}>Coming soon in a future update.</Text>
        </View>
      </View>
    );
  };

  // Render Stack.Screen once at top to prevent infinite loop from navigation state updates
  const stackScreenOptions = useMemo(() => ({ headerShown: false }), []);

  // Show error state if person not found
  if (!person) {
    return (
      <AuthGate requireAuth>
        <ContactBundleProvider contactId={typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''}>
          <Stack.Screen options={stackScreenOptions} />
          <SafeAreaView style={styles.container}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Contact not found</Text>
              <TouchableOpacity onPress={() => go.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ContactBundleProvider>
      </AuthGate>
    );
  }

  // Auto-show paywall if user is not paid
  usePaywallGate();

  return (
    <AuthGate requireAuth>
        <Stack.Screen options={stackScreenOptions} />
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Modal
            visible={editingNote !== null}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditingNote(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Note</Text>
                  <TouchableOpacity
                    onPress={() => setEditingNote(null)}
                    style={styles.modalCloseButton}
                  >
                    <X size={24} color="#000000" />
                  </TouchableOpacity>
                </View>
                <CrossPlatformTextInput
                  style={styles.modalTextInput}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  placeholder="Enter note content..."
                  placeholderTextColor="#999999"
                  multiline
                  autoFocus
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setEditingNote(null)}
                    disabled={savingNote}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSaveButton, (!editedContent.trim() || savingNote) && styles.modalSaveButtonDisabled]}
                    onPress={handleSaveNote}
                    disabled={!editedContent.trim() || savingNote}
                  >
                    {savingNote ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSaveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          
          {/* Full-Screen Image Modal */}
          <Modal
            visible={fullScreenImage !== null}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setFullScreenImage(null)}
          >
            <View style={styles.imageModalOverlay}>
              <TouchableOpacity 
                style={styles.imageModalClose}
                onPress={() => setFullScreenImage(null)}
              >
                <X size={32} color="#FFFFFF" />
              </TouchableOpacity>
              {fullScreenImage && (
                <Image
                  source={{ uri: fullScreenImage }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </Modal>
          
          {/* Contact Header with Back Button */}
          <View style={styles.contactHeader}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => go.back()} style={styles.headerBackButton}>
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Contact Context</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.headerRow}>
              <Avatar
                name={person.fullName || person.name || 'Contact'}
                photoUrl={person.photo_url}
                avatarUrl={person.avatarUrl}
                size={56}
                warmthColor={getWarmthColor(warmthStatus)}
                borderWidth={3}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.contactName}>{person.fullName || person.name}</Text>
                {person.phones && person.phones.length > 0 && (
                  <Text style={styles.contactPhone}>{person.phones[0]}</Text>
                )}
              </View>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.warmthBadge, { backgroundColor: getWarmthColor(warmthStatus) }]}>
                <Text style={styles.warmthText}>{warmthStatus.toUpperCase()}</Text>
              </View>
              <Text style={styles.warmthScore}>Score: {warmthScore}</Text>
            </View>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.key;
              const IconComponent = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, isActive && styles.activeTabButton]}
                  onPress={() => handleTabPress(index)}
                >
                  <IconComponent 
                    size={22} 
                    color={isActive ? themeColors.primary : '#999999'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <Text style={[styles.tabLabel, isActive && { color: themeColors.primary, fontWeight: '600' }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Swipable Content */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={styles.contentScrollView}
          >
            {tabs.map((tab, index) => (
              <View key={tab.key} style={[styles.tabPage, { width: screenWidth }]}>
                <ScrollView 
                  style={styles.pageScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pageContent}
                >
                  {index === 0 && renderDetails()}
                  {index === 1 && renderInteractions()}
                  {index === 2 && renderNotes()}
                  {index === 3 && renderActivity()}
                  {index === 4 && renderInsights()}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>

        {/* Full-Screen Image Modal */}
        <Modal
          visible={!!fullScreenImage}
          transparent
          animationType="fade"
          onRequestClose={() => setFullScreenImage(null)}
        >
          <View style={styles.fullScreenModal}>
            <TouchableOpacity
              style={styles.fullScreenClose}
              onPress={() => setFullScreenImage(null)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {fullScreenImage && (
              <Image
                source={{ uri: fullScreenImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerBackButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4ECDC4',
  },
  tabLabel: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    fontWeight: '500',
  },
  contentScrollView: {
    flex: 1,
  },
  tabPage: {
    flex: 1,
  },
  pageScrollView: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 20,
  },
  tabContent: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    padding: 16,
    paddingBottom: 8,
  },
  contactHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  contactPhone: {
    fontSize: 13,
    color: '#666666',
  },
  contactSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warmthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warmthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  warmthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  warmthScore: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  contactInfoContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  contactInfoText: {
    fontSize: 13,
    color: '#666666',
    maxWidth: '80%',
  },
  pipelineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  pipelineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    minWidth: 70,
  },
  actionLabel: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  contextCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  contextHook: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  contextBullets: {
    gap: 4,
  },
  contextBullet: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#000000',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  tagText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  interactionsContainer: {
    paddingHorizontal: 16,
  },
  voiceNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  voiceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voiceNoteDate: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  voiceNoteTranscript: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  noteType: {
    fontSize: 11,
    color: '#4ECDC4',
    backgroundColor: '#E8F8F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  noteContent: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  insightDescription: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 8,
  },
  insightRecommendation: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 16,
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginHorizontal: 16,
    gap: 12,
    paddingRight: 8,
  },
  yAxisContainer: {
    width: 35,
    height: 140,
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    fontWeight: '600',
  },
  chartAreaWrapper: {
    flex: 1,
    height: 140,
    position: 'relative',
    overflow: 'visible',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 12,
    bottom: 12,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  lineChartContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 12,
    bottom: 12,
    overflow: 'visible',
  },
  lineSegmentsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    marginTop: -6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dataPointInner: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginHorizontal: 16,
  },
  chartLegendText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  windowSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  windowButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  windowButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  windowButtonText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  windowButtonTextActive: {
    color: '#FFFFFF',
  },
  chartOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    top: 8,
  },
  tooltipText: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
  },
  tooltipCard: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tooltipDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  tooltipValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  tooltipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tooltipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  addNoteButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  paywallContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  paywallIconContainer: {
    marginBottom: 24,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  paywallDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  noteActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  screenshotContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  screenshotPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  screenshotPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  screenshotPlaceholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
    gap: 12,
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  audioInfo: {
    flex: 1,
  },
  audioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  audioDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteCardDeleting: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTextInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#000000',
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  detailSection: {
    marginTop: 12,
  },
  detailSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  activitySummaryBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  activitySummaryText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  preferredChannelTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#059669',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  analysisContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  refreshIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionHighPriority: {
    borderColor: '#FCA5A5',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  suggestionHeader: {
    marginBottom: 8,
  },
  priorityBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  suggestionAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  suggestionReason: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestionTiming: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  suggestionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  composeCTA: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  emptyInsights: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyInsightsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyInsightsSubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addNoteSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addNoteSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addNoteSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  expandButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000000',
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000000',
  },
  searchClear: {
    padding: 4,
    marginLeft: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  allNotesHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  interactionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  interactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  interactionMeta: {
    flex: 1,
  },
  interactionType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  interactionTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  interactionContent: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  interactionDuration: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Bottom Sheet Modal Styles
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  saveButtonCompact: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSheetContent: {
    padding: 20,
    minHeight: 300,
  },
  bottomSheetInput: {
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 250,
  },
  bottomSheetFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  charCountBottom: {
    fontSize: 14,
    textAlign: 'right',
  },
  attachmentsContainer: {
    marginTop: 12,
    gap: 8,
  },
  attachmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  attachmentName: {
    maxWidth: 160,
    color: '#374151',
    fontSize: 13,
  },
  addAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  addAttachmentText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  clearSearchButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  clearSearchButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  // Files & Documents styles
  filesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  fileSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Audio progress styles (new)
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  // Full-screen modal styles (new)
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  inlineActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshWarmthButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  refreshContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshWarmthLabel: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
});