import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { TrendingUp, Clock } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface PipelineHistoryEntry {
  id: string;
  from_stage_name?: string;
  to_stage_name: string;
  changed_at: string;
  changed_by?: string;
  notes?: string;
}

interface PipelineHistoryTimelineProps {
  history: PipelineHistoryEntry[];
  maxItems?: number;
}

export function PipelineHistoryTimeline({ 
  history, 
  maxItems = 10 
}: PipelineHistoryTimelineProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const displayedHistory = history.slice(0, maxItems);

  if (displayedHistory.length === 0) {
    return (
      <View style={styles.emptyState}>
        <TrendingUp size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No pipeline history</Text>
        <Text style={styles.emptySubtext}>
          Stage changes will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {displayedHistory.map((entry, index) => (
        <View
          key={entry.id || index}
          style={[
            styles.historyEntry,
            index === displayedHistory.length - 1 && styles.lastEntry
          ]}
        >
          <View style={styles.timeline}>
            <View style={styles.timelineDot} />
            {index < displayedHistory.length - 1 && (
              <View style={styles.timelineLine} />
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <View style={styles.stageChange}>
                {entry.from_stage_name && (
                  <>
                    <Text style={styles.fromStage}>{entry.from_stage_name}</Text>
                    <Text style={styles.arrow}>→</Text>
                  </>
                )}
                <Text style={styles.toStage}>{entry.to_stage_name}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Clock size={12} color={theme.colors.textSecondary} />
                <Text style={styles.date}>{formatDate(entry.changed_at)}</Text>
              </View>
            </View>

            {entry.notes && (
              <Text style={styles.notes} numberOfLines={2}>
                {entry.notes}
              </Text>
            )}

            {entry.changed_by && (
              <Text style={styles.changedBy}>
                by {entry.changed_by}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  historyEntry: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  lastEntry: {
    marginBottom: 0,
  },
  timeline: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    marginBottom: 6,
  },
  stageChange: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  fromStage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginHorizontal: 6,
  },
  toStage: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  notes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  changedBy: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
