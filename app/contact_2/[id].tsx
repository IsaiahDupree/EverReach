import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useContactDetail } from "@/hooks/useContactDetail";
import { useTheme } from "@/providers/ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import Avatar from "@/components/Avatar";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MessageCircle, 
  Calendar,
  MoreVertical,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  Network
} from "lucide-react-native";

type TabType = 'overview' | 'activity' | 'files' | 'insights' | 'related';

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'activity', label: 'Activity', icon: TrendingUp },
  { key: 'files', label: 'Files', icon: FileText },
  { key: 'insights', label: 'Insights', icon: Sparkles },
  { key: 'related', label: 'Related', icon: Network },
];

export default function ContactDetailV2Screen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics tracking
  const analytics = useAnalytics('ContactDetailV2', {
    screenProperties: { 
      contact_id: id as string,
      version: 'v2'
    },
  });
  
  const {
    contact,
    interactions,
    isLoading,
    refetchAll,
  } = useContactDetail(id as string);

  const handleRefresh = async () => {
    setRefreshing(true);
    analytics.startTimer('refresh');
    await refetchAll();
    analytics.endTimer('refresh', { success: true });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Contact not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {contact.display_name}
        </Text>
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.colors.surface }]}>
          <Avatar
            name={contact.display_name}
            size={80}
            photoUrl={contact.photo_url}
            avatarUrl={contact.avatar_url}
          />
          <Text style={[styles.contactName, { color: theme.colors.text }]}>
            {contact.display_name}
          </Text>
          {contact.company && (
            <Text style={[styles.contactCompany, { color: theme.colors.textSecondary }]}>
              {contact.company}
            </Text>
          )}
          
          {/* Warmth Badge */}
          {contact.warmth && (
            <View style={[styles.warmthBadge, { backgroundColor: getWarmthColor(contact.warmth) }]}>
              <Text style={styles.warmthText}>
                {contact.warmth} • {getWarmthLabel(contact.warmth)}
              </Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
              <Mail size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
              <Calendar size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Meet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                  activeTab === tab.key && { borderBottomColor: theme.colors.primary }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <tab.icon 
                  size={18} 
                  color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text 
                  style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'related' && renderRelated()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function renderOverview() {
    return (
      <View style={styles.overviewContent}>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>24</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Touches</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>3</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tasks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>8d</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Last</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Info</Text>
          {contact.emails?.map((email, index) => (
            <View key={index} style={styles.infoRow}>
              <Mail size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{email}</Text>
              {index === 0 && (
                <View style={[styles.primaryBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>
          ))}
          {contact.phones?.map((phone, index) => (
            <View key={index} style={styles.infoRow}>
              <Phone size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{phone}</Text>
            </View>
          ))}
        </View>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tags</Text>
            <View style={styles.tagsContainer}>
              {contact.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.tagText, { color: theme.colors.text }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Interactions */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
          {interactions.slice(0, 3).map((interaction) => (
            <View key={interaction.id} style={[styles.interactionItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.interactionHeader}>
                <Text style={[styles.interactionType, { color: theme.colors.text }]}>
                  {interaction.kind}
                </Text>
                <Text style={[styles.interactionDate, { color: theme.colors.textSecondary }]}>
                  {new Date(interaction.created_at).toLocaleDateString()}
                </Text>
              </View>
              {interaction.content && (
                <Text style={[styles.interactionContent, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {interaction.content}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderActivity() {
    return (
      <View style={styles.tabContentInner}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          Unified activity feed coming soon...
        </Text>
      </View>
    );
  }

  function renderFiles() {
    return (
      <View style={styles.tabContentInner}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          File attachments coming soon...
        </Text>
      </View>
    );
  }

  function renderInsights() {
    return (
      <View style={styles.tabContentInner}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          AI insights coming soon...
        </Text>
      </View>
    );
  }

  function renderRelated() {
    return (
      <View style={styles.tabContentInner}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          Related contacts coming soon...
        </Text>
      </View>
    );
  }
}

function getWarmthColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#3B82F6';
  return '#EF4444';
}

function getWarmthLabel(score: number): string {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  if (score >= 40) return 'Cool';
  return 'Cold';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 12,
  },
  moreButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  contactCompany: {
    fontSize: 16,
    marginTop: 4,
  },
  warmthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  warmthText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: 16,
    gap: 16,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  interactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  interactionType: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  interactionDate: {
    fontSize: 12,
  },
  interactionContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  tabContentInner: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
