import React from 'react';
import { ScrollView, Pressable, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Bubble, SectionTitle } from './ui';
import { MessageCircle, Sparkles, Heart, Coffee, Calendar, Users, Check } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

type SuggestedGoal = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const CARD_MARGIN = 12;

export default function SuggestedGoalsCarousel({
  suggestions,
  selected,
  onSelect,
  contactName,
}: {
  suggestions: string[];
  selected?: string | null;
  onSelect: (goal: string) => void;
  contactName?: string;
}) {
  const { theme } = useAppSettings();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = screenWidth * 0.75;
  // Convert string suggestions to structured goals with icons and colors
  const structuredGoals: SuggestedGoal[] = suggestions.map(goal => {
    // Default goal structure
    const baseGoal: SuggestedGoal = {
      id: goal,
      title: goal,
      description: '',
      icon: <MessageCircle size={24} color="#FFFFFF" />,
      color: '#4ECDC4'
    };

    // Customize based on goal content
    if (goal.toLowerCase().includes('follow up on ai features')) {
      baseGoal.title = 'Follow up on AI features';
      baseGoal.description = `Continue the conversation about AI features for Q2`;
      baseGoal.icon = <Sparkles size={24} color="#FFFFFF" />;
      baseGoal.color = '#8B5CF6';
    } else if (goal.toLowerCase().includes('ask about ai')) {
      baseGoal.title = 'Ask about AI';
      baseGoal.description = `Connect over their interest in AI`;
      baseGoal.icon = <Sparkles size={24} color="#FFFFFF" />;
      baseGoal.color = '#8B5CF6';
    } else if (goal.toLowerCase().includes('check-in') || goal.toLowerCase().includes('check in')) {
      baseGoal.title = 'Casual check-in';
      baseGoal.description = `A friendly message to stay in touch`;
      baseGoal.icon = <Coffee size={24} color="#FFFFFF" />;
      baseGoal.color = '#F59E0B';
    } else if (goal.toLowerCase().includes('follow up')) {
      baseGoal.title = 'Follow up';
      baseGoal.description = `Continue your previous conversation`;
      baseGoal.icon = <MessageCircle size={24} color="#FFFFFF" />;
      baseGoal.color = '#10B981';
    } else if (goal.toLowerCase().includes('meeting') || goal.toLowerCase().includes('call')) {
      baseGoal.title = 'Schedule meeting';
      baseGoal.description = `Propose a time to connect`;
      baseGoal.icon = <Calendar size={24} color="#FFFFFF" />;
      baseGoal.color = '#3B82F6';
    } else if (goal.toLowerCase().includes('congratulate')) {
      baseGoal.title = 'Congratulate';
      baseGoal.description = `Celebrate their achievement`;
      baseGoal.icon = <Heart size={24} color="#FFFFFF" />;
      baseGoal.color = '#EF4444';
    } else if (goal.toLowerCase().includes('intro')) {
      baseGoal.title = 'Ask for intro';
      baseGoal.description = `Request a connection`;
      baseGoal.icon = <Users size={24} color="#FFFFFF" />;
      baseGoal.color = '#6366F1';
    }

    return baseGoal;
  });

  return (
    <Bubble testID="suggestedGoals">
      <SectionTitle><Text>Suggested Goals</Text></SectionTitle>
      {contactName && (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Based on your history with {contactName}</Text>
      )}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        decelerationRate="fast"
        pagingEnabled={false}
      >
        {structuredGoals.map((goal, index) => (
          <Pressable
            key={goal.id}
            onPress={() => onSelect(goal.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select goal: ${goal.title}`}
            testID={`goal_${goal.id}`}
            style={[
              styles.goalCard,
              { backgroundColor: goal.color, width: CARD_WIDTH },
              selected === goal.id && [
                styles.goalCardSelected,
                { borderWidth: 2, borderColor: theme.colors.surface },
              ],
              index === 0 && styles.firstCard,
              index === structuredGoals.length - 1 && styles.lastCard
            ]}
          >
            <View style={styles.iconContainer}>
              {goal.icon}
            </View>
            {selected === goal.id && (
              <View style={[styles.checkBadge, { backgroundColor: theme.colors.surface }]}
              >
                <Check size={14} color={theme.colors.primary} />
              </View>
            )}
            <Text style={styles.goalTitle}>{goal.title}</Text>
            {goal.description && (
              <Text style={styles.goalDescription} numberOfLines={2}>{goal.description}</Text>
            )}
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap to select</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Bubble>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    marginTop: -4,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  goalCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: CARD_MARGIN / 2,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: 'space-between',
  },
  goalCardSelected: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstCard: {
    marginLeft: CARD_MARGIN,
  },
  lastCard: {
    marginRight: CARD_MARGIN,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  goalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  tapHint: {
    alignSelf: 'flex-end',
  },
  tapHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
});