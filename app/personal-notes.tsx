import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Stack, router } from 'expo-router';
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
} from 'lucide-react-native';
import { VoiceNotesRepo } from '@/repos/VoiceNotesRepo';
import { TextNotesRepo } from '@/repos/TextNotesRepo';
import { PeopleRepo } from '@/repos/PeopleRepo';
import { Audio } from 'expo-av';

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
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<PersonalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      
      // Load voice notes and text notes
      const voiceNotes = await VoiceNotesRepo.all();
      const textNotes = await TextNotesRepo.all();
      const people = await PeopleRepo.all();
      const peopleMap = new Map(people.map(p => [p.id, p]));
      
      // Load text notes from people interactions
      const interactionTextNotes: PersonalNote[] = [];
      for (const person of people) {
        if (person.interactions) {
          for (const interaction of person.interactions) {
            if (interaction.channel === 'note') {
              interactionTextNotes.push({
                id: `${person.id}-${interaction.id}`,
                type: 'text',
                content: interaction.summary,
                personId: person.id,
                personName: person.fullName,
                createdAt: new Date(interaction.occurredAt).getTime(),
              });
            }
          }
        }
      }
      
      // Convert voice notes
      const voiceNotesConverted: PersonalNote[] = voiceNotes.map(vn => ({
        id: vn.id,
        type: 'voice',
        content: vn.transcription || 'No transcription available',
        personId: vn.personId,
        personName: vn.personId && vn.personId !== 'personal' ? peopleMap.get(vn.personId)?.fullName : undefined,
        createdAt: vn.createdAt,
        audioUri: vn.audioUri,
      }));
      
      // Convert text notes from TextNotesRepo
      const textNotesConverted: PersonalNote[] = textNotes.map(tn => ({
        id: tn.id,
        type: 'text',
        content: tn.content,
        personId: tn.personId,
        personName: tn.personId ? peopleMap.get(tn.personId)?.fullName : undefined,
        createdAt: tn.createdAt,
      }));
      
      const allNotes = [...interactionTextNotes, ...voiceNotesConverted, ...textNotesConverted]
        .sort((a, b) => b.createdAt - a.createdAt);
      
      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);
  
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
      const newNote = {
        id: Date.now().toString(),
        content: newNoteText.trim(),
        createdAt: Date.now(),
      };
      
      // Save using TextNotesRepo
      await TextNotesRepo.upsert(newNote);
      
      setNewNoteText('');
      setShowAddNote(false);
      await loadNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
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
              if (note.type === 'voice') {
                // Stop playing audio if this note is currently playing
                if (playingAudio === note.id) {
                  await stopAudio();
                }
                await VoiceNotesRepo.remove(note.id);
              } else {
                // Check if it's an interaction note (has personId and starts with personId-)
                if (note.personId && note.id.startsWith(`${note.personId}-`)) {
                  Alert.alert('Cannot Delete', 'Text notes linked to people cannot be deleted from here. Please edit them from the person\'s profile.');
                  return;
                } else {
                  // It's a standalone text note, delete from TextNotesRepo
                  await TextNotesRepo.remove(note.id);
                }
              }
              await loadNotes();
            } catch (error) {
              console.error('Failed to delete note:', error);
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
    router.push('/voice-note');
  };

  const filters: { key: FilterType; label: string; icon: any }[] = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'text', label: 'Text', icon: Edit3 },
    { key: 'personal', label: 'Personal', icon: FileText },
    { key: 'people', label: 'People', icon: Calendar },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <TextInput
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddNote(true)}
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
              onPress={() => setActiveFilter(filter.key)}
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {filteredNotes.length === 0 ? (
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
        
          <View style={styles.bottomPadding} />
        </ScrollView>
      </TouchableWithoutFeedback>
      
      {/* Add Note Modal */}
      {showAddNote && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              style={styles.keyboardAvoidingModal}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Add Note</Text>
                  
                  {/* Note Type Selector */}
                  <View style={styles.noteTypeSelector}>
                    <TouchableOpacity
                      style={styles.noteTypeButton}
                      onPress={() => {
                        setShowAddNote(false);
                        handleAddVoiceNote();
                      }}
                    >
                      <Mic size={20} color="#10B981" />
                      <Text style={styles.noteTypeButtonText}>Voice Note</Text>
                    </TouchableOpacity>
                    <View style={styles.noteTypeDividerContainer}>
                      <View style={styles.noteTypeDivider} />
                      <Text style={styles.noteTypeOrText}>or</Text>
                      <View style={styles.noteTypeDivider} />
                    </View>
                  </View>
                  
                  <Text style={styles.textNoteLabel}>Add Text Note</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Write your note..."
                    value={newNoteText}
                    onChangeText={setNewNoteText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#999999"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      handleAddTextNote();
                    }}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowAddNote(false);
                        setNewNoteText('');
                      }}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, !newNoteText.trim() && styles.saveButtonDisabled]}
                      onPress={handleAddTextNote}
                      disabled={!newNoteText.trim()}
                    >
                      <Text style={styles.saveText}>Save Text</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    marginBottom: 8,
  },
  filterContent: {
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 4,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
  bottomPadding: {
    height: 32,
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
    paddingHorizontal: 16,
  },
  keyboardAvoidingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
  textNoteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
});