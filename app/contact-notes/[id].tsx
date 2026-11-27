import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { 
  Plus,
  Mic,
  MessageSquare,
  ArrowLeft,
  Edit3,
  Trash2
} from 'lucide-react-native';

type InteractionChannel = 'sms' | 'email' | 'dm' | 'call' | 'meet' | 'note';

interface Interaction {
  id: string;
  channel: InteractionChannel;
  occurredAt: string;
  summary: string;
  sentiment?: 'pos' | 'neu' | 'neg';
}

export default function ContactNotesScreen() {
  const { id } = useLocalSearchParams();
  const { people, updatePerson } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  const editInputRef = useRef<TextInput>(null);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        Keyboard.dismiss();
      }
    },
  });

  const person = people.find(p => p.id === id);
  const personVoiceNotes = voiceNotes.filter(vn => vn.personId === id);

  if (!person) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Contact Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Contact not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allInteractions: (Interaction & { type: 'interaction' | 'voice' })[] = [
    ...(person.interactions || []).map(i => ({ ...i, type: 'interaction' as const })),
    ...personVoiceNotes.map(vn => ({
      id: vn.id,
      channel: 'note' as const,
      occurredAt: vn.createdAt,
      summary: vn.transcript || 'Voice note (no transcript)',
      type: 'voice' as const
    }))
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const handleAddNote = () => {
    if (noteInput.trim()) {
      const interaction = {
        id: Date.now().toString(),
        channel: 'note' as const,
        occurredAt: new Date().toISOString(),
        summary: noteInput.trim(),
      };
      
      updatePerson(person.id, {
        interactions: [...(person.interactions || []), interaction],
        lastInteraction: interaction.occurredAt,
        lastInteractionSummary: interaction.summary,
      });
      
      setNoteInput('');
      noteInputRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  const handleEditNote = (noteId: string, newText: string) => {
    if (newText.trim()) {
      const updatedInteractions = (person.interactions || []).map(interaction => 
        interaction.id === noteId 
          ? { ...interaction, summary: newText.trim() }
          : interaction
      );
      
      updatePerson(person.id, {
        interactions: updatedInteractions,
      });
    }
    setEditingNote(null);
    setEditText('');
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedInteractions = (person.interactions || []).filter(
      interaction => interaction.id !== noteId
    );
    
    updatePerson(person.id, {
      interactions: updatedInteractions,
    });
  };

  const startEditing = (noteId: string, currentText: string) => {
    if (!currentText.trim()) return;
    if (currentText.length > 1000) return;
    const sanitizedText = currentText.trim();
    
    setEditingNote(noteId);
    setEditText(sanitizedText);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'note': return <MessageSquare size={16} color="#666666" />;
      case 'call': return <Mic size={16} color="#666666" />;
      default: return <MessageSquare size={16} color="#666666" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'note': return '#4A90E2';
      case 'call': return '#50C878';
      case 'email': return '#FF6B6B';
      case 'meet': return '#FFD93D';
      case 'sms': return '#9B59B6';
      case 'dm': return '#34495E';
      default: return '#666666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `${person.fullName} - Notes`,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#000000', fontSize: 18, fontWeight: '600' },
          headerTintColor: '#000000'
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.scrollContent}
            {...panResponder.panHandlers}
          >
            {/* Header Summary */}
            <View style={styles.headerSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {person.fullName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <Text style={styles.personName}>{person.fullName}</Text>
              <Text style={styles.notesCount}>
                {allInteractions.length} {allInteractions.length === 1 ? 'note' : 'notes'}
              </Text>
            </View>

            {/* Add Note Section */}
            <View style={styles.addNoteSection}>
              <Text style={styles.sectionTitle}>Add New Note</Text>
              <View style={styles.noteInputContainer}>
                <TextInput
                  ref={noteInputRef}
                  style={styles.noteInput}
                  value={noteInput}
                  onChangeText={setNoteInput}
                  placeholder="What happened in your interaction with this contact?"
                  placeholderTextColor="#999999"
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 100);
                  }}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    handleAddNote();
                  }}
                />
                <TouchableOpacity 
                  style={[styles.addButton, !noteInput.trim() && styles.addButtonDisabled]}
                  onPress={handleAddNote}
                  disabled={!noteInput.trim()}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes Timeline */}
            <View style={styles.timelineSection}>
              <Text style={styles.sectionTitle}>All Notes & Interactions</Text>
              
              {allInteractions.length === 0 ? (
                <View style={styles.emptyState}>
                  <MessageSquare size={48} color="#CCCCCC" />
                  <Text style={styles.emptyStateTitle}>No notes yet</Text>
                  <Text style={styles.emptyStateText}>
                    Add your first note about {person.fullName} above
                  </Text>
                </View>
              ) : (
                allInteractions.map((item) => (
                  <View key={`${item.type}-${item.id}`} style={styles.timelineItem}>
                    <View style={styles.timelineMarker}>
                      <View style={[styles.timelineDot, { backgroundColor: getChannelColor(item.channel) }]} />
                      <View style={styles.timelineLine} />
                    </View>
                    
                    <View style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <View style={styles.noteHeaderLeft}>
                          {getChannelIcon(item.channel)}
                          <Text style={styles.noteDate}>
                            {new Date(item.occurredAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                          <View style={[styles.channelBadge, { backgroundColor: getChannelColor(item.channel) }]}>
                            <Text style={styles.channelBadgeText}>
                              {item.type === 'voice' ? 'Voice' : item.channel.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        
                        {item.type === 'interaction' && (
                          <View style={styles.noteActions}>
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => startEditing(item.id, item.summary)}
                            >
                              <Edit3 size={14} color="#666666" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => {
                                if (Platform.OS === 'web') {
                                  if (confirm('Delete this note?')) {
                                    handleDeleteNote(item.id);
                                  }
                                } else {
                                  handleDeleteNote(item.id);
                                }
                              }}
                            >
                              <Trash2 size={14} color="#FF6B6B" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      
                      {editingNote === item.id ? (
                        <View style={styles.editContainer}>
                          <TextInput
                            ref={editInputRef}
                            style={styles.editInput}
                            value={editText}
                            onChangeText={setEditText}
                            multiline
                            autoFocus
                            onSubmitEditing={() => handleEditNote(item.id, editText)}
                          />
                          <View style={styles.editActions}>
                            <TouchableOpacity 
                              style={styles.cancelButton}
                              onPress={() => {
                                setEditingNote(null);
                                setEditText('');
                              }}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.saveButton}
                              onPress={() => handleEditNote(item.id, editText)}
                            >
                              <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.noteContent}>{item.summary}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  personName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  notesCount: {
    fontSize: 14,
    color: '#666666',
  },
  addNoteSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  noteInputContainer: {
    gap: 12,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timelineSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E5E5',
  },
  noteCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#666666',
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  editContainer: {
    gap: 12,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});