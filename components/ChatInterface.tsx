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
  Image,
} from 'react-native';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { MessageCircle, Send, ChevronLeft, Copy, User, FileText, Activity, Database, Paperclip } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import VoiceMicButton from '@/components/VoiceMicButton';
import { sendAgentMessage, type AgentChatRequest, type AgentChatResponse } from '@/lib/agent-api';
import { useScreenshotAnalysis } from '@/hooks/useScreenshotAnalysis';
import ScreenshotPreview from '@/components/chat/ScreenshotPreview';
import AnalysisResults from '@/components/chat/AnalysisResults';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import AnalyzingLoader from '@/components/chat/AnalyzingLoader';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  relatedContacts?: string[];
  references?: AgentChatResponse['references'];
  imageUri?: string;
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
  autoOpenImagePicker?: boolean;
}

export default function ChatInterface({ visible, onClose, threadId, threadLabel, initialQuery, externalQuery, draftText, onDraftTextChange, embedHeader, autoOpenImagePicker = false }: ChatInterfaceProps) {
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const { theme } = useAppSettings();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [internalDraft, setInternalDraft] = useState<string>('');
  const inputText = useMemo(() => (draftText ?? internalDraft), [draftText, internalDraft]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hydratedRef = useRef(false);
  const lastExternalQueryRef = useRef<string | undefined>(undefined);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [inputBarHeight, setInputBarHeight] = useState<number>(0);
  const [contextInfoHeight, setContextInfoHeight] = useState<number>(0);
  const inputRef = useRef<TextInput>(null);

  // Screenshot analysis
  const {
    image,
    analyzing,
    analysisResult,
    error: screenshotError,
    showImagePicker,
    analyzeScreenshot,
    executeSuggestedAction,
    removeImage,
  } = useScreenshotAnalysis();

  // Auto-open image picker when requested by parent (e.g., attach button in Chat tab)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (visible && autoOpenImagePicker && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      showImagePicker();
    }
  }, [visible, autoOpenImagePicker, showImagePicker]);

  const sendMessageToAI = useCallback(async (history: Message[]) => {
    setIsLoading(true);
    try {
      const lastUserMessage = history[history.length - 1];
      if (!lastUserMessage || lastUserMessage.isUser === false) {
        throw new Error('No user message to send');
      }

      const request: AgentChatRequest = {
        message: lastUserMessage.text,
        context: {
          use_tools: true
        }
      };

      const response = await sendAgentMessage(request);

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: response.message,
        isUser: false,
        timestamp: new Date(),
        references: response.references,
      };
      setMessages(prev => [...prev, aiMessage]);

      console.log('📊 Agent response:', {
        tools_used: response.tools_used ?? [],
        tokens: response.usage?.total_tokens ?? 0
      });
    } catch (e) {
      console.error('\n========== CHAT INTERFACE ERROR ==========');
      console.error('❌ AI chat error:', e);
      console.error('💥 Error type:', e instanceof Error ? e.constructor.name : typeof e);
      console.error('📝 Error message:', e instanceof Error ? e.message : String(e));
      console.error('📚 Error stack:', e instanceof Error ? e.stack : 'No stack trace');
      console.error('🔍 Full error object:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
      console.error('==========================================\n');
      
      const errorText = e instanceof Error ? e.message : String(e);
      const userFriendlyMessage = errorText.includes('401') || errorText.includes('Unauthorized')
        ? "Authentication error. Please sign in again."
        : errorText.includes('404') || errorText.includes('Not Found')
        ? "Service not available. Please check your connection."
        : errorText.includes('Network')
        ? "Network error. Please check your internet connection."
        : "I'm having trouble connecting right now. Please try again shortly.";
      
      const errMessage: Message = {
        id: Date.now().toString(),
        text: userFriendlyMessage,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Scroll to end when keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !image) || isLoading) return;

    // If screenshot attached, analyze it first
    if (image) {
      const userImageMessage: Message = {
        id: Date.now().toString(),
        text: trimmed || '',
        isUser: true,
        timestamp: new Date(),
        imageUri: image.uri,
      };
      setMessages(prev => [...prev, userImageMessage]);
      if (onDraftTextChange) onDraftTextChange(''); else setInternalDraft('');
      const result = await analyzeScreenshot(trimmed || undefined);
      removeImage();
      if (result) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: result.vision_summary,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      return;
    }

    // Regular text message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      isUser: true,
      timestamp: new Date(),
    };
    const history = [...messages, newMessage];
    setMessages(prev => [...prev, newMessage]);
    if (onDraftTextChange) onDraftTextChange(''); else setInternalDraft('');
    // Keep the keyboard open for faster follow-ups
    setTimeout(() => inputRef.current?.focus(), 0);
    void (async () => { await sendMessageToAI(history); })();
  }, [inputText, isLoading, messages, image, analyzeScreenshot, sendMessageToAI, onDraftTextChange]);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = async (text: string, messageId: string) => {
    if (!text.trim()) return;
    try {
      await Clipboard.setStringAsync(text);
      console.log('Message copied to clipboard');
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const renderMessage = (m: Message) => {
    const isUser = m.isUser;
    const isCopied = copiedMessageId === m.id;
    const hasReferences = !isUser && m.references && (
      (m.references.contacts && m.references.contacts.length > 0) ||
      (m.references.notes && m.references.notes.length > 0) ||
      (m.references.interactions && m.references.interactions.length > 0) ||
      (m.references.data_sources && m.references.data_sources.length > 0)
    );

    return (
      <View key={m.id} style={[styles.msgRow, isUser && styles.msgRowUser]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {!isUser && (
            <View style={styles.aiHeader}>
              <MessageCircle size={14} color="#007AFF" />
              <Text style={styles.aiLabel}>CRM Assistant</Text>
            </View>
          )}
          {m.text ? (
            <Text style={[styles.msgText, isUser ? styles.userText : styles.aiText]}>{m.text}</Text>
          ) : null}
          {m.imageUri ? (
            <Image source={{ uri: m.imageUri }} style={styles.msgImage} resizeMode="cover" />
          ) : null}

          {hasReferences && m.references && (
            <View style={styles.referencesContainer}>
              <Text style={styles.referencesTitle}>Sources:</Text>
              <View style={styles.referencesContent}>
                {m.references.contacts && m.references.contacts.length > 0 && (
                  <View style={styles.referenceItem}>
                    <User size={12} color="#666" />
                    <Text style={styles.referenceText}>
                      {m.references.contacts.length} contact{m.references.contacts.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {m.references.notes && m.references.notes.length > 0 && (
                  <View style={styles.referenceItem}>
                    <FileText size={12} color="#666" />
                    <Text style={styles.referenceText}>
                      {m.references.notes.length} note{m.references.notes.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {m.references.interactions && m.references.interactions.length > 0 && (
                  <View style={styles.referenceItem}>
                    <Activity size={12} color="#666" />
                    <Text style={styles.referenceText}>
                      {m.references.interactions.length} interaction{m.references.interactions.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {m.references.data_sources && m.references.data_sources.length > 0 && (
                  <View style={styles.referenceItem}>
                    <Database size={12} color="#666" />
                    <Text style={styles.referenceText}>
                      {m.references.data_sources.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.messageFooter}>
            <Text style={[styles.time, isUser && styles.timeUser]}>
              {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopyMessage(m.text, m.id)}
              activeOpacity={0.7}
            >
              <Copy size={14} color={isUser ? '#fff' : '#007AFF'} />
              {isCopied && (
                <Text style={[styles.copiedText, isUser && styles.copiedTextUser]}>Copied!</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' 
        ? Math.max(0, Math.round(insets.top + (embedHeader ? headerHeight : 0) + contextInfoHeight)) 
        : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Context Info */}
          <View style={styles.contextInfo} onLayout={(e) => setContextInfoHeight(e.nativeEvent.layout.height)}>
            <Text style={styles.contextText}>{people.length} contacts • {voiceNotes.length} notes</Text>
          </View>

          {/* Optional Embedded Header */}
          {embedHeader && (
            <View style={styles.headerBar} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
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
            {analyzing && <AnalyzingLoader />}
            {analysisResult && (
              <AnalysisResults
                result={analysisResult}
                onExecuteAction={executeSuggestedAction}
              />
            )}
          </ScrollView>

          {/* Screenshot Preview */}
          {image && !analyzing && (
            <ScreenshotPreview image={image} onRemove={removeImage} />
          )}

          {/* Input Row */}
          <View style={styles.inputBar} onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={showImagePicker}
              disabled={isLoading || analyzing}
            >
              <Paperclip size={20} color={isLoading || analyzing ? theme.colors.textSecondary : theme.colors.primary} />
            </TouchableOpacity>
            <CrossPlatformTextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask about your contacts, notes, or get suggestions..."
              placeholderTextColor={theme.colors.textSecondary}
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
            {(() => {
              const canSend = (!!inputText.trim() || !!image) && !isLoading;
              return (
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    { backgroundColor: canSend ? theme.colors.primary : theme.colors.border },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!canSend}
                  testID="chat-send"
                >
                  <Send size={18} color={canSend ? theme.colors.surface : theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })()}
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
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  time: { fontSize: 11, color: '#999' },
  timeUser: { color: 'rgba(255, 255, 255, 0.7)' },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  copiedText: { fontSize: 10, color: '#007AFF', fontWeight: '600' },
  copiedTextUser: { color: '#fff' },
  referencesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  referencesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  referencesContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  referenceText: {
    fontSize: 11,
    color: '#666',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  loadingText: { fontSize: 14, color: '#666' },
  inputBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: '#fff', 
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#000', maxHeight: 100, backgroundColor: '#F8F9FA' },
  micBtn: {
    // Style for VoiceMicButton container
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#E5E5E5' },
  msgImage: { width: 180, height: 180, borderRadius: 10, marginTop: 8, backgroundColor: '#EEE' },
});
