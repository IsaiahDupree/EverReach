import React, { useState, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { usePeople } from "@/providers/PeopleProvider";
import { useVoiceNotes } from "@/providers/VoiceNotesProvider";
import { 
  Phone, 
  Mail, 
  MessageCircle,
  Mic,
  Tag,
  Edit,
  Trash2,
  Zap
} from "lucide-react-native";
import { PipelineStages, PipelineThemes, PipelineLabels, ThemeColors } from "@/constants/pipelines";

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const { people, updatePerson, deletePerson, getWarmthStatus, getWarmthScore } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const [noteInput, setNoteInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);


  const person = people.find(p => p.id === id);
  const personVoiceNotes = voiceNotes.filter(vn => vn.personId === id);

  if (!person) {
    return (
      <View style={styles.container}>
        <Text>Contact not found</Text>
      </View>
    );
  }

  const warmthStatus = getWarmthStatus(person.id);
  const warmthScore = getWarmthScore(person.id);

  const themeKey = (person.theme && PipelineThemes.includes(person.theme)) ? person.theme : 'networking';
  const themeColors = ThemeColors[themeKey];
  const stages = PipelineStages[themeKey];

  const getWarmthColor = (status: string) => {
    switch (status) {
      case 'hot': return '#4ECDC4';
      case 'warm': return '#FFD93D';
      case 'cool': return '#95E1D3';
      case 'cold': return '#FF6B6B';
      default: return '#999999';
    }
  };

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
      
      setNoteInput("");
      noteInputRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete ${person.fullName}?`)) {
        deletePerson(person.id);
        router.back();
      }
    } else {
      // On mobile, you'd use Alert.alert
      deletePerson(person.id);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.avatarText}>
            {person.fullName.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <Text style={styles.name}>{person.fullName}</Text>
        {(person.title || person.company) && (
          <Text style={styles.subtitle}>
            {person.title ? `${person.title}${person.company ? ' at ' : ''}` : ''}
            {person.company || ''}
          </Text>
        )}
        
        {/* Warmth Indicator */}
        <View style={styles.warmthContainer}>
          <View style={[styles.warmthBadge, { backgroundColor: getWarmthColor(warmthStatus) }]}>
            <Text style={styles.warmthText}>{warmthStatus.toUpperCase()}</Text>
          </View>
          <Text style={styles.warmthScore}>Score: {warmthScore}</Text>
        </View>
      </View>

      {/* Theme & Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pipeline Theme</Text>
        <View style={styles.themeRow}>
          {PipelineThemes.map((t) => (
            <TouchableOpacity
              key={t}
              testID={`theme-${t}`}
              style={[styles.themeChip, themeKey === t && { backgroundColor: ThemeColors[t].primary }]}
              onPress={() => {
                const sanitized = String(t);
                if (!PipelineThemes.includes(sanitized as any)) return;
                console.log('ContactDetail: change theme', sanitized);
                const firstStage = PipelineStages[sanitized as keyof typeof PipelineStages][0];
                updatePerson(person.id, { theme: sanitized as any, pipeline: sanitized as any, status: firstStage });
              }}
            >
              <Text style={[styles.themeChipText, themeKey === t && { color: '#FFFFFF' }]}>
                {PipelineLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {stages.map((stage) => {
            const selected = person.status === stage;
            return (
              <TouchableOpacity
                key={stage}
                testID={`status-${stage}`}
                style={[styles.statusChip, selected && { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  const s = String(stage).trim();
                  if (!s || s.length > 60) return;
                  if (!stages.includes(s)) return;
                  console.log('ContactDetail: change status', s);
                  updatePerson(person.id, { status: s });
                }}
              >
                <Text style={[styles.statusChipText, selected && { color: '#FFFFFF' }]}>{stage}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Craft Message Button */}
      <View style={styles.craftMessageSection}>
        <TouchableOpacity 
          style={[styles.craftMessageButton, { backgroundColor: themeColors.primary }]}
          onPress={() => router.push(`/goal-picker?personId=${person.id}&channel=sms`)}
        >
          <Zap size={20} color="#FFFFFF" />
          <Text style={styles.craftMessageButtonText}>Craft Message</Text>
        </TouchableOpacity>
      </View>

      {/* Context Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context Summary</Text>
        <TouchableOpacity 
          style={styles.contextSummary}
          onPress={() => router.push(`/contact-notes/${person.id}`)}
        >
          <Text style={styles.contextHook}>
            We last spoke about {person.lastInteractionSummary || 'general topics'} on {person.lastInteraction 
              ? new Date(person.lastInteraction).toLocaleDateString()
              : 'unknown date'}
          </Text>
          <View style={styles.contextBullets}>
            {person.goals?.[0] && (
              <Text style={styles.contextBullet}>• Current goal: {person.goals[0]}</Text>
            )}
            {person.interests?.[0] && (
              <Text style={styles.contextBullet}>• Shared interest: {person.interests[0]}</Text>
            )}
            <Text style={styles.contextBullet}>• Next best step: Follow up on recent conversation</Text>
          </View>
          <View style={styles.contextBullets}>
            <Text style={styles.contextBullet}>• Tap to view all notes ({person.interactions?.length || 0})</Text>
          </View>
          <View style={styles.contextChips}>
            {person.interests?.slice(0, 3).map((interest) => (
              <View key={`context-${interest}`} style={styles.contextChip}>
                <Text style={styles.contextChipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {person.phones?.[0] && (
          <TouchableOpacity style={styles.actionButton}>
            <Phone size={20} color="#000000" />
          </TouchableOpacity>
        )}
        {person.emails?.[0] && (
          <TouchableOpacity style={styles.actionButton}>
            <Mail size={20} color="#000000" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={20} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/voice-note?personId=${person.id}`)}
        >
          <Mic size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {person.emails?.map((email, index) => (
          <View key={index} style={styles.infoRow}>
            <Mail size={16} color="#666666" />
            <Text style={styles.infoText}>{email}</Text>
          </View>
        ))}
        {person.phones?.map((phone, index) => (
          <View key={index} style={styles.infoRow}>
            <Phone size={16} color="#666666" />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        ))}
      </View>

      {/* Tags & Interests */}
      {(person.tags?.length || person.interests?.length) ? (
        <View style={styles.section}>
          {person.tags?.length ? (
            <>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagContainer}>
                {person.tags.map((tag) => (
                  <View key={`tag-${tag}`} style={styles.tag}>
                    <Tag size={12} color="#666666" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          
          {person.interests?.length ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Interests</Text>
              <View style={styles.tagContainer}>
                {person.interests.map((interest) => (
                  <View key={`interest-${interest}`} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Voice Notes */}
      {personVoiceNotes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Notes</Text>
          {personVoiceNotes.map(note => (
            <View key={note.id} style={styles.voiceNoteCard}>
              <View style={styles.voiceNoteHeader}>
                <Mic size={16} color="#666666" />
                <Text style={styles.voiceNoteDate}>
                  {new Date(note.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {note.transcript && (
                <Text style={styles.voiceNoteTranscript}>{note.transcript}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Add Note */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Note</Text>
        <View style={styles.noteInputContainer}>
          <TextInput
            ref={noteInputRef}
            style={styles.noteInput}
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="Add a note about this contact..."
            placeholderTextColor="#999999"
            multiline
            returnKeyType="done"
            blurOnSubmit={true}
            autoCapitalize="sentences"
            autoCorrect={true}
            onFocus={() => {
              // Scroll to note input when focused
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleAddNote();
            }}
          />
          <TouchableOpacity 
            style={styles.addNoteButton}
            onPress={handleAddNote}
            disabled={!noteInput.trim()}
          >
            <Text style={styles.addNoteButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactions */}
      {person.interactions?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Interactions</Text>
          {person.interactions.slice(-5).reverse().map((interaction, index) => (
            <View key={index} style={styles.interactionCard}>
              <Text style={styles.interactionDate}>
                {new Date(interaction.occurredAt).toLocaleDateString()}
              </Text>
              <Text style={styles.interactionSummary}>{interaction.summary}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push(`/add-contact?editId=${person.id}`)}
        >
          <Edit size={20} color="#000000" />
          <Text style={styles.editButtonText}>Edit Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={20} color="#FF6B6B" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  warmthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warmthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warmthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warmthScore: {
    fontSize: 14,
    color: '#666666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 14,
    color: '#666666',
  },
  voiceNoteCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  voiceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voiceNoteDate: {
    fontSize: 12,
    color: '#666666',
  },
  voiceNoteTranscript: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  noteInputContainer: {
    gap: 12,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addNoteButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  interactionCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#E5E5E5',
    paddingLeft: 12,
    marginBottom: 12,
  },
  interactionDate: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  interactionSummary: {
    fontSize: 14,
    color: '#000000',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  craftMessageSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  themeChipText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  statusRow: {
    gap: 8,
    paddingVertical: 4,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 13,
    color: '#000000',
  },
  craftMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  craftMessageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contextSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  contextHook: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 20,
  },
  contextBullets: {
    marginBottom: 12,
  },
  contextBullet: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 20,
  },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contextChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contextChipText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
});