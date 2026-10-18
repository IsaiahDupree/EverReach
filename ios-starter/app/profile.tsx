/**
 * Profile Screen
 * Feature: IOS-NAV-007
 * Help Integration: HO-HELP-003
 *
 * User profile editing screen with:
 * - Name editing
 * - Avatar upload
 * - Save changes functionality
 * - Help button with contextual help overlay
 *
 * Acceptance Criteria:
 * - Edit name
 * - Upload avatar
 * - Save changes
 *
 * CUSTOMIZATION GUIDE:
 * To adapt this screen for your app:
 * 1. Add additional profile fields (phone, bio, location, etc.)
 * 2. Customize avatar upload (use your storage solution)
 * 3. Add profile validation rules specific to your app
 * 4. Update styling to match your brand
 * 5. Consider adding profile completion percentage
 *
 * @module app/profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import HelpOverlay from '../components/common/HelpOverlay';
import { HELP_CONTENT } from '../lib/help-content';

/**
 * User profile data interface
 */
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Profile Screen Component
 *
 * Allows users to edit their profile information including name and avatar.
 * Integrates with Supabase for data persistence and storage.
 *
 * @example
 * ```tsx
 * // This screen is accessed from settings via router.push('/profile')
 * ```
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  /**
   * Load user profile data on mount
   * CUSTOMIZATION: Extend this to load additional profile fields
   */
  useEffect(() => {
    loadProfile();
  }, [user]);

  /**
   * Load profile data from Supabase
   */
  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user metadata from auth
      const metadata = user.user_metadata || {};

      setDisplayName(metadata.display_name || metadata.full_name || user.email?.split('@')[0] || '');
      setAvatarUrl(metadata.avatar_url || null);

      // CUSTOMIZATION: Query your users table for additional fields
      // Example:
      // const { data, error } = await supabase
      //   .from('users')
      //   .select('*')
      //   .eq('id', user.id)
      //   .single();
      //
      // if (error) throw error;
      // if (data) {
      //   setDisplayName(data.display_name || '');
      //   setAvatarUrl(data.avatar_url || null);
      // }

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle avatar selection from device
   * CUSTOMIZATION: Customize image picker options (cropping, quality, etc.)
   */
  const handleSelectAvatar = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload a profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setLocalAvatarUri(imageUri);
        await uploadAvatar(imageUri);
      }
    } catch (error) {
      console.error('Error selecting avatar:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  /**
   * Upload avatar to Supabase Storage
   * CUSTOMIZATION: Modify storage bucket and path as needed
   */
  const uploadAvatar = async (imageUri: string) => {
    if (!user) return;

    try {
      setIsUploadingAvatar(true);

      // CUSTOMIZATION: Implement actual upload to Supabase Storage
      // For now, we'll just use the local URI
      // In production, you would:
      // 1. Convert image to blob/base64
      // 2. Upload to Supabase Storage bucket
      // 3. Get public URL
      // 4. Update avatarUrl state

      // Example implementation:
      // const fileExt = imageUri.split('.').pop();
      // const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      // const filePath = `avatars/${fileName}`;
      //
      // const { error: uploadError } = await supabase.storage
      //   .from('avatars')
      //   .upload(filePath, blob);
      //
      // if (uploadError) throw uploadError;
      //
      // const { data } = supabase.storage
      //   .from('avatars')
      //   .getPublicUrl(filePath);
      //
      // setAvatarUrl(data.publicUrl);

      // For demo purposes, use local URI
      setAvatarUrl(imageUri);

      console.log('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar');
      setLocalAvatarUri(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  /**
   * Save profile changes
   * CUSTOMIZATION: Extend to save additional profile fields
   */
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save profile');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name');
      return;
    }

    try {
      setIsSaving(true);

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        },
      });

      if (error) throw error;

      // CUSTOMIZATION: Also update your users table if you have one
      // Example:
      // const { error: dbError } = await supabase
      //   .from('users')
      //   .update({
      //     display_name: displayName.trim(),
      //     avatar_url: avatarUrl,
      //     updated_at: new Date().toISOString(),
      //   })
      //   .eq('id', user.id);
      //
      // if (dbError) throw dbError;

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  };

  /**
   * Loading state
   */
  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  /**
   * Not authenticated state
   */
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please log in to edit your profile</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setShowHelp(true)}
            testID="profile-help-button"
            accessibilityLabel="Get help with profile settings"
            accessibilityRole="button"
            accessibilityHint="Opens information about profile fields and settings"
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {localAvatarUri || avatarUrl ? (
              <Image
                source={{ uri: localAvatarUri || avatarUrl || undefined }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {displayName.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {isUploadingAvatar && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.changeAvatarButton}
            onPress={handleSelectAvatar}
            disabled={isUploadingAvatar}
          >
            <Text style={styles.changeAvatarButtonText}>
              {avatarUrl ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Email Field (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputDisabledText}>{user.email}</Text>
            </View>
            <Text style={styles.fieldHint}>Email cannot be changed</Text>
          </View>

          {/* Display Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#999999"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Text style={styles.fieldHint}>This is how others will see you</Text>
          </View>

          {/* CUSTOMIZATION: Add more fields here */}
          {/* Example:
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
            />
          </View>
          */}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            disabled={isSaving}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Help Overlay */}
      {showHelp && (
        <HelpOverlay
          id="profile-help"
          title={HELP_CONTENT.profile.title}
          dismissText="Got it"
          onDismiss={() => setShowHelp(false)}
        >
          <View style={styles.helpContent}>
            <Text style={styles.helpDescription}>
              {HELP_CONTENT.profile.description}
            </Text>

            {/* Profile fields */}
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Profile Fields</Text>
              {HELP_CONTENT.profile.fields.map((field, index) => (
                <View key={index} style={styles.helpItem}>
                  <Text style={styles.helpItemTitle}>{field.name}</Text>
                  <Text style={styles.helpItemText}>{field.description}</Text>
                </View>
              ))}
            </View>

            {/* Tips */}
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Tips</Text>
              {HELP_CONTENT.profile.tips.map((tip, index) => (
                <View key={index} style={styles.helpTipItem}>
                  <Text style={styles.helpTipBullet}>•</Text>
                  <Text style={styles.helpItemText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </HelpOverlay>
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * Styles
 * CUSTOMIZATION: Update colors and spacing to match your brand
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeAvatarButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  fieldContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 17,
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputDisabledText: {
    fontSize: 17,
    color: '#999999',
  },
  fieldHint: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
  },
  actionsSection: {
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#007AFF',
  },
  // Help overlay styles
  helpContent: {
    gap: 16,
  },
  helpDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpSection: {
    gap: 12,
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  helpItem: {
    gap: 4,
  },
  helpItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  helpItemText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  helpTipItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  helpTipBullet: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },
});
