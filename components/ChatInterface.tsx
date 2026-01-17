import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MessageCircle, Send, ChevronLeft } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import VoiceMicButton from '@/components/VoiceMicButton';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  relatedContacts?: string[];
}

interface EmbeddedHeaderProps { onBack: () => void; title?: string }

interface ChatInterfaceProps {
  visible: boolean;
  onClose: () => void;
  threadId?: string;
  threadLabel?: string;
  initialQuery?: string;
  externalQuery?: string;
  draftText?: string;
  onDraftTextChange?: (text: string) => void;
  embedHeader?: EmbeddedHeaderProps;
}

export default function ChatInterface({ visible, onClose, threadId, threadLabel, initialQuery, externalQuery, draftText, onDraftTextChange, embedHeader }: ChatInterfaceProps) {
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();

  const [messages, setMessages] = useState<Message[]>([]);
  const [internalDraft, setInternalDraft] = useState<string>('');
  const inputText = useMemo(() => (draftText ?? internalDraft), [draftText, internalDraft]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hydratedRef = useRef(false);
  const lastExternalQueryRef = useRef<string | undefined>(undefined);

  const sendMessageToAI = useCallback(async (history: Message[]) => {
    setIsLoading(true);
    try {
      // Build contact context for AI
      const contactsContext = people.map(person => {
        const warmthStatus = person.warmth ? 
          (person.warmth >= 70 ? 'hot' : person.warmth >= 50 ? 'warm' : person.warmth >= 30 ? 'cool' : 'cold') : 'unknown';
        
        return {
          name: person.fullName || person.name,
          company: person.company,
          title: person.title,
          emails: person.emails,
          phones: person.phones,
          tags: person.tags,
          interests: person.interests,
          lastInteraction: person.lastInteraction,
          lastInteractionSummary: person.lastInteractionSummary,
          warmthStatus,
          warmthScore: person.warmth
        };
      });

      // Build voice notes context
      const notesContext = voiceNotes.map(note => ({
        personId: note.personId,
        transcript: note.transcript,
        duration: note.duration,
        createdAt: note.createdAt,
        contextScope: note.contextScope,
        extractedInterests: note.extractedInterests
      }));

      const systemPrompt = `You are a helpful personal CRM assistant for EverReach. You have access to the user's contact list and voice notes.

CONTACT LIST (${people.length} contacts):
${contactsContext.map(c => `• ${c.name}${c.company ? ` (${c.company})` : ''}${c.title ? ` - ${c.title}` : ''}
  Warmth: ${c.warmthStatus} (${c.warmthScore || 'unknown'})
  Last interaction: ${c.lastInteractionSummary || 'No recent interaction'}
  Interests: ${c.interests?.join(', ') || 'None listed'}
  Contact: ${c.emails?.[0] || c.phones?.[0] || 'No contact info'}`).join('\n\n')}

VOICE NOTES (${voiceNotes.length} notes):
${notesContext.map(n => `• Note from ${n.createdAt}: ${n.transcript || 'No transcript'}`).join('\n')}

You can help with:
- Finding specific contacts by name, company, or other details
- Providing information about contacts and their interaction history
- Suggesting follow-ups based on warmth scores and last interactions
- Analyzing voice notes and extracting insights
- General CRM tasks and relationship management advice

Be concise, helpful, and reference specific contact details when relevant.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-12).map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
          ],
        }),
      });
      
      const data = await response.json();
      const completion: string | undefined = data?.completion;

      if (completion) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: completion,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (e) {
      console.error('AI chat error:', e);
      const errMessage: Message = {
        id: Date.now().toString(),
        text: "I'm having trouble connecting right now. Please try again shortly.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [people, voiceNotes]);

  // Handle externalQuery submissions
  useEffect(() => {
    if (!visible) return;
    const q = externalQuery?.trim();
    if (!q || lastExternalQueryRef.current === q) return;
    lastExternalQueryRef.current = q;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: q,
      isUser: true,
      timestamp: new Date(),
    };
    const history = [...messages, newMsg];
    setMessages(prev => [...prev, newMsg]);
    if (onDraftTextChange) onDraftTextChange(''); else setInternalDraft('');
    void (async () => { await sendMessageToAI(history); })();
  }, [externalQuery, visible]);

  // Initialize messages
  useEffect(() => {
    if (visible && !hydratedRef.current) {
      hydratedRef.current = true;
      if (initialQuery) {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: initialQuery,
          isUser: true,
          timestamp: new Date(),
        };
        setMessages([userMessage]);
        sendMessageToAI([userMessage]);
      } else {
        const welcome: Message = {
          id: 'welcome',
          text: `Hi! I'm your personal CRM assistant. I can help you with contacts, notes, and CRM tasks. What would you like to do?`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages([welcome]);
        // chat opened impression
        console.log('📊 Analytics: chat_opened (source: embedded_or_route)');
      }
    }
  }, [visible, initialQuery, sendMessageToAI]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return () => clearTimeout(t);
    }
  }, [messages]);





  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    const history = [...messages, newMsg];
    setMessages(prev => [...prev, newMsg]);
    if (onDraftTextChange) onDraftTextChange(''); else setInternalDraft('');
    await sendMessageToAI(history);
  };



  const handleCopyMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      await Clipboard.setStringAsync(text);
      console.log('Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const renderMessage = (m: Message) => {
    const isUser = m.isUser;
    return (
      <View key={m.id} style={[styles.msgRow, isUser && styles.msgRowUser]}>
        <TouchableOpacity
          style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
          onLongPress={() => handleCopyMessage(m.text)}
          activeOpacity={0.8}
        >
          {!isUser && (
            <View style={styles.aiHeader}>
              <MessageCircle size={14} color="#007AFF" />
              <Text style={styles.aiLabel}>CRM Assistant</Text>
            </View>
          )}
          <Text style={[styles.msgText, isUser ? styles.userText : styles.aiText]}>{m.text}</Text>

          <Text style={styles.time}>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Context Info */}
          <View style={styles.contextInfo}>
            <Text style={styles.contextText}>{people.length} contacts • {voiceNotes.length} notes</Text>
          </View>

          {/* Optional Embedded Header */}
          {embedHeader && (
            <View style={styles.headerBar}>
              <TouchableOpacity style={styles.headerBack} onPress={embedHeader.onBack} testID="chat-embedded-back">
                <ChevronLeft size={20} color="#007AFF" />
                <Text style={styles.headerBackText}>Trending</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>{embedHeader.title ?? 'CRM Assistant'}</Text>
              <View style={styles.headerRightSpacer} />
            </View>
          )}

          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef} 
            style={styles.scroll} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Row */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your contacts, notes, or get suggestions..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={(t) => {
                if (onDraftTextChange) onDraftTextChange(t); else setInternalDraft(t);
              }}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              testID="chat-input"
            />
            <VoiceMicButton
              size={36}
              onRecordingComplete={(uri, duration) => {
                console.log('Recording completed:', uri, duration);
              }}
              onTranscriptReady={(transcript) => {
                if (transcript.trim()) {
                  if (onDraftTextChange) {
                    onDraftTextChange(transcript);
                  } else {
                    setInternalDraft(transcript);
                  }
                }
              }}
              style={styles.micBtn}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              testID="chat-send"
            >
              <Send size={18} color={(!inputText.trim() || isLoading) ? '#999' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  innerContainer: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fff' },
  headerBack: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  headerBackText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  headerRightSpacer: { width: 48 },
  contextInfo: {
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    alignItems: 'center',
  },
  contextText: { fontSize: 13, color: '#666' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 16, alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  aiLabel: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
  msgText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#000' },
  related: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 6 },
  relatedText: { fontSize: 12, color: '#666', flex: 1 },
  time: { fontSize: 11, color: '#999', marginTop: 6, alignSelf: 'flex-end' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  loadingText: { fontSize: 14, color: '#666' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: '#fff', padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#000', maxHeight: 100, backgroundColor: '#F8F9FA' },
  micBtn: {
    // Style for VoiceMicButton container
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#E5E5E5' },
});
