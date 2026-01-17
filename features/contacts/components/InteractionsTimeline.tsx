import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { Phone, Mail, MessageCircle, Calendar, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

interface Interaction {
  id: string;
  kind?: string;  // Made optional - some interactions may not have kind
  content?: string;
  created_at: string;
  metadata?: {
    subject?: string;
    direction?: 'inbound' | 'outbound';
    duration?: number;
  };
}

interface InteractionsTimelineProps {
  interactions: Interaction[];
  contactId: string;
  maxItems?: number;
}

export default function InteractionsTimeline({ 
  interactions, 
  contactId, 
  maxItems = 10 
}: InteractionsTimelineProps) {
  const { theme } = useAppSettings();
  const sortedInteractions = [...interactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems);

  const getInteractionIcon = (kind?: string) => {
    if (!kind) return <Clock size={16} color={theme.colors.textSecondary} />;
    
    switch (kind.toLowerCase()) {
      case 'call':
      case 'phone':
        return <Phone size={16} color={theme.colors.textSecondary} />;
      case 'email':
        return <Mail size={16} color={theme.colors.textSecondary} />;
      case 'sms':
      case 'message':
        return <MessageCircle size={16} color={theme.colors.textSecondary} />;
      case 'meeting':
        return <Calendar size={16} color={theme.colors.textSecondary} />;
      default:
        return <Clock size={16} color={theme.colors.textSecondary} />;
    }
  };

  const getInteractionTypeLabel = (kind?: string) => {
    if (!kind) return 'Interaction';
    
    switch (kind.toLowerCase()) {
      case 'call':
      case 'phone':
        return 'Phone Call';
      case 'email':
        return 'Email';
      case 'sms':
      case 'message':
        return 'Message';
      case 'meeting':
        return 'Meeting';
      default:
        return kind.charAt(0).toUpperCase() + kind.slice(1);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (sortedInteractions.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Interactions</Text>
        <View style={styles.emptyState}>
          <Clock size={32} color={theme.colors.border} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No interactions yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Log your first interaction to track your relationship</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12 }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Interactions</Text>
        <TouchableOpacity onPress={() => router.push(`/contact-context/${contactId}?tab=interactions`)}>
          <Text style={[styles.viewAll, { color: theme.colors.primary }]}>View All ({interactions.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
      >
        {sortedInteractions.map((interaction) => (
          <TouchableOpacity 
            key={interaction.id}
            style={[styles.interactionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.push(`/contact-context/${contactId}?tab=interactions`)}
          >
            <View style={styles.interactionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                {getInteractionIcon(interaction.kind)}
              </View>
              <View style={styles.interactionMeta}>
                <Text style={[styles.interactionType, { color: theme.colors.text }]}>
                  {getInteractionTypeLabel(interaction.kind)}
                </Text>
                <Text style={[styles.interactionTime, { color: theme.colors.textSecondary }]}>
                  {getTimeAgo(interaction.created_at)}
                </Text>
              </View>
            </View>

            {interaction.metadata?.subject && (
              <Text style={[styles.interactionSubject, { color: theme.colors.text }]} numberOfLines={2}>
                {interaction.metadata.subject}
              </Text>
            )}

            {interaction.content && (
              <Text style={[styles.interactionContent, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                {interaction.content}
              </Text>
            )}

            {interaction.metadata?.direction && (
              <View style={[
                styles.directionBadge,
                { backgroundColor: interaction.metadata.direction === 'inbound' ? '#E8F5E9' : '#E3F2FD' }
              ]}>
                <Text style={[
                  styles.directionText,
                  { color: interaction.metadata.direction === 'inbound' ? '#2E7D32' : '#1565C0' }
                ]}>
                  {interaction.metadata.direction === 'inbound' ? 'Received' : 'Sent'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {interactions.length > maxItems && (
        <TouchableOpacity 
          style={styles.viewMoreButton}
          onPress={() => router.push(`/contact-context/${contactId}?tab=interactions`)}
        >
          <Text style={[styles.viewMoreText, { color: theme.colors.primary }]}>
            View {interactions.length - maxItems} more interaction{interactions.length - maxItems !== 1 ? 's' : ''}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  viewAll: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  timelineScroll: {
    gap: 12,
    paddingRight: 16,
  },
  interactionCard: {
    width: 240,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  interactionMeta: {
    flex: 1,
  },
  interactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  interactionTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  interactionSubject: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  interactionContent: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  directionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  directionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  viewMoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  },
});
