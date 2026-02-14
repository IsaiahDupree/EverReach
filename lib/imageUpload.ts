import { supabase } from './supabase';
import { FLAGS } from '@/constants/flags';
import { decode } from 'base64-arraybuffer';
import { backendBase, authHeader, apiFetch } from '@/lib/api';
import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

export interface ImageUploadResult {
  url: string;
  path: string;
}

// Global query client instance for cache invalidation
let queryClientInstance: QueryClient | null = null;

/**
 * Initialize the query client for cache invalidation
 * Call this from _layout.tsx after creating the QueryClient
 */
export function setQueryClientForImageUpload(client: QueryClient) {
  queryClientInstance = client;
}

export async function uploadContactAvatar(
  uri: string,
  contactId: string
): Promise<ImageUploadResult | null> {
  if (FLAGS.LOCAL_ONLY) {
    console.log('[ImageUpload] LOCAL_ONLY mode - returning local URI');
    return { url: uri, path: uri };
  }
  // Prefer backend-driven flow to avoid bucket not found errors
  return uploadContactAvatarToApi(uri, contactId);
}

/**
 * Upload avatar via NEW simplified backend API endpoint
 * Endpoint: POST /api/v1/contacts/:id/avatar
 * 
 * This replaces the old multi-step process with a single endpoint that:
 * - Accepts multipart/form-data
 * - Uploads to storage automatically
 * - Updates contact record automatically
 * - Returns public URL immediately
 */
export async function uploadContactAvatarToApi(
  uri: string,
  contactId: string
): Promise<ImageUploadResult | null> {
  try {
    console.log('[ImageUpload] Uploading avatar via /avatar endpoint for contact:', contactId);
    
    const base = backendBase();
    const auth = await authHeader();

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    // Create FormData with the image
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // Web: Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('avatar', blob, fileName);
    } else {
      // Native: Use file URI directly
      // @ts-ignore react-native FormData file
      formData.append('avatar', {
        uri,
        type: contentType,
        name: fileName,
      });
    }

    // Upload to NEW endpoint
    const uploadRes = await fetch(`${base}/api/v1/contacts/${contactId}/avatar`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(auth.Authorization ? { Authorization: auth.Authorization } : {}),
        // Do NOT set Content-Type - let browser/RN set it with multipart boundary
      },
      body: formData as any,
    });

    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      console.error('[ImageUpload] Avatar upload failed:', uploadRes.status, txt);
      return null;
    }

    const result = await uploadRes.json();
    const publicUrl = result.photo_url || result.avatar_url || result.url;
    
    if (!publicUrl) {
      console.error('[ImageUpload] No URL returned from server:', result);
      return null;
    }

    console.log('[ImageUpload] ✅ Avatar uploaded successfully:', publicUrl);

    // Extract path from URL for compatibility
    const path = publicUrl.includes('/storage/v1/object/public/')
      ? publicUrl.split('/storage/v1/object/public/')[1]?.split('/').slice(1).join('/') || publicUrl
      : publicUrl;

    // Invalidate React Query cache so the new avatar appears immediately
    if (queryClientInstance) {
      console.log('[ImageUpload] Invalidating avatar cache for contact:', contactId);
      
      // Invalidate specific contact avatar
      await queryClientInstance.invalidateQueries({
        queryKey: ['contact-avatar', contactId],
      });
      
      // Invalidate contact detail
      await queryClientInstance.invalidateQueries({
        queryKey: ['contact', contactId],
      });
      
      // Invalidate contacts list so avatar shows everywhere
      await queryClientInstance.invalidateQueries({
        queryKey: ['contacts', 'list'],
      });
      
      // Invalidate people list
      await queryClientInstance.invalidateQueries({
        queryKey: ['people'],
      });
      
      console.log('[ImageUpload] ✅ Avatar cache invalidated');
    }

    return { url: publicUrl, path };
  } catch (e) {
    console.error('[ImageUpload] uploadContactAvatarToApi error:', e);
    return null;
  }
}

export async function deleteContactAvatar(path: string): Promise<boolean> {
  if (FLAGS.LOCAL_ONLY || !supabase) {
    console.log('[ImageUpload] LOCAL_ONLY mode - skipping delete');
    return true;
  }

  try {
    console.log('[ImageUpload] Deleting image at path:', path);

    const { error } = await supabase.storage
      .from('contact-images')
      .remove([path]);

    if (error) {
      console.error('[ImageUpload] Delete error:', error);
      return false;
    }

    console.log('[ImageUpload] Delete successful');
    return true;
  } catch (error) {
    console.error('[ImageUpload] Failed to delete image:', error);
    return false;
  }
}

export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

export function getWarmthColor(warmth?: number, warmthBand?: string): string {
  if (warmthBand) {
    return getWarmthColorFromBand(warmthBand);
  }
  
  if (warmth !== undefined) {
    return getWarmthColorFromScore(warmth);
  }
  
  return '#95E1D3';
}

export function getWarmthColorFromScore(score: number): string {
  if (score >= 80) return '#FF6B6B';
  if (score >= 60) return '#FFD93D';
  if (score >= 40) return '#95E1D3';
  return '#4ECDC4';
}

export function getWarmthColorFromBand(band: string): string {
  const normalizedBand = band.toLowerCase();
  switch (normalizedBand) {
    case 'hot':
      return '#FF6B6B';
    case 'warm':
      return '#FFD93D';
    case 'neutral':
    case 'cool':
      return '#95E1D3';
    case 'cold':
      return '#4ECDC4';
    default:
      return '#95E1D3';
  }
}
