import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Camera,
  Mic,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
export interface Interaction {
  id: string;
  contact_id: string;
  kind: 'email' | 'note' | 'call' | 'screenshot' | 'voice_note' | 'meeting' | 'sms';
  content?: string;
  metadata: {
    subject?: string;
    direction?: 'inbound' | 'outbound';
    status?: string;
    opened?: boolean;
    clicked?: boolean;
    ai_generated?: boolean;
    template_id?: string;
    goal?: string;
    channel?: string;
    image_url?: string;
    screenshot_id?: string;
    analysis?: {
      text_extracted?: string;
      entities?: any[];
      action_items?: string[];
      confidence_score?: number;
    };
    audio_url?: string;
    duration_seconds?: number;
    transcription?: {
      text?: string;
      confidence?: number;
    };
    ai_analysis?: {
      contacts_mentioned?: string[];
      action_items?: string[];
      sentiment?: string;
      tags?: string[];
    };
    recording_url?: string;
    attendees?: string[];
    location?: string;
    notes?: string;
    tags?: string[];
    sentiment?: string;
    priority?: string;
  };
  occurred_at: string;
  created_at: string;
  updated_at?: string;
}

interface InteractionCardProps {
  interaction: Interaction;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function EmailCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
          <Mail size={20} color="#1565C0" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Email</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        <View style={styles.headerRight}>
          {metadata.direction && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    metadata.direction === 'inbound' ? '#E8F5E9' : '#FFF3E0',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: metadata.direction === 'inbound' ? '#2E7D32' : '#E65100',
                  },
                ]}
              >
                {metadata.direction === 'inbound' ? '↓ In' : '↑ Out'}
              </Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color="#007AFF" />
          ) : (
            <ChevronDown size={20} color="#8E8E93" />
          )}
        </View>
      </View>

      {metadata.subject && (
        <Text style={styles.subject} numberOfLines={expanded ? undefined : 1}>
          {metadata.subject}
        </Text>
      )}

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedSection}>
          {metadata.status && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status:</Text>
              <Text style={styles.metaValue}>{metadata.status}</Text>
            </View>
          )}
          {metadata.goal && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Goal:</Text>
              <Text style={styles.metaValue}>{metadata.goal}</Text>
            </View>
          )}
          {metadata.channel && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Channel:</Text>
              <Text style={styles.metaValue}>{metadata.channel}</Text>
            </View>
          )}
          {metadata.opened !== undefined && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Opened:</Text>
              {metadata.opened ? (
                <CheckCircle size={16} color="#34C759" />
              ) : (
                <XCircle size={16} color="#8E8E93" />
              )}
            </View>
          )}
          {metadata.ai_generated && (
            <View style={[styles.badge, { backgroundColor: '#F3E5F5', marginTop: 8 }]}>
              <Text style={[styles.badgeText, { color: '#7B1FA2' }]}>
                ✨ AI Generated
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ScreenshotCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
          <Camera size={20} color="#E65100" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Screenshot</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#007AFF" />
        ) : (
          <ChevronDown size={20} color="#8E8E93" />
        )}
      </View>

      {metadata.image_url && (
        <Image
          source={{ uri: metadata.image_url }}
          style={styles.screenshot}
          resizeMode="cover"
        />
      )}

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 2}>
          {interaction.content}
        </Text>
      )}

      {expanded && metadata.analysis && (
        <View style={styles.expandedSection}>
          {metadata.analysis.action_items && metadata.analysis.action_items.length > 0 && (
            <View style={styles.actionItemsSection}>
              <Text style={styles.sectionTitle}>Action Items:</Text>
              {metadata.analysis.action_items.map((item: string, idx: number) => (
                <Text key={idx} style={styles.actionItem}>
                  • {item}
                </Text>
              ))}
            </View>
          )}
          {metadata.analysis.confidence_score !== undefined && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Confidence:</Text>
              <Text style={styles.metaValue}>
                {Math.round(metadata.analysis.confidence_score * 100)}%
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function VoiceNoteCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
          <Mic size={20} color="#7B1FA2" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Voice Note</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        <View style={styles.headerRight}>
          {metadata.duration_seconds && (
            <View style={[styles.badge, { backgroundColor: '#F5F5F5' }]}>
              <Clock size={12} color="#666666" />
              <Text style={[styles.badgeText, { color: '#666666', marginLeft: 4 }]}>
                {formatDuration(metadata.duration_seconds)}
              </Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color="#007AFF" />
          ) : (
            <ChevronDown size={20} color="#8E8E93" />
          )}
        </View>
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}

      {expanded && metadata.ai_analysis && (
        <View style={styles.expandedSection}>
          {metadata.ai_analysis.action_items &&
            metadata.ai_analysis.action_items.length > 0 && (
              <View style={styles.actionItemsSection}>
                <Text style={styles.sectionTitle}>Action Items:</Text>
                {metadata.ai_analysis.action_items.map((item: string, idx: number) => (
                  <Text key={idx} style={styles.actionItem}>
                    • {item}
                  </Text>
                ))}
              </View>
            )}
          {metadata.ai_analysis.sentiment && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sentiment:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      metadata.ai_analysis.sentiment === 'positive'
                        ? '#34C759'
                        : metadata.ai_analysis.sentiment === 'negative'
                        ? '#FF3B30'
                        : '#8E8E93',
                  },
                ]}
              >
                {metadata.ai_analysis.sentiment}
              </Text>
            </View>
          )}
          {metadata.ai_analysis.contacts_mentioned &&
            metadata.ai_analysis.contacts_mentioned.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mentioned:</Text>
                <Text style={styles.metaValue}>
                  {metadata.ai_analysis.contacts_mentioned.join(', ')}
                </Text>
              </View>
            )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function NoteCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#FFF9C4' }]}>
          <FileText size={20} color="#F57F17" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Note</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#007AFF" />
        ) : (
          <ChevronDown size={20} color="#8E8E93" />
        )}
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedSection}>
          {metadata.tags && metadata.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {metadata.tags.map((tag: string, idx: number) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {metadata.sentiment && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sentiment:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      metadata.sentiment === 'positive'
                        ? '#34C759'
                        : metadata.sentiment === 'negative'
                        ? '#FF3B30'
                        : '#8E8E93',
                  },
                ]}
              >
                {metadata.sentiment}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CallCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
          <Phone size={20} color="#2E7D32" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Call</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        <View style={styles.headerRight}>
          {metadata.direction && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    metadata.direction === 'inbound' ? '#E8F5E9' : '#FFF3E0',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: metadata.direction === 'inbound' ? '#2E7D32' : '#E65100',
                  },
                ]}
              >
                {metadata.direction === 'inbound' ? '↓ In' : '↑ Out'}
              </Text>
            </View>
          )}
          {metadata.duration_seconds && (
            <View style={[styles.badge, { backgroundColor: '#F5F5F5' }]}>
              <Clock size={12} color="#666666" />
              <Text style={[styles.badgeText, { color: '#666666', marginLeft: 4 }]}>
                {formatDuration(metadata.duration_seconds)}
              </Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color="#007AFF" />
          ) : (
            <ChevronDown size={20} color="#8E8E93" />
          )}
        </View>
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function MeetingCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
          <Calendar size={20} color="#01579B" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>Meeting</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#007AFF" />
        ) : (
          <ChevronDown size={20} color="#8E8E93" />
        )}
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedSection}>
          {metadata.location && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Location:</Text>
              <Text style={styles.metaValue}>{metadata.location}</Text>
            </View>
          )}
          {metadata.attendees && metadata.attendees.length > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Attendees:</Text>
              <Text style={styles.metaValue}>{metadata.attendees.join(', ')}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function GenericCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#F5F5F5' }]}>
          <MessageCircle size={20} color="#666666" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>
            {interaction.kind.charAt(0).toUpperCase() + interaction.kind.slice(1)}
          </Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#007AFF" />
        ) : (
          <ChevronDown size={20} color="#8E8E93" />
        )}
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function SmsCard({ interaction }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { metadata } = interaction;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
          <MessageCircle size={20} color="#2E7D32" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>SMS</Text>
          <Text style={styles.cardTime}>{formatDate(interaction.occurred_at)}</Text>
        </View>
        <View style={styles.headerRight}>
          {metadata.direction && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    metadata.direction === 'inbound' ? '#E8F5E9' : '#FFF3E0',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: metadata.direction === 'inbound' ? '#2E7D32' : '#E65100',
                  },
                ]}
              >
                {metadata.direction === 'inbound' ? '↓ In' : '↑ Out'}
              </Text>
            </View>
          )}
          {metadata.status === 'sent' && (
            <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
              <CheckCircle size={12} color="#34C759" />
              <Text style={[styles.badgeText, { color: '#34C759', marginLeft: 4 }]}>
                Sent
              </Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color="#007AFF" />
          ) : (
            <ChevronDown size={20} color="#8E8E93" />
          )}
        </View>
      </View>

      {interaction.content && (
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {interaction.content}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedSection}>
          {metadata.goal && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Goal:</Text>
              <Text style={styles.metaValue}>{metadata.goal}</Text>
            </View>
          )}
          {metadata.ai_generated && (
            <View style={[styles.badge, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.badgeText, { color: '#7B1FA2' }]}>
                ✨ AI Generated
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function InteractionCard({ interaction }: InteractionCardProps) {
  switch (interaction.kind) {
    case 'email':
      return <EmailCard interaction={interaction} />;
    case 'sms':
      return <SmsCard interaction={interaction} />;
    case 'screenshot':
      return <ScreenshotCard interaction={interaction} />;
    case 'voice_note':
      return <VoiceNoteCard interaction={interaction} />;
    case 'note':
      return <NoteCard interaction={interaction} />;
    case 'call':
      return <CallCard interaction={interaction} />;
    case 'meeting':
      return <MeetingCard interaction={interaction} />;
    default:
      return <GenericCard interaction={interaction} />;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  subject: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 6,
  },
  content: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  metaValue: {
    fontSize: 13,
    color: '#000000',
    flex: 1,
  },
  screenshot: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionItemsSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 6,
  },
  actionItem: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    paddingLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500' as const,
  },
});
