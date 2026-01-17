import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Mic,
  Calendar,
  Heart,
  Star,
  Clock,
  User,
  Tag,
} from 'lucide-react-native';
import { PipelineThemes, ThemeColors } from '@/constants/pipelines';

type TabType = 'overview' | 'interactions' | 'notes' | 'insights';

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'interactions', label: 'History', icon: Clock },
  { key: 'notes', label: 'Notes', icon: Mic },
  { key: 'insights', label: 'Insights', icon: Star },
];

export default function ContactContextScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { people, getWarmthStatus, getWarmthScore } = usePeople();
  const { voiceNotes } = useVoiceNotes();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();

  const person = people.find(p => p.id === id);
  const personVoiceNotes = voiceNotes.filter(vn => vn.personId === id);

  if (!person) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Contact Context', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Contact not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Contact Header */}
      <View style={[styles.contactHeader, { borderBottomColor: themeColors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.avatarText}>
            {person.fullName.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <Text style={styles.contactName}>{person.fullName}</Text>
        {(person.title || person.company) && (
          <Text style={styles.contactSubtitle}>
            {person.title ? `${person.title}${person.company ? ' at ' : ''}` : ''}
            {person.company || ''}
          </Text>
        )}
        
        {/* Warmth Status */}
        <View style={styles.warmthContainer}>
          <View style={[styles.warmthBadge, { backgroundColor: getWarmthColor(warmthStatus) }]}>
            <Text style={styles.warmthText}>{warmthStatus.toUpperCase()}</Text>
          </View>
          <Text style={styles.warmthScore}>Score: {warmthScore}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {person.phones?.[0] && (
          <TouchableOpacity style={styles.actionButton}>
            <Phone size={20} color="#000000" />
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>
        )}
        {person.emails?.[0] && (
          <TouchableOpacity style={styles.actionButton}>
            <Mail size={20} color="#000000" />
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={20} color="#000000" />
          <Text style={styles.actionLabel}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/voice-note?personId=${person.id}`)}
        >
          <Mic size={20} color="#000000" />
          <Text style={styles.actionLabel}>Voice Note</Text>
        </TouchableOpacity>
      </View>

      {/* Context Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context Summary</Text>
        <View style={styles.contextCard}>
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
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {person.emails?.map((email, emailIndex) => (
          <View key={`email-${emailIndex}-${email}`} style={styles.infoRow}>
            <Mail size={16} color="#666666" />
            <Text style={styles.infoText}>{email}</Text>
          </View>
        ))}
        {person.phones?.map((phone, phoneIndex) => (
          <View key={`phone-${phoneIndex}-${phone}`} style={styles.infoRow}>
            <Phone size={16} color="#666666" />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        ))}
      </View>

      {/* Tags & Interests */}
      {(person.tags?.length || person.interests?.length) ? (
        <View style={styles.section}>
          {person.interests?.length ? (
            <>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tagContainer}>
                {person.interests.map((interest) => (
                  <View key={`interest-${interest}`} style={styles.interestTag}>
                    <Heart size={12} color="#4A90E2" />
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          
          {person.tags?.length ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Tags</Text>
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
        </View>
      ) : null}
    </View>
  );

  const renderInteractions = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Interaction History</Text>
      {person.interactions?.length ? (
        person.interactions.slice().reverse().map((interaction, interactionIndex) => (
          <View key={`interaction-${interactionIndex}-${interaction.occurredAt}`} style={styles.interactionCard}>
            <View style={styles.interactionHeader}>
              <Calendar size={16} color={themeColors.primary} />
              <Text style={styles.interactionDate}>
                {new Date(interaction.occurredAt).toLocaleDateString()}
              </Text>
              <Text style={styles.interactionChannel}>{interaction.channel}</Text>
            </View>
            <Text style={styles.interactionSummary}>{interaction.summary}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Clock size={48} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No interactions recorded yet</Text>
        </View>
      )}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Voice Notes & Recordings</Text>
      {personVoiceNotes.length > 0 ? (
        personVoiceNotes.map(note => (
          <View key={note.id} style={styles.voiceNoteCard}>
            <View style={styles.voiceNoteHeader}>
              <Mic size={16} color={themeColors.primary} />
              <Text style={styles.voiceNoteDate}>
                {new Date(note.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {note.transcript && (
              <Text style={styles.voiceNoteTranscript}>{note.transcript}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Mic size={48} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No voice notes recorded yet</Text>
          <TouchableOpacity 
            style={styles.addNoteButton}
            onPress={() => router.push(`/voice-note?personId=${person.id}`)}
          >
            <Text style={styles.addNoteButtonText}>Record First Note</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderInsights = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Relationship Insights</Text>
      
      {/* Warmth Analysis */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Star size={20} color={getWarmthColor(warmthStatus)} />
          <Text style={styles.insightTitle}>Relationship Temperature</Text>
        </View>
        <Text style={styles.insightDescription}>
          Your relationship is currently <Text style={{ color: getWarmthColor(warmthStatus), fontWeight: '600' }}>{warmthStatus}</Text> with a score of {warmthScore}.
        </Text>
        <Text style={styles.insightRecommendation}>
          💡 Recommendation: {warmthStatus === 'cold' ? 'Reach out soon to reconnect' : warmthStatus === 'cool' ? 'Schedule a casual check-in' : warmthStatus === 'warm' ? 'Great time to deepen the relationship' : 'Maintain regular contact'}
        </Text>
      </View>

      {/* Communication Pattern */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <MessageCircle size={20} color={themeColors.primary} />
          <Text style={styles.insightTitle}>Communication Pattern</Text>
        </View>
        <Text style={styles.insightDescription}>
          You&apos;ve had {person.interactions?.length || 0} interactions total.
        </Text>
        {person.lastInteraction && (
          <Text style={styles.insightRecommendation}>
            💡 Last contact was {Math.floor((Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))} days ago
          </Text>
        )}
      </View>

      {/* Shared Interests */}
      {person.interests?.length ? (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Heart size={20} color="#FF6B6B" />
            <Text style={styles.insightTitle}>Shared Interests</Text>
          </View>
          <Text style={styles.insightDescription}>
            You both enjoy: {person.interests.join(', ')}
          </Text>
          <Text style={styles.insightRecommendation}>
            💡 Use these topics as conversation starters
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Contact Context',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <ArrowLeft size={24} color="#000000" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => handleTabPress(index)}
            >
              <IconComponent 
                size={20} 
                color={isActive ? themeColors.primary : '#666666'} 
              />
              <Text style={[styles.tabLabel, isActive && { color: themeColors.primary }]}>
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
              {index === 0 && renderOverview()}
              {index === 1 && renderInteractions()}
              {index === 2 && renderNotes()}
              {index === 3 && renderInsights()}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
    color: '#666666',
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
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  warmthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warmthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  warmthText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warmthScore: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
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
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  interactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  interactionDate: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  interactionChannel: {
    fontSize: 12,
    color: '#4ECDC4',
    backgroundColor: '#E8F8F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  interactionSummary: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
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
});