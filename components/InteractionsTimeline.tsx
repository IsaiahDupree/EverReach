import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Mail, Phone, MessageCircle, FileText, Calendar } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface Interaction {
  id: string;
  contact_id: string;
  kind: string;
  content?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface InteractionsTimelineProps {
  interactions: Interaction[];
  onInteractionPress?: (interaction: Interaction) => void;
  maxItems?: number;
}

export function InteractionsTimeline({ 
  interactions, 
  onInteractionPress,
  maxItems = 10 
}: InteractionsTimelineProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getInteractionIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'email':
        return <Mail size={16} color={theme.colors.primary} />;
      case 'call':
        return <Phone size={16} color={theme.colors.success} />;
      case 'sms':
      case 'message':
        return <MessageCircle size={16} color={theme.colors.primary} />;
      case 'note':
        return <FileText size={16} color={theme.colors.textSecondary} />;
      case 'meeting':
        return <Calendar size={16} color={theme.colors.primary} />;
      default:
        return <FileText size={16} color={theme.colors.textSecondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const displayedInteractions = interactions.slice(0, maxItems);

  if (displayedInteractions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <FileText size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No interactions yet</Text>
        <Text style={styles.emptySubtext}>
          Start a conversation to build your relationship
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {displayedInteractions.map((interaction, index) => (
        <TouchableOpacity
          key={interaction.id}
          style={[
            styles.interactionCard,
            index === displayedInteractions.length - 1 && styles.lastCard
          ]}
          onPress={() => onInteractionPress?.(interaction)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {getInteractionIcon(interaction.kind)}
          </View>
          
          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <Text style={styles.kind}>{interaction.kind}</Text>
              <Text style={styles.date}>{formatDate(interaction.created_at)}</Text>
            </View>
            
            {interaction.content && (
              <Text style={styles.content} numberOfLines={2}>
                {interaction.content}
              </Text>
            )}
            
            {interaction.metadata?.sentiment && (
              <View style={styles.metadataContainer}>
                <Text style={styles.metadata}>
                  Sentiment: {interaction.metadata.sentiment}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  interactionCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kind: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  content: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  metadataContainer: {
    marginTop: 4,
  },
  metadata: {
    fontSize: 12,
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
