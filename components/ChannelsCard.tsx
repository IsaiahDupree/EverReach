import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking, Platform } from 'react-native';
import { Mail, Phone, MessageCircle, Linkedin, Globe, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface Channel {
  type: 'email' | 'phone' | 'sms' | 'linkedin' | 'website';
  value: string;
  label?: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

interface ChannelsCardProps {
  channels: Channel[];
  onChannelPress?: (channel: Channel) => void;
}

export function ChannelsCard({ channels, onChannelPress }: ChannelsCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail size={20} color={theme.colors.primary} />;
      case 'phone':
        return <Phone size={20} color={theme.colors.success} />;
      case 'sms':
        return <MessageCircle size={20} color={theme.colors.primary} />;
      case 'linkedin':
        return <Linkedin size={20} color="#0077B5" />;
      case 'website':
        return <Globe size={20} color={theme.colors.primary} />;
      default:
        return <MessageCircle size={20} color={theme.colors.textSecondary} />;
    }
  };

  const handleChannelPress = async (channel: Channel) => {
    if (onChannelPress) {
      onChannelPress(channel);
      return;
    }

    let url = '';
    switch (channel.type) {
      case 'email':
        url = `mailto:${channel.value}`;
        break;
      case 'phone':
        url = `tel:${channel.value}`;
        break;
      case 'sms':
        url = `sms:${channel.value}`;
        break;
      case 'linkedin':
      case 'website':
        url = channel.value.startsWith('http') ? channel.value : `https://${channel.value}`;
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
            alert(`Cannot open ${channel.type}`);
          }
        }
      } catch (error) {
        console.error('[ChannelsCard] Error opening URL:', error);
        if (Platform.OS === 'web') {
          alert(`Failed to open ${channel.type}`);
        }
      }
    }
  };

  if (channels.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MessageCircle size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No contact channels</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {channels.map((channel, index) => (
        <TouchableOpacity
          key={`${channel.type}-${index}`}
          style={styles.channelRow}
          onPress={() => handleChannelPress(channel)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {getChannelIcon(channel.type)}
          </View>
          
          <View style={styles.contentContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                {channel.label || channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
              </Text>
              {channel.is_primary && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Primary</Text>
                </View>
              )}
              {channel.is_verified && (
                <CheckCircle size={14} color={theme.colors.success} />
              )}
            </View>
            <Text style={styles.value} numberOfLines={1}>
              {channel.value}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    gap: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});
