import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ScrollView,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import {
  MessageCircle,
  Send,
  Mic,
  MicOff,
  ChevronUp,
  ArrowLeft,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
} from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import * as Clipboard from 'expo-clipboard';
import analytics from '@/lib/analytics';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  relatedContacts?: string[];
}

interface TrendingQuery {
  id: string;
  query: string;
  category: 'contacts' | 'notes' | 'insights' | 'actions';
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: 'today' | 'week' | 'month';
}

interface ExpandableChatBarProps {
  onQuerySubmit?: (query: string) => void;
  initialQuery?: string;
}

const COLLAPSED_HEIGHT = 60;

export default function ExpandableChatBar({ onQuerySubmit, initialQuery }: ExpandableChatBarProps) {
  const { theme } = useAppSettings();
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const { isRecording: recorderIsRecording } = useAudioRecorder();
  const { height: screenHeight } = useWindowDimensions();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState(initialQuery || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe] = useState<'today' | 'week' | 'month'>('today');
  
  const EXPANDED_HEIGHT = screenHeight * 0.85;
  
  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const hasInitialized = useRef(false);

  // Analytics tracking
  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    if (!event?.trim()) return;
    if (properties) {
      const sanitizedProps = Object.fromEntries(
        Object.entries(properties)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [
            key,
            typeof value === 'string' ? value.slice(0, 1000) : value
          ])
      );
      analytics.track(event, sanitizedProps);
    } else {
      analytics.track(event);
    }
  }, []);

  // Generate trending queries
  const generateTrendingQueries = useCallback((): TrendingQuery[] => {
    const baseQueries: TrendingQuery[] = [
      {
        id: '1',
        query: 'Who should I follow up with this week?',
        category: 'insights',
        frequency: 45,
        trend: 'up',
        timeframe: selectedTimeframe,
      },
      {
        id: '2',
        query: 'Show me contacts I haven\'t talked to in 30 days',
        category: 'contacts',
        frequency: 38,
        trend: 'up',
        timeframe: selectedTimeframe,
      },
      {
        id: '3',
        query: 'Add a note about my meeting today',
        category: 'actions',
        frequency: 32,
        trend: 'stable',
        timeframe: selectedTimeframe,
      },
      {
        id: '4',
        query: 'Search my notes for "client"',
        category: 'notes',
        frequency: 28,
        trend: 'up',
        timeframe: selectedTimeframe,
      },
      {
        id: '5',
        query: 'Tag potential clients for outreach',
        category: 'actions',
        frequency: 25,
        trend: 'down',
        timeframe: selectedTimeframe,
      },
      {
        id: '6',
        query: 'Update contact interests and goals',
        category: 'actions',
        frequency: 22,
        trend: 'stable',
        timeframe: selectedTimeframe,
      },
    ];

    // Personalize based on user's data
    if (people.length > 0) {
      const recentContact = people[0];
      baseQueries.unshift({
        id: 'personalized-1',
        query: `Tell me about ${recentContact.fullName}`,
        category: 'contacts',
        frequency: 15,
        trend: 'up',
        timeframe: selectedTimeframe,
      });
    }

    if (voiceNotes.length > 0) {
      baseQueries.push({
        id: 'personalized-2',
        query: 'Summarize my recent voice notes',
        category: 'notes',
        frequency: 18,
        trend: 'up',
        timeframe: selectedTimeframe,
      });
    }

    return baseQueries.slice(0, 8);
  }, [people, voiceNotes, selectedTimeframe]);

  const [trendingQueries] = useState<TrendingQuery[]>(generateTrendingQueries());

  const handleExpand = useCallback(() => {
    if (isExpanded) return;
    
    setIsExpanded(true);
    trackEvent('chat_bar_expanded', { source: 'tap' });
    
    Animated.spring(animatedHeight, {
      toValue: EXPANDED_HEIGHT,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start(() => {
      inputRef.current?.focus();
    });
  }, [isExpanded, animatedHeight, trackEvent, EXPANDED_HEIGHT]);

  // Initialize welcome message
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (initialQuery) {
        setInputText(initialQuery);
        handleExpand();
      } else {
        const welcome: Message = {
          id: 'welcome',
          text: `Hi! I'm your personal CRM assistant. I can help you with contacts, notes, and CRM tasks. What would you like to do?`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages([welcome]);
      }
    }
  }, [initialQuery, handleExpand]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && isExpanded) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isExpanded]);



  const handleCollapse = useCallback(() => {
    if (!isExpanded) return;
    
    Keyboard.dismiss();
    setIsExpanded(false);
    trackEvent('chat_bar_collapsed', { method: 'back_button' });
    
    Animated.spring(animatedHeight, {
      toValue: COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [isExpanded, animatedHeight, trackEvent]);

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
        transcription: note.transcription,
        createdAt: note.createdAt
      }));

      const systemPrompt = `You are a helpful personal CRM assistant for EverReach. You have access to the user's contact list and voice notes.

CONTACT LIST (${people.length} contacts):
${contactsContext.map(c => `• ${c.name}${c.company ? ` (${c.company})` : ''}${c.title ? ` - ${c.title}` : ''}
  Warmth: ${c.warmthStatus} (${c.warmthScore || 'unknown'})
  Last interaction: ${c.lastInteractionSummary || 'No recent interaction'}
  Interests: ${c.interests?.join(', ') || 'None listed'}
  Contact: ${c.emails?.[0] || c.phones?.[0] || 'No contact info'}`).join('\n\n')}

VOICE NOTES (${voiceNotes.length} notes):
${notesContext.map(n => `• Note from ${n.createdAt}: ${n.transcription || 'No transcription'}`).join('\n')}

You can help with:
- Finding specific contacts by name, company, or other details
- Providing information about contacts and their interaction history
- Suggesting follow-ups based on warmth scores and last interactions
- Analyzing voice notes and extracting insights
- General CRM tasks and relationship management advice

Be concise, helpful, and reference specific contact details when relevant.`;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const response = await fetch(`${baseUrl}/api/v1/agent/chat`, {
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

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend || isLoading) return;
    
    // Validate and sanitize input
    if (textToSend.length > 500) {
      console.warn('Message too long, truncating');
    }
    const sanitizedText = textToSend.slice(0, 500).trim();
    
    trackEvent('message_sent', { text: sanitizedText, method: messageText ? 'trending_query' : 'manual' });
    
    const newMsg: Message = {
      id: Date.now().toString(),
      text: sanitizedText,
      isUser: true,
      timestamp: new Date(),
    };
    
    const history = [...messages, newMsg];
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    
    if (onQuerySubmit) {
      onQuerySubmit(sanitizedText);
    }
    
    await sendMessageToAI(history);
  }, [inputText, isLoading, messages, onQuerySubmit, sendMessageToAI, trackEvent]);

  const handleTrendingQueryPress = useCallback((query: string) => {
    if (!query?.trim()) return;
    const sanitizedQuery = query.slice(0, 500).trim();
    
    trackEvent('trending_query_clicked', { query: sanitizedQuery, expanded: isExpanded });
    
    setInputText(sanitizedQuery);
    if (!isExpanded) {
      handleExpand();
      // Auto-submit after expansion animation
      setTimeout(() => {
        handleSendMessage(sanitizedQuery);
      }, 300);
    } else {
      handleSendMessage(sanitizedQuery);
    }
  }, [isExpanded, handleExpand, trackEvent, handleSendMessage]);

  const handleVoiceRecording = async () => {
    // Voice recording feature coming soon
  };

  const handleCopyMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contacts': return <Users size={16} color={theme.colors.primary} />;
      case 'notes': return <MessageCircle size={16} color={theme.colors.primary} />;
      case 'insights': return <BarChart3 size={16} color={theme.colors.primary} />;
      case 'actions': return <Sparkles size={16} color={theme.colors.primary} />;
      default: return <MessageCircle size={16} color={theme.colors.primary} />;
    }
  };

  const getTrendIcon = (trend: string) => {
    const color = trend === 'up' ? '#34C759' : trend === 'down' ? '#FF3B30' : '#8E8E93';
    return <TrendingUp size={14} color={color} />;
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
              <MessageCircle size={14} color={theme.colors.primary} />
              <Text style={[styles.aiLabel, { color: theme.colors.primary }]}>CRM Assistant</Text>
            </View>
          )}
          <Text style={[styles.msgText, isUser ? styles.userText : { color: theme.colors.text }]}>{m.text}</Text>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
            {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTrendingQueries = () => (
    <View style={styles.trendingContainer}>
      <Text style={[styles.trendingTitle, { color: theme.colors.text }]}>Trending Queries</Text>
      <ScrollView 
        style={styles.trendingScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.trendingContent}
      >
        {trendingQueries.map((query, index) => (
          <TouchableOpacity
            key={query.id}
            style={[
              styles.trendingQuery,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}
            onPress={() => handleTrendingQueryPress(query.query)}
            activeOpacity={0.7}
            testID={`trending-query-${query.id}`}
          >
            <View style={styles.queryHeader}>
              <View style={styles.queryMeta}>
                <Text style={[styles.queryRank, { color: theme.colors.primary }]}>#{index + 1}</Text>
                {getCategoryIcon(query.category)}
                <Text style={[styles.queryCategory, { color: theme.colors.textSecondary }]}>
                  {query.category.charAt(0).toUpperCase() + query.category.slice(1)}
                </Text>
              </View>
              <View style={styles.queryStats}>
                {getTrendIcon(query.trend)}
                <Text style={[styles.queryFrequency, { color: theme.colors.textSecondary }]}>
                  {query.frequency}
                </Text>
              </View>
            </View>
            <Text style={[styles.queryText, { color: theme.colors.text }]}>{query.query}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCollapsedBar = () => (
    <TouchableOpacity
      style={[
        styles.collapsedBar,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }
      ]}
      onPress={handleExpand}
      activeOpacity={0.8}
      testID="expandable-chat-bar"
    >
      <View style={styles.collapsedContent}>
        <MessageCircle size={20} color={theme.colors.primary} />
        <Text style={[styles.collapsedText, { color: theme.colors.textSecondary }]}>
          Ask your CRM assistant anything...
        </Text>
        <ChevronUp size={20} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderExpandedChat = () => (
    <View style={styles.expandedContainer}>
      {/* Header */}
      <View style={[styles.expandedHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCollapse}
          testID="chat-back-button"
        >
          <ArrowLeft size={20} color={theme.colors.primary} />
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Trending</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>CRM Assistant</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Context Info */}
      <View style={[styles.contextInfo, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.contextText, { color: theme.colors.textSecondary }]}>
          {people.length} contacts • {voiceNotes.length} notes
        </Text>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef} 
        style={[styles.messagesScroll, { backgroundColor: theme.colors.background }]} 
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingRow}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Ask about your contacts, notes, or get suggestions..."
          placeholderTextColor={theme.colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          onSubmitEditing={() => handleSendMessage()}
          blurOnSubmit={false}
          editable={true}
          selectTextOnFocus={Platform.OS === 'web'}
          {...(Platform.OS === 'web' && {
            selection: undefined,
          })}
        />
        <TouchableOpacity 
          style={[styles.micBtn, recorderIsRecording && styles.micActive]} 
          onPress={handleVoiceRecording}
        >
          {recorderIsRecording ? <MicOff size={18} color="#fff" /> : <Mic size={18} color={theme.colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: (!inputText.trim() || isLoading) ? theme.colors.border : theme.colors.primary }
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={18} color={(!inputText.trim() || isLoading) ? theme.colors.textSecondary : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Trending Queries (always visible when collapsed) */}
      {!isExpanded && renderTrendingQueries()}
      
      {/* Expandable Chat Bar */}
      <Animated.View 
        style={[
          styles.chatBarContainer,
          {
            height: animatedHeight,
            backgroundColor: theme.colors.surface,
          }
        ]}
      >
        {isExpanded ? renderExpandedChat() : renderCollapsedBar()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trendingContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  trendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  trendingScroll: {
    flex: 1,
  },
  trendingContent: {
    paddingBottom: 80, // Space for chat bar
  },
  trendingQuery: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queryRank: {
    fontSize: 14,
    fontWeight: '700',
  },
  queryCategory: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  queryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  queryFrequency: {
    fontSize: 12,
  },
  queryText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  chatBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  collapsedBar: {
    height: COLLAPSED_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  collapsedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  collapsedText: {
    flex: 1,
    fontSize: 16,
  },
  expandedContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Balance the back button
  },
  contextInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  contextText: {
    fontSize: 13,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  time: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micActive: {
    backgroundColor: '#FF3B30',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});