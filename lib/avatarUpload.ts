/**
 * Avatar Upload Utilities
 * 
 * Handles contact profile picture uploads to Supabase Storage
 * and updates the contact record with the avatar URL
 */

import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from './api';
import { Platform } from 'react-native';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Pick an image from the device and upload as contact avatar
 * @param contactId - Contact UUID
 * @returns Upload result with avatar URL or error
 */
export async function pickAndUploadAvatar(contactId: string): Promise<AvatarUploadResult> {
  try {
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      return {
        success: false,
        error: 'Permission to access photos was denied',
      };
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop
      quality: 0.8,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'Image selection cancelled',
      };
    }

    const asset = result.assets[0];
    
    // Upload the image
    return await uploadAvatar(contactId, asset.uri, asset.fileName || 'avatar.jpg');
  } catch (error) {
    console.error('[pickAndUploadAvatar] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pick image',
    };
  }
}

/**
 * Take a photo and upload as contact avatar
 * @param contactId - Contact UUID
 * @returns Upload result with avatar URL or error
 */
export async function takePhotoAndUploadAvatar(contactId: string): Promise<AvatarUploadResult> {
  try {
    // Request permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      return {
        success: false,
        error: 'Permission to access camera was denied',
      };
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square crop
      quality: 0.8,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'Photo capture cancelled',
      };
    }

    const asset = result.assets[0];
    
    // Upload the image
    return await uploadAvatar(contactId, asset.uri, asset.fileName || 'avatar.jpg');
  } catch (error) {
    console.error('[takePhotoAndUploadAvatar] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take photo',
    };
  }
}

/**
 * Upload an avatar image to the backend
 * @param contactId - Contact UUID
 * @param imageUri - Local file URI
 * @param fileName - File name (default: 'avatar.jpg')
 * @returns Upload result with avatar URL or error
 */
export async function uploadAvatar(
  contactId: string,
  imageUri: string,
  fileName: string = 'avatar.jpg'
): Promise<AvatarUploadResult> {
  try {
    console.log('[uploadAvatar] Starting upload for contact:', contactId);

    // Create form data
    const formData = new FormData();
    
    // Handle different platforms
    if (Platform.OS === 'web') {
      // Web: Fetch the blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('avatar', blob, fileName);
    } else {
      // Native: Use the URI directly
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
    }

    // Upload to backend
    const response = await apiFetch(`/api/v1/contacts/${contactId}/avatar`, {
      method: 'POST',
      requireAuth: true,
      body: formData,
      // Don't set Content-Type - let browser set it with boundary for multipart/form-data
      headers: {},
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[uploadAvatar] Upload failed:', response.status, errorText);
      return {
        success: false,
        error: `Upload failed: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[uploadAvatar] Upload successful:', data.avatar_url);

    return {
      success: true,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    console.error('[uploadAvatar] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a contact's avatar
 * @param contactId - Contact UUID
 * @returns Success status
 */
export async function deleteAvatar(contactId: string): Promise<boolean> {
  try {
    console.log('[deleteAvatar] Deleting avatar for contact:', contactId);

    const response = await apiFetch(`/api/v1/contacts/${contactId}/avatar`, {
      method: 'DELETE',
      requireAuth: true,
    });

    if (!response.ok) {
      console.error('[deleteAvatar] Delete failed:', response.status);
      return false;
    }

    console.log('[deleteAvatar] Avatar deleted successfully');
    return true;
  } catch (error) {
    console.error('[deleteAvatar] Error:', error);
    return false;
  }
}

/**
 * Get the full avatar URL from a relative path or URL
 * Normalizes Supabase storage URLs
 */
export function normalizeAvatarUrl(value?: string): string | undefined {
  if (!value) return undefined;
  
  const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'attachments';

  const toPublic = (p: string) => {
    const clean = p.replace(/^\/+/, '');
    return SUPABASE_URL
      ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`
      : `https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`;
  };

  try {
    if (/^https?:\/\//i.test(value)) {
      // Fix old presigned upload URLs
      if (value.includes('/upload/sign/')) {
        const m = value.match(/\/upload\/sign\/(.+?)(\?|$)/);
        if (m && m[1]) return toPublic(m[1].replace(/^attachments\//, ''));
      }
      // Normalize cross-project host mismatch
      const u = new URL(value);
      if (u.hostname.endsWith('supabase.co') && SUPABASE_URL && !u.origin.startsWith(SUPABASE_URL)) {
        return `${SUPABASE_URL}${u.pathname}`;
      }
      return value;
    }
    // Treat as storage path
    return toPublic(value);
  } catch {
    return value;
  }
}
