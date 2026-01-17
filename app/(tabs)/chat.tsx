import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MessageCircle,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
  Clock,
  Send,
} from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import ChatInterface from '@/components/ChatInterface';
import VoiceMicButton from '@/components/VoiceMicButton';

interface TrendingQuery {
  id: string;
  query: string;
  category: 'contacts' | 'notes' | 'insights' | 'actions';
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: 'today' | 'week' | 'month';
}

interface QueryStats {
  totalQueries: number;
  activeUsers: number;
  topCategories: { name: string; count: number; color: string }[];
  dailyTrend: number;
}

export default function ChatTabScreen() {
  const visible = true; // Always visible in tab context
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { people } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const params = useLocalSearchParams<{ threadId?: string; threadLabel?: string; initialQuery?: string }>();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [inputText, setInputText] = useState('');
  const [showChatInterface, setShowChatInterface] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [stats, setStats] = useState<QueryStats>({
    totalQueries: 0,
    activeUsers: 1,
    topCategories: [],
    dailyTrend: 0,
  });

  const containerStyle = useMemo(() => [{ backgroundColor: theme.colors.background }, styles.container], [theme.colors.background]);

  // Show chat interface if there are params or if explicitly requested
  useEffect(() => {
    if (params.initialQuery || params.threadId) {
      setShowChatInterface(true);
    }
  }, [params.initialQuery, params.threadId]);

  // Mock trending queries based on user's data
  const generateTrendingQueries = React.useCallback((): TrendingQuery[] => {
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

  const [trendingQueries, setTrendingQueries] = useState<TrendingQuery[]>([]);

  useEffect(() => {
    setTrendingQueries(generateTrendingQueries());
    
    // Generate mock stats
    const totalQueries = Math.floor(Math.random() * 200) + 150;
    const categories = [
      { name: 'Contacts', count: Math.floor(totalQueries * 0.35), color: '#007AFF' },
      { name: 'Notes', count: Math.floor(totalQueries * 0.28), color: '#34C759' },
      { name: 'Actions', count: Math.floor(totalQueries * 0.25), color: '#FF9500' },
      { name: 'Insights', count: Math.floor(totalQueries * 0.12), color: '#AF52DE' },
    ];
    
    setStats({
      totalQueries,
      activeUsers: Math.floor(Math.random() * 50) + 25,
      topCategories: categories,
      dailyTrend: Math.floor(Math.random() * 30) + 5,
    });
  }, [generateTrendingQueries, selectedTimeframe, people.length, voiceNotes.length]);

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

  const handleQueryPress = (query: string) => {
    if (!query?.trim()) return;
    setInputText(query.trim());
    setShowChatInterface(true);
  };

  const handleSendQuery = () => {
    if (inputText.trim()) {
      setShowChatInterface(true);
    }
  };

  const handleInputChange = (text: string) => {
    if (!text || text.length <= 500) {
      setInputText(text.trim() ? text : '');
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

  const timeframeOptions = [
    { key: 'today' as const, label: 'Today', icon: <Clock size={16} color={theme.colors.textSecondary} /> },
    { key: 'week' as const, label: 'This Week', icon: <Calendar size={16} color={theme.colors.textSecondary} /> },
    { key: 'month' as const, label: 'This Month', icon: <BarChart3 size={16} color={theme.colors.textSecondary} /> },
  ];

  if (showChatInterface) {
    return (
      <View style={containerStyle}>
        <ChatInterface 
          visible={visible} 
          onClose={handleClose} 
          threadId={params.threadId} 
          threadLabel={params.threadLabel}
          initialQuery={inputText || params.initialQuery}
          embedHeader={{
            onBack: handleBackToTrending,
            title: "CRM Assistant"
          }}
        />
      </View>
    );
  }

  return (
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.innerContainer}>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                      <MessageCircle size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>EverReach CRM Assistant</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                      Discover what others are asking and get inspired for your next query
                    </Text>
                  </View>
                </View>

                {/* Interactive Input Bar */}
                <View style={styles.inputContainer}>
                  <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Ask about your contacts, notes, or get suggestions..."
                      placeholderTextColor={theme.colors.textSecondary}
                      value={inputText}
                      onChangeText={handleInputChange}
                      multiline
                      maxLength={500}
                      onSubmitEditing={handleSendQuery}
                      blurOnSubmit={false}
                    />
                    <VoiceMicButton
                      size={36}
                      onRecordingComplete={(uri, duration) => {
                        console.log('Recording completed:', uri, duration);
                      }}
                      onTranscriptReady={(transcript) => {
                        if (transcript.trim()) {
                          setInputText(transcript);
                          setShowChatInterface(true);
                        }
                      }}
                      style={styles.micBtn}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendBtn, 
                        { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.border }
                      ]}
                      onPress={handleSendQuery}
                      disabled={!inputText.trim()}
                    >
                      <Send size={18} color={inputText.trim() ? '#fff' : theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Timeframe Selector */}
                <View style={styles.timeframeContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Trending Queries</Text>
                  <View style={styles.timeframeSelector}>
                    {timeframeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.timeframeButton,
                          {
                            backgroundColor: selectedTimeframe === option.key 
                              ? theme.colors.primary + '15' 
                              : theme.colors.surface,
                            borderColor: selectedTimeframe === option.key 
                              ? theme.colors.primary 
                              : theme.colors.border,
                          }
                        ]}
                        onPress={() => setSelectedTimeframe(option.key)}
                      >
                        {option.icon}
                        <Text style={[
                          styles.timeframeText,
                          {
                            color: selectedTimeframe === option.key 
                              ? theme.colors.primary 
                              : theme.colors.textSecondary
                          }
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Trending Queries */}
                <View style={styles.queriesContainer}>
                  {trendingQueries.map((query, index) => (
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
                        <View style={styles.queryStats}>
                          {getTrendIcon(query.trend)}
                          <Text style={[styles.queryFrequency, { color: theme.colors.textSecondary }]}>
                            {query.frequency} uses
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

                {/* Category Breakdown */}
                <View style={[styles.categoryContainer, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Popular Categories</Text>
                  <View style={styles.categoryList}>
                    {stats.topCategories.map((category) => (
                      <View key={category.name} style={styles.categoryItem}>
                        <View style={styles.categoryInfo}>
                          <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                          <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category.name}</Text>
                        </View>
                        <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
                          {category.count} queries
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Help Text */}
                <View style={styles.helpContainer}>
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                    Tap any trending query above to get started instantly
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    </View>
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    // Style for VoiceMicButton container
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
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
  categoryContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
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
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 14,
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
