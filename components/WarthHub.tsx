import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
} from 'react-native';
import {
  Flame,
  Target,
  MessageSquare,
  Clock,
  Search,
  User,
} from 'lucide-react-native';
// import { router } from 'expo-router';
import GoalModal from '@/components/Goalmodal';
import { DEFAULT_GOALS, Goal } from '@/lib/goals';

interface Person {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  tags: string[];
  lastInteractionDays: number;
  interactionsLast30d: number;
  sentimentAvg: number;
  reciprocity: number;
  channelMix: number;
  goals: string[];
}

interface Reminder {
  id: string;
  personId: string;
  goalId: string;
  dueInDays: number;
  reason: string;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
}

const PEOPLE: Person[] = [
  {
    id: 'p1',
    name: 'Sarah E. Ashley',
    handle: '@saraheashley',
    tags: ['Copywriter', 'Email', 'IG'],
    lastInteractionDays: 6,
    interactionsLast30d: 5,
    sentimentAvg: 0.7,
    reciprocity: 0.85,
    channelMix: 0.6,
    goals: ['collab', 'checkin'],
  },
  {
    id: 'p2',
    name: 'Marcus Lee',
    handle: '@marcus.builds',
    tags: ['Engineer', 'YouTube'],
    lastInteractionDays: 20,
    interactionsLast30d: 2,
    sentimentAvg: 0.2,
    reciprocity: 0.3,
    channelMix: 0.4,
    goals: ['collab'],
  },
  {
    id: 'p3',
    name: 'Priya Patel',
    handle: '@priya.codes',
    tags: ['Founder', 'LinkedIn', 'DM'],
    lastInteractionDays: 3,
    interactionsLast30d: 7,
    sentimentAvg: 0.6,
    reciprocity: 0.7,
    channelMix: 0.8,
    goals: ['deal', 'checkin'],
  },
];

const REMINDERS: Reminder[] = [
  {
    id: 'r1',
    personId: 'p1',
    goalId: 'collab',
    dueInDays: -1,
    reason: 'You promised to send a sample deck',
    suggestedAction: 'Send deck + 2-line summary',
    priority: 'high',
  },
  {
    id: 'r2',
    personId: 'p3',
    goalId: 'deal',
    dueInDays: 1,
    reason: 'Great last call – schedule pricing walkthrough',
    suggestedAction: 'Offer 15-min slot',
    priority: 'high',
  },
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function computeWarmth(p: Person): { score: number; factors: Record<string, number> } {
  const recency = clamp01(1 - p.lastInteractionDays / 45);
  const freq = clamp01(p.interactionsLast30d / 8);
  const sentiment = clamp01((p.sentimentAvg + 1) / 2);
  const reciprocity = clamp01(p.reciprocity);
  const mix = clamp01(p.channelMix);
  const score01 = 0.28 * recency + 0.22 * freq + 0.18 * sentiment + 0.22 * reciprocity + 0.1 * mix;
  return {
    score: Math.round(score01 * 100),
    factors: { recency, freq, sentiment, reciprocity, mix },
  };
}

function warmthTier(score: number): 'inner' | 'rising' | 'cold' {
  if (score >= 72) return 'inner';
  if (score >= 40) return 'rising';
  return 'cold';
}

function TierBadge({ score }: { score: number }) {
  const tier = warmthTier(score);
  const label = tier === 'inner' ? 'Inner Circle' : tier === 'rising' ? 'Rising' : 'Cold';
  const bgColor = tier === 'inner' ? '#000' : tier === 'rising' ? '#666' : '#999';
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]} testID="tier-badge">
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function DueBadge({ days }: { days: number }) {
  let label = '';
  let bgColor = '#999';
  if (days < 0) {
    label = 'Overdue';
    bgColor = '#ef4444';
  } else if (days === 0) {
    label = 'Due today';
    bgColor = '#000';
  } else if (days <= 2) {
    label = 'Due soon';
    bgColor = '#666';
  } else {
    label = `In ${days}d`;
    bgColor = '#999';
  }
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]} testID="due-badge">
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function PersonRow({ person, goalId }: { person: Person; goalId?: string }) {
  const { score } = useMemo(() => computeWarmth(person), [person]);
  const onCraft = useCallback(() => {
    console.log('[WarmthHub] Craft pressed for', person.id);
  }, [person.id]);
  const onSchedule = useCallback(() => {
    console.log('[WarmthHub] Schedule pressed for', person.id);
  }, [person.id]);
  return (
    <View style={styles.personRow} testID={`person-${person.id}`}>
      <View style={styles.personInfo}>
        <View style={styles.avatar}>
          <User size={20} color="#666" />
        </View>
        <View style={styles.personDetails}>
          <View style={styles.personHeader}>
            <Text style={styles.personName}>{person.name}</Text>
            <TierBadge score={score} />
          </View>
          <Text style={styles.personMeta}>
            {person.handle} • {score}/100 warmth • {person.tags.join(' · ')}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={onCraft} testID={`craft-${person.id}`}>
          <MessageSquare size={16} color="#000" />
          <Text style={styles.actionButtonText}>Craft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={onSchedule} testID={`schedule-${person.id}`}>
          <Clock size={16} color="#666" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WarmthHub() {
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [activeGoal, setActiveGoal] = useState<string>(DEFAULT_GOALS[0]?.id ?? '');
  const [query, setQuery] = useState<string>('');
  const [showOnlyDue, setShowOnlyDue] = useState<boolean>(true);
  const [goalModalVisible, setGoalModalVisible] = useState<boolean>(false);

  const filteredPeople = useMemo(() => {
    return PEOPLE
      .filter(p => p.goals.includes(activeGoal))
      .filter(p => (p.name + (p.handle ?? '') + p.tags.join(' ')).toLowerCase().includes(query.toLowerCase()))
      .map(p => ({ p, score: computeWarmth(p).score }))
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p);
  }, [activeGoal, query]);

  const goal = useMemo(() => goals.find(g => g.id === activeGoal) ?? goals[0], [activeGoal, goals]);

  const reminders = useMemo(() => {
    const items = REMINDERS.filter(r => r.goalId === activeGoal && (!showOnlyDue || r.dueInDays <= 2))
      .map(r => {
        const person = PEOPLE.find(p => p.id === r.personId);
        if (!person) return null;
        const score = computeWarmth(person).score;
        return { r, person, score };
      })
      .filter((x): x is { r: Reminder; person: Person; score: number } => Boolean(x));
    items.sort((a, b) => (a.r.dueInDays - b.r.dueInDays) || (b.score - a.score));
    return items;
  }, [activeGoal, showOnlyDue]);

  const openGoalModal = useCallback(() => {
    console.log('[WarmthHub] Open goal modal');
    setGoalModalVisible(true);
  }, []);

  const onSelectGoal = useCallback((id: string) => {
    console.log('[WarmthHub] Select goal', id);
    setActiveGoal(id);
    setGoalModalVisible(false);
  }, []);

  const onAddGoal = useCallback((g: Goal) => {
    console.log('[WarmthHub] Add goal', g);
    setGoals(prev => [...prev, g]);
  }, []);

  const onRenameGoal = useCallback((id: string, update: Partial<Goal>) => {
    console.log('[WarmthHub] Rename goal', id, update);
    setGoals(prev => prev.map(go => (go.id === id ? { ...go, ...update } : go)));
  }, []);

  const onDeleteGoal = useCallback((id: string) => {
    console.log('[WarmthHub] Delete goal', id);
    setGoals(prev => prev.filter(go => go.id !== id));
    setActiveGoal(prev => (prev === id ? (goals[0]?.id ?? '') : prev));
  }, [goals]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="warmthhub-screen">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Flame size={24} color="#000" />
          <View>
            <Text style={styles.title}>Warmth Hub</Text>
            <Text style={styles.subtitle}>
              Active goal: {goal?.emoji} {goal?.label} • recommended cadence {goal?.cadenceDays}d
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openGoalModal} style={styles.iconBtn} testID="open-goal-modal">
            <Target size={16} color="#000" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Search size={16} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search people, tags…"
              placeholderTextColor="#666"
              testID="search-input"
            />
          </View>
        </View>
      </View>

      <View style={styles.goalChips}>
        {goals.map(g => (
          <TouchableOpacity
            key={g.id}
            style={[styles.chip, g.id === activeGoal && styles.activeChip]}
            onPress={() => setActiveGoal(g.id)}
            testID={`goal-chip-${g.id}`}
          >
            <Text style={[styles.chipText, g.id === activeGoal && styles.activeChipText]}>
              {g.emoji} {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mainContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>People Heatmap</Text>
            <Text style={styles.cardSubtitle}>
              Ranked by warmth (recency × frequency × reciprocity × sentiment × channel mix)
            </Text>
          </View>
          <View style={styles.cardContent}>
            {filteredPeople.map(p => (
              <PersonRow key={p.id} person={p} goalId={activeGoal} />
            ))}
            {filteredPeople.length === 0 && (
              <Text style={styles.emptyText}>No matches for this goal yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Follow-ups</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Show due/soon only</Text>
              <Switch value={showOnlyDue} onValueChange={setShowOnlyDue} />
            </View>
          </View>
          <View style={styles.cardContent}>
            {reminders.map(({ r, person, score }) => (
              <View key={r.id} style={styles.reminderCard} testID={`reminder-${r.id}`}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderInfo}>
                    <View style={styles.avatar}>
                      <User size={20} color="#666" />
                    </View>
                    <View>
                      <View style={styles.reminderPersonHeader}>
                        <Text style={styles.personName}>{person.name}</Text>
                        <TierBadge score={score} />
                        <DueBadge days={r.dueInDays} />
                      </View>
                      <Text style={styles.reminderReason}>{r.reason}</Text>
                      <Text style={styles.reminderSuggestion}>
                        Suggested: <Text style={styles.bold}>{r.suggestedAction}</Text>
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.reminderActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => console.log('[WarmthHub] Craft from reminder', r.id)}>
                    <MessageSquare size={16} color="#000" />
                    <Text style={styles.actionButtonText}>Craft</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => console.log('[WarmthHub] Snooze reminder', r.id)}>
                    <Clock size={16} color="#666" />
                    <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Snooze</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {reminders.length === 0 && (
              <Text style={styles.emptyText}>No reminders for this goal right now.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.cardSubtitle}>Goal-aware shortcuts that log context automatically</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => console.log('[WarmthHub] Quick Craft')}>
            <Text style={styles.quickActionText}>Craft Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.secondaryButton]}
            onPress={() => console.log('[WarmthHub] Upload Screenshot')}
          >
            <Text style={[styles.quickActionText, styles.secondaryButtonText]}>Upload Screenshot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionButton, styles.outlineButton]} onPress={() => console.log('[WarmthHub] Log Interaction')}>
            <Text style={[styles.quickActionText, styles.outlineButtonText]}>Log Interaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionButton, styles.outlineButton]} onPress={() => console.log('[WarmthHub] Schedule Reminder')}>
            <Text style={[styles.quickActionText, styles.outlineButtonText]}>Schedule Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GoalModal
        visible={goalModalVisible}
        goals={goals}
        activeGoalId={activeGoal}
        onClose={() => setGoalModalVisible(false)}
        onSelectGoal={onSelectGoal}
        onAddGoal={onAddGoal}
        onRenameGoal={onRenameGoal}
        onDeleteGoal={onDeleteGoal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    position: 'relative',
    width: 200,
  },
  searchIcon: {
    position: 'absolute',
    left: 8,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 32,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  activeChip: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 14,
    color: '#000',
  },
  activeChipText: {
    color: '#fff',
  },
  mainContent: {
    gap: 16 as const,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardContent: {
    gap: 16 as const,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 as const,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personDetails: {
    flex: 1,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as const,
    marginBottom: 4,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  personMeta: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8 as const,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 as const,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#000',
    borderRadius: 6,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: '#666',
  },
  outlineButtonText: {
    color: '#000',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as const,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
  },
  reminderCard: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  reminderHeader: {
    marginBottom: 12,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12 as const,
  },
  reminderPersonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as const,
    marginBottom: 4,
  },
  reminderReason: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  reminderSuggestion: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  bold: {
    fontWeight: '500',
  },
  iconBtn: {
    padding: 6,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8 as const,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12 as const,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
