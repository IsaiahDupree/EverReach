import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
// Note: Using AsyncStorage directly here as this is a settings provider
// In a production app, consider creating a dedicated storage provider
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { FLAGS } from '@/constants/flags';

const SYNC_ENABLED_KEY = '@app_settings_sync_enabled';
const TRIAL_START_KEY = '@app_settings_trial_start';
const IS_PAID_KEY = '@app_settings_is_paid';
const THEME_KEY = '@app_settings_theme';
const CLOUD_MODE_KEY = '@app_settings_cloud_mode';
const DEV_FEATURES_KEY = '@app_settings_dev_features';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    notification: string;
    error: string;
    success: string;
  };
}

const lightTheme: Theme = {
  colors: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    primary: '#000000',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E5E5E5',
    card: '#FFFFFF',
    notification: '#FF6B6B',
    error: '#FF6B6B',
    success: '#10B981',
  },
};

const darkTheme: Theme = {
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    primary: '#FFFFFF',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    card: '#1C1C1E',
    notification: '#FF453A',
    error: '#FF453A',
    success: '#30D158',
  },
};

// Theme utility functions
export const getThemedColor = (theme: Theme, colorKey: keyof Theme['colors']) => {
  return theme.colors[colorKey];
};

export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
) => {
  return styleCreator;
};

// Common theme-aware style patterns
export const commonStyles = (theme: Theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});

const TRIAL_DURATION_DAYS = 7;

export const [AppSettingsProvider, useAppSettings] = createContextHook(() => {
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const initialCloudMode = !FLAGS.LOCAL_ONLY;
  const [cloudModeEnabled, setCloudModeEnabled] = useState<boolean>(initialCloudMode);
  const [devFeaturesEnabled, setDevFeaturesEnabled] = useState<boolean>(false);
  const systemColorScheme = useColorScheme();

  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load settings from storage with optimized performance
  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      if (isLoaded) return; // Prevent multiple loads
      
      // Mark as loaded immediately to prevent hydration timeout
      if (isMounted) {
        setIsLoaded(true);
      }
      
      try {
        console.log('[AppSettings] Loading settings...');
        
        // Batch all AsyncStorage reads for better performance
        const [syncEnabledStr, trialStartStr, isPaidStr, themeModeStr, cloudModeStr, devFeaturesStr] = await Promise.all([
          AsyncStorage.getItem(SYNC_ENABLED_KEY),
          AsyncStorage.getItem(TRIAL_START_KEY),
          AsyncStorage.getItem(IS_PAID_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(CLOUD_MODE_KEY),
          AsyncStorage.getItem(DEV_FEATURES_KEY)
        ]);

        if (!isMounted) return;

        // Process sync enabled setting
        if (syncEnabledStr !== null) {
          try {
            const syncValue = syncEnabledStr === 'true' || (syncEnabledStr !== 'false' && JSON.parse(syncEnabledStr));
            if (isMounted) setSyncEnabled(syncValue);
          } catch (error) {
            console.warn('Error parsing sync enabled setting:', error);
            if (isMounted) setSyncEnabled(false);
            AsyncStorage.removeItem(SYNC_ENABLED_KEY).catch(() => {});
          }
        }

        // Process trial start date
        if (trialStartStr) {
          if (isMounted) setTrialStartDate(new Date(trialStartStr));
        } else {
          const now = new Date();
          if (isMounted) setTrialStartDate(now);
          AsyncStorage.setItem(TRIAL_START_KEY, now.toISOString()).catch(() => {});
        }

        // Process paid status
        if (isPaidStr !== null) {
          try {
            const paidValue = isPaidStr === 'true' || (isPaidStr !== 'false' && JSON.parse(isPaidStr));
            if (isMounted) setIsPaid(paidValue);
          } catch (error) {
            console.warn('Error parsing isPaid setting:', error);
            if (isMounted) setIsPaid(false);
            AsyncStorage.removeItem(IS_PAID_KEY).catch(() => {});
          }
        }

        // Process theme mode
        if (themeModeStr !== null) {
          try {
            let parsedTheme: ThemeMode = 'system';
            if (['light', 'dark', 'system'].includes(themeModeStr)) {
              parsedTheme = themeModeStr as ThemeMode;
            } else {
              const parsed = JSON.parse(themeModeStr) as ThemeMode;
              if (['light', 'dark', 'system'].includes(parsed)) {
                parsedTheme = parsed;
              }
            }
            if (isMounted) setThemeMode(parsedTheme);
          } catch (error) {
            console.warn('Error parsing theme setting:', error);
            if (isMounted) setThemeMode('system');
            AsyncStorage.removeItem(THEME_KEY).catch(() => {});
          }
        }

        // Process cloud mode
        if (cloudModeStr !== null) {
          try {
            const cloudValue = cloudModeStr === 'true' || (cloudModeStr !== 'false' && JSON.parse(cloudModeStr));
            if (isMounted) setCloudModeEnabled(cloudValue);
          } catch (error) {
            console.warn('Error parsing cloud mode setting:', error);
            if (isMounted) setCloudModeEnabled(initialCloudMode);
          }
        }

        // Process dev features
        if (devFeaturesStr !== null) {
          try {
            const devValue = devFeaturesStr === 'true' || (devFeaturesStr !== 'false' && JSON.parse(devFeaturesStr));
            if (isMounted) setDevFeaturesEnabled(devValue);
          } catch (error) {
            console.warn('Error parsing dev features setting:', error);
            if (isMounted) setDevFeaturesEnabled(false);
          }
        }
        
        console.log('[AppSettings] Settings loaded successfully');
      } catch (error) {
        console.error('Error loading app settings:', error);
        // Set defaults on error
        if (isMounted) {
          setSyncEnabled(false);
          setIsPaid(false);
          setThemeMode('system');
          setCloudModeEnabled(initialCloudMode);
          if (!trialStartDate) {
            setTrialStartDate(new Date());
          }
        }
      }
    };

    // Load settings in background without blocking render
    loadSettings();
    
    return () => {
      isMounted = false;
    };
  }, [initialCloudMode, isLoaded]);

  const enableSync = useCallback(async () => {
    try {
      setSyncEnabled(true);
      await AsyncStorage.setItem(SYNC_ENABLED_KEY, JSON.stringify(true));
    } catch (error) {
      console.error('Error enabling sync:', error);
    }
  }, []);

  const disableSync = useCallback(async () => {
    try {
      setSyncEnabled(false);
      await AsyncStorage.setItem(SYNC_ENABLED_KEY, JSON.stringify(false));
    } catch (error) {
      console.error('Error disabling sync:', error);
    }
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(mode));
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }, []);

  const enableCloudMode = useCallback(async () => {
    try {
      setCloudModeEnabled(true);
      await AsyncStorage.setItem(CLOUD_MODE_KEY, JSON.stringify(true));
    } catch (error) {
      console.error('Error enabling cloud mode:', error);
    }
  }, []);

  const disableCloudMode = useCallback(async () => {
    try {
      setCloudModeEnabled(false);
      await AsyncStorage.setItem(CLOUD_MODE_KEY, JSON.stringify(false));
    } catch (error) {
      console.error('Error disabling cloud mode:', error);
    }
  }, []);

  const enableDevFeatures = useCallback(async () => {
    try {
      setDevFeaturesEnabled(true);
      await AsyncStorage.setItem(DEV_FEATURES_KEY, JSON.stringify(true));
    } catch (error) {
      console.error('Error enabling dev features:', error);
    }
  }, []);

  const disableDevFeatures = useCallback(async () => {
    try {
      setDevFeaturesEnabled(false);
      await AsyncStorage.setItem(DEV_FEATURES_KEY, JSON.stringify(false));
    } catch (error) {
      console.error('Error disabling dev features:', error);
    }
  }, []);

  const currentTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const trialDaysLeft = useMemo(() => {
    if (isPaid || !trialStartDate) return 0;
    
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, TRIAL_DURATION_DAYS - daysSinceStart);
    
    return daysLeft;
  }, [isPaid, trialStartDate]);

  return useMemo(() => ({
    syncEnabled,
    enableSync,
    disableSync,
    trialDaysLeft,
    isPaid,
    themeMode,
    setTheme,
    theme: currentTheme,
    isDark: currentTheme === darkTheme,
    commonStyles: commonStyles(currentTheme),
    cloudModeEnabled,
    enableCloudMode,
    disableCloudMode,
    devFeaturesEnabled,
    enableDevFeatures,
    disableDevFeatures
  }), [syncEnabled, enableSync, disableSync, trialDaysLeft, isPaid, themeMode, setTheme, currentTheme, cloudModeEnabled, enableCloudMode, disableCloudMode, devFeaturesEnabled, enableDevFeatures, disableDevFeatures]);
});