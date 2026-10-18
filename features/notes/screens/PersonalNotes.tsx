import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  Search,
  Mic,
  FileText,
  Calendar,
  Trash2,
  Edit3,
  Play,
  Pause,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react-native';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { TextNotesRepo } from '@/repos/TextNotesRepo';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { Audio } from 'expo-av';
import { useTheme } from '@/providers/ThemeProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { go } from '@/lib/navigation';
import { useNotesComposer } from '@/providers/NotesComposerProvider';

type PersonalNote = {
  id: string;
  type: 'voice' | 'text';
  content: string;
  personId?: string;
  personName?: string;
  createdAt: number;
  audioUri?: string;
};

type FilterType = 'all' | 'voice' | 'text' | 'personal' | 'people';

export default function PersonalNotesScreen() {
  const insets = useSafeAreaInsets();
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const notesComposer = useNotesComposer();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('PersonalNotes');
  
  // Get initial filter from query params (default to 'all')
  const initialFilter = (params.filter as FilterType) || 'all';
  
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<PersonalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'file'; uri: string; name: string }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      console.log('[PersonalNotes] Loading notes from backend...');
      const textNotes = await TextNotesRepo.all();
      const peopleMap = new Map(people.map(p => [p.id, p]));

      console.log('[PersonalNotes] Loaded', textNotes.length, 'text notes');
      console.log('[PersonalNotes] Loaded', voiceNotes.length, 'voice notes');

      const voiceNotesConverted: PersonalNote[] = voiceNotes.map(vn => ({
        id: vn.id,
        type: 'voice',
        content: vn.transcription || 'No transcription available',
        personId: vn.personId,
        personName: vn.personId && vn.personId !== 'personal' ? peopleMap.get(vn.personId)?.fullName : undefined,
        createdAt: vn.createdAt,
        audioUri: vn.audioUri,
      }));

      const textNotesConverted: PersonalNote[] = textNotes.map(tn => ({
        id: tn.id,
        type: 'text',
        content: tn.content,
        personId: tn.personId,
        personName: tn.personId ? peopleMap.get(tn.personId)?.fullName : undefined,
        createdAt: tn.createdAt,
      }));

      const allNotes = [...voiceNotesConverted, ...textNotesConverted]
        .sort((a, b) => b.createdAt - a.createdAt);

      console.log('[PersonalNotes] Total notes:', allNotes.length);
      setNotes(allNotes);
    } catch (error) {
      console.error('[PersonalNotes] Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    }
  }, [people, voiceNotes]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  useEffect(() => {
    let filtered = notes;

    // Track search usage if query exists
    if (searchQuery.trim() && searchQuery.length >= 3) {
      screenAnalytics.track('notes_searched', {
        queryLength: searchQuery.length,
        resultCount: filtered.filter(n => 
          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.personName && n.personName.toLowerCase().includes(searchQuery.toLowerCase()))
        ).length,
      });
    }

    // Apply filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'voice') {
        filtered = filtered.filter(n => n.type === 'voice');
      } else if (activeFilter === 'text') {
        filtered = filtered.filter(n => n.type === 'text');
      } else if (activeFilter === 'personal') {
        filtered = filtered.filter(n => !n.personId);
      } else if (activeFilter === 'people') {
        filtered = filtered.filter(n => n.personId);
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.content.toLowerCase().includes(query) ||
        (n.personName && n.personName.toLowerCase().includes(query))
      );
    }

    setFilteredNotes(filtered);
  }, [notes, activeFilter, searchQuery]);

  const handleAddTextNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      // Create a new text note
      // Don't generate an ID - let the backend create it (set to 'new' so upsert knows it's a new note)
      const newNote = {
        id: 'new',
        content: newNoteText.trim(),
        createdAt: Date.now(),
      };

      // Save using TextNotesRepo
      await TextNotesRepo.upsert(newNote);
      
      // Track note added
      screenAnalytics.track('personal_note_added', {
        noteType: 'text',
        noteLength: newNoteText.trim().length,
      });

      setNewNoteText('');
      setShowAddNote(false);
      await loadNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
      analytics.errors.occurred(error as Error, 'PersonalNotes');
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleDeleteNote = async (note: PersonalNote) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Track note deletion
              screenAnalytics.track('personal_note_deleted', {
                noteType: note.type,
                noteLength: note.content.length,
                hasContact: !!note.personId,
              });
              
              if (note.type === 'voice') {
                // Stop playing audio if this note is currently playing
                if (playingAudio === note.id) {
                  await stopAudio();
                }
                await VoiceNotesRepo.remove(note.id);
              } else {
                await TextNotesRepo.remove(note.id);
              }
              await loadNotes();
            } catch (error) {
              console.error('Failed to delete note:', error);
              analytics.errors.occurred(error as Error, 'PersonalNotes');
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const playAudio = async (note: PersonalNote) => {
    try {
      // Stop current audio if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (playingAudio === note.id) {
        setPlayingAudio(null);
        return;
      }

      if (!note.audioUri) {
        Alert.alert('No Audio', 'This voice note has no audio file.');
        return;
      }
      
      // Track audio playback
      screenAnalytics.track('voice_note_played', {
        noteId: note.id,
        hasContact: !!note.personId,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: note.audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingAudio(note.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setPlayingAudio(null);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleAddVoiceNote = () => {
    go.voiceNote('');
  };

  const filters: { key: FilterType; label: string; icon: any }[] = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'text', label: 'Text', icon: Edit3 },
    { key: 'personal', label: 'Personal', icon: FileText },
    { key: 'people', label: 'People', icon: Calendar },
  ];

  const isEmpty = filteredNotes.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Personal Notes',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#000000', fontWeight: '600' },
          headerTintColor: '#000000',
        }}
      />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <CrossPlatformTextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999999"
            returnKeyType="search"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadNotes}
        >
          <RefreshCw size={20} color="#666666" />
        </TouchableOpacity>
        {/* Compact media buttons (match CRM assistant style) */}
        <TouchableOpacity
          style={styles.iconSquareButton}
          onPress={handleAddVoiceNote}
          accessibilityLabel="Record voice note"
        >
          <Mic size={18} color="#666666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconSquareButton}
          onPress={() => go.screenshotAnalysis()}
          accessibilityLabel="Add image note"
        >
          <ImageIcon size={18} color="#666666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            notesComposer.open({
              target: { type: 'personal' },
              onSaved: () => loadNotes(),
            })
          }
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => {
                screenAnalytics.track('notes_filter_changed', {
                  filter: filter.key,
                  previousFilter: activeFilter,
                });
                setActiveFilter(filter.key);
              }}
            >
              <Icon
                size={14}
                color={isActive ? '#FFFFFF' : '#666666'}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Notes List */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.notesList}
          contentContainerStyle={[
            styles.notesContent,
            isEmpty ? styles.notesContentEmpty : styles.notesContentNotEmpty,
          ]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching notes' : 'No notes yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first note'}
            </Text>
          </View>
        ) : (
          filteredNotes.map((note) => {
            const Icon = note.type === 'voice' ? Mic : Edit3;
            return (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteTypeContainer}>
                    <Icon size={16} color={note.type === 'voice' ? '#10B981' : '#3B82F6'} />
                    <Text style={styles.noteType}>
                      {note.type === 'voice' ? 'Voice' : 'Text'}
                    </Text>
                  </View>
                  <View style={styles.noteActions}>
                    {note.type === 'voice' && note.audioUri && (
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => playAudio(note)}
                      >
                        {playingAudio === note.id ? (
                          <Pause size={16} color="#10B981" />
                        ) : (
                          <Play size={16} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    )}
                    <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNote(note)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {note.personName && (
                  <View style={styles.personTag}>
                    <Text style={styles.personName}>{note.personName}</Text>
                  </View>
                )}
                
                <Text style={styles.noteContent} numberOfLines={4}>
                  {note.content}
                </Text>
              </View>
            );
          })
        )}
        </ScrollView>
      </TouchableWithoutFeedback>
      
      {/* Add Note Modal */}
      {showAddNote && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayTouchable} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={styles.keyboardAvoidingModal}
          >
            <View style={styles.longformModal}>
              {/* Header */}
              <View style={styles.longformHeader}>
                <TouchableOpacity onPress={() => { setNewNoteText(''); setShowAddNote(false); }}>
                  <Text style={styles.headerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.longformTitle}>Add Personal Note</Text>
                <TouchableOpacity onPress={handleAddTextNote} disabled={!newNoteText.trim()}>
                  <Text style={[styles.headerSaveText, !newNoteText.trim() && { opacity: 0.5 }]}>Save</Text>
                </TouchableOpacity>
              </View>
              
              {/* Large input */}
              <View style={styles.longformInputContainer}>
                <CrossPlatformTextInput
                  style={styles.longformInput}
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                  placeholder="Write your detailed note here..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={12}
                />
              </View>
              
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsPreview}>
                  {attachments.map((att, idx) => (
                    <View key={idx} style={styles.attachmentChip}>
                      <Text style={styles.attachmentName}>{att.name}</Text>
                      <TouchableOpacity onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                        <Text style={styles.attachmentRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Voice Recording Preview */}
              {recordingUri && (
                <View style={styles.voiceRecordingPreview}>
                  <Mic size={16} color="#10B981" />
                  <Text style={styles.voiceRecordingText}>Voice note attached</Text>
                  <TouchableOpacity onPress={() => setRecordingUri(null)}>
                    <Text style={styles.attachmentRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Footer actions */}
              <View style={styles.longformFooter}>
                <View style={styles.mediaActions}>
                  <TouchableOpacity
                    style={styles.mediaActionButton}
                    onPress={() => {
                      setShowAddNote(false);
                      handleAddVoiceNote();
                    }}
                  >
                    <Mic size={18} color="#666666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mediaActionButton}
                    onPress={() => {
                      setShowAddNote(false);
                      go.screenshotAnalysis();
                    }}
                  >
                    <ImageIcon size={18} color="#666666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.charCount}>{newNoteText.length} characters</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  iconSquareButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    maxHeight: 40,  // ✅ Tab height (28) + padding wiggle room
  },
  filterContent: {
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 4,
    height: 28,
  },
  filterTabActive: {
    backgroundColor: '#000000',
  },
  filterText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notesContent: {
    paddingTop: 0,
    paddingBottom: 32,
    flexGrow: 1,
  },
  notesContentEmpty: {
    justifyContent: 'center',
  },
  notesContentNotEmpty: {
    justifyContent: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#999999',
  },
  playButton: {
    padding: 4,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  personTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  personName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  noteContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  keyboardAvoidingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  longformModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
  },
  longformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  longformTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSaveText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  longformInputContainer: {
    flexGrow: 1,
  },
  longformInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 200,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  longformFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  attachmentButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  attachmentName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  attachmentRemove: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  voiceRecordingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  voiceRecordingText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaActionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTypeSelector: {
    alignItems: 'center',
    marginBottom: 24,
  },
  noteTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  noteTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  noteTypeDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  noteTypeDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    flex: 1,
  },
  noteTypeOrText: {
    fontSize: 14,
    color: '#999999',
    marginHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textNoteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
});