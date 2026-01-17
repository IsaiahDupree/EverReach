import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { User, Camera, Save, ArrowLeft, FileText, Mail, Globe, XCircle } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProviderV2';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { apiFetch } from '@/lib/api';
import Avatar from '@/components/Avatar';

export default function PersonalProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const screenAnalytics = useAnalytics('PersonalProfile');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    about: '',
    profileImageUrl: '',
  });

  useEffect(() => {
    loadProfile();
    loadOrgId();
  }, [user]);

  const loadOrgId = async () => {
    try {
      const stored = await AsyncStorage.getItem('@org_id');
      setOrgId(stored || 'default-org-id');
    } catch (error) {
      console.error('[PersonalProfile] Error loading org ID:', error);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      if (!user) return;

      // Load from /api/v1/me endpoint
      const response = await apiFetch('/api/v1/me', {
        method: 'GET',
        requireAuth: true,
      });

      if (response.ok) {
        const { user: userData } = await response.json();
        
        // Parse display_name into first/last name
        const displayName = userData.display_name || '';
        const nameParts = displayName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Handle avatar_url - could be storage path, full URL, or missing
        let avatarUrl = userData.avatar_url || '';
        
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          // It's a storage path, construct public URL
          const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
          const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media-assets';
          avatarUrl = SUPABASE_URL
            ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${avatarUrl}`
            : `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${avatarUrl}`;
        }
        
        // Fallback to auth account avatar if no custom avatar uploaded
        if (!avatarUrl) {
          const metadata = (user as any).user_metadata || {};
          avatarUrl = metadata.avatar_url || '';
          console.log('[PersonalProfile] No custom avatar, using auth avatar:', avatarUrl);
        }
        
        setProfileData({
          firstName,
          lastName,
          about: '', // Not yet supported by backend
          profileImageUrl: avatarUrl,
        });
      } else {
        // Fallback to user metadata
        const metadata = (user as any).user_metadata || {};
        setProfileData({
          firstName: metadata.full_name?.split(' ')[0] || '',
          lastName: metadata.full_name?.split(' ')[1] || '',
          about: '',
          profileImageUrl: metadata.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('[PersonalProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Use /api/v1/me endpoint as per documentation
      const response = await apiFetch('/api/v1/me', {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({
          display_name: `${profileData.firstName} ${profileData.lastName}`.trim(),
          avatar_url: profileData.profileImageUrl || null,
          about: profileData.about || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save: ${response.status}`);
      }

      const { user: updatedUser } = await response.json();
      console.log('[PersonalProfile] Profile saved:', updatedUser);

      screenAnalytics.track('profile_saved', {
        hasAbout: !!profileData.about,
        hasImage: !!profileData.profileImageUrl,
      });

      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('[PersonalProfile] Error saving:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload to storage via backend presigned flow
        const asset = result.assets[0];
        const contentType = (asset.mimeType || '').includes('png') ? 'image/png' : 'image/jpeg';
        const extension = contentType === 'image/png' ? 'png' : 'jpg';
        // Use recommended path format: users/{userId}/profile/avatar.{ext}
        const path = `users/${user?.id}/profile/avatar.${extension}`;

        // 1) Get presigned URL
        const signRes = await apiFetch('/api/v1/files', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ path, contentType }),
        });
        if (!signRes.ok) {
          const txt = await signRes.text().catch(() => '');
          throw new Error(`Presign failed: ${signRes.status} ${txt}`);
        }
        const { url: uploadUrl } = await signRes.json();

        // 2) Upload file bytes (platform-specific)
        if (Platform.OS === 'web') {
          // Web: Use fetch with blob
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: blob,
          });
          
          if (!putRes.ok) {
            throw new Error(`Upload failed: ${putRes.status}`);
          }
        } else {
          // Native: Dynamically import legacy FileSystem for SDK 54+ compatibility
          const FileSystem = await import('expo-file-system/legacy');
          const putRes = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
            httpMethod: 'PUT',
            headers: { 'Content-Type': contentType },
          });
          if (putRes.status !== 200) {
            throw new Error(`Upload failed: ${putRes.status}`);
          }
        }

        // 3) Save storage path (NOT full URL) - will be used with /api/v1/me
        // The backend will construct the public URL when needed
        setProfileData({ ...profileData, profileImageUrl: path });
        screenAnalytics.track('profile_image_selected', { uploaded: true });
      }
    } catch (error) {
      console.error('[PersonalProfile] Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              screenAnalytics.track('account_delete_initiated');
              
              // 1. Call backend to enqueue deletion
              const response = await apiFetch('/api/v1/me/account', {
                method: 'DELETE',
                requireAuth: true
              });

              if (!response.ok) {
                throw new Error(`Failed to request deletion: ${response.status}`);
              }

              // 2. Sign out locally
              await signOut();
              screenAnalytics.track('account_delete_completed');
              
              Alert.alert(
                'Account Deleted',
                'Your account has been scheduled for deletion. You have been signed out.',
                [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
              );
            } catch (error: any) {
              console.error('[Settings] Delete account error:', error);
              Alert.alert('Error', 'Failed to request account deletion. Please contact support.');
            }
          }
        }
      ]
    );
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Personal Profile', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Personal Profile',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.push('/(tabs)/home');
                }
              }}
              style={styles.headerButton}
            >
              <ArrowLeft 
                size={24} 
                color={theme.colors.text} 
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          
          <View style={styles.profileImageContainer}>
            {profileData.profileImageUrl ? (
              <Avatar
                name={`${profileData.firstName} ${profileData.lastName}`.trim() || 'User'}
                avatarUrl={profileData.profileImageUrl}
                size={120}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <User size={48} color={theme.colors.textSecondary} />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handlePickImage}
            >
              <Camera size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.hint}>Tap the camera icon to upload a photo</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.accountInfo}>
            <View style={styles.accountItem}>
              <Mail size={20} color={theme.colors.textSecondary} />
              <View style={styles.accountItemText}>
                <Text style={styles.accountLabel}>Signed in as</Text>
                <Text style={styles.accountValue}>{user?.email || 'Not signed in'}</Text>
              </View>
            </View>
            
            {orgId && (
              <View style={styles.accountItem}>
                <Globe size={20} color={theme.colors.textSecondary} />
                <View style={styles.accountItemText}>
                  <Text style={styles.accountLabel}>Organization</Text>
                  <Text style={styles.accountValue}>{orgId}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={profileData.firstName}
                onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
                placeholder="John"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            
            <View style={styles.nameField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={profileData.lastName}
                onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
                placeholder="Doe"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionSubtitle}>
            Share a bit about yourself - your role, interests, goals, etc.
          </Text>
          
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profileData.about}
            onChangeText={(text) => setProfileData({ ...profileData, about: text })}
            placeholder="I'm a product manager passionate about..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          
          <Text style={styles.characterCount}>{profileData.about.length}/1000 characters</Text>
        </View>

        {/* Personal Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Personal Notes</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your personal notes and context are stored here
          </Text>
          
          <TouchableOpacity
            style={styles.viewNotesButton}
            onPress={() => router.push('/personal-notes?filter=personal')}
          >
            <Text style={styles.viewNotesButtonText}>View All Personal Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Danger Zone - Delete Account */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <XCircle size={20} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            Permanently delete your account and all data
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  accountInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountItemText: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  viewNotesButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  viewNotesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dangerZone: {
    marginTop: 48,
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5', // Red-300
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626', // Red-600
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2', // Red-50
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA', // Red-200
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626', // Red-600
  },
  dangerHint: {
    fontSize: 12,
    color: '#9CA3AF', // Gray-400
    textAlign: 'center',
    marginTop: 12,
  },
});
