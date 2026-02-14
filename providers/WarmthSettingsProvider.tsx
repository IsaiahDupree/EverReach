import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { KV } from '@/storage/AsyncStorageService';

const WARMTH_SETTINGS_KEY = '@warmth_settings';

export interface WarmthSettings {
  hotThreshold: number;
  warmThreshold: number;
  coolThreshold: number;
  defaultWarmthForNewLeads: number;
}

const DEFAULT_WARMTH_SETTINGS: WarmthSettings = {
  hotThreshold: 80,
  warmThreshold: 60,
  coolThreshold: 20,
  defaultWarmthForNewLeads: 30, // New leads start at EWMA base (cool)
};

const [WarmthSettingsProviderInternal, useWarmthSettingsInternal] = createContextHook(() => {
  const [settings, setSettings] = useState<WarmthSettings>(DEFAULT_WARMTH_SETTINGS);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load settings from storage
  useEffect(() => {
    (async () => {
      try {
        const loadedSettings = await KV.get<WarmthSettings>(WARMTH_SETTINGS_KEY);
        if (loadedSettings) {
          setSettings({ ...DEFAULT_WARMTH_SETTINGS, ...loadedSettings });
        }
      } catch (error) {
        console.error('Error loading warmth settings:', error);
      } finally {
        setIsInitialized(true);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<WarmthSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await KV.set(WARMTH_SETTINGS_KEY, updatedSettings);
    } catch (error) {
      console.error('Error saving warmth settings:', error);
    }
  }, [settings]);

  const getWarmthStatus = useCallback((score: number): 'hot' | 'warm' | 'neutral' | 'cool' | 'cold' => {
    if (score >= settings.hotThreshold) return 'hot';
    if (score >= settings.warmThreshold) return 'warm';
    if (score >= 40) return 'neutral';
    if (score >= settings.coolThreshold) return 'cool';
    return 'cold';
  }, [settings]);

  const resetToDefaults = useCallback(async () => {
    try {
      setSettings(DEFAULT_WARMTH_SETTINGS);
      await KV.set(WARMTH_SETTINGS_KEY, DEFAULT_WARMTH_SETTINGS);
    } catch (error) {
      console.error('Error resetting warmth settings:', error);
    }
  }, []);

  return useMemo(() => ({
    settings,
    updateSettings,
    getWarmthStatus,
    resetToDefaults,
    isInitialized,
  }), [settings, updateSettings, getWarmthStatus, resetToDefaults, isInitialized]);
});

export const WarmthSettingsProvider = WarmthSettingsProviderInternal;
export const useWarmthSettings = useWarmthSettingsInternal;

// Export default settings for fallback
export { DEFAULT_WARMTH_SETTINGS };