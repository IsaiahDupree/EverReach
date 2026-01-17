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
  hotThreshold: 60,
  warmThreshold: 30,
  coolThreshold: 10,
  defaultWarmthForNewLeads: 50, // New leads start as "warm"
};

export const [WarmthSettingsProvider, useWarmthSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<WarmthSettings>(DEFAULT_WARMTH_SETTINGS);

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

  const getWarmthStatus = useCallback((score: number): 'hot' | 'warm' | 'cool' | 'cold' => {
    if (score >= settings.hotThreshold) return 'hot';
    if (score >= settings.warmThreshold) return 'warm';
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
  }), [settings, updateSettings, getWarmthStatus, resetToDefaults]);
});