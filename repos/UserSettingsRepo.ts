import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User Profile and Settings
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Compose Settings (message composition preferences)
 */
export interface ComposeSettings {
  default_tone?: 'casual' | 'professional' | 'warm' | 'direct';
  default_length?: 'short' | 'medium' | 'long';
  default_channel?: 'sms' | 'email' | 'dm';
  signature?: string;
  brand_voice?: string;
}

const SETTINGS_PREFIX = 'user_settings/';

/**
 * Local storage implementation for settings
 */
const LocalUserSettingsRepo = {
  async getProfile(): Promise<UserProfile | null> {
    return AsyncStorage.getItem(SETTINGS_PREFIX + 'profile').then(data => 
      data ? JSON.parse(data) : null
    );
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile();
    const updated = { ...existing, ...profile };
    await AsyncStorage.setItem(SETTINGS_PREFIX + 'profile', JSON.stringify(updated));
    return updated as UserProfile;
  },

  async getComposeSettings(): Promise<ComposeSettings | null> {
    return AsyncStorage.getItem(SETTINGS_PREFIX + 'compose').then(data =>
      data ? JSON.parse(data) : null
    );
  },

  async updateComposeSettings(settings: Partial<ComposeSettings>): Promise<ComposeSettings> {
    const existing = await this.getComposeSettings();
    const updated = { ...existing, ...settings };
    await AsyncStorage.setItem(SETTINGS_PREFIX + 'compose', JSON.stringify(updated));
    return updated;
  },
};

/**
 * Supabase/Backend implementation
 */
const SupabaseUserSettingsRepo = {
  async getProfile(): Promise<UserProfile | null> {
    try {
      const response = await apiFetch('/api/v1/me', { requireAuth: true });

      if (!response.ok) {
        console.error('[UserSettingsRepo] Failed to fetch profile:', response.status);
        return null;
      }

      const data = await response.json();
      return data.profile || data.user || data;
    } catch (error) {
      console.error('[UserSettingsRepo.getProfile] failed:', error);
      return null;
    }
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await apiFetch('/api/v1/me', {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Profile update failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.profile || data.user || data;
    } catch (error) {
      console.error('[UserSettingsRepo.updateProfile] failed:', error);
      throw error;
    }
  },

  async getComposeSettings(): Promise<ComposeSettings | null> {
    try {
      const response = await apiFetch('/api/v1/me/compose-settings', { requireAuth: true });

      if (!response.ok) {
        console.error('[UserSettingsRepo] Failed to fetch compose settings:', response.status);
        return null;
      }

      const data = await response.json();
      return data.settings || data;
    } catch (error) {
      console.error('[UserSettingsRepo.getComposeSettings] failed:', error);
      return null;
    }
  },

  async updateComposeSettings(updates: Partial<ComposeSettings>): Promise<ComposeSettings> {
    try {
      const response = await apiFetch('/api/v1/me/compose-settings', {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Compose settings update failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.settings || data;
    } catch (error) {
      console.error('[UserSettingsRepo.updateComposeSettings] failed:', error);
      throw error;
    }
  },

  /**
   * Get user account info
   */
  async getAccount(): Promise<any> {
    try {
      const response = await apiFetch('/api/v1/me/account', { requireAuth: true });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[UserSettingsRepo.getAccount] failed:', error);
      return null;
    }
  },
};

/**
 * Hybrid User Settings Repository
 */
export const UserSettingsRepo = {
  async getProfile(): Promise<UserProfile | null> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[UserSettingsRepo] Using LOCAL storage');
      return LocalUserSettingsRepo.getProfile();
    }
    console.log('[UserSettingsRepo] Using BACKEND');
    return SupabaseUserSettingsRepo.getProfile();
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalUserSettingsRepo.updateProfile(updates);
    }
    return SupabaseUserSettingsRepo.updateProfile(updates);
  },

  async getComposeSettings(): Promise<ComposeSettings | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalUserSettingsRepo.getComposeSettings();
    }
    return SupabaseUserSettingsRepo.getComposeSettings();
  },

  async updateComposeSettings(updates: Partial<ComposeSettings>): Promise<ComposeSettings> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalUserSettingsRepo.updateComposeSettings(updates);
    }
    return SupabaseUserSettingsRepo.updateComposeSettings(updates);
  },

  async getAccount(): Promise<any> {
    if (FLAGS.LOCAL_ONLY) {
      return { tier: 'free_trial', subscription: null };
    }
    return SupabaseUserSettingsRepo.getAccount();
  },
};

export default UserSettingsRepo;
