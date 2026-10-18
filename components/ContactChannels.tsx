/**
 * Contact Channels Component
 * Displays all communication channels for a contact (email, phone, social media)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import {
  SocialMediaChannel,
  PLATFORM_NAMES,
  PLATFORM_COLORS,
  PLATFORM_ICONS,
  buildProfileUrl,
  validateHandle,
} from '@/types/socialChannels';
import { openSocialChannel, openEmail, openPhone } from '@/lib/deepLinking';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '@/providers/AppSettingsProvider';

export interface ContactChannelsProps {
  contactId: string;
  emails?: string[];
  phones?: string[];
  socialChannels?: SocialMediaChannel[];
  preferredChannels?: string[];
  onUpdateSocialChannels?: (channels: SocialMediaChannel[]) => Promise<void>;
  editable?: boolean;
  onSetPreferredChannel?: (platform: string) => Promise<void>;
  initiallyExpanded?: boolean;
  showEditIcon?: boolean;
  hideSocialHeader?: boolean;
}

export function ContactChannels({
  contactId,
  emails = [],
  phones = [],
  socialChannels = [],
  preferredChannels = [],
  onUpdateSocialChannels,
  editable = true,
  onSetPreferredChannel,
  initiallyExpanded = false,
  showEditIcon = false,
  hideSocialHeader = false,
}: ContactChannelsProps) {
  const { theme } = useAppSettings();
  const [isUpdating, setIsUpdating] = useState(false);
  const [initialChannel, setInitialChannel] = useState<SocialMediaChannel | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(initiallyExpanded);
  const [manageVisible, setManageVisible] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addPlatform, setAddPlatform] = useState<any | null>(null);
  const [addHandle, setAddHandle] = useState<string>('');
  const [addError, setAddError] = useState<string | null>(null);
  const [markPreferred, setMarkPreferred] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [localPreferred, setLocalPreferred] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Track keyboard visibility and height with smooth animation
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Animate the layout change smoothly
        LayoutAnimation.configureNext(LayoutAnimation.create(
          250,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        ));
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to show input after keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Animate the layout change smoothly when keyboard hides
        LayoutAnimation.configureNext(LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        ));
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  const keyboardVisible = keyboardHeight > 0;

  const canSave = Boolean(addPlatform && addHandle.trim().length > 0 && !isUpdating && !addError);

  const effectivePreferredSet = React.useMemo(() => {
    return new Set<string>(localPreferred ? [localPreferred] : preferredChannels);
  }, [localPreferred, preferredChannels]);

  // Sort social channels to show preferred ones first
  const sortedSocialChannels = [...socialChannels].filter(ch => ch?.platform).sort((a, b) => {
    const aPreferred = effectivePreferredSet.has(a.platform);
    const bPreferred = effectivePreferredSet.has(b.platform);
    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return 0;
  });

  // Determine the top (preferred) platform from the sorted list
  const topPlatform = sortedSocialChannels[0]?.platform;

  const handleOpenEmail = async (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const opened = await openEmail(email);
    if (!opened) {
      Alert.alert('Error', 'Could not open email client');
    }
  };

  const handleSetPreferred = async (platform: string) => {
    if (!onSetPreferredChannel) {
      Alert.alert('Not Supported', 'Setting a preferred channel is not available.');
      return;
    }
    try {
      setIsUpdating(true);
      // Optimistically reflect in UI
      setLocalPreferred(platform);
      await onSetPreferredChannel(platform);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch (e: any) {
      console.error('[ContactChannels] Failed to set preferred:', e?.message || e);
      Alert.alert('Error', e?.message || 'Failed to set preferred channel');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update preferred channel. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const showSocialOptions = (channel: SocialMediaChannel) => {
    if (!editable) return;
    Alert.alert(
      PLATFORM_NAMES[channel.platform],
      channel.handle,
      [
        { text: 'Open', onPress: () => handleOpenSocialChannel(channel) },
        onSetPreferredChannel
          ? { text: 'Set Preferred', onPress: () => handleSetPreferred(channel.platform) }
          : undefined as any,
        { text: 'Edit', onPress: () => { setIsAdding(true); setAddPlatform(channel.platform as any); setAddHandle(channel.handle); setInitialChannel(channel); setAddError(null); setManageVisible(true); } },
        { text: 'Remove', style: 'destructive', onPress: () => handleDeleteSocialChannel(channel) },
        { text: 'Cancel', style: 'cancel' },
      ]
        .filter(Boolean) as any
    );
  };

  // Save edited social channel (replace existing by platform)
  const handleSaveEditedChannel = async (channel: SocialMediaChannel) => {
    if (!onUpdateSocialChannels) return;
    try {
      setIsUpdating(true);
      const next = socialChannels.map((ch) =>
        ch.platform === (initialChannel?.platform || channel.platform) ? channel : ch
      );
      await onUpdateSocialChannels(next);
      setInitialChannel(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error('[ContactChannels] Error saving edited channel:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenPhone = async (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Contact',
      `What would you like to do?`,
      [
        {
          text: 'Call',
          onPress: async () => {
            const opened = await openPhone(phone);
            if (!opened) {
              Alert.alert('Error', 'Could not open phone dialer');
            }
          },
        },
        {
          text: 'Message',
          onPress: async () => {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
              await SMS.sendSMSAsync([phone], '');
            } else {
              Alert.alert('Error', 'SMS is not available on this device');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleOpenSocialChannel = async (channel: SocialMediaChannel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const opened = await openSocialChannel(channel);
    if (!opened) {
      Alert.alert(
        'Error',
        `Could not open ${PLATFORM_NAMES[channel.platform]}. Please check if the app is installed.`
      );
    }
  };

  const handleAddSocialChannel = async (channel: SocialMediaChannel) => {
    if (!onUpdateSocialChannels) {
      Alert.alert('Error', 'Cannot add social channel');
      return;
    }

    try {
      setIsUpdating(true);
      
      // Validate channel before adding
      console.log('[ContactChannels] New channel to add:', JSON.stringify(channel, null, 2));
      console.log('[ContactChannels] Channel validation:', {
        hasPlatform: !!channel.platform,
        platformLength: channel.platform?.length || 0,
        hasHandle: !!channel.handle,
        handleLength: channel.handle?.length || 0,
        hasUrl: !!channel.url,
        urlStartsWithHttp: channel.url?.startsWith('http'),
      });
      
      const updatedChannels = [...socialChannels, channel];
      console.log('[ContactChannels] Updated channels count:', updatedChannels.length);
      console.log('[ContactChannels] Full channels array:', JSON.stringify(updatedChannels, null, 2));
      
      await onUpdateSocialChannels(updatedChannels);
      // Close manage modal
      setManageVisible(false);
      
      // Then show success feedback (haptics only; modal auto-closes)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error: any) {
      console.error('[ContactChannels] Error adding channel:', error);
      console.error('[ContactChannels] Error details:', {
        message: error?.message,
        status: error?.status,
        details: error?.details,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Try to extract meaningful error message
      let errorMessage = 'Failed to add social channel. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      if (error?.details) {
        console.log('[ContactChannels] Validation details:', error.details);
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSocialChannel = (channel: SocialMediaChannel) => {
    if (!onUpdateSocialChannels) return;

    Alert.alert(
      'Remove Channel',
      `Remove ${PLATFORM_NAMES[channel.platform]} (${channel.handle})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const updatedChannels = socialChannels.filter(
                (ch) => ch.platform !== channel.platform
              );
              await onUpdateSocialChannels(updatedChannels);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[ContactChannels] Error removing channel:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to remove channel. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const hasChannels = emails.length > 0 || phones.length > 0 || socialChannels.length > 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Channels</Text>

      {!hasChannels && (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12 }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.border} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No contact channels yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Add email, phone, or social media</Text>
        </View>
      )}

      {/* Emails */}
      {emails.length > 0 && emails[0] && (
        <TouchableOpacity
          style={[styles.channelItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 12 }, preferredChannels.includes('email') && styles.preferredChannel]}
          onPress={() => handleOpenEmail(emails[0]!)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <Ionicons name="mail" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelLabelRow}>
              <Text style={[styles.channelLabel, { color: theme.colors.textSecondary }]}>Primary Email</Text>
              {preferredChannels.includes('email') && (
                <View style={[styles.preferredBadge, { backgroundColor: theme.colors.success || '#10B981' }]}>
                  <Text style={styles.preferredBadgeText}>Preferred</Text>
                </View>
              )}
            </View>
            <Text style={[styles.channelValue, { color: theme.colors.text }]}>{emails[0]}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Phones */}
      {phones.length > 0 && phones[0] && (
        <TouchableOpacity
          style={[styles.channelItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 12 }, preferredChannels.includes('phone') && styles.preferredChannel]}
          onPress={() => handleOpenPhone(phones[0]!)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <Ionicons name="call" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelLabelRow}>
              <Text style={[styles.channelLabel, { color: theme.colors.textSecondary }]}>Primary Phone</Text>
              {preferredChannels.includes('phone') && (
                <View style={[styles.preferredBadge, { backgroundColor: theme.colors.success || '#10B981' }]}>
                  <Text style={styles.preferredBadgeText}>Preferred</Text>
                </View>
              )}
            </View>
            <Text style={[styles.channelValue, { color: theme.colors.text }]}>{phones[0]}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Social Media Channels Header (optional) */}
      {!hideSocialHeader && (
        <TouchableOpacity
          style={styles.socialHeader}
          activeOpacity={0.7}
          onPress={() => setIsExpanded((v) => !v)}
        >
          <Text style={[styles.subsectionTitle, { color: theme.colors.textSecondary }]}>Social Media ({socialChannels.length})</Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {justSaved && (
        <View style={styles.saveToast}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.saveToastText}>Saved</Text>
        </View>
      )}

      {/* Collapsed view: show preferred (top of sorted) or first social */}
      {!isExpanded && !hideSocialHeader && sortedSocialChannels.length > 0 && (() => {
        const preferred = sortedSocialChannels[0];
        return (
          <TouchableOpacity
            key={`social-collapsed-${preferred.platform}`}
            style={[styles.channelItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 12 }]}
            onPress={() => handleOpenSocialChannel(preferred)}
            disabled={isUpdating}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
              ]}
            >
              <Ionicons
                name={PLATFORM_ICONS[preferred.platform] as any}
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.channelInfo}>
              <View style={styles.channelLabelRow}>
                <Text style={[styles.channelLabel, { color: theme.colors.textSecondary }]}>
                  {PLATFORM_NAMES[preferred.platform]}
                </Text>
              </View>
              <Text style={[styles.channelValue, { color: theme.colors.text }]}>{preferred.handle}</Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      {/* Expanded view: show all social channels and Add button */}
      {(isExpanded || hideSocialHeader) && sortedSocialChannels.map((channel, index) => (
        <TouchableOpacity
          key={`social-${channel.platform}-${index}`}
          style={[styles.channelItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 12 }]}
          onPress={() => handleOpenSocialChannel(channel)}
          disabled={isUpdating}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
            ]}
          >
            <Ionicons
              name={PLATFORM_ICONS[channel.platform] as any}
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelLabelRow}>
              <Text style={[styles.channelLabel, { color: theme.colors.textSecondary }]}>
                {PLATFORM_NAMES[channel.platform]}
              </Text>
            </View>
            <Text style={[styles.channelValue, { color: theme.colors.text }]}>{channel.handle}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {(isExpanded || hideSocialHeader) && editable && onUpdateSocialChannels && (
        <TouchableOpacity
          style={[styles.addButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface, borderRadius: 12 }]}
          onPress={() => { setManageVisible(true); setIsAdding(true); setAddPlatform(null); setAddHandle(''); setAddError(null); }}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add Social Media</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Manage Social Channels Modal */}
      <Modal
        visible={manageVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManageVisible(false)}
      >
        <TouchableOpacity 
          style={styles.manageOverlay}
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
        >
          <View 
            style={[
              styles.manageContainer, 
              // Push modal up partially when keyboard is visible (not full height)
              keyboardHeight > 0 && { marginBottom: Math.min(keyboardHeight * 0.3, 100) }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.manageHeader}>
              <Text style={styles.manageTitle}>
                {isAdding
                  ? (socialChannels.some((s) => s.platform === addPlatform) ? 'Edit Social Media' : 'Add Social Media')
                  : 'Manage Social Media'}
              </Text>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setManageVisible(false); }}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.manageContent} 
              contentContainerStyle={{ paddingBottom: keyboardVisible ? 100 : 48 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.addFormContainer}>
                  {/* Platform Selection - Hide when keyboard open */}
                  {!keyboardVisible && (
                    <>
                  <Text style={styles.addFormLabel}>Select Platform</Text>
                  <View style={styles.addPlatformsGrid}>
                    {(
                      [
                        'instagram','twitter','linkedin','facebook','whatsapp','telegram','tiktok','snapchat','youtube','threads','pinterest','twitch','discord','custom',
                      ] as const
                    ).map((p) => {
                      const existing = socialChannels.find((s) => s.platform === p);
                      const active = addPlatform === p;
                      return (
                        <TouchableOpacity
                          key={`pf-${p}`}
                          style={[
                            styles.platformTile,
                            existing && styles.platformTileDisabled,
                            active && [styles.platformTileActive, { borderColor: PLATFORM_COLORS[p] }],
                          ]}
                          onPress={() => {
                            setAddPlatform(p);
                            if (existing) {
                              setAddHandle(existing.handle);
                              setInitialChannel(existing);
                              setMarkPreferred(preferredChannels.includes(p));
                            } else {
                              setAddHandle('');
                              setInitialChannel(null);
                              setMarkPreferred(false);
                            }
                            setIsAdding(true);
                            setAddError(null);
                          }}
                        >
                          <View style={[styles.platformIconCircle, active && { backgroundColor: PLATFORM_COLORS[p] }]}>
                            <Ionicons name={PLATFORM_ICONS[p] as any} size={18} color={active ? '#FFF' : '#6B7280'} />
                          </View>
                          <Text style={[styles.platformTileText, existing && !active && { color: '#777' }]}>
                            {PLATFORM_NAMES[p]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                    </>
                  )}

                  {/* Selected platform badge - show when keyboard is open */}
                  {keyboardVisible && addPlatform && (
                    <View style={[styles.selectedPlatformBadge, { borderColor: PLATFORM_COLORS[addPlatform] }]}>
                      <Ionicons name={PLATFORM_ICONS[addPlatform] as any} size={18} color={PLATFORM_COLORS[addPlatform]} />
                      <Text style={[styles.selectedPlatformText, { color: PLATFORM_COLORS[addPlatform] }]}>
                        {PLATFORM_NAMES[addPlatform]}
                      </Text>
                    </View>
                  )}

                  {/* Handle Input - ALWAYS visible */}
                  <Text style={styles.addFormLabel}>
                    {addPlatform === 'custom' ? 'Profile URL' : 'Handle'}
                  </Text>
                  <TextInput
                    ref={inputRef}
                    style={styles.addInput}
                    placeholder={addPlatform === 'custom' ? 'https://example.com/you' : '@username'}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    value={addHandle}
                    onChangeText={(t) => {
                      setAddHandle(t);
                      if (addPlatform) {
                        const { valid, error } = validateHandle(addPlatform as any, t.trim());
                        setAddError(valid ? null : (error || 'Invalid handle'));
                      } else {
                        setAddError(null);
                      }
                    }}
                  />
                  {addError ? <Text style={styles.addError}>{addError}</Text> : null}

                  {/* Preferred toggle - ALWAYS visible */}
                  <View style={styles.preferredRow}>
                    <Text style={styles.preferredRowLabel}>Set as Preferred</Text>
                    <Switch value={markPreferred} onValueChange={setMarkPreferred} />
                  </View>

                  {/* Preview - ALWAYS visible */}
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>Preview</Text>
                    <Text style={styles.previewValue}>
                      {addPlatform ? buildProfileUrl(addPlatform as any, (addHandle || '').trim()) : ''}
                    </Text>
                  </View>

                  <View style={styles.actionRowTop}>
                    {socialChannels.some((s) => s.platform === addPlatform) && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        disabled={isUpdating}
                        onPress={() => {
                          const existing = socialChannels.find((s) => s.platform === addPlatform);
                          if (!existing) return;
                          Alert.alert(
                            'Remove Channel',
                            `Delete ${PLATFORM_NAMES[existing.platform]} for this contact?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  await handleDeleteSocialChannel(existing);
                                  setIsAdding(false);
                                  setManageVisible(false);
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.cancelButton, !socialChannels.some((s) => s.platform === addPlatform) && { flex: 1 }]} onPress={() => { setIsAdding(false); setAddPlatform(null); setAddHandle(''); setAddError(null); }}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.saveButtonFull,
                      { backgroundColor: (theme.colors.primary || '#111827') },
                      (isUpdating || !canSave) && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={socialChannels.some((s) => s.platform === addPlatform) ? 'Save Changes' : 'Add Channel'}
                    disabled={isUpdating || !canSave}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (!addPlatform) { setAddError('Please select a platform'); return; }
                      const { valid, error } = validateHandle(addPlatform as any, addHandle.trim());
                      if (!valid) { setAddError(error || 'Invalid handle'); return; }
                      const channel: SocialMediaChannel = {
                        platform: addPlatform as any,
                        handle: addHandle.trim(),
                        url: buildProfileUrl(addPlatform as any, addHandle.trim()),
                      };
                      const existing = socialChannels.find((s) => s.platform === addPlatform);
                      if (existing) {
                        setInitialChannel(existing);
                        await handleSaveEditedChannel(channel);
                      } else {
                        await handleAddSocialChannel(channel);
                      }
                      // Close modal asap
                      setIsAdding(false);
                      setManageVisible(false);
                      // Fire-and-forget preferred save for faster perceived performance
                      if (markPreferred && onSetPreferredChannel) {
                        handleSetPreferred(addPlatform as string);
                      }
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.saveButtonContent}>
                        <Ionicons name={socialChannels.some((s) => s.platform === addPlatform) ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>
                          {socialChannels.some((s) => s.platform === addPlatform) ? 'Save Changes' : 'Add Channel'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emailIcon: {
    backgroundColor: '#E3F2FD',
  },
  phoneIcon: {
    backgroundColor: '#E8F5E9',
  },
  channelInfo: {
    flex: 1,
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    marginBottom: 2,
  },
  channelValue: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  preferredChannel: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  channelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  preferredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  preferredRow: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferredRowLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  // Manage modal styles
  manageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  manageContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  manageContainerKeyboardOpen: {
    maxHeight: '95%',
  },
  inputFirstSection: {
    marginBottom: 16,
  },
  selectedPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    gap: 8,
  },
  selectedPlatformText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  manageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  manageContent: {
    padding: 16,
  },
  manageEmpty: {
    fontSize: 14,
    color: '#6B7280',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  manageRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  manageHandle: {
    fontSize: 12,
    color: '#6B7280',
  },
  manageRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  manageActionText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  manageFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  manageAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageAddText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Inline Add form styles
  addFormContainer: {
    paddingVertical: 8,
  },
  addFormLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  addPlatformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  platformTile: {
    width: '31%',
    margin: '1%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  platformTileActive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#111827',
  },
  platformTileDisabled: {
    opacity: 0.8,
  },
  platformIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformTileText: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
    fontWeight: '600',
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 4,
    backgroundColor: '#FFFFFF',
  },
  platformChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  platformChipDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E7EB',
  },
  platformChipText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  previewBox: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 14,
    color: '#2563EB',
  },
  addError: {
    marginTop: 6,
    color: '#EF4444',
    fontSize: 12,
  },
  addActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  actionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  saveButtonFull: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  saveToastText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
