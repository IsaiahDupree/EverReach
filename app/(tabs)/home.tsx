import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSettings, type Theme } from "@/providers/AppSettingsProvider";
import { router } from "expo-router";
import { 
  Users, 
  User,
  Calendar,
  Mic,
  ChevronRight,
  AlertCircle,
  Shield,
  Camera
} from "lucide-react-native";

import { DEFAULT_GOALS } from "@/lib/goals";
import { FLAGS } from "@/constants/flags";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBackgroundPrefetch } from "@/hooks/useBackgroundPrefetch";
import { SkeletonDashboard, SkeletonHealthCard, SkeletonInteractionCard } from "@/components/SkeletonLoaders";
import Avatar from "@/components/Avatar";
import { getWarmthColor } from "@/lib/imageUpload";
import { usePeople } from "@/providers/PeopleProvider";
import { useWarmth } from "@/providers/WarmthProvider";
import { useFocusEffect } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/providers/AuthProviderV2";
import { supabase } from "@/lib/supabase";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const [riPage, setRiPage] = React.useState(0);
  
  // Analytics tracking
  const analytics = useAnalytics('Home');
  const pagerRef = React.useRef<ScrollView>(null);
  const pageWidth = React.useMemo(() => Dimensions.get('window').width - 32, []);

  const { warmthSummary, recentInteractions, alerts, isLoading, refetchAll } = useDashboardData();
  const { people, refreshPeople } = usePeople();
  const { getWarmth } = useWarmth();
  const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useAuth();
  const [userName, setUserName] = React.useState<string>('');

  // Load user's first name
  React.useEffect(() => {
    const loadUserName = async () => {
      if (!user) return;
      
      try {
        // Try to get from profiles table
        const { data } = await supabase
          ?.from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .single();
        
        if (data?.first_name) {
          setUserName(data.first_name);
        } else {
          // Fallback to metadata
          const metadata = (user as any).user_metadata || {};
          const fullName = metadata.full_name || metadata.name || '';
          const firstName = fullName.split(' ')[0] || 'there';
          setUserName(firstName);
        }
      } catch (error) {
        console.error('[Dashboard] Error loading user name:', error);
        // Default fallback
        const metadata = (user as any).user_metadata || {};
        const fullName = metadata.full_name || metadata.name || '';
        const firstName = fullName.split(' ')[0] || 'there';
        setUserName(firstName);
      }
    };
    
    loadUserName();
  }, [user]);

  useBackgroundPrefetch();

  // Auto-refresh when screen comes into focus (with debounce to prevent spam)
  const lastRefreshRef = React.useRef(0);
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Only refetch if it's been more than 5 seconds since last refresh
      if (timeSinceLastRefresh > 5000) {
        console.log('[Dashboard] Screen focused, refreshing data...');
        lastRefreshRef.current = now;
        refetchAll();
        refreshPeople();
      } else {
        console.log('[Dashboard] Screen focused, skipping refresh (too recent)');
      }
    }, [refetchAll, refreshPeople])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    analytics.startTimer('dashboard_refresh');
    await Promise.all([
      refetchAll(),
      refreshPeople(),
    ]);
    analytics.endTimer('dashboard_refresh', { success: true });
    setRefreshing(false);
  };

  // Transform backend data to UI format
  const summary = warmthSummary.data ? {
    hot: warmthSummary.data.by_band.hot,
    warm: warmthSummary.data.by_band.warm,
    cool: warmthSummary.data.by_band.cooling,
    cold: warmthSummary.data.by_band.cold,
    total: warmthSummary.data.total_contacts,
  } : { hot: 0, warm: 0, cool: 0, cold: 0, total: 0 };
  
  const interactions = recentInteractions.data?.items || [];
  const contactAlerts = alerts.data || [];

  // Log interactions once when data changes (not on every render)
  React.useEffect(() => {
    if (recentInteractions.data) {
      console.log('[Dashboard] Interactions loaded:', interactions.length);
    }
  }, [recentInteractions.data]);

  const styles = createStyles(theme);

  if (isLoading && !warmthSummary.data && !recentInteractions.data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {FLAGS.LOCAL_ONLY && (
            <View style={styles.localModeIndicator}>
              <Shield size={16} color={theme.colors.success} />
              <Text style={styles.localModeText}>Local-Only Mode Active</Text>
            </View>
          )}
          <SkeletonDashboard theme={theme} />
        </ScrollView>
      </View>
    );
  }

  const coldAlert = contactAlerts.find(a => a.type === 'cold');
  const dueTodayAlert = contactAlerts.find(a => a.type === 'due_today');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {FLAGS.LOCAL_ONLY && (
          <View style={styles.localModeIndicator}>
            <Shield size={16} color={theme.colors.success} />
            <Text style={styles.localModeText}>Local-Only Mode Active</Text>
          </View>
        )}

        {/* Welcome Ribbon */}
        <TouchableOpacity
          style={styles.welcomeRibbon}
          onPress={() => {
            analytics.track('view_personal_profile_tapped');
            router.push('/personal-profile');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.welcomeText}>Welcome, {userName || 'there'}!</Text>
          <View style={styles.viewProfileButton}>
            <User size={16} color={theme.colors.primary} />
            <Text style={styles.viewProfileText}>View Personal Profile</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/voice-note')}
        >
          <View style={styles.actionIcon}>
            <Mic size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.actionText} numberOfLines={1} ellipsizeMode="tail">Voice Note</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/add-contact')}
        >
          <View style={styles.actionIcon}>
            <Users size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.actionText} numberOfLines={1} ellipsizeMode="tail">Add Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/screenshot-analysis')}
        >
          <View style={styles.actionIcon}>
            <Camera size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.actionText} numberOfLines={1} ellipsizeMode="tail">Screenshot</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {(coldAlert || dueTodayAlert) && (
        <View style={styles.alertSection}>
          {coldAlert && (
            <TouchableOpacity 
              style={styles.alertCard}
              onPress={() => router.push('/people?filter=cold')}
              activeOpacity={0.7}
            >
              <View style={styles.alertHeader}>
                <AlertCircle size={20} color={theme.colors.error} />
                <Text style={styles.alertTitle}>Going Cold</Text>
              </View>
              <Text style={styles.alertCount}>{coldAlert.count} contacts</Text>
              <View style={styles.alertAction}>
                <Text style={styles.alertActionText}>Review</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          )}

          {dueTodayAlert && (
            <TouchableOpacity 
              style={styles.alertCard}
              onPress={() => router.push('/people')}
              activeOpacity={0.7}
            >
              <View style={styles.alertHeader}>
                <Calendar size={20} color={theme.colors.success} />
                <Text style={styles.alertTitle}>Due Today</Text>
              </View>
              <Text style={styles.alertCount}>{dueTodayAlert.count} follow-ups</Text>
              <View style={styles.alertAction}>
                <Text style={styles.alertActionText}>View</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Relationship Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relationship Health</Text>
        {warmthSummary.isLoading ? (
          <View style={styles.healthGrid}>
            <SkeletonHealthCard theme={theme} />
            <SkeletonHealthCard theme={theme} />
            <SkeletonHealthCard theme={theme} />
            <SkeletonHealthCard theme={theme} />
          </View>
        ) : (
          <View style={styles.healthGrid}>
            <TouchableOpacity 
              style={styles.healthCard}
              onPress={() => router.push('/people?filter=hot')}
            >
              <View style={[styles.healthIndicator, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.healthLabel}>Hot</Text>
              <Text style={styles.healthCount}>{summary.hot}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.healthCard}
              onPress={() => router.push('/people?filter=warm')}
            >
              <View style={[styles.healthIndicator, { backgroundColor: '#FFD93D' }]} />
              <Text style={styles.healthLabel}>Warm</Text>
              <Text style={styles.healthCount}>{summary.warm}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.healthCard}
              onPress={() => router.push('/people?filter=cool')}
            >
              <View style={[styles.healthIndicator, { backgroundColor: '#95E1D3' }]} />
              <Text style={styles.healthLabel}>Cool</Text>
              <Text style={styles.healthCount}>{summary.cool}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.healthCard}
              onPress={() => router.push('/people?filter=cold')}
            >
              <View style={[styles.healthIndicator, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.healthLabel}>Cold</Text>
              <Text style={styles.healthCount}>{summary.cold}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent Interactions + Message Goals (slideable) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{riPage === 0 ? 'Recent Interactions' : 'Message Goals'}</Text>
          {riPage === 0 ? (
            <TouchableOpacity onPress={() => router.push('/people')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/chat')}>
              <Text style={styles.seeAll}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
            setRiPage(page);
          }}
        >
          {/* Page 1: Recent Interactions */}
          <View style={[styles.pageContainer, { width: pageWidth }]}>
            {recentInteractions.isLoading ? (
              <>
                <SkeletonInteractionCard theme={theme} />
                <SkeletonInteractionCard theme={theme} />
                <SkeletonInteractionCard theme={theme} />
              </>
            ) : interactions.length > 0 ? (
              interactions.slice(0, 5).map((interaction: any) => {
                const match = people?.find?.((p: any) => p.id === interaction.contact_id);
                const displayName = interaction.contact_name || match?.fullName || match?.name || 'Unknown Contact';
                const contentPreview = interaction.content 
                  ? interaction.content.substring(0, 100) 
                  : `${interaction.kind || 'Note'} interaction`;
                
                // Get warmth from centralized provider
                const warmth = interaction.contact_id ? getWarmth(interaction.contact_id) : null;
                
                // Prioritize photo_url (user uploads) over avatarUrl (external)
                const photoUrl = match?.photo_url ?? interaction.contact_photo_url;
                const avatarUrl = match?.avatarUrl ?? interaction.contact_avatar_url;
                
                // Debug avatar resolution
                if (!photoUrl && !avatarUrl && interaction.contact_id) {
                  console.log('[Dashboard] Missing avatar for contact:', {
                    contact_id: interaction.contact_id,
                    contact_name: interaction.contact_name,
                    match_found: !!match,
                    match_photo_url: match?.photo_url,
                    match_avatarUrl: match?.avatarUrl,
                    interaction_photo: interaction.contact_photo_url,
                    interaction_avatar: interaction.contact_avatar_url,
                    people_count: people?.length,
                  });
                }
                
                return (
                  <TouchableOpacity
                    key={interaction.id}
                    style={styles.interactionCard}
                    onPress={() => {
                      console.log('[Dashboard] Interaction tapped:', {
                        id: interaction.id,
                        contact_id: interaction.contact_id,
                        contact_name: interaction.contact_name,
                      });
                      
                      if (interaction.contact_id) {
                        console.log('[Dashboard] Navigating to /contact/' + interaction.contact_id);
                        router.push(`/contact/${interaction.contact_id}`);
                      } else {
                        console.error('[Dashboard] No contact_id found for interaction:', interaction);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.interactionLeft}>
                      <Avatar 
                        name={displayName}
                        photoUrl={photoUrl}
                        avatarUrl={avatarUrl}
                        size={48}
                        warmthColor={warmth?.color}
                      />
                    </View>
                    <View style={styles.interactionContent}>
                      <Text style={styles.personName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.interactionSummary} numberOfLines={2}>
                        {contentPreview}
                      </Text>
                      <Text style={styles.timeAgo}>
                        {formatTimeAgo(interaction.created_at)}
                      </Text>
                    </View>
                    <View style={styles.interactionRight}>
                      <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent interactions</Text>
              </View>
            )}
          </View>

          {/* Page 2: Message Goals */}
          <View style={[styles.pageContainer, { width: pageWidth }]}>
            {DEFAULT_GOALS.map(g => {
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.goalCard}
                  onPress={() => router.push('/chat')}
                >
                  <View style={styles.goalIcon}>
                    <Text style={styles.goalEmoji}>{g.emoji ?? '🎯'}</Text>
                  </View>
                  <View style={styles.goalContent}>
                    <Text style={styles.goalLabel}>{g.label}</Text>
                    <Text style={styles.goalCount}>Tap to compose</Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>


      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  welcomeRibbon: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  viewProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  alertSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  alertCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  alertCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertActionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  healthGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  healthCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  healthCount: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  interactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border + '20',
  },
  interactionLeft: {
    marginRight: 12,
  },
  interactionContent: {
    flex: 1,
    gap: 4,
  },
  interactionRight: {
    marginLeft: 8,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  interactionSummary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalEmoji: {
    fontSize: 18,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  goalCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pageContainer: {
    // Container for each page in the horizontal scroll
  },
  goalContent: {
    flex: 1,
  },
  localModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '10',
    borderColor: theme.colors.success,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  localModeText: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
