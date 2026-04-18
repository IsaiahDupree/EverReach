import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  language?: string;
  fontSize?: 'small' | 'medium' | 'large';
  privacyMode?: boolean;
  biometricEnabled?: boolean;
  offlineMode?: boolean;
  analyticsOptIn?: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  notifications: true,
  emailNotifications: true,
  pushNotifications: true,
  language: 'en',
  fontSize: 'medium',
  privacyMode: false,
  biometricEnabled: false,
  offlineMode: false,
  analyticsOptIn: true,
};

export class PreferencesManager {
  private static readonly STORAGE_KEY = '@everreach_preferences';

  static async getAll(): Promise<UserPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch (error) {
      console.error('[PreferencesManager] Error loading preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  static async set(key: keyof UserPreferences, value: any): Promise<void> {
    try {
      const current = await this.getAll();
      const updated = { ...current, [key]: value };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[PreferencesManager] Error saving preference:', error);
    }
  }

  static async setMultiple(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getAll();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[PreferencesManager] Error saving preferences:', error);
    }
  }

  static async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[PreferencesManager] Error resetting preferences:', error);
    }
  }
}
