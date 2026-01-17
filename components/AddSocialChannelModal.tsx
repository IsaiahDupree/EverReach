/**
 * Add Social Channel Modal
 * Allows users to add social media handles to contacts
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SocialPlatform,
  SocialMediaChannel,
  PLATFORM_NAMES,
  PLATFORM_COLORS,
  PLATFORM_ICONS,
  buildProfileUrl,
  validateHandle,
  formatHandleForDisplay,
} from '@/types/socialChannels';

interface AddSocialChannelModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (channel: SocialMediaChannel) => void;
  existingChannels?: SocialMediaChannel[];
  mode?: 'add' | 'edit';
  initialChannel?: SocialMediaChannel;
}

export function AddSocialChannelModal({
  visible,
  onClose,
  onSave,
  existingChannels = [],
  mode = 'add',
  initialChannel,
}: AddSocialChannelModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Prefill when editing
  React.useEffect(() => {
    if (visible && mode === 'edit' && initialChannel) {
      setSelectedPlatform(initialChannel.platform);
      // Strip @ for input but keep display in preview/format
      const clean = initialChannel.handle?.replace(/^@/, '') || '';
      setHandle(clean);
      setError('');
    } else if (visible && mode === 'add') {
      setSelectedPlatform('instagram');
      setHandle('');
      setError('');
    }
  }, [visible, mode, initialChannel]);

  const platforms: SocialPlatform[] = [
    'instagram',
    'twitter',
    'linkedin',
    'facebook',
    'whatsapp',
    'telegram',
    'tiktok',
    'snapchat',
  ];

  const handleSave = () => {
    // Clear previous errors
    setError('');

    // Validate handle
    const validation = validateHandle(selectedPlatform, handle);
    if (!validation.valid) {
      setError(validation.error || 'Invalid handle');
      return;
    }

    // Duplicate check (allow same-platform if editing that same one)
    const platformExists = existingChannels.some(
      (ch) => ch.platform === selectedPlatform
    );
    const editingSamePlatform = mode === 'edit' && initialChannel?.platform === selectedPlatform;
    if (platformExists && !editingSamePlatform) {
      Alert.alert(
        'Platform Already Added',
        `You already have a ${PLATFORM_NAMES[selectedPlatform]} account. Edit the existing one or choose a different platform.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Build URL
    const url = buildProfileUrl(selectedPlatform, handle);

    // Create channel object
    const channel: SocialMediaChannel = {
      platform: selectedPlatform,
      handle: formatHandleForDisplay(selectedPlatform, handle),
      url,
    };

    // Save and close
    onSave(channel);
    handleClose();
  };

  const handleClose = () => {
    setHandle('');
    setError('');
    setSelectedPlatform('instagram');
    onClose();
  };

  const getPlaceholder = (platform: SocialPlatform): string => {
    switch (platform) {
      case 'custom':
        return 'https://example.com/profile';
      case 'whatsapp':
        return '+1234567890';
      case 'discord':
        return 'username#1234 or user ID';
      case 'linkedin':
        return 'john-doe';
      case 'instagram':
      case 'twitter':
      case 'tiktok':
      case 'threads':
      case 'youtube':
        return '@username';
      default:
        return 'username';
    }
  };

  const getInputHint = (platform: SocialPlatform): string => {
    switch (platform) {
      case 'custom':
        return 'Enter the full URL to your profile';
      case 'whatsapp':
        return 'Enter phone number with country code';
      case 'discord':
        return 'Enter your Discord username or user ID';
      case 'linkedin':
        return 'Enter your LinkedIn profile username';
      case 'instagram':
        return 'Enter your Instagram username';
      case 'twitter':
        return 'Enter your Twitter/X username';
      case 'facebook':
        return 'Enter your Facebook username or ID';
      case 'telegram':
        return 'Enter your Telegram username';
      case 'tiktok':
        return 'Enter your TikTok username';
      case 'snapchat':
        return 'Enter your Snapchat username';
      case 'youtube':
        return 'Enter your YouTube channel handle';
      case 'threads':
        return 'Enter your Threads username';
      case 'pinterest':
        return 'Enter your Pinterest username';
      case 'twitch':
        return 'Enter your Twitch username';
      default:
        return 'Enter your username';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'edit' ? 'Edit Social Media' : 'Add Social Media'}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={[styles.content, keyboardVisible && styles.contentKeyboardOpen]}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* Handle Input - Show first when keyboard is open */}
            <View style={[styles.inputSection, keyboardVisible && styles.inputSectionKeyboardOpen]}>
              {/* Show selected platform badge when keyboard is open */}
              {keyboardVisible && (
                <View style={styles.selectedPlatformBadge}>
                  <View style={[styles.selectedPlatformIcon, { backgroundColor: PLATFORM_COLORS[selectedPlatform] }]}>
                    <Ionicons name={PLATFORM_ICONS[selectedPlatform] as any} size={16} color="#FFF" />
                  </View>
                  <Text style={styles.selectedPlatformText}>{PLATFORM_NAMES[selectedPlatform]}</Text>
                </View>
              )}
              <Text style={[styles.label, { marginTop: keyboardVisible ? 8 : 0 }]}>
                {keyboardVisible ? 'Enter Handle' : `${PLATFORM_NAMES[selectedPlatform]} Handle`}
              </Text>
              <Text style={styles.hint}>{getInputHint(selectedPlatform)}</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={getPlaceholder(selectedPlatform)}
                value={handle}
                onChangeText={(text) => {
                  setHandle(text);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={
                  selectedPlatform === 'whatsapp' ? 'phone-pad' : 'default'
                }
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Preview */}
              {handle && !error ? (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <Text style={styles.previewUrl}>
                    {buildProfileUrl(selectedPlatform, handle)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Platform Selection - Hidden when keyboard is open */}
            {!keyboardVisible && (
              <>
            <Text style={styles.label}>Select Platform</Text>
            <View style={styles.platformGrid}>
              {platforms.map((platform) => {
                const isSelected = selectedPlatform === platform;
                const alreadyAdded = existingChannels.some(
                  (ch) => ch.platform === platform
                );
                const disableThis = mode === 'add' ? alreadyAdded : (alreadyAdded && platform !== initialChannel?.platform);

                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      isSelected && styles.platformButtonSelected,
                      disableThis && styles.platformButtonDisabled,
                    ]}
                    onPress={() => !disableThis && setSelectedPlatform(platform)}
                    disabled={disableThis}
                  >
                    <View
                      style={[
                        styles.platformIconContainer,
                        {
                          backgroundColor: isSelected
                            ? PLATFORM_COLORS[platform]
                            : `${PLATFORM_COLORS[platform]}20`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={PLATFORM_ICONS[platform] as any}
                        size={24}
                        color={
                          isSelected
                            ? '#FFFFFF'
                            : alreadyAdded
                            ? '#CCC'
                            : PLATFORM_COLORS[platform]
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.platformName,
                        isSelected && styles.platformNameSelected,
                        alreadyAdded && styles.platformNameDisabled,
                      ]}
                    >
                      {PLATFORM_NAMES[platform]}
                    </Text>
                    {alreadyAdded && (
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
              </>
            )}
            
            {/* Extra padding */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !handle && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!handle}
            >
              <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Save Changes' : 'Add Channel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  contentKeyboardOpen: {
    maxHeight: 200,
  },
  contentContainer: {
    paddingBottom: 10,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputSectionKeyboardOpen: {
    marginBottom: 0,
  },
  selectedPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  selectedPlatformIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedPlatformText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  platformButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  platformButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  platformIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  platformName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  platformNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  platformNameDisabled: {
    color: '#CCC',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#F44336',
    flex: 1,
  },
  previewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewUrl: {
    fontSize: 14,
    color: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
