import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Linkedin, 
  Twitter, 
  Instagram,
  Globe,
  CheckCircle2,
  Star,
  Plus
} from 'lucide-react-native';

interface Channel {
  id: string;
  channel_type: 'email' | 'phone' | 'sms' | 'linkedin' | 'twitter' | 'instagram' | 'website';
  channel_value: string;
  is_primary?: boolean;
  is_verified?: boolean;
  label?: string;
}

interface ChannelsCardProps {
  channels: Channel[];
  contactId: string;
  onAddChannel?: () => void;
}

export default function ChannelsCard({ channels, contactId, onAddChannel }: ChannelsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getChannelIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail size={18} color="#4B5563" />;
      case 'phone':
        return <Phone size={18} color="#4B5563" />;
      case 'sms':
        return <MessageCircle size={18} color="#4B5563" />;
      case 'linkedin':
        return <Linkedin size={18} color="#0A66C2" />;
      case 'twitter':
        return <Twitter size={18} color="#1DA1F2" />;
      case 'instagram':
        return <Instagram size={18} color="#E4405F" />;
      case 'website':
        return <Globe size={18} color="#4B5563" />;
      default:
        return <MessageCircle size={18} color="#4B5563" />;
    }
  };

  const getChannelLabel = (channel: Channel) => {
    if (channel.label) return channel.label;
    
    switch (channel.channel_type.toLowerCase()) {
      case 'email':
        return 'Email';
      case 'phone':
        return 'Phone';
      case 'sms':
        return 'SMS';
      case 'linkedin':
        return 'LinkedIn';
      case 'twitter':
        return 'Twitter';
      case 'instagram':
        return 'Instagram';
      case 'website':
        return 'Website';
      default:
        return channel.channel_type.charAt(0).toUpperCase() + channel.channel_type.slice(1);
    }
  };

  const handleChannelPress = async (channel: Channel) => {
    let url = '';

    switch (channel.channel_type.toLowerCase()) {
      case 'email':
        url = `mailto:${channel.channel_value}`;
        break;
      case 'phone':
        url = `tel:${channel.channel_value}`;
        break;
      case 'sms':
        url = `sms:${channel.channel_value}`;
        break;
      case 'linkedin':
        url = channel.channel_value.startsWith('http') 
          ? channel.channel_value 
          : `https://linkedin.com/in/${channel.channel_value}`;
        break;
      case 'twitter':
        url = channel.channel_value.startsWith('http') 
          ? channel.channel_value 
          : `https://twitter.com/${channel.channel_value.replace('@', '')}`;
        break;
      case 'instagram':
        url = channel.channel_value.startsWith('http') 
          ? channel.channel_value 
          : `https://instagram.com/${channel.channel_value.replace('@', '')}`;
        break;
      case 'website':
        url = channel.channel_value.startsWith('http') 
          ? channel.channel_value 
          : `https://${channel.channel_value}`;
        break;
    }

    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          console.error('[ChannelsCard] Cannot open URL:', url);
          if (Platform.OS === 'web') {
            alert('Cannot open this channel');
          }
        }
      } catch (error) {
        console.error('[ChannelsCard] Error opening URL:', error);
        if (Platform.OS === 'web') {
          alert('Failed to open channel');
        }
      }
    }
  };

  const sortedChannels = [...channels].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    if (a.is_verified && !b.is_verified) return -1;
    if (!a.is_verified && b.is_verified) return 1;
    return 0;
  });

  const displayChannels = expanded ? sortedChannels : sortedChannels.slice(0, 4);

  if (channels.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Channels</Text>
        <View style={styles.emptyState}>
          <MessageCircle size={32} color="#CCCCCC" />
          <Text style={styles.emptyText}>No contact channels</Text>
          {onAddChannel && (
            <TouchableOpacity style={styles.addButton} onPress={onAddChannel}>
              <Plus size={16} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Channel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Contact Channels</Text>
        {onAddChannel && (
          <TouchableOpacity style={styles.addIconButton} onPress={onAddChannel}>
            <Plus size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.channelsGrid}>
        {displayChannels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelCard}
            onPress={() => handleChannelPress(channel)}
          >
            <View style={styles.channelHeader}>
              <View style={styles.iconBackground}>
                {getChannelIcon(channel.channel_type)}
              </View>
              
              <View style={styles.badges}>
                {channel.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  </View>
                )}
                {channel.is_verified && (
                  <CheckCircle2 size={14} color="#10B981" fill="#D1FAE5" />
                )}
              </View>
            </View>

            <Text style={styles.channelLabel}>{getChannelLabel(channel)}</Text>
            <Text style={styles.channelValue} numberOfLines={1}>
              {channel.channel_value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {channels.length > 4 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${channels.length - 4} More`}
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
  addIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  channelCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 90,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  primaryBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  channelValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandText: {
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
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});
