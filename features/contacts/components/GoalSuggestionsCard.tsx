import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Lightbulb, Target, TrendingUp, Heart, Briefcase, Sparkles, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

interface GoalSuggestion {
  id: string;
  goal: string;
  goal_key: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'nurture' | 're-engage' | 'convert' | 'maintain';
  confidence: number;
}

interface GoalSuggestionsCardProps {
  suggestions: GoalSuggestion[];
  contactId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function GoalSuggestionsCard({ 
  suggestions, 
  contactId, 
  loading,
  onRefresh 
}: GoalSuggestionsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Debug logging
  console.log('[GoalSuggestionsCard] Render:', {
    suggestionsCount: suggestions?.length || 0,
    suggestions: suggestions,
    loading,
    contactId
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nurture':
        return <Heart size={16} color="#EC4899" />;
      case 're-engage':
        return <TrendingUp size={16} color="#F59E0B" />;
      case 'convert':
        return <Target size={16} color="#8B5CF6" />;
      case 'maintain':
        return <Briefcase size={16} color="#10B981" />;
      default:
        return <Lightbulb size={16} color="#6B7280" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nurture':
        return { bg: '#FCE7F3', text: '#BE185D' };
      case 're-engage':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'convert':
        return { bg: '#EDE9FE', text: '#7C3AED' };
      case 'maintain':
        return { bg: '#D1FAE5', text: '#059669' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'High Priority', color: '#EF4444' };
      case 'medium':
        return { label: 'Medium', color: '#F59E0B' };
      case 'low':
        return { label: 'Low Priority', color: '#10B981' };
      default:
        return { label: priority, color: '#6B7280' };
    }
  };

  const handleGoalPress = (suggestion: GoalSuggestion) => {
    // Encode the suggestion context to pass to message generation
    const suggestionContext = encodeURIComponent(JSON.stringify({
      goal: suggestion.goal,
      reason: suggestion.reason,
      category: suggestion.category,
      priority: suggestion.priority,
    }));
    
    router.push(
      `/goal-picker?personId=${contactId}&preselectedGoal=${suggestion.goal_key}&channel=sms&suggestionContext=${suggestionContext}`
    );
  };

  if (collapsed) {
    if (loading) {
      return (
        <TouchableOpacity 
          style={styles.compactSection}
          onPress={() => setCollapsed(false)}
          activeOpacity={0.7}
        >
          <View style={styles.compactHeader}>
            <View style={styles.compactTitleRow}>
              <Sparkles size={16} color="#8B5CF6" />
              <Text style={styles.compactTitle}>AI Goal Suggestions</Text>
            </View>
            <ChevronRight size={16} color="#8B5CF6" />
          </View>
          <View style={styles.compactLoadingContent}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.compactLoadingText}>Analyzing...</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (!suggestions || suggestions.length === 0) {
      return (
        <TouchableOpacity 
          style={styles.compactSection}
          onPress={() => setCollapsed(false)}
          activeOpacity={0.7}
        >
          <View style={styles.compactHeader}>
            <View style={styles.compactTitleRow}>
              <Sparkles size={16} color="#8B5CF6" />
              <Text style={styles.compactTitle}>AI Goal Suggestions</Text>
            </View>
            <ChevronRight size={16} color="#8B5CF6" />
          </View>
          <View style={styles.compactEmptyContent}>
            <Lightbulb size={20} color="#CCCCCC" />
            <Text style={styles.compactEmptyText}>No suggestions available</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const sortedSuggestions = [...suggestions].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    const topSuggestion = sortedSuggestions[0];
    const categoryColors = getCategoryColor(topSuggestion.category);
    
    return (
      <TouchableOpacity 
        style={styles.compactSection}
        onPress={() => setCollapsed(false)}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <View style={styles.compactTitleRow}>
            <Sparkles size={16} color="#8B5CF6" />
            <Text style={styles.compactTitle}>AI Suggestion</Text>
            {suggestions.length > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{suggestions.length}</Text>
              </View>
            )}
          </View>
          <ChevronRight size={16} color="#8B5CF6" />
        </View>
        
        <View style={styles.compactContent}>
          <View style={[styles.compactCategoryBadge, { backgroundColor: categoryColors.bg }]}>
            {getCategoryIcon(topSuggestion.category)}
            <Text style={[styles.compactCategoryText, { color: categoryColors.text }]}>
              {topSuggestion.category.charAt(0).toUpperCase() + topSuggestion.category.slice(1).replace('-', ' ')}
            </Text>
          </View>
          <Text style={styles.compactGoal} numberOfLines={1}>
            {topSuggestion.goal}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Goal Suggestions</Text>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={styles.loadingText}>Analyzing relationship...</Text>
        </View>
      </View>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.titleRow}>
          <View style={styles.titleWithIcon}>
            <Sparkles size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>AI Goal Suggestions</Text>
          </View>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Get Suggestions</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.emptyState}>
          <Lightbulb size={32} color="#CCCCCC" />
          <Text style={styles.emptyText}>No suggestions available</Text>
          <Text style={styles.emptySubtext}>
            Add more interactions to get AI-powered recommendations
          </Text>
        </View>
      </View>
    );
  }

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const displaySuggestions = expanded ? sortedSuggestions : sortedSuggestions.slice(0, 2);

  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.headerTouchable}
        onPress={() => setCollapsed(true)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleWithIcon}>
            <Sparkles size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>AI Goal Suggestions</Text>
          </View>
          <View style={styles.headerActions}>
            {onRefresh && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }} 
                style={styles.refreshIconButton}
              >
                <TrendingUp size={16} color="#8B5CF6" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                setCollapsed(true);
              }} 
              style={styles.collapseButton}
            >
              <Text style={styles.collapseText}>Minimize</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Suggested next steps to strengthen this relationship
        </Text>
      </TouchableOpacity>

      <View style={styles.suggestionsContainer}>
        {displaySuggestions.map((suggestion, index) => {
          const categoryColors = getCategoryColor(suggestion.category);
          const priorityInfo = getPriorityLabel(suggestion.priority);

          return (
            <TouchableOpacity
              key={suggestion.id}
              style={[
                styles.suggestionCard,
                index === 0 && suggestion.priority === 'high' && styles.highPriorityCard
              ]}
              onPress={() => handleGoalPress(suggestion)}
            >
              <View style={styles.suggestionHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColors.bg }]}>
                  {getCategoryIcon(suggestion.category)}
                  <Text style={[styles.categoryText, { color: categoryColors.text }]}>
                    {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1).replace('-', ' ')}
                  </Text>
                </View>

                {suggestion.priority === 'high' && (
                  <View style={[styles.priorityDot, { backgroundColor: priorityInfo.color }]} />
                )}
              </View>

              <Text style={styles.suggestionGoal}>{suggestion.goal}</Text>
              <Text style={styles.suggestionReason}>{suggestion.reason}</Text>

              <View style={styles.suggestionFooter}>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceText}>
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Text>
                </View>

                <View style={styles.actionHint}>
                  <Text style={styles.actionText}>Tap to compose</Text>
                  <ChevronRight size={14} color="#8B5CF6" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {suggestions.length > 2 && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${suggestions.length - 2} More Suggestion${suggestions.length - 2 !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  headerTouchable: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  refreshIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  highPriorityCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestionGoal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
    lineHeight: 20,
  },
  suggestionReason: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  compactSection: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  countBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compactGoal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  compactLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  compactLoadingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  compactEmptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  compactEmptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapseText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
