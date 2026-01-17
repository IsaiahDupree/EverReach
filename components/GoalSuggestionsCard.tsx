import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Lightbulb, ChevronRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface GoalSuggestion {
  id: string;
  goal: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimated_impact?: string;
}

interface GoalSuggestionsCardProps {
  suggestions: GoalSuggestion[];
  isLoading?: boolean;
  onSuggestionPress?: (suggestion: GoalSuggestion) => void;
  onRefresh?: () => void;
}

export function GoalSuggestionsCard({ 
  suggestions, 
  isLoading,
  onSuggestionPress,
  onRefresh 
}: GoalSuggestionsCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning || '#FFD93D';
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Generating AI suggestions...</Text>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Sparkles size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No suggestions available</Text>
        <Text style={styles.emptySubtext}>
          AI will analyze your relationship and suggest next steps
        </Text>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>Generate Suggestions</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={20} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>AI Suggestions</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={suggestion.id || index}
          style={[
            styles.suggestionCard,
            index === suggestions.length - 1 && styles.lastCard
          ]}
          onPress={() => onSuggestionPress?.(suggestion)}
          activeOpacity={0.7}
        >
          <View style={styles.suggestionHeader}>
            <View style={styles.iconContainer}>
              <Lightbulb size={18} color={theme.colors.primary} />
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(suggestion.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(suggestion.priority) }]}>
                {suggestion.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.goalText}>{suggestion.goal}</Text>
          
          {suggestion.reasoning && (
            <Text style={styles.reasoningText} numberOfLines={2}>
              {suggestion.reasoning}
            </Text>
          )}

          {suggestion.estimated_impact && (
            <View style={styles.impactContainer}>
              <Text style={styles.impactLabel}>Impact:</Text>
              <Text style={styles.impactText}>{suggestion.estimated_impact}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Tap to use this suggestion</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  refreshText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  suggestionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 0,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goalText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  reasoningText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  impactText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
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
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
