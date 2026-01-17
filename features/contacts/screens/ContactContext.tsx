import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { usePeople } from '@/providers/PeopleProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { TextNotesRepo } from '@/repos/TextNotesRepo';
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
} from 'lucide-react-native';
import { PipelineThemes, ThemeColors } from '@/constants/pipelines';
import InteractionsTimeline from '@/features/contacts/components/InteractionsTimeline';
import AuthGate from '@/components/AuthGate';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { apiFetch } from '@/lib/api';
// Use dynamic import for DocumentPicker to avoid hard-failing when native module isn't present
 
import { go } from '@/lib/navigation';
import { parseContactContextParams } from '@/lib/params';

type TabType = 'interactions' | 'notes' | 'insights' | 'details' | 'activity';

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'details', label: 'Details', icon: MessageCircle },
  { key: 'interactions', label: 'History', icon: Clock },
  { key: 'notes', label: 'Notes', icon: Mic },
  { key: 'activity', label: 'Activity', icon: Sparkles },
  { key: 'insights', label: 'Insights', icon: Star },
];

export default function ContactContextScreen() {
  const rawParams = useLocalSearchParams();
  const { id: idParam, tab } = parseContactContextParams(rawParams as any);
  const id = idParam;
  const router = useRouter();
  const { people, getWarmthStatus, getWarmthScore } = usePeople();
  const { getByPerson } = useInteractions();
  const { theme } = useAppSettings();
  const { isPaid } = useSubscription();
  const { voiceNotes: allVoiceNotes } = useVoiceNotes();
  const ENABLE_AI_CONTEXT = process.env.EXPO_PUBLIC_ENABLE_AI_CONTEXT === 'true';
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('ContactContext');
  
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const requestedTabParam = tab;
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [editingNote, setEditingNote] = useState<TextNote | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [relationshipAnalysis, setRelationshipAnalysis] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNewNote, setSavingNewNote] = useState(false);
  const [expandedNoteModal, setExpandedNoteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ uri: string; fileName: string; mimeType: string; fileSize: number }>>([]);

  const person = people.find(p => p.id === id);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
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

  const handlePickAttachment = async () => {
    try {
      const { getDocumentAsync } = await import('expo-document-picker');
      const res: any = await getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
      if ((res as any).canceled) return;
      const asset = (res as any).assets?.[0] || res;
      if (!asset) return;
      const file = {
        uri: asset.uri,
        fileName: asset.name || asset.fileName || 'attachment',
        mimeType: asset.mimeType || 'application/octet-stream',
        fileSize: asset.size || 0,
      };
      setPendingAttachments(prev => [...prev, file]);
    } catch (e) {
      console.error('[ContactContext] Failed selecting attachment:', e);
      const hint = Platform.OS === 'ios' || Platform.OS === 'android'
        ? '\n\nHint: if using a Development Build, rebuild after installing expo-document-picker.'
        : '';
      Alert.alert('Attachment Error', `Could not select attachment.${hint}`);
    }
  };

  const loadAIInsights = React.useCallback(async () => {
    if (!id || typeof id !== 'string' || !isPaid || !ENABLE_AI_CONTEXT) return;
    
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
  }, [id, isPaid, ENABLE_AI_CONTEXT]);

  useEffect(() => {
    loadTextNotes();
    loadInteractions();
    if (isPaid && ENABLE_AI_CONTEXT) {
      loadAIInsights();
    }
  }, [loadTextNotes, loadInteractions, loadAIInsights, isPaid, ENABLE_AI_CONTEXT]);

  if (!person) {
    return (
      <AuthGate requireAuth>
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Contact not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AuthGate>
    );
  }

  const warmthStatus = getWarmthStatus(person.id);
  const warmthScore = getWarmthScore(person.id);
  const themeKey = (person.theme && PipelineThemes.includes(person.theme)) ? person.theme : 'networking';
  const themeColors = ThemeColors[themeKey];

  const getWarmthColor = (status: string) => {
    switch (status) {
      case 'hot': return '#4ECDC4';
      case 'warm': return '#FFD93D';
      case 'cool': return '#95E1D3';
      case 'cold': return '#FF6B6B';
      default: return '#999999';
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
      <View style={styles.tabContent}>
        <InteractionsTimeline
          interactions={(interactions || []).map((it: any) => ({
            id: it.id,
            kind: it.type || 'note',
            content: it.content || it.summary || it.notes || '',
            created_at: it.occurred_at || new Date().toISOString(),
            metadata: {
              subject: (it as any).subject,
              direction: it.direction,
              duration: it.duration_minutes,
            },
          })) as any}
          contactId={id as string}
          maxItems={10}
        />
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
      </View>
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
      
      // Track note deletion
      screenAnalytics.track('context_note_deleted', {
        contactId: id as string,
        noteId: note.id,
        noteLength: note.content.length,
      });
      
      await TextNotesRepo.remove(note.id);
      setTextNotes(prev => prev.filter(n => n.id !== note.id));
      console.log('[ContactContext] Note deleted successfully');
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
      <ScrollView style={styles.tabContent}>
        <Text style={styles.tabTitle}>Notes</Text>
        
        {/* Add New Note Section */}
        <View style={styles.addNoteSection}>
          <View style={styles.addNoteSectionHeader}>
            <Text style={styles.addNoteSectionTitle}>Add New Note</Text>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpandedNoteModal(true)}
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
            onPress={handleAddNewNote}
            disabled={!newNoteText.trim() || savingNewNote}
          >
            {savingNewNote ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.addNoteButtonText, { color: newNoteText.trim() ? '#000000' : '#9CA3AF' }]}>
                + Add Note
              </Text>
            )}
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
                <Text style={styles.noteContent}>{content}</Text>
                {!isVoice && (
                  <View style={styles.noteActions}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.noteActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditNote(noteData as TextNote);
                          }}
                        >
                          <Edit2 size={16} color="#666666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.noteActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(noteData as TextNote);
                          }}
                        >
                          <Trash2 size={16} color="#FF6B6B" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
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
                  onPress={() => go.contactNotes(person.id)}
                >
                  <Text style={styles.addNoteButtonText}>Add First Note</Text>
                </TouchableOpacity>
              </View>
            );
          }
        })()}
      </ScrollView>
    );
  };

  const handleAddNewNote = async () => {
    if (!newNoteText.trim() || !id) return;
    
    try {
      setSavingNewNote(true);
      console.log('[ContactContext] Adding new note for contact (via API):', id);

      // 1) Create note interaction via backend
      const createRes = await apiFetch(`/api/v1/contacts/${id}/notes`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ content: newNoteText.trim() }),
      });
      if (!createRes.ok) {
        const t = await createRes.text();
        throw new Error(`Create note failed: ${createRes.status} ${t}`);
      }
      const createData: any = await createRes.json();
      const interactionId: string | undefined = createData?.note?.id;
      console.log('[ContactContext] Note created with interaction id:', interactionId);

      // 2) Upload and link attachments to the interaction (if any)
      if (interactionId && pendingAttachments.length > 0) {
        for (const file of pendingAttachments) {
          try {
            const path = `contacts/${id}/interactions/${interactionId}/${Date.now()}-${file.fileName}`;
            const signRes = await apiFetch('/api/v1/files', {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({ path, contentType: file.mimeType }),
            });
            if (!signRes.ok) throw new Error(`Sign upload failed ${signRes.status}`);
            const { url } = await signRes.json();

            const bin = await fetch(file.uri);
            const blob = await bin.blob();
            const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.mimeType }, body: blob });
            if (!putRes.ok) throw new Error(`Upload failed ${putRes.status}`);

            const linkRes = await apiFetch(`/api/v1/interactions/${interactionId}/files`, {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({ path, mime_type: file.mimeType, size_bytes: file.fileSize || blob.size }),
            });
            if (!linkRes.ok) {
              console.warn('[ContactContext] Link file to interaction failed', linkRes.status);
            }
          } catch (e) {
            console.error('[ContactContext] Attachment upload/link failed:', e);
          }
        }
      }

      // Track creation
      screenAnalytics.track('context_note_created', {
        contactId: id as string,
        noteLength: newNoteText.trim().length,
        withAttachments: pendingAttachments.length,
      });

      // Clear UI and refresh
      setNewNoteText('');
      setPendingAttachments([]);
      await loadTextNotes();
      console.log('[ContactContext] New note added successfully');
    } catch (error) {
      console.error('[ContactContext] Failed to add note:', error);
      analytics.errors.occurred(error as Error, 'ContactContext');
      Alert.alert('Error', 'Failed to add note. Please try again.');
    } finally {
      setSavingNewNote(false);
    }
  };

  const renderDetails = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabTitle}>Contact Details</Text>
        
        {/* Basic Info */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>📇 Basic Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{person.fullName || person.name}</Text>
          </View>
          {person.company && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company</Text>
              <Text style={styles.detailValue}>{person.company}</Text>
            </View>
          )}
          {person.title && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Title</Text>
              <Text style={styles.detailValue}>{person.title}</Text>
            </View>
          )}
          {person.emails && person.emails.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{person.emails[0]}</Text>
            </View>
          )}
          {person.phones && person.phones.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{person.phones[0]}</Text>
            </View>
          )}
        </View>

        {/* Tags & Interests */}
        {(person.tags && person.tags.length > 0) || (person.interests && person.interests.length > 0) ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>🏷️ Tags & Interests</Text>
            {person.tags && person.tags.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Tags</Text>
                <View style={styles.tagContainer}>
                  {person.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {person.interests && person.interests.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Interests</Text>
                <View style={styles.tagContainer}>
                  {person.interests.map((interest, index) => (
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
        {(person as any).customFields && (person as any).customFields.length > 0 ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>✨ Custom Fields</Text>
            {(person as any).customFields.map((field: any, index: number) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{field.key}</Text>
                <Text style={styles.detailValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
          {person.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Added</Text>
              <Text style={styles.detailValue}>{formatDate(new Date(person.createdAt).toISOString())}</Text>
            </View>
          )}
          {person.lastInteraction && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Contact</Text>
              <Text style={styles.detailValue}>
                {Math.floor((Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))} days ago
              </Text>
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

    return (
      <ScrollView style={styles.tabContent}>
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
      </ScrollView>
    );
  };

  const renderInsights = () => {
    if (!isPaid) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIconContainer}>
              <Sparkles size={64} color="#FFD700" />
            </View>
            <Text style={styles.paywallTitle}>Unlock Relationship Insights</Text>
            <Text style={styles.paywallDescription}>
              Get AI-powered insights about your relationships, including:
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Star size={20} color="#4ECDC4" />
                <Text style={styles.featureText}>Relationship temperature analysis</Text>
              </View>
              <View style={styles.featureItem}>
                <MessageCircle size={20} color="#4ECDC4" />
                <Text style={styles.featureText}>Communication pattern insights</Text>
              </View>
              <View style={styles.featureItem}>
                <Heart size={20} color="#4ECDC4" />
                <Text style={styles.featureText}>Shared interests & conversation starters</Text>
              </View>
              <View style={styles.featureItem}>
                <Sparkles size={20} color="#4ECDC4" />
                <Text style={styles.featureText}>Personalized recommendations</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => go.subscriptionPlans()}
            >
              <Lock size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (loadingInsights) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.tabTitle}>Relationship Insights</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Analyzing relationship...</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.tabTitle}>Relationship Insights</Text>
        
        {/* AI Relationship Health Analysis */}
        {relationshipAnalysis && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Star size={24} color="#FFD700" />
              <Text style={styles.analysisTitle}>Relationship Health Analysis</Text>
              <TouchableOpacity 
                onPress={loadAIInsights}
                style={styles.refreshIconButton}
              >
                <Sparkles size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.analysisContent}>{relationshipAnalysis}</Text>
          </View>
        )}

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionHeader}>
              <Sparkles size={18} color="#8B5CF6" /> Recommended Actions
            </Text>
            {aiSuggestions.map((suggestion, index) => (
              <TouchableOpacity 
                key={suggestion.id || index}
                style={[
                  styles.suggestionCard,
                  suggestion.priority === 'high' && styles.suggestionHighPriority
                ]}
                onPress={() => {
                  // Navigate to compose message with suggestion context
                  const suggestionContext = encodeURIComponent(JSON.stringify({
                    goal: suggestion.suggested_approach || suggestion.action,
                    reason: suggestion.reason,
                    category: 're-engage',
                  }));
                  go.to(`/goal-picker?personId=${id}&channel=${suggestion.channel || 'sms'}&suggestionContext=${suggestionContext}`);
                }}
              >
                <View style={styles.suggestionHeader}>
                  {suggestion.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>HIGH PRIORITY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.suggestionAction}>{suggestion.suggested_approach || suggestion.action}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                {suggestion.timing && (
                  <Text style={styles.suggestionTiming}>⏰ {suggestion.timing.replace(/_/g, ' ')}</Text>
                )}
                <View style={styles.suggestionFooter}>
                  <Text style={styles.composeCTA}>Tap to compose message →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Fallback if no AI data */}
        {!relationshipAnalysis && aiSuggestions.length === 0 && (
          <View style={styles.emptyInsights}>
            <Sparkles size={48} color="#CCCCCC" />
            <Text style={styles.emptyInsightsText}>No insights available yet</Text>
            <Text style={styles.emptyInsightsSubtext}>
              Add more interactions and notes to get AI-powered insights
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadAIInsights}
            >
              <Text style={styles.retryButtonText}>Refresh Insights</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <AuthGate requireAuth>
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
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        
        {/* Contact Header with Back Button */}
        <View style={styles.contactHeader}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <ArrowLeft size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Contact Context</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.headerRow}>
            <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.avatarText}>
                {person.fullName?.charAt(0).toUpperCase() || person.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
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
                testID={`tab-${tab.key}`}
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

        {/* Expanded Note Modal - Bottom Sheet */}
        <Modal
          visible={expandedNoteModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setExpandedNoteModal(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setExpandedNoteModal(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.background }]}>
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>
                  Add Note for {person?.name || 'Contact'}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await handleAddNewNote();
                    setExpandedNoteModal(false);
                  }}
                  disabled={!newNoteText.trim() || savingNewNote}
                  style={[
                    styles.saveButtonCompact,
                    (!newNoteText.trim() || savingNewNote) && styles.saveButtonDisabled
                  ]}
                >
                  {savingNewNote ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <View style={styles.bottomSheetContent}>
                <CrossPlatformTextInput
                  style={[styles.bottomSheetInput, { color: theme.colors.text }]}
                  placeholder="Write your detailed note here..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />

                {/* Attachments */}
                <View style={styles.attachmentsContainer}>
                  {pendingAttachments.length > 0 && (
                    <View style={styles.attachmentsList}>
                      {pendingAttachments.map((file, idx) => (
                        <View key={`${file.uri}-${idx}`} style={styles.attachmentChip}>
                          <Paperclip size={14} color="#374151" />
                          <Text numberOfLines={1} style={styles.attachmentName}>{file.fileName}</Text>
                          <TouchableOpacity onPress={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}>
                            <X size={14} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.addAttachmentBtn}
                    onPress={handlePickAttachment}
                    disabled={savingNewNote}
                    activeOpacity={0.8}
                  >
                    <Paperclip size={16} color="#111827" />
                    <Text style={styles.addAttachmentText}>Add attachment</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.bottomSheetFooter}>
                <Text style={[styles.charCountBottom, { color: theme.colors.textSecondary }]}>
                  {newNoteText.length} characters
                </Text>
              </View>
            </View>
          </View>
        </Modal>
        
      </SafeAreaView>
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
});