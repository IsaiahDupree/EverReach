import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePeople } from "@/providers/PeopleProvider";
import { useAppSettings, type Theme } from "@/providers/AppSettingsProvider";
import { router } from "expo-router";
import { 
  Users, 
  Calendar,
  Mic,
  ChevronRight,
  AlertCircle,
  Shield
} from "lucide-react-native";

import { DEFAULT_GOALS } from "@/lib/goals";
import { FLAGS } from "@/constants/flags";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { people, getWarmthStatus } = usePeople();
  const { theme } = useAppSettings();
  const [riPage, setRiPage] = React.useState(0);
  const pagerRef = React.useRef<ScrollView>(null);
  const pageWidth = React.useMemo(() => Dimensions.get('window').width - 32, []);

  const coldContacts = people.filter(p => getWarmthStatus(p.id) === 'cold');
  const coolContacts = people.filter(p => getWarmthStatus(p.id) === 'cool');
  const dueToday = people.filter(p => {
    if (!p.nextTouchAt) return false;
    const next = new Date(p.nextTouchAt);
    const today = new Date();
    return next.toDateString() === today.toDateString();
  });



  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Local-Only Mode Indicator */}
        {FLAGS.LOCAL_ONLY && (
          <View style={styles.localModeIndicator}>
            <Shield size={16} color={theme.colors.success} />
            <Text style={styles.localModeText}>Local-Only Mode Active</Text>
          </View>
        )}
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/voice-note')}
        >
          <View style={styles.actionIcon}>
            <Mic size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.actionText}>Voice Note</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/add-contact')}
        >
          <View style={styles.actionIcon}>
            <Users size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.actionText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {(coldContacts.length > 0 || dueToday.length > 0) && (
        <View style={styles.alertSection}>
          {coldContacts.length > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <AlertCircle size={20} color={theme.colors.error} />
                <Text style={styles.alertTitle}>Going Cold</Text>
              </View>
              <Text style={styles.alertCount}>{coldContacts.length} contacts</Text>
              <TouchableOpacity 
                style={styles.alertAction}
                onPress={() => router.push('/people')}
              >
                <Text style={styles.alertActionText}>Review</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {dueToday.length > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Calendar size={20} color={theme.colors.success} />
                <Text style={styles.alertTitle}>Due Today</Text>
              </View>
              <Text style={styles.alertCount}>{dueToday.length} follow-ups</Text>
              <TouchableOpacity 
                style={styles.alertAction}
                onPress={() => router.push('/people')}
              >
                <Text style={styles.alertActionText}>View</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Relationship Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relationship Health</Text>
        <View style={styles.healthGrid}>
          <TouchableOpacity 
            style={styles.healthCard}
            onPress={() => router.push('/people?filter=hot')}
          >
            <View style={[styles.healthIndicator, { backgroundColor: '#4ECDC4' }]} />
            <Text style={styles.healthLabel}>Hot</Text>
            <Text style={styles.healthCount}>
              {people.filter(p => getWarmthStatus(p.id) === 'hot').length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.healthCard}
            onPress={() => router.push('/people?filter=warm')}
          >
            <View style={[styles.healthIndicator, { backgroundColor: '#FFD93D' }]} />
            <Text style={styles.healthLabel}>Warm</Text>
            <Text style={styles.healthCount}>
              {people.filter(p => getWarmthStatus(p.id) === 'warm').length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.healthCard}
            onPress={() => router.push('/people?filter=cool')}
          >
            <View style={[styles.healthIndicator, { backgroundColor: '#95E1D3' }]} />
            <Text style={styles.healthLabel}>Cool</Text>
            <Text style={styles.healthCount}>{coolContacts.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.healthCard}
            onPress={() => router.push('/people?filter=cold')}
          >
            <View style={[styles.healthIndicator, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.healthLabel}>Cold</Text>
            <Text style={styles.healthCount}>{coldContacts.length}</Text>
          </TouchableOpacity>
        </View>
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
            {people.slice(0, 3).map(person => (
              <TouchableOpacity
                key={person.id}
                style={styles.interactionCard}
                onPress={() => router.push(`/contact/${person.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {person.fullName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.interactionContent}>
                  <Text style={styles.personName}>{person.fullName}</Text>
                  <Text style={styles.interactionSummary}>
                    {person.lastInteractionSummary || 'No recent interaction'}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Page 2: Message Goals */}
          <View style={[styles.pageContainer, { width: pageWidth }]}>
            {DEFAULT_GOALS.map(g => {
              const count = people.filter(p => (p.goals || []).includes(g.id)).length;
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
                    <Text style={styles.goalCount}>{count} {count === 1 ? 'person' : 'people'}</Text>
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
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
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
    padding: 20,
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  interactionContent: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  interactionSummary: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
  eventCard: {
    flexDirection: 'row',
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
  eventDate: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventMonth: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  eventContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  eventAttendees: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});