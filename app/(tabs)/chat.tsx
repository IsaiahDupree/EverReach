import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  
  KeyboardAvoidingView,
  
  
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  MessageCircle,
  Users,
  BarChart3,
  ArrowRight,
  Send,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useAnalytics } from '@/hooks/useAnalytics';
import VoiceMicButton from '@/components/VoiceMicButton';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { usePeople } from '@/providers/PeopleProvider';
import ChatInterface from '@/components/ChatInterface';
import { PaywallGate } from '@/components/PaywallGate';

// Suggested queries are a static, curated set of example prompts (optionally
// personalized from the user's own real contacts/voice notes). They are NOT
// derived from any real usage telemetry, so no fabricated "uses"/"trend"/
// popularity numbers are attached to them.
interface SuggestedQuery {
  id: string;
  query: string;
  category: 'contacts' | 'notes' | 'insights' | 'actions';
}

export default function ChatTabScreen() {
  const visible = true; // Always visible in tab context
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const params = useLocalSearchParams<{ threadId?: string; threadLabel?: string; initialQuery?: string }>();

  // Analytics tracking
  const analytics = useAnalytics('Chat', {
    screenProperties: {
      has_initial_query: !!params.initialQuery,
      thread_id: params.threadId,
    },
  });
  const [inputText, setInputText] = useState('');
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [autoOpenImagePicker, setAutoOpenImagePicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const containerStyle = useMemo(() => [{ backgroundColor: theme.colors.background }, styles.container], [theme.colors.background]);

  // Hide bottom tab bar during a focused chat session (ChatInterface)
  const navigation = useNavigation();
  useEffect(() => {
    const defaultTabBar = {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.border,
    } as any;
    (navigation as any)?.setOptions?.({
      tabBarStyle: showChatInterface ? { display: 'none' } : defaultTabBar,
    });
  }, [navigation, showChatInterface, theme]);

  // Show chat interface if there are params or if explicitly requested
  useEffect(() => {
    if (params.initialQuery || params.threadId) {
      setShowChatInterface(true);
    }
  }, [params.initialQuery, params.threadId]);

  // Static example prompts to help users get started. Optionally personalized
  // using the user's own real data (their contacts / voice notes) — never
  // backed by fabricated "usage" numbers, since we don't track per-query
  // popularity.
  const generateSuggestedQueries = React.useCallback((): SuggestedQuery[] => {
    const baseQueries: SuggestedQuery[] = [
      {
        id: '1',
        query: 'Who should I follow up with this week?',
        category: 'insights',
      },
      {
        id: '2',
        query: 'Show me contacts I haven\'t talked to in 30 days',
        category: 'contacts',
      },
      {
        id: '3',
        query: 'Add a note about my meeting today',
        category: 'actions',
      },
      {
        id: '4',
        query: 'Search my notes for "client"',
        category: 'notes',
      },
      {
        id: '5',
        query: 'Tag potential clients for outreach',
        category: 'actions',
      },
      {
        id: '6',
        query: 'Update contact interests and goals',
        category: 'actions',
      },
    ];

    // Personalize based on the user's own real data
    if (people.length > 0) {
      const recentContact = people[0];
      baseQueries.unshift({
        id: 'personalized-1',
        query: `Tell me about ${recentContact.fullName}`,
        category: 'contacts',
      });
    }

    if (voiceNotes.length > 0) {
      baseQueries.push({
        id: 'personalized-2',
        query: 'Summarize my recent voice notes',
        category: 'notes',
      });
    }

    return baseQueries.slice(0, 8);
  }, [people, voiceNotes]);

  const [suggestedQueries, setSuggestedQueries] = useState<SuggestedQuery[]>([]);

  useEffect(() => {
    setSuggestedQueries(generateSuggestedQueries());
  }, [generateSuggestedQueries]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contacts': return <Users size={16} color={theme.colors.primary} />;
      case 'notes': return <MessageCircle size={16} color={theme.colors.primary} />;
      case 'insights': return <BarChart3 size={16} color={theme.colors.primary} />;
      case 'actions': return <Sparkles size={16} color={theme.colors.primary} />;
      default: return <MessageCircle size={16} color={theme.colors.primary} />;
    }
  };

  const handleQueryPress = (query: string) => {
    if (!query?.trim()) return;
    
    // Track trending query selection
    analytics.track('chat_trending_query_selected', {
      query: query.trim(),
      queryLength: query.trim().length,
    });
    
    setInputText(query.trim());
    setShowChatInterface(true);
  };

  const handleSendQuery = () => {
    if (inputText.trim()) {
      // Track query sent
      analytics.track('chat_query_sent', {
        queryLength: inputText.trim().length,
        source: 'manual_input',
      });
      
      setShowChatInterface(true);
    }
  };

  const handleInputChange = (text: string) => {
    if (text.length <= 500) {
      setInputText(text);
    }
  };

  const handleClose = () => {
    setShowChatInterface(false);
    setInputText('');
  };

  const handleBackToTrending = () => {
    setShowChatInterface(false);
    setInputText('');
  };

  if (showChatInterface) {
    return (
      <PaywallGate featureArea="ai_messages">
        <View style={containerStyle}>
          <ChatInterface 
            visible={visible} 
            onClose={handleClose} 
            threadId={params.threadId} 
            threadLabel={params.threadLabel}
            initialQuery={autoOpenImagePicker ? undefined : (inputText || params.initialQuery)}
            draftText={inputText}
            onDraftTextChange={setInputText}
            embedHeader={{
              onBack: handleBackToTrending,
              title: "CRM Assistant"
            }}
            autoOpenImagePicker={autoOpenImagePicker}
          />
        </View>
      </PaywallGate>
    );
  }

  return (
    <PaywallGate featureArea="ai_messages">
    <View style={containerStyle}>
      {/* Custom Header for Trending View */}
      <View style={[styles.customHeader, { backgroundColor: theme.colors.surface, paddingTop: insets.top }]}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.customHeaderTitle, { color: theme.colors.text }]}>CRM Assistant</Text>
        <View style={styles.headerSpacer} />
      </View>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.innerContainer}>
              <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                      <MessageCircle size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>EverReach CRM Assistant</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}> 
                      Ask about your contacts, notes, or get suggestions...
                    </Text>
                  </View>
                </View>

                {/* Suggested Queries */}
                <View style={styles.timeframeContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Suggested Queries</Text>
                </View>

                <View style={styles.queriesContainer}>
                  {suggestedQueries.map((query, index) => (
                    <TouchableOpacity
                      key={query.id}
                      style={[
                        styles.queryCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        }
                      ]}
                      onPress={() => handleQueryPress(query.query)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.queryHeader}>
                        <View style={styles.queryMeta}>
                          <Text style={[styles.queryRank, { color: theme.colors.primary }]}>#{index + 1}</Text>
                          {getCategoryIcon(query.category)}
                          <Text style={[styles.queryCategory, { color: theme.colors.textSecondary }]}>
                            {query.category.charAt(0).toUpperCase() + query.category.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.queryText, { color: theme.colors.text }]}>{query.query}</Text>
                      <View style={styles.queryFooter}>
                        <Text style={[styles.tryItText, { color: theme.colors.primary }]}>Try this query</Text>
                        <ArrowRight size={16} color={theme.colors.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Help Text */}
                <View style={styles.helpContainer}>
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                    Tap any suggestion above to get started instantly
                  </Text>
                </View>
              </ScrollView>

              {/* Fixed Input Bar at Bottom */}
              <View style={[styles.fixedInputContainer, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 8 }]}>
                <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <CrossPlatformTextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Ask me anything..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={inputText}
                    onChangeText={handleInputChange}
                    multiline
                    maxLength={500}
                    onSubmitEditing={handleSendQuery}
                    blurOnSubmit={false}
                    autoFocus={false}
                    inputAccessoryViewID={undefined}
                  />
                  <VoiceMicButton
                    size={36}
                    compact
                    onRecordingComplete={(uri, duration) => {
                      console.log('Recording completed:', uri, duration);
                    }}
                    onTranscriptReady={(transcript) => {
                      if (transcript.trim()) {
                        analytics.track('chat_voice_query_used', {
                          transcriptLength: transcript.trim().length,
                        });
                        setInputText(transcript);
                        setShowChatInterface(true);
                      }
                    }}
                    style={styles.micBtn}
                  />
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => {
                      setAutoOpenImagePicker(true);
                      setShowChatInterface(true);
                      setTimeout(() => setAutoOpenImagePicker(false), 0);
                    }}
                    accessibilityLabel="Attach screenshot"
                  >
                    <ImageIcon size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendBtn, 
                      { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.border }
                    ]}
                    onPress={handleSendQuery}
                    disabled={!inputText.trim()}
                  >
                    <Send size={20} color={inputText.trim() ? theme.colors.surface : theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
          </View>
        </KeyboardAvoidingView>
    </View>
    </PaywallGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  customHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 80,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    width: 80,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  keyboardContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  fixedInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    minHeight: 20,
  },
  micBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeframeContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  queriesContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  queryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
  queryText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  queryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tryItText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
